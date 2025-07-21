import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

import LOGO from "/LOGO-1.png";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

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
        } catch (error: any) {
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
            <div className="min-h-screen flex flex-col lg:flex-row">
                {/* Lado esquerdo (roxo) */}
                <div className="bg-[#8257e5] text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="max-w-md flex flex-col items-center text-center">
                        <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col">
                            <img src={LOGO} alt="Logo" className="w-[300rem]" />
                            <p className="text-lg md:text-xl text-white/80">APRENDIZAGEM E RESULTADO</p>
                        </div>
                    </div>
                </div>

                {/* Lado direito (branco) */}
                <div className="bg-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                    <div className="w-full max-w-md text-center">
                        <div className="mb-6 flex justify-center">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                            E-mail enviado!
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Se o e-mail <strong>{email}</strong> existir em nossa base de dados,
                            você receberá um link para redefinir sua senha em alguns minutos.
                        </p>
                        <p className="text-sm text-gray-500 mb-8">
                            Verifique sua caixa de entrada e também a pasta de spam.
                        </p>
                        <Button
                            onClick={handleBackToLogin}
                            className="w-full py-6 bg-[#8257e5] hover:bg-[#6d48c2]"
                        >
                            Voltar para o login
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Lado esquerdo (roxo) */}
            <div className="bg-[#8257e5] text-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                <div className="max-w-md flex flex-col items-center text-center">
                    <div className="mb-8 w-32 h-32 md:w-full md:h-full flex items-center justify-center flex-col">
                        <img src={LOGO} alt="Logo" className="w-[300rem]" />
                        <p className="text-lg md:text-xl text-white/80">APRENDIZAGEM E RESULTADO</p>
                    </div>
                </div>
            </div>

            {/* Lado direito (branco) */}
            <div className="bg-white w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    <div className="mb-6">
                        <Button
                            variant="ghost"
                            onClick={handleBackToLogin}
                            className="p-0 h-auto text-gray-600 hover:text-gray-800"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar para o login
                        </Button>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                        Esqueceu sua senha?
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Digite seu e-mail e enviaremos um link para você redefinir sua senha.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                type="email"
                                placeholder="Seu e-mail"
                                className="pl-10"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-6 bg-[#8257e5] hover:bg-[#6d48c2]"
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

                    <div className="mt-12 text-center text-sm text-gray-500">
                        © 2025 Innov Play ❤️
                    </div>
                </div>
            </div>
        </div>
    );
} 