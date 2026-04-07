import Header from "@/components/header/Header";
import LeftPanel from "@/components/left-panel/LeftPanel";
import CenterPanel from "@/components/center-panel/CenterPanel";
import RightPanel from "@/components/right-panel/RightPanel";

export default function GenerationPage() {
  return (
    <div className="flex h-screen flex-col">
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
    </div>
  );
}
