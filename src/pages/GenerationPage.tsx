import { useCallback, useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import Header from "@/components/header/Header";
import LeftPanel from "@/components/left-panel/LeftPanel";
import CenterPanel from "@/components/center-panel/CenterPanel";
import RightPanel from "@/components/right-panel/RightPanel";
import VibeImportDialog from "@/components/modals/VibeImportDialog";
import VibeEncodeDialog from "@/components/modals/VibeEncodeDialog";

const VIBE_EXTENSIONS = [".naiv4vibe"];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function getFileExtension(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx >= 0 ? path.slice(idx).toLowerCase() : "";
}

export default function GenerationPage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [importFilePath, setImportFilePath] = useState<string | null>(null);
  const [encodeImagePath, setEncodeImagePath] = useState<string | null>(null);

  // Listen for Tauri file drop events
  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();
    const unlisten = appWindow.onDragDropEvent((event) => {
      if (event.payload.type === "enter") {
        setIsDragOver(true);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const paths: string[] = event.payload.paths;
        if (paths.length > 0) {
          const ext = getFileExtension(paths[0]);
          if (VIBE_EXTENSIONS.includes(ext)) {
            setImportFilePath(paths[0]);
          } else if (IMAGE_EXTENSIONS.includes(ext)) {
            setEncodeImagePath(paths[0]);
          }
        }
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleVibesChanged = useCallback(() => {
    // Trigger re-render in VibeSection by dispatching a custom event
    window.dispatchEvent(new CustomEvent("vibes-changed"));
  }, []);

  return (
    <div className="flex h-screen flex-col relative">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-border">
          <LeftPanel />
        </aside>
        <main className="flex-1 overflow-hidden">
          <CenterPanel />
        </main>
        <aside className="w-64 shrink-0 overflow-y-auto border-l border-border">
          <RightPanel />
        </aside>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="rounded-xl border-2 border-dashed border-primary p-8 text-center">
            <p className="text-sm font-medium text-primary">
              Drop file here
            </p>
          </div>
        </div>
      )}

      {/* Vibe Import Dialog */}
      {importFilePath && (
        <VibeImportDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setImportFilePath(null);
          }}
          filePath={importFilePath}
          onImported={handleVibesChanged}
        />
      )}

      {/* Vibe Encode Dialog */}
      {encodeImagePath && (
        <VibeEncodeDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEncodeImagePath(null);
          }}
          initialImagePath={encodeImagePath}
          onEncoded={handleVibesChanged}
        />
      )}
    </div>
  );
}
