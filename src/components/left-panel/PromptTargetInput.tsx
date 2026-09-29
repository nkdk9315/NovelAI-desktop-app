import { useEffect, useState } from "react";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import PromptGroupModal from "@/components/modals/PromptGroupModal";
import CharacterPromptGroups from "./CharacterPromptGroups";

interface PromptTargetInputProps {
  targetId: string;
  placeholder?: string;
  rows?: number;
  /** Text to start from when the target doesn't exist yet (older data kept plain text) */
  initialText?: string;
}

/**
 * A prompt box with tag groups for any prompt target (a manga panel's scene,
 * a character's appearance in a panel, an outfit). Creates the target on
 * first use; it is saved with the project like the main / character prompts.
 */
export default function PromptTargetInput({ targetId, placeholder, rows = 2, initialText }: PromptTargetInputProps) {
  const exists = useSidebarPromptStore((s) => s.targets[targetId] != null);
  const [browserOpen, setBrowserOpen] = useState(false);

  useEffect(() => {
    if (exists) return;
    const store = useSidebarPromptStore.getState();
    store.initTarget(targetId);
    if (initialText?.trim()) store.setPromptOverride(targetId, initialText.trim());
  }, [exists, targetId, initialText]);

  if (!exists) return null;
  return (
    <>
      <CharacterPromptGroups
        targetId={targetId}
        onOpenGroupBrowser={() => setBrowserOpen(true)}
        textareaRows={rows}
        placeholder={placeholder}
      />
      {browserOpen && <PromptGroupModal open={browserOpen} onOpenChange={setBrowserOpen} targetId={targetId} />}
    </>
  );
}
