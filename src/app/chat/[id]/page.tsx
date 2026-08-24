"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ChatScreen } from "@/features/chat/components/ChatScreen";
import { ModelPickerSheet } from "@/features/models/components/ModelPickerSheet";
import { useConversation } from "@/features/chat/hooks/useConversation";
import { useModelSelection } from "@/features/models/store/ModelSelectionProvider";

export default function ChatConversationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const [input, setInput] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const { conv, isStreaming, sendMessage, stopStreaming, attachedIds, toggleAttach } = useConversation(params.id);

  const handleSend = (text?: string) => {
    sendMessage(text ?? input);
    setInput("");
  };

  return (
    <>
      <TopBar title={conv ? conv.title : "OpenTai"} onBack={() => router.push("/")} />
      <ChatScreen
        conv={conv}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        isStreaming={isStreaming}
        onStop={stopStreaming}
        model={selectedModel}
        onOpenModel={() => setModelPickerOpen(true)}
        attachedIds={attachedIds}
        onToggleAttach={toggleAttach}
      />
      <ModelPickerSheet
        open={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        model={selectedModel}
        setModel={setSelectedModel}
      />
    </>
  );
}
