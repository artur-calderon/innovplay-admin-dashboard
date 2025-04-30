
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Students from "./pages/Students";
import Evaluations from "./pages/Evaluations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/alunos" element={<Students />} />
          <Route path="/avaliacoes" element={<Evaluations />} />
          <Route path="/agenda" element={<Index />} />
          <Route path="/jogos" element={<Index />} />
          <Route path="/play-tv" element={<Index />} />
          <Route path="/plantao" element={<Index />} />
          <Route path="/cartao-resposta" element={<Index />} />
          <Route path="/certificados" element={<Index />} />
          <Route path="/competicoes" element={<Index />} />
          <Route path="/olimpiadas" element={<Index />} />
          <Route path="/escolas" element={<Index />} />
          <Route path="/usuarios" element={<Index />} />
          <Route path="/perfil" element={<Index />} />
          <Route path="/avisos" element={<Index />} />
          <Route path="/configuracoes" element={<Index />} />
          {/* More routes will be added later */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
