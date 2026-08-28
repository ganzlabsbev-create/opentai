"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { IconButton } from "@/components/ui/IconButton";
import { useDrawer } from "@/components/layout/DrawerProvider";
import { ChatScreen } from "@/features/chat/components/ChatScreen";
import { ModelPickerSheet } from "@/features/models/components/ModelPickerSheet";
import { useConversation } from "@/features/chat/hooks/useConversation";
import { useModelSelection } from "@/features/models/store/ModelSelectionProvider";

export default function ChatRootPage() {
  const router = useRouter();
  const { openDrawer } = useDrawer();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const [input, setInput] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const {
    conv,
    isStreaming,
    sendMessage,
    stopStreaming,
    attachedIds,
    toggleAttach,
    activeTool,
    setActiveTool,
    liveVoice,
    pendingImages,
    addPendingImages,
    removePendingImage,
    imagePickError,
    clearImagePickError,
    selectedModelSupportsVision,
  } = useConversation(null, (newId) => {
    router.push(`/chat/${newId}`);
  });

  const handleSend = (text?: string) => {
    sendMessage(text ?? input);
    setInput("");
  };

  return (
    <>
      <TopBar
        title="OpenTai"
        onMenu={openDrawer}
        right={<IconButton icon={Plus} title="แชทใหม่" onClick={() => setInput("")} />}
      />
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
        activeTool={activeTool}
        onSetActiveTool={setActiveTool}
        liveVoice={liveVoice}
        pendingImages={pendingImages}
        onAddPendingImages={addPendingImages}
        onRemovePendingImage={removePendingImage}
        imagePickError={imagePickError}
        onClearImagePickError={clearImagePickError}
        modelSupportsVision={selectedModelSupportsVision}
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
