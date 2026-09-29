import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import ToastAutoDismiss from "@/components/shared/ToastAutoDismiss";
import ProjectListPage from "@/pages/ProjectListPage";
import GenerationPage from "@/pages/GenerationPage";
import SpritePage from "@/pages/SpritePage";

function App() {
  return (
    <ErrorBoundary>
      <MemoryRouter>
        <TooltipProvider>
          <Routes>
            <Route path="/" element={<ProjectListPage />} />
            <Route path="/project/:id" element={<GenerationPage />} />
            <Route path="/sprite/:id" element={<SpritePage />} />
          </Routes>
          <Toaster position="bottom-right" richColors closeButton />
          <ToastAutoDismiss />
        </TooltipProvider>
      </MemoryRouter>
    </ErrorBoundary>
  );
}

export default App;
