import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface ChangePasswordFormProps {
    onSuccess?: () => void;
    compact?: boolean;
}

export const ChangePasswordForm = ({ onSuccess, compact = false }: ChangePasswordFormProps) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
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
                description: "A nova senha deve ter pelo menos 6 caracteres.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword === currentPassword) {
            toast({
                title: "Senha inválida",
                description: "A nova senha deve ser diferente da senha atual.",
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
            await api.post("/users/change-password", {
                current_password: currentPassword,
                new_password: newPassword
            });

            toast({
                title: "Senha alterada com sucesso!",
                description: "Sua senha foi alterada. Você receberá um e-mail de confirmação.",
            });

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            console.error("Erro ao alterar senha:", error);
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                "Não foi possível alterar sua senha. Verifique se a senha atual está correta.";

            toast({
                title: "Erro",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (compact) {
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Senha atual"
                        className="pl-10"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={isLoading}
                        required
                    />
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        disabled={isLoading}
                    >
                        {showCurrentPassword ? (
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
                        type={showNewPassword ? "text" : "password"}
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
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        disabled={isLoading}
                    >
                        {showNewPassword ? (
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

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Alterando...
                        </>
                    ) : (
                        "Alterar senha"
                    )}
                </Button>
            </form>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Alterar senha</CardTitle>
                <p className="text-gray-600">
                    Altere sua senha para manter sua conta segura.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Senha atual"
                            className="pl-10"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            disabled={isLoading}
                        >
                            {showCurrentPassword ? (
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
                            type={showNewPassword ? "text" : "password"}
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
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            disabled={isLoading}
                        >
                            {showNewPassword ? (
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
                                    <li>• Não use a mesma senha de outros serviços</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-6"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Alterando...
                            </>
                        ) : (
                            "Alterar senha"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

