
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentsPage from "./pages/students/StudentsPage";
import EvaluationsPage from "./pages/evaluations/EvaluationsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Index /></Layout>} />
          <Route path="/alunos" element={<Layout><StudentsPage /></Layout>} />
          <Route path="/avaliacoes" element={<Layout><EvaluationsPage /></Layout>} />
          <Route path="/agenda" element={<Layout><Index /></Layout>} />
          <Route path="/jogos" element={<Layout><Index /></Layout>} />
          <Route path="/play-tv" element={<Layout><Index /></Layout>} />
          <Route path="/plantao" element={<Layout><Index /></Layout>} />
          <Route path="/cartao-resposta" element={<Layout><Index /></Layout>} />
          <Route path="/certificados" element={<Layout><Index /></Layout>} />
          <Route path="/competicoes" element={<Layout><Index /></Layout>} />
          <Route path="/olimpiadas" element={<Layout><Index /></Layout>} />
          <Route path="/escolas" element={<Layout><Index /></Layout>} />
          <Route path="/usuarios" element={<Layout><Index /></Layout>} />
          <Route path="/perfil" element={<Layout><Index /></Layout>} />
          <Route path="/avisos" element={<Layout><Index /></Layout>} />
          <Route path="/configuracoes" element={<Layout><Index /></Layout>} />
          <Route path="*" element={<Layout><NotFound /></Layout>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
