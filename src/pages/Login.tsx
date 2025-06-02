import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/authContext";

import LOGO from "/LOGO-1.png"

export default function Login() {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {login, user} = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matricula || !senha) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(matricula, senha);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Lado esquerdo (roxo) */}
      <div className="bg-[#8257e5] text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="max-w-md flex flex-col items-center text-center">
          {/* Ilustração centralizada */}
          <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col">
            <img src={LOGO} alt="Logo" className="w-[300rem]" />
            
            <p className="text-lg md:text-xl text-white/80">APRENDIZAGEM E RESULTADO</p>
          </div>
        </div>
      </div>
      
      {/* Lado direito (branco) */}
      <div className="bg-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Área Login</h2>
          <p className="text-gray-600 mb-8">
            A educação constrói seres humanos, jogos (diversão) alegra a vida, juntos transformam o mundo.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Matrícula"
                className="pl-10"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                className="pl-10"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lembrar"
                  checked={lembrar}
                  onCheckedChange={(checked) => setLembrar(checked === true)}
                  disabled={isLoading}
                />
                <label
                  htmlFor="lembrar"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Lembrar
                </label>
              </div>
              <a href="#" className="text-sm text-[#8257e5] hover:underline">
                Esqueceu sua senha?
              </a>
            </div>
            
            <Button
              type="submit"
              className="w-full py-6 bg-[#8257e5] hover:bg-[#6d48c2]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Acessar"
              )}
            </Button>
          </form>
          
          <div className="mt-12 text-center text-sm text-gray-500">
            © 2025 Innov Play ❤️
          </div>
        </div>
      </div>
    </div>
  );
}
