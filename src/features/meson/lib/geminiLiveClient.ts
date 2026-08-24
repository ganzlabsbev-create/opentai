/**
 * Minimal browser client for Gemini's Live API (BidiGenerateContentConstrained),
 * used with the short-lived token from /api/meson/live-token so the API key
 * never reaches the browser. Endpoint + setup-message-first ordering verified
 * against Google's current Live API WebSocket docs (checked 2026-08); the
 * exact realtimeInput/serverContent audio field names below follow the
 * long-standing documented convention (16-bit PCM, 16kHz mono input /
 * 24kHz mono output, base64-encoded inlineData) but — like the other Meson
 * routes touching preview surfaces — should be re-confirmed against current
 * docs if Google changes the wire format.
 */

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export interface LiveClientCallbacks {
  onOpen?: () => void;
  onModelTurnAudio?: (pcm16: Int16Array) => void;
  onModelTurnText?: (text: string) => void;
  onTurnComplete?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function base64FromInt16(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function int16FromBase64(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micNode: ScriptProcessorNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private cb: LiveClientCallbacks;

  constructor(cb: LiveClientCallbacks) {
    this.cb = cb;
  }

  connect(token: string, model: string) {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(
      token
    )}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      // Setup must be the very first message sent.
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: { responseModalities: ["AUDIO"] },
          },
        })
      );
      this.cb.onOpen?.();
    };

    ws.onmessage = async (event) => {
      let raw = event.data;
      if (raw instanceof Blob) raw = await raw.text();
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw as string);
      } catch {
        return;
      }

      if (msg.error) {
        this.cb.onError?.(typeof msg.error === "string" ? msg.error : JSON.stringify(msg.error));
        return;
      }

      const serverContent = msg.serverContent as
        | { modelTurn?: { parts?: { text?: string; inlineData?: { mimeType: string; data: string } }[] }; turnComplete?: boolean }
        | undefined;
      if (serverContent?.modelTurn?.parts) {
        for (const part of serverContent.modelTurn.parts) {
          if (part.text) this.cb.onModelTurnText?.(part.text);
          if (part.inlineData?.data) this.cb.onModelTurnAudio?.(int16FromBase64(part.inlineData.data));
        }
      }
      if (serverContent?.turnComplete) this.cb.onTurnComplete?.();
    };

    ws.onerror = () => this.cb.onError?.("WebSocket ผิดพลาด");
    ws.onclose = () => this.cb.onClose?.();
  }

  async startMic() {
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioCtx = new AudioContext();
    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
    // ScriptProcessorNode is deprecated but needs no separate worklet file
    // to ship and is still broadly supported — acceptable for this use.
    this.micNode = this.audioCtx.createScriptProcessor(4096, 1, 1);

    this.micNode.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const resampled = this.downsample(input, this.audioCtx!.sampleRate, INPUT_SAMPLE_RATE);
      const pcm16 = floatTo16BitPCM(resampled);
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: { mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`, data: base64FromInt16(pcm16) },
          },
        })
      );
    };

    this.micSource.connect(this.micNode);
    this.micNode.connect(this.audioCtx.destination);
  }

  private downsample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const outLength = Math.floor(input.length / ratio);
    const out = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) out[i] = input[Math.floor(i * ratio)]!;
    return out;
  }

  stopMic() {
    this.micNode?.disconnect();
    this.micSource?.disconnect();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micNode = null;
    this.micSource = null;
    this.micStream = null;
  }

  close() {
    this.stopMic();
    this.audioCtx?.close();
    this.audioCtx = null;
    this.ws?.close();
    this.ws = null;
  }
}

/** Simple sequential playback queue for incoming 24kHz mono PCM16 chunks. */
export class LiveAudioPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;

  push(pcm16: Int16Array) {
    if (!this.ctx) this.ctx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    const buffer = this.ctx.createBuffer(1, pcm16.length, OUTPUT_SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) channel[i] = pcm16[i]! / 0x8000;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    const startAt = Math.max(this.ctx.currentTime, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;
  }

  close() {
    this.ctx?.close();
    this.ctx = null;
    this.nextStartTime = 0;
  }
}
