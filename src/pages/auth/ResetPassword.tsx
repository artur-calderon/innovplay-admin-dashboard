import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";

import LOGO from "/LOGO-1.png";
import LOGO_WHITE from "/AFIRME-PLAY-LOGO-branco.png";

interface TokenValidationResponse {
    valido: boolean;
    mensagem: string;
    email: string;
}

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [tokenData, setTokenData] = useState<TokenValidationResponse | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { settings } = useSettings();

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

    // Controlar quando as animações devem começar
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 10);
        
        return () => {
            clearTimeout(timer);
            setIsMounted(false);
        };
    }, []);

    // Limpar qualquer componente anterior ao montar
    useEffect(() => {
        const previousFixedElements = document.querySelectorAll('[data-auth-page]');
        previousFixedElements.forEach(el => {
            if (el !== document.querySelector('[data-auth-page="reset-password"]')) {
                el.remove();
            }
        });
    }, []);

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                toast({
                    title: "Token inválido",
                    description: "Link de redefinição inválido.",
                    variant: "destructive",
                });
                navigate("/");
                return;
            }

            try {
                const response = await api.post("/users/validate-reset-token", { token });
                const data: TokenValidationResponse = response.data;

                if (data.valido) {
                    setTokenData(data);
                } else {
                    toast({
                        title: "Token expirado",
                        description: data.mensagem || "Este link de redefinição expirou ou é inválido.",
                        variant: "destructive",
                    });
                    navigate("/");
                }
            } catch (error: unknown) {
                console.error("Erro ao validar token:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível validar o link de redefinição.",
                    variant: "destructive",
                });
                navigate("/");
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token, navigate, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha todos os campos.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                title: "Senha muito curta",
                description: "A senha deve ter pelo menos 6 caracteres.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                title: "Senhas não coincidem",
                description: "As senhas digitadas não são iguais.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/users/reset-password", {
                token,
                new_password: newPassword
            });

            setIsSuccess(true);
            toast({
                title: "Senha alterada com sucesso!",
                description: "Sua senha foi redefinida. Você receberá um e-mail de confirmação.",
            });
        } catch (error: unknown) {
            console.error("Erro ao redefinir senha:", error);
            toast({
                title: "Erro",
                description: "Não foi possível redefinir sua senha. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate("/");
    };

    if (isValidating) {
        return (
            <div 
                data-auth-page="reset-password-validating"
                className={`min-h-screen w-full flex flex-col lg:flex-row fixed inset-0 z-50 transition-all duration-500 ${
                    isDark 
                        ? "bg-[#240046]" 
                        : "bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"
                }`}
            >
                <div className={`text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 transition-all duration-500 ${
                    isDark 
                        ? "bg-[#240046]" 
                        : "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600"
                }`}>
                    <div className="max-w-md flex flex-col items-center text-center">
                        <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col animate-fade-in-up">
                            <img src={isDark ? LOGO_WHITE : LOGO} alt="Logo" className="w-[300px] max-w-full h-auto animate-logo-float drop-shadow-2xl transition-transform duration-300 hover:scale-105" />
                            <p className="text-lg md:text-xl text-white/80 animate-fade-in-delay mt-4">APRENDIZAGEM E RESULTADO</p>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="w-full max-w-md text-center">
                        <div className={`relative flex flex-col ${
                            isDark 
                                ? "bg-[#240046] shadow-[7px_7px_10px_3px_rgba(36,0,70,0.16)]" 
                                : "bg-white/90 backdrop-blur-md shadow-xl"
                        } rounded-xl max-h-[420px] overflow-hidden p-6 animate-slide-in-right`}>
                            <Loader2 className={`h-16 w-16 animate-spin mx-auto mb-6 ${isDark ? "text-purple-400" : "text-[#8257e5]"}`} />
                            <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${
                                isDark ? "text-white" : "text-gray-800"
                            }`}>
                                Validando link...
                            </h2>
                            <p className={isDark ? "text-white/80" : "text-gray-600"}>
                                Aguarde enquanto validamos seu link de redefinição.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div 
                data-auth-page="reset-password-success"
                className={`min-h-screen w-full flex flex-col lg:flex-row fixed inset-0 z-50 transition-all duration-500 ${
                    isDark 
                        ? "bg-[#240046]" 
                        : "bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"
                }`}
            >
                <div className={`text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 transition-all duration-500 ${
                    isDark 
                        ? "bg-[#240046]" 
                        : "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600"
                }`}>
                    <div className="max-w-md flex flex-col items-center text-center">
                        <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col animate-fade-in-up">
                            <img src={isDark ? LOGO_WHITE : LOGO} alt="Logo" className="w-[300px] max-w-full h-auto animate-logo-float drop-shadow-2xl transition-transform duration-300 hover:scale-105" />
                            <p className="text-lg md:text-xl text-white/80 animate-fade-in-delay mt-4">APRENDIZAGEM E RESULTADO</p>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="w-full max-w-md text-center">
                        <div className={`relative flex flex-col ${
                            isDark 
                                ? "bg-[#240046] shadow-[7px_7px_10px_3px_rgba(36,0,70,0.16)]" 
                                : "bg-white/90 backdrop-blur-md shadow-xl"
                        } rounded-xl max-h-[420px] overflow-hidden p-6 animate-slide-in-right`}>
                            <div className="mb-6 flex justify-center">
                                <CheckCircle className="h-16 w-16 text-green-500 animate-fade-in" />
                            </div>
                            <h2 className={`text-2xl md:text-3xl font-bold mb-4 animate-fade-in-delay ${
                                isDark ? "text-white" : "text-gray-800"
                            }`}>
                                Senha redefinida!
                            </h2>
                            <p className={`mb-8 animate-fade-in-delay-2 ${
                                isDark ? "text-white/80" : "text-gray-600"
                            }`}>
                                Sua senha foi alterada com sucesso. Você pode fazer login com sua nova senha.
                            </p>
                            <Button
                                onClick={handleBackToLogin}
                                className={`w-[85%] h-10 mx-auto text-white font-bold border-none rounded cursor-pointer transition-all duration-300 animate-slide-in-up delay-300 ${
                                    isDark 
                                        ? "bg-[#573b8a] hover:bg-[#6d44b8] hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 active:scale-95" 
                                        : "bg-[#573b8a] hover:bg-[#6d44b8] hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 active:scale-95"
                                }`}
                            >
                                Ir para o login
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            data-auth-page="reset-password"
            className={`min-h-screen w-full flex flex-col lg:flex-row fixed inset-0 z-50 transition-all duration-500 ${
                isDark 
                    ? "bg-[#240046]" 
                    : "bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"
            }`}
        >
            <div className={`text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 transition-all duration-500 ${
                isDark 
                    ? "bg-[#240046]" 
                    : "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600"
            }`}>
                <div className="max-w-md flex flex-col items-center text-center">
                    <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col animate-fade-in-up">
                        <img src={LOGO} alt="Logo" className="w-[300px] max-w-full h-auto animate-logo-float drop-shadow-2xl transition-transform duration-300 hover:scale-105" />
                        <p className="text-lg md:text-xl text-white/80 animate-fade-in-delay mt-4">APRENDIZAGEM E RESULTADO</p>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    <div className={`relative flex flex-col animate-slide-in-right ${
                        isDark 
                            ? "bg-[#240046] shadow-[7px_7px_10px_3px_rgba(36,0,70,0.16)]" 
                            : "bg-white/90 backdrop-blur-md shadow-xl"
                    } rounded-xl max-h-[420px] overflow-hidden transition-all duration-300 hover:shadow-2xl`}>
                        <div className="flex flex-col gap-3.5 p-6">
                            <h2 className={`text-2xl md:text-3xl font-bold mb-1 flex justify-center animate-fade-in ${
                                isDark ? "text-white" : "text-gray-800"
                            }`}>
                                Redefinir senha
                            </h2>
                            <p className={`mb-6 text-center animate-fade-in-delay ${
                                isDark ? "text-white/80" : "text-gray-600"
                            }`}>
                                Digite sua nova senha para a conta <strong>{tokenData?.email}</strong>
                            </p>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                                <div className="relative group animate-slide-in-up delay-75">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-transform duration-300 group-focus-within:scale-110">
                                        <Lock className={`h-5 w-5 transition-colors duration-300 ${isDark ? "text-gray-300 group-focus-within:text-purple-400" : "text-gray-400 group-focus-within:text-purple-600"}`} />
                                    </div>
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Nova senha"
                                        className={`pl-10 h-10 bg-[#e0dede] border-none outline-none rounded transition-all duration-300 focus:scale-[1.02] focus:shadow-lg ${
                                            isDark 
                                                ? "bg-gray-700 text-white placeholder:text-gray-400 focus:bg-gray-600 focus:ring-2 focus:ring-purple-500/50" 
                                                : "bg-[#e0dede] text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/50"
                                        }`}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={isLoading}
                                        minLength={6}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 transition-all duration-300 hover:scale-110 active:scale-95"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className={`h-5 w-5 transition-all duration-300 ${isDark ? "text-gray-300 hover:text-purple-400" : "text-gray-400 hover:text-purple-600"}`} />
                                        ) : (
                                            <Eye className={`h-5 w-5 transition-all duration-300 ${isDark ? "text-gray-300 hover:text-purple-400" : "text-gray-400 hover:text-purple-600"}`} />
                                        )}
                                    </button>
                                </div>

                                <div className="relative group animate-slide-in-up delay-150">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-transform duration-300 group-focus-within:scale-110">
                                        <Lock className={`h-5 w-5 transition-colors duration-300 ${isDark ? "text-gray-300 group-focus-within:text-purple-400" : "text-gray-400 group-focus-within:text-purple-600"}`} />
                                    </div>
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirmar nova senha"
                                        className={`pl-10 h-10 bg-[#e0dede] border-none outline-none rounded transition-all duration-300 focus:scale-[1.02] focus:shadow-lg ${
                                            isDark 
                                                ? "bg-gray-700 text-white placeholder:text-gray-400 focus:bg-gray-600 focus:ring-2 focus:ring-purple-500/50" 
                                                : "bg-[#e0dede] text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500/50"
                                        }`}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={isLoading}
                                        minLength={6}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 transition-all duration-300 hover:scale-110 active:scale-95"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={isLoading}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className={`h-5 w-5 transition-all duration-300 ${isDark ? "text-gray-300 hover:text-purple-400" : "text-gray-400 hover:text-purple-600"}`} />
                                        ) : (
                                            <Eye className={`h-5 w-5 transition-all duration-300 ${isDark ? "text-gray-300 hover:text-purple-400" : "text-gray-400 hover:text-purple-600"}`} />
                                        )}
                                    </button>
                                </div>

                                <div className={`rounded-lg p-4 animate-fade-in-delay-2 transition-all duration-300 ${
                                    isDark 
                                        ? "bg-blue-900/30 border border-blue-700/50" 
                                        : "bg-blue-50 border border-blue-200"
                                }`}>
                                    <div className="flex items-start">
                                        <AlertCircle className={`h-5 w-5 mt-0.5 mr-2 flex-shrink-0 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                                        <div className={`text-sm ${isDark ? "text-blue-200" : "text-blue-800"}`}>
                                            <p className="font-medium mb-1">Dicas para uma senha segura:</p>
                                            <ul className="space-y-1 text-xs">
                                                <li>• Use pelo menos 6 caracteres</li>
                                                <li>• Combine letras, números e símbolos</li>
                                                <li>• Evite informações pessoais</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className={`w-[85%] h-10 mx-auto mt-3 mb-2.5 text-white font-bold border-none rounded cursor-pointer transition-all duration-300 animate-slide-in-up delay-300 ${
                                        isDark 
                                            ? "bg-[#573b8a] hover:bg-[#6d44b8] hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" 
                                            : "bg-[#573b8a] hover:bg-[#6d44b8] hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    }`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Redefinindo...
                                        </>
                                    ) : (
                                        <span className="transition-all duration-300">Redefinir senha</span>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 text-center animate-fade-in-delay-2">
                                <Button
                                    variant="ghost"
                                    onClick={handleBackToLogin}
                                    className={`p-0 h-auto transition-all duration-300 hover:scale-105 ${
                                        isDark 
                                            ? "text-white/80 hover:text-white" 
                                            : "text-gray-600 hover:text-gray-800"
                                    }`}
                                >
                                    Voltar para o login
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className={`mt-8 text-center text-sm animate-fade-in-delay-3 transition-opacity duration-300 ${
                        isDark ? "text-white/80" : "text-gray-500"
                    }`}>
                        © {new Date().getFullYear()} Afirme Play - JESUS CRISTO É O SENHOR
                    </div>
                </div>
            </div>
        </div>
    );
} 