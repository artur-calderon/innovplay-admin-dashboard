import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Save, Shield, Heart, Trophy, Target, Star, Zap, Brain } from "lucide-react";
import { toast } from "react-toastify";

const PREDEFINED_TRAITS = [
    { id: "organizado", label: "Organizado", icon: Shield, color: "bg-blue-100 text-blue-800" },
    { id: "dedicado", label: "Dedicado", icon: Heart, color: "bg-green-100 text-green-800" },
    { id: "focado", label: "Focado", icon: Trophy, color: "bg-purple-100 text-purple-800" },
    { id: "proativo", label: "Proativo", icon: Target, color: "bg-orange-100 text-orange-800" },
    { id: "criativo", label: "Criativo", icon: Star, color: "bg-yellow-100 text-yellow-800" },
    { id: "energico", label: "Energético", icon: Zap, color: "bg-pink-100 text-pink-800" },
    { id: "analitico", label: "Analítico", icon: Brain, color: "bg-indigo-100 text-indigo-800" },
];

const GENDERS = [
    { value: "masculino", label: "Masculino" },
    { value: "feminino", label: "Feminino" },
    { value: "outro", label: "Outro" },
    { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

const COUNTRIES = [
    "Brasil", "Argentina", "Chile", "Colômbia", "Espanha", "Portugal", 
    "Estados Unidos", "Canadá", "México", "França", "Itália", "Alemanha",
    "Reino Unido", "Japão", "China", "Índia", "Austrália", "Outro"
];

export const PersonalDataForm = () => {
    const { user, setUser } = useAuth();
    const { toast: toastHook } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        birth_date: user?.birth_date || '',
        nationality: user?.nationality || '',
        phone: user?.phone || '',
        gender: user?.gender || '',
        address: user?.address || '',
        traits: [] as string[],
    });

    useEffect(() => {
        // Carregar características do usuário se existirem
        const loadUserTraits = async () => {
            try {
                const response = await api.get(`/users/${user.id}`);
                if (response.data) {
                    const userData = response.data.user ?? response.data;
                    setFormData({
                        birth_date: userData.birth_date || '',
                        nationality: userData.nationality || '',
                        phone: userData.phone || '',
                        gender: userData.gender || '',
                        address: userData.address || '',
                        traits: userData.traits || userData.characteristics || [],
                    });
                } else {
                    // Usar dados do contexto se não conseguir carregar
                    setFormData({
                        birth_date: user?.birth_date || '',
                        nationality: user?.nationality || '',
                        phone: user?.phone || '',
                        gender: user?.gender || '',
                        address: user?.address || '',
                        traits: [],
                    });
                }
            } catch (error) {
                // Se não conseguir carregar, usar dados do contexto
                setFormData({
                    birth_date: user?.birth_date || '',
                    nationality: user?.nationality || '',
                    phone: user?.phone || '',
                    gender: user?.gender || '',
                    address: user?.address || '',
                    traits: [],
                });
            }
        };

        if (user?.id) {
            loadUserTraits();
        } else {
            // Fallback para dados do contexto
            setFormData({
                birth_date: user?.birth_date || '',
                nationality: user?.nationality || '',
                phone: user?.phone || '',
                gender: user?.gender || '',
                address: user?.address || '',
                traits: [],
            });
        }
    }, [user?.id, user?.birth_date, user?.nationality, user?.phone, user?.gender, user?.address]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const toggleTrait = (traitId: string) => {
        setFormData(prev => ({
            ...prev,
            traits: prev.traits.includes(traitId)
                ? prev.traits.filter(t => t !== traitId)
                : [...prev.traits, traitId]
        }));
    };

    const formatPhone = (value: string) => {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');
        
        // Formata como (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
        } else {
            return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
        }
    };

    const handlePhoneChange = (value: string) => {
        const formatted = formatPhone(value);
        handleInputChange('phone', formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const dataToSend = {
                birth_date: formData.birth_date || null,
                nationality: formData.nationality || null,
                phone: formData.phone.replace(/\D/g, '') || null,
                gender: formData.gender || null,
                address: formData.address || null,
                traits: formData.traits.length > 0 ? formData.traits : null,
            };

            const response = await api.put(`/users/${user.id}`, dataToSend);

            if (response.data) {
                const updatedUser = response.data.user ?? response.data;
                setUser({
                    ...user,
                    ...updatedUser,
                });
                
                // Atualizar formData com os dados retornados
                setFormData({
                    birth_date: updatedUser.birth_date || '',
                    nationality: updatedUser.nationality || '',
                    phone: updatedUser.phone || '',
                    gender: updatedUser.gender || '',
                    address: updatedUser.address || '',
                    traits: updatedUser.traits || updatedUser.characteristics || [],
                });
                
                toast.success('Dados pessoais atualizados com sucesso!');
                toastHook({
                    title: "Sucesso",
                    description: "Seus dados pessoais foram atualizados com sucesso.",
                });
            }
        } catch (error: any) {
            console.error('Erro ao atualizar dados pessoais:', error);
            const errorMessage = error.response?.data?.erro || 
                                 error.response?.data?.error || 
                                 'Erro ao atualizar dados pessoais';
            toast.error(errorMessage);
            toastHook({
                title: "Erro",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Dados Pessoais</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Atualize suas informações pessoais. Campos marcados com * são obrigatórios.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="birth_date">Data de Nascimento</Label>
                            <Input
                                id="birth_date"
                                type="date"
                                value={formData.birth_date ? formData.birth_date.split('T')[0] : ''}
                                onChange={(e) => handleInputChange('birth_date', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gender">Gênero</Label>
                            <Select
                                value={formData.gender || ''}
                                onValueChange={(value) => handleInputChange('gender', value)}
                            >
                                <SelectTrigger id="gender">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GENDERS.map((gender) => (
                                        <SelectItem key={gender.value} value={gender.value}>
                                            {gender.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nationality">Nacionalidade</Label>
                            <Select
                                value={formData.nationality || ''}
                                onValueChange={(value) => handleInputChange('nationality', value)}
                            >
                                <SelectTrigger id="nationality">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COUNTRIES.map((country) => (
                                        <SelectItem key={country} value={country}>
                                            {country}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address">Endereço</Label>
                            <Input
                                id="address"
                                type="text"
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                placeholder="Rua, número, complemento"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Características</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                            Selecione as características que melhor descrevem você (pode selecionar múltiplas).
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {PREDEFINED_TRAITS.map((trait) => {
                                const Icon = trait.icon;
                                const isSelected = formData.traits.includes(trait.id);
                                return (
                                    <button
                                        key={trait.id}
                                        type="button"
                                        onClick={() => toggleTrait(trait.id)}
                                        className={`flex items-center gap-1 px-3 py-2 rounded-md border transition-all ${
                                            isSelected
                                                ? `${trait.color} border-current`
                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon className="h-3 w-3" />
                                        <span className="text-sm font-medium">{trait.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {formData.traits.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Nenhuma característica selecionada
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                                try {
                                    const response = await api.get(`/users/${user.id}`);
                            if (response.data) {
                                const userData = response.data.user ?? response.data;
                                        setFormData({
                                            birth_date: userData.birth_date || '',
                                            nationality: userData.nationality || '',
                                            phone: userData.phone || '',
                                            gender: userData.gender || '',
                                        address: userData.address || '',
                                            traits: userData.traits || userData.characteristics || [],
                                        });
                                    }
                                } catch (error) {
                                    setFormData({
                                        birth_date: user?.birth_date || '',
                                        nationality: user?.nationality || '',
                                        phone: user?.phone || '',
                                        gender: user?.gender || '',
                                    address: user?.address || '',
                                        traits: [],
                                    });
                                }
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            <Save className="h-4 w-4 mr-2" />
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

