import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProjectListPage from "@/pages/ProjectListPage";
import GenerationPage from "@/pages/GenerationPage";

function App() {
  return (
    <ErrorBoundary>
      <MemoryRouter>
        <TooltipProvider>
          <Routes>
            <Route path="/" element={<ProjectListPage />} />
            <Route path="/project/:id" element={<GenerationPage />} />
          </Routes>
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </MemoryRouter>
    </ErrorBoundary>
  );
}

export default App;
