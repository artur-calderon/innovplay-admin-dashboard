import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useSettings } from "@/hooks/useSettings";

import LOGO from "/LOGO-1.png"
import LOGO_WHITE from "/AFIRME PLAY LOGO branco.png"

export default function Login() {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSettings();

  const { login, user } = useAuth();

  // Controlar quando as animações devem começar (pequeno delay para evitar flash)
  useEffect(() => {
    // Forçar que este componente fique por cima durante a transição
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 10); // Delay mínimo para garantir que o componente está montado
    
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, []);

  // Limpar qualquer componente anterior ao montar
  useEffect(() => {
    // Forçar remoção de qualquer elemento fixo anterior
    const previousFixedElements = document.querySelectorAll('[data-auth-page]');
    previousFixedElements.forEach(el => {
      if (el !== document.querySelector('[data-auth-page="login"]')) {
        el.remove();
      }
    });
  }, []);

  // Verificar tema do sistema e sincronizar
  useEffect(() => {
    const checkTheme = () => {
      const rootElement = document.documentElement;
      const hasDarkClass = rootElement.classList.contains('dark');
      setIsDark(hasDarkClass);
    };

    // Verificar tema inicial
    checkTheme();

    // Observar mudanças na classe dark
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Sincronizar com settings quando mudar
  useEffect(() => {
    if (settings.theme) {
      setIsDark(settings.theme === "dark");
    }
  }, [settings.theme]);

  const handleLogin = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!matricula || !senha) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Validação básica da matrícula (deve ter pelo menos 3 caracteres)
    if (matricula.trim().length < 3) {
      toast({
        title: "Matrícula inválida",
        description: "A matrícula deve ter pelo menos 3 caracteres.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);
    
    // Limpar o valor da matrícula removendo @ e espaços
    const matriculaLimpa = matricula.trim().split('@')[0].trim();
    
    try {
      // Tentar primeiro com email completo, depois apenas com matrícula se falhar
      const emailCompleto = `${matriculaLimpa}@afirmeplay.com.br`;
      const matriculaApenas = matriculaLimpa;
      
      try {
        // Primeira tentativa: email completo
        await login(emailCompleto, senha);
        // Se chegou aqui, o login foi bem-sucedido
        // O contexto já trata o redirecionamento e o toast de sucesso
        return; // Retornar para evitar processar o catch externo
      } catch (firstError: unknown) {
        // Se falhar com 401 ou 404, tentar apenas com a matrícula
        if (firstError && typeof firstError === 'object' && 'response' in firstError) {
          const axiosError = firstError as { response?: { status?: number } };
          const status = axiosError.response?.status;
          
          if (status === 401 || status === 404) {
            // Segunda tentativa: apenas matrícula
            await login(matriculaApenas, senha);
            return; // Sucesso na segunda tentativa
          }
        }
        // Se não for 401 ou 404, lançar o erro
        throw firstError;
      }
    } catch (error: unknown) {

      // Tratamento específico de erros de login
      let errorTitle = "Erro no login";
      let errorDescription = "Ocorreu um erro ao tentar fazer login.";

      // Type guard para erro com response (axios)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string; erro?: string; error?: string } } };
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;

        if (status === 401) {
          errorTitle = "Credenciais inválidas";
          errorDescription = "Matrícula ou senha incorretos. Verifique suas credenciais e tente novamente.";
        } else if (status === 404) {
          errorTitle = "Usuário não encontrado";
          errorDescription = "Não foi possível encontrar um usuário com essa matrícula.";
        } else if (status === 422) {
          errorTitle = "Dados inválidos";
          errorDescription = data?.message || "Os dados fornecidos são inválidos.";
        } else if (status && status >= 500) {
          errorTitle = "Erro do servidor";
          errorDescription = "O servidor está enfrentando problemas. Tente novamente mais tarde.";
        } else {
          // Outros erros da API
          errorDescription = data?.erro || data?.error || data?.message || "Erro desconhecido.";
        }
      } else if (error && typeof error === 'object' && 'code' in error) {
        const networkError = error as { code?: string; message?: string };
        if (networkError.code === 'ERR_NETWORK') {
          errorTitle = "Erro de conexão";
          errorDescription = "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.";
        } else if (networkError.code === 'ECONNABORTED') {
          errorTitle = "Timeout";
          errorDescription = "A requisição demorou muito para responder. Tente novamente.";
        } else {
          errorDescription = networkError.message || "Ocorreu um erro inesperado.";
        }
      } else if (error instanceof Error) {
        errorDescription = error.message || "Ocorreu um erro inesperado.";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 5000, // 5 segundos para erros
      });

      // Limpar apenas a senha em caso de erro, mantendo a matrícula
      setSenha("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[linear-gradient(135deg,#05071A_0%,#101633_30%,#1B1F4A_55%,#3B2D7A_80%,#7B3FE4_100%)]">
      {/* Lado esquerdo (gradiente Afirme Play) */}
      <div className="text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="max-w-md flex flex-col items-center text-center">
          {/* Ilustração centralizada */}
          <div className={`mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col transition-opacity duration-300 ${
            isMounted ? "animate-fade-in-up opacity-100" : "opacity-0"
          }`}>
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
              <img 
                src={isDark ? LOGO_WHITE : LOGO} 
                alt="Logo" 
                className="relative w-[300px] max-w-full h-auto animate-logo-float drop-shadow-2xl transition-transform duration-300 hover:scale-105" 
              />
            </div>
            <p className={`text-lg md:text-xl text-white/90 font-medium tracking-wide mt-6 transition-opacity duration-300 ${
              isMounted ? "animate-fade-in-delay opacity-100" : "opacity-0"
            }`}>
              APRENDIZAGEM E RESULTADO
            </p>
            <div className={`mt-6 w-24 h-1 rounded-full transition-opacity duration-300 ${
              isDark ? "bg-purple-400/50" : "bg-white/30"
            } ${isMounted ? "animate-fade-in-delay-2 opacity-100" : "opacity-0"}`}></div>
          </div>
        </div>
      </div>

      {/* Lado direito (card sobre o gradiente) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="enhanced-card rounded-2xl p-8 bg-white/90 backdrop-blur-md shadow-xl">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Área Login</h2>
            <p className="text-gray-600 mb-8">
              A educação constrói seres humanos, jogos e diversão alegram a vida, juntos transformam o mundo.
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Matrícula ou e-mail"
                className="pl-10 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
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
                className="pl-10 pr-10 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
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
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
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
                <label htmlFor="lembrar" className="text-sm text-gray-600">
                  Lembrar-me
                </label>
              </div>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Esqueceu a senha?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full py-6 bg-[linear-gradient(90deg,#4F8EAD_0%,#5A9FDB_18%,#8F9AFF_38%,#8F81FF_60%,#CB61FC_80%,#FF61FE_100%)] hover:brightness-110 text-white shadow-lg"
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
          </div>

          <div className="mt-8 text-center text-sm text-white/80">
            © 2025 Afirme Play ❤️
          </div>
        </div>
      </div>
    </div>
  );
}
