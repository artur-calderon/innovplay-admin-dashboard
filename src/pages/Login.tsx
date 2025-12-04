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
      console.error("Erro ao fazer login:", error);

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
    <div 
      data-auth-page="login"
      className={`min-h-screen w-full flex flex-col lg:flex-row transition-all duration-500 fixed inset-0 z-50 ${
        isDark 
          ? "bg-[#240046]" 
          : "bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"
      }`}
    >
      {/* Lado esquerdo (gradiente Afirme Play) */}
      <div className={`text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 relative overflow-hidden transition-all duration-500 ${
        isDark 
          ? "bg-[#240046]" 
          : "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600"
      }`}>
        {/* Elementos decorativos de fundo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-md flex flex-col items-center text-center relative z-10">
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
          <div className={`relative flex flex-col transition-all duration-300 ${
            isDark 
              ? "bg-gradient-to-br from-[#240046] to-[#2d0052] shadow-[7px_7px_10px_3px_rgba(36,0,70,0.16)] border border-purple-500/20" 
              : "bg-white/95 backdrop-blur-md shadow-2xl border border-white/50"
          } rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.01] ${
            isMounted ? "animate-slide-in-right opacity-100" : "opacity-0 translate-x-8"
          }`}>
            {/* Gradiente sutil no topo */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              isDark 
                ? "bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" 
                : "bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"
            }`}></div>
            
            <div className="flex flex-col gap-5 p-8">
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className={`text-3xl md:text-4xl font-bold transition-opacity duration-300 ${
                  isDark ? "text-white" : "text-gray-900"
                } ${isMounted ? "animate-fade-in opacity-100" : "opacity-0"}`}>
                  Bem-vindo
                </h2>
                <p className={`text-sm font-medium transition-opacity duration-300 ${
                  isDark ? "text-white/70" : "text-gray-500"
                } ${isMounted ? "animate-fade-in-delay opacity-100" : "opacity-0"}`}>
                  Excelência Institucional impulsionada por Resultados e Foco no Aprendizado
                </p>
              </div>

              {/* Divisor */}
              <div className={`h-px w-full my-2 ${
                isDark ? "bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" : "bg-gradient-to-r from-transparent via-gray-200 to-transparent"
              }`}></div>

              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  handleLogin(e); 
                  return false;
                }} 
                className="flex flex-col gap-4" 
                noValidate
              >
                <div className="space-y-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider transition-opacity duration-300 delay-75 ${
                    isDark ? "text-white/70" : "text-gray-600"
                  } ${isMounted ? "animate-slide-in-up opacity-100" : "opacity-0"}`}>
                    Usuário
                  </label>
                  <div className={`relative group transition-opacity duration-300 delay-75 ${
                    isMounted ? "animate-slide-in-up opacity-100" : "opacity-0"
                  }`}>
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-transform duration-300 group-focus-within:scale-110 z-10">
                      <User className={`h-5 w-5 transition-colors duration-300 ${isDark ? "text-gray-400 group-focus-within:text-purple-400" : "text-gray-500 group-focus-within:text-purple-600"}`} />
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        type="text"
                        placeholder="usuario"
                        className={`pl-12 pr-32 h-12 bg-[#e0dede] border-none outline-none rounded-lg transition-all duration-300 focus:scale-[1.01] focus:shadow-lg ${
                          isDark 
                            ? "bg-gray-700/80 text-white placeholder:text-gray-500 focus:bg-gray-700 focus:ring-2 focus:ring-purple-500/50" 
                            : "bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-purple-500/50"
                        }`}
                        value={matricula}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Remove o @ e tudo depois se o usuário tentar digitar
                          // Também remove espaços e caracteres especiais que não devem estar no email
                          const cleanValue = value.split('@')[0].trim();
                          setMatricula(cleanValue);
                        }}
                        onKeyDown={(e) => {
                          // Prevenir que o usuário digite @
                          if (e.key === '@') {
                            e.preventDefault();
                          }
                        }}
                        disabled={isLoading}
                      />
                      <span className={`absolute right-4 text-sm pointer-events-none ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}>
                        @afirmeplay.com.br
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-semibold uppercase tracking-wider transition-opacity duration-300 delay-150 ${
                    isDark ? "text-white/70" : "text-gray-600"
                  } ${isMounted ? "animate-slide-in-up opacity-100" : "opacity-0"}`}>
                    Senha
                  </label>
                  <div className={`relative group transition-opacity duration-300 delay-150 ${
                    isMounted ? "animate-slide-in-up opacity-100" : "opacity-0"
                  }`}>
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-transform duration-300 group-focus-within:scale-110">
                      <Lock className={`h-5 w-5 transition-colors duration-300 ${isDark ? "text-gray-400 group-focus-within:text-purple-400" : "text-gray-500 group-focus-within:text-purple-600"}`} />
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      className={`pl-12 pr-12 h-12 bg-[#e0dede] border-none outline-none rounded-lg transition-all duration-300 focus:scale-[1.01] focus:shadow-lg ${
                        isDark 
                          ? "bg-gray-700/80 text-white placeholder:text-gray-500 focus:bg-gray-700 focus:ring-2 focus:ring-purple-500/50" 
                          : "bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-purple-500/50"
                      }`}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-4 transition-all duration-300 hover:scale-110 active:scale-95"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className={`h-5 w-5 transition-all duration-300 ${isDark ? "text-gray-400 hover:text-purple-400" : "text-gray-500 hover:text-purple-600"}`} />
                      ) : (
                        <Eye className={`h-5 w-5 transition-all duration-300 ${isDark ? "text-gray-400 hover:text-purple-400" : "text-gray-500 hover:text-purple-600"}`} />
                      )}
                    </button>
                  </div>
                </div>

                <div className={`flex items-center justify-between pt-2 transition-opacity duration-300 ${
                  isMounted ? "animate-fade-in-delay-2 opacity-100" : "opacity-0"
                }`}>
                  <div className="flex items-center space-x-2.5">
                    <Checkbox
                      id="lembrar"
                      checked={lembrar}
                      onCheckedChange={(checked) => setLembrar(checked === true)}
                      disabled={isLoading}
                      className="transition-all duration-300 hover:scale-110"
                    />
                    <label
                      htmlFor="lembrar"
                      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-300 cursor-pointer ${
                        isDark ? "text-white/90 hover:text-purple-300" : "text-gray-700 hover:text-purple-600"
                      }`}
                    >
                      Lembrar-me
                    </label>
                  </div>
                  <a 
                    href="/forgot-password" 
                    className={`text-sm font-medium transition-all duration-300 hover:underline hover:scale-105 ${
                      isDark ? "text-purple-300 hover:text-purple-200" : "text-purple-600 hover:text-purple-700"
                    }`}
                  >
                    Esqueceu a senha?
                  </a>
                </div>

                <Button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await handleLogin();
                  }}
                  className={`w-full h-12 mt-4 text-white font-semibold text-base border-none rounded-lg cursor-pointer transition-all duration-300 delay-300 shadow-lg ${
                    isMounted ? "animate-slide-in-up opacity-100" : "opacity-0 translate-y-4"
                  } ${
                    isDark 
                      ? "bg-gradient-to-r from-[#573b8a] to-[#6d44b8] hover:from-[#6d44b8] hover:to-[#7d54c8] hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
                      : "bg-gradient-to-r from-[#573b8a] to-[#6d44b8] hover:from-[#6d44b8] hover:to-[#7d54c8] hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <span className="transition-all duration-300">Entrar</span>
                  )}
                </Button>
              </form>
            </div>
          </div>

          <div className={`mt-6 text-center text-xs transition-opacity duration-300 ${
            isDark ? "text-white/60" : "text-gray-500"
          } ${isMounted ? "animate-fade-in-delay-3 opacity-100" : "opacity-0"}`}>
            © 2025 Afirme Play - JESUS CRISTO É O SENHOR
          </div>
        </div>
      </div>
    </div>
  );
}
