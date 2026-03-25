import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";

import LOGO from "/LOGO-1.png";
import LOGO_WHITE from "/AFIRME PLAY LOGO branco.png";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
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
            if (el !== document.querySelector('[data-auth-page="forgot-password"]')) {
                el.remove();
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast({
                title: "Campo obrigatório",
                description: "Por favor, insira seu e-mail.",
                variant: "destructive",
            });
            return;
        }

        // Validação básica de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({
                title: "E-mail inválido",
                description: "Por favor, insira um e-mail válido.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/users/forgot-password", { email });
            setIsSuccess(true);
            toast({
                title: "E-mail enviado",
                description: "Se o e-mail existir em nossa base, você receberá um link para redefinir sua senha.",
            });
        } catch (error: unknown) {
            console.error("Erro ao solicitar reset de senha:", error);
            // Mesmo com erro, mostramos a mesma mensagem por segurança
            setIsSuccess(true);
            toast({
                title: "E-mail enviado",
                description: "Se o e-mail existir em nossa base, você receberá um link para redefinir sua senha.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate("/");
    };

    if (isSuccess) {
        return (
            <div 
                data-auth-page="forgot-password-success"
                className={`min-h-screen w-full flex flex-col lg:flex-row fixed inset-0 z-50 transition-all duration-500 ${
                    isDark 
                        ? "bg-[#240046]" 
                        : "bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"
                }`}
            >
                {/* Lado esquerdo (roxo) */}
                <div className={`text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 ${
                    isDark 
                        ? "bg-[#240046]" 
                        : "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600"
                }`}>
                    <div className="max-w-md flex flex-col items-center text-center">
                        <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col">
                            <img src={isDark ? LOGO_WHITE : LOGO} alt="Logo" className="w-[300px] max-w-full h-auto" />
                            <p className="text-lg md:text-xl text-white/80">APRENDIZAGEM E RESULTADO</p>
                        </div>
                    </div>
                </div>

                {/* Lado direito (branco) */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="w-full max-w-md text-center">
                        <div className={`relative flex flex-col ${
                            isDark 
                                ? "bg-[#240046] shadow-[7px_7px_10px_3px_rgba(36,0,70,0.16)]" 
                                : "bg-white/90 backdrop-blur-md shadow-xl"
                        } rounded-xl max-h-[420px] overflow-hidden p-6`}>
                            <div className="mb-6 flex justify-center">
                                <CheckCircle className="h-16 w-16 text-green-500" />
                            </div>
                            <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${
                                isDark ? "text-white" : "text-gray-800"
                            }`}>
                                E-mail enviado!
                            </h2>
                            <p className={`mb-8 ${
                                isDark ? "text-white/80" : "text-gray-600"
                            }`}>
                                Se o e-mail <strong>{email}</strong> existir em nossa base de dados,
                                você receberá um link para redefinir sua senha em alguns minutos.
                            </p>
                            <p className={`text-sm mb-8 ${
                                isDark ? "text-white/70" : "text-gray-500"
                            }`}>
                                Verifique sua caixa de entrada e também a pasta de spam.
                            </p>
                            <Button
                                onClick={handleBackToLogin}
                                className={`w-[85%] h-10 mx-auto text-white font-bold border-none rounded cursor-pointer transition-all duration-200 ${
                                    isDark 
                                        ? "bg-[#573b8a] hover:bg-[#6d44b8]" 
                                        : "bg-[#573b8a] hover:bg-[#6d44b8]"
                                }`}
                            >
                                Voltar para o login
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            data-auth-page="forgot-password"
            className={`min-h-screen w-full flex flex-col lg:flex-row fixed inset-0 z-50 transition-all duration-500 ${
                isDark 
                    ? "bg-[#240046]" 
                    : "bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"
            }`}
        >
            {/* Lado esquerdo (roxo) */}
            <div className={`text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 ${
                isDark 
                    ? "bg-[#240046]" 
                    : "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600"
            }`}>
                <div className="max-w-md flex flex-col items-center text-center">
                    <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col">
                        <img src={LOGO} alt="Logo" className="w-[300px] max-w-full h-auto" />
                        <p className="text-lg md:text-xl text-white/80">APRENDIZAGEM E RESULTADO</p>
                    </div>
                </div>
            </div>

            {/* Lado direito (branco) */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    <div className={`relative flex flex-col ${
                        isDark 
                            ? "bg-[#240046] shadow-[7px_7px_10px_3px_rgba(36,0,70,0.16)]" 
                            : "bg-white/90 backdrop-blur-md shadow-xl"
                    } rounded-xl max-h-[420px] overflow-hidden`}>
                        <div className="flex flex-col gap-3.5 p-6">
                            <div className="mb-2">
                                <Button
                                    variant="ghost"
                                    onClick={handleBackToLogin}
                                    className={`p-0 h-auto ${
                                        isDark 
                                            ? "text-white/80 hover:text-white" 
                                            : "text-gray-600 hover:text-gray-800"
                                    }`}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Voltar para o login
                                </Button>
                            </div>

                            <h2 className={`text-2xl md:text-3xl font-bold mb-1 flex justify-center ${
                                isDark ? "text-white" : "text-gray-800"
                            }`}>
                                Esqueceu sua senha?
                            </h2>
                            <p className={`mb-6 text-center ${
                                isDark ? "text-white/80" : "text-gray-600"
                            }`}>
                                Digite seu e-mail e enviaremos um link para você redefinir sua senha.
                            </p>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Mail className={`h-5 w-5 ${isDark ? "text-gray-300" : "text-gray-400"}`} />
                                    </div>
                                    <Input
                                        type="email"
                                        placeholder="Seu e-mail"
                                        className={`pl-10 h-10 bg-[#e0dede] border-none outline-none rounded ${
                                            isDark ? "bg-gray-700 text-white placeholder:text-gray-400" : "bg-[#e0dede] text-gray-900"
                                        }`}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className={`w-[85%] h-10 mx-auto mt-3 mb-2.5 text-white font-bold border-none rounded cursor-pointer transition-all duration-200 ${
                                        isDark 
                                            ? "bg-[#573b8a] hover:bg-[#6d44b8]" 
                                            : "bg-[#573b8a] hover:bg-[#6d44b8]"
                                    }`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        "Enviar link de redefinição"
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>

                    <div className={`mt-8 text-center text-sm ${
                        isDark ? "text-white/80" : "text-gray-500"
                    }`}>
                        © {new Date().getFullYear()} Afirme Play - JESUS CRISTO É O SENHOR
                    </div>
                </div>
            </div>
        </div>
    );
} 