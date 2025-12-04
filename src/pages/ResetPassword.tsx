import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

import LOGO from "/LOGO-1.png";

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
    const navigate = useNavigate();
    const { toast } = useToast();

    // Garantir que a página sempre use tema claro
    useEffect(() => {
        const rootElement = document.documentElement;
        rootElement.classList.remove('dark');
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (rootElement.classList.contains('dark')) {
                        rootElement.classList.remove('dark');
                    }
                }
            });
        });
        
        observer.observe(rootElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        return () => {
            observer.disconnect();
        };
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
            } catch (error: any) {
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
        } catch (error: any) {
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
            <div className="min-h-screen flex flex-col lg:flex-row">
                <div className="bg-[#8257e5] text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="max-w-md flex flex-col items-center text-center">
                        <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col">
                            <img src={LOGO} alt="Logo" className="w-[300px] max-w-full h-auto" />
                            <p className="text-lg md:text-xl text-white/80">APRENDIZAGEM E RESULTADO</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="w-full max-w-md text-center">
                        <Loader2 className="h-16 w-16 text-[#8257e5] animate-spin mx-auto mb-6" />
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                            Validando link...
                        </h2>
                        <p className="text-gray-600">
                            Aguarde enquanto validamos seu link de redefinição.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex flex-col lg:flex-row">
                <div className="bg-[#8257e5] text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="max-w-md flex flex-col items-center text-center">
                        <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col">
                            <img src={LOGO} alt="Logo" className="w-[300px] max-w-full h-auto" />
                            <p className="text-lg md:text-xl text-white/80">APRENDIZAGEM E RESULTADO</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="w-full max-w-md text-center">
                        <div className="mb-6 flex justify-center">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                            Senha redefinida!
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Sua senha foi alterada com sucesso. Você pode fazer login com sua nova senha.
                        </p>
                        <Button
                            onClick={handleBackToLogin}
                            className="w-full py-6 bg-[#8257e5] hover:bg-[#6d48c2]"
                        >
                            Ir para o login
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            <div className="bg-[#8257e5] text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                <div className="max-w-md flex flex-col items-center text-center">
                    <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col">
                        <img src={LOGO} alt="Logo" className="w-[300rem]" />
                        <p className="text-lg md:text-xl text-white/80">APRENDIZAGEM E RESULTADO</p>
                    </div>
                </div>
            </div>

            <div className="bg-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                        Redefinir senha
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Digite sua nova senha para a conta <strong>{tokenData?.email}</strong>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nova senha"
                                className="pl-10"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isLoading}
                                minLength={6}
                                required
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

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirmar nova senha"
                                className="pl-10"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                minLength={6}
                                required
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isLoading}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-5 w-5 text-gray-400" />
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-400" />
                                )}
                            </button>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div className="text-sm text-blue-800">
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
                            className="w-full py-6 bg-[#8257e5] hover:bg-[#6d48c2]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Redefinindo...
                                </>
                            ) : (
                                "Redefinir senha"
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <Button
                            variant="ghost"
                            onClick={handleBackToLogin}
                            className="text-gray-600 hover:text-gray-800"
                        >
                            Voltar para o login
                        </Button>
                    </div>

                    <div className="mt-12 text-center text-sm text-gray-500">
                        © 2025 Afirme Play ❤️
                    </div>
                </div>
            </div>
        </div>
    );
} 