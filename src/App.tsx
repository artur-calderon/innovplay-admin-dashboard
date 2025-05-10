
import { Toaster } from "@/components/ui/toaster";
import {ToastContainer} from 'react-toastify'
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Students from "./pages/Students";
import Evaluations from "./pages/Evaluations";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { useAuth } from "./context/authContext";
import { useEffect, useState } from "react";
import { api } from "./lib/api";
import EmBreve from "./pages/EmBreve";
import { EvaluationForm } from "./components/evaluations/EvaluationForm";
import Layout from "./components/layout/Layout";
import StudentEvaluations from "./components/evaluations/StudentEvaluations";

const queryClient = new QueryClient();


const App = () =>{ 
  const {user, setUser} = useAuth();
  const navigate = useNavigate()

  useEffect(()=>{
    api.get('/persist-user').then(res =>{
      setUser(res.data.usuario)
    }).catch(e => {
      console.log(e)
      if(e.response?.status === 401){
        setUser({id: '',
          nome: '',
          matricula:'',
          email:'',
          role:'',
          tenant_id:''})
       navigate("/")
      }
    })
  },[setUser, navigate])
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Sonner />
        
          <Routes>
            <Route path="/" element={user.id != "" ? <Navigate to={user.role === 'aluno' ? "/aluno": "/app"}/>: <Login />} />
            {
              user.role === 'aluno' && (
                <Route path="/aluno" element={<Layout/>}>
                    <Route index element={<Index/>}/>
                    <Route path="/aluno/avaliacoes" element={<StudentEvaluations />} />
                    <Route path="/aluno/agenda" element={<EmBreve />} />
                    <Route path="/aluno/jogos" element={<EmBreve />} />
                    <Route path="/aluno/play-tv" element={<EmBreve />} />
                    <Route path="/aluno/certificados" element={<EmBreve />} />
                    <Route path="/aluno/competicoes" element={<EmBreve />} />
                    <Route path="/aluno/olimpiadas" element={<EmBreve />} />
                    <Route path="/aluno/escolas" element={<EmBreve />} />
                    <Route path="/aluno/perfil" element={<EmBreve />} />
                    <Route path="/aluno/avisos" element={<EmBreve />} />
                </Route>
              )
            }

            {
              user.role != 'aluno' && (
                <Route path="/app" element={<Layout/>}>
                  <Route index element={<Index/>}/>
                  <Route path="/app/alunos" element={<Students />} />
                  <Route path="/app/avaliacoes" element={<Evaluations />} />
                  <Route path="/app/agenda" element={<EmBreve />} />
                  <Route path="/app/jogos" element={<EmBreve />} />
                  <Route path="/app/play-tv" element={<EmBreve />} />
                  <Route path="/app/plantao" element={<EmBreve />} />
                  <Route path="/app/cartao-resposta" element={<EmBreve />} />
                  <Route path="/app/certificados" element={<EmBreve />} />
                  <Route path="/app/competicoes" element={<EmBreve />} />
                  <Route path="/app/olimpiadas" element={<EmBreve />} />
                  <Route path="/app/escolas" element={<EmBreve />} />
                  <Route path="/app/usuarios" element={<EmBreve />} />
                  <Route path="/app/perfil" element={<EmBreve />} />
                  <Route path="/app/avisos" element={<EmBreve />} />
                  <Route path="/app/criar-avaliacao" element={<EvaluationForm onSubmit={null}/>} />
                  <Route path="/app/configuracoes" element={<EmBreve />} />
                </Route>
              )
            }
           
            {/* More routes will be added later */}
            <Route path="*" element={<NotFound />} />
          </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
  
}

export default App;
