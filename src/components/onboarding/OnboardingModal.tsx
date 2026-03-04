import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, type User } from "@/context/authContext";
import { useSettings, loadAndApplySettings, saveSettings } from "@/hooks/useSettings";
import { useAvatarConfig } from "@/hooks/useAvatarConfig";
import { AvatarPreview } from "@/components/profile/AvatarPreview";
import { AvatarCustomizer } from "@/components/profile/AvatarCustomizer";
import { submitOnboarding, type OnboardingProfile } from "@/services/onboardingApi";
import {
  Sun,
  Moon,
  Type,
  User,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Shield,
  Heart,
  Trophy,
  Target,
  Star,
  Zap,
  Brain,
} from "lucide-react";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
];

const PREDEFINED_TRAITS = [
  { id: "organizado", label: "Organizado", icon: Shield, color: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300" },
  { id: "dedicado", label: "Dedicado", icon: Heart, color: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" },
  { id: "focado", label: "Focado", icon: Trophy, color: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300" },
  { id: "proativo", label: "Proativo", icon: Target, color: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300" },
  { id: "criativo", label: "Criativo", icon: Star, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300" },
  { id: "energico", label: "Energético", icon: Zap, color: "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300" },
  { id: "analitico", label: "Analítico", icon: Brain, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300" },
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
  "Reino Unido", "Japão", "China", "Índia", "Austrália", "Outro",
];

const STEPS = [
  { id: 0, title: "Aparência", icon: Sun, description: "Tema e fonte" },
  { id: 1, title: "Avatar", icon: User, description: "Ícone do perfil" },
  { id: 2, title: "Dados pessoais", icon: Sparkles, description: "Informações do perfil" },
];

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  profile?: OnboardingProfile | null;
}

export function OnboardingModal({ open, onComplete, profile }: OnboardingModalProps) {
  const { user, setOnboardingComplete, updateAvatarConfig } = useAuth();
  const { settings, updateTheme, updateFontFamily, persistSettings } = useSettings();
  const { config, updateConfig } = useAvatarConfig();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    gender: "",
    nationality: "",
    phone: "",
    address: "",
    traits: [] as string[],
  });

  // Pré-preenche com profile da API ou com user
  useEffect(() => {
    if (!open) return;
    const source = profile ?? user;
    const ac = profile?.avatar_config;
    setFormData((prev) => ({
      ...prev,
      name: (source?.name ?? prev.name) || "",
      birth_date: (source?.birth_date?.toString?.()?.split?.("T")[0] ?? source?.birth_date ?? prev.birth_date) || "",
      gender: (source?.gender ?? prev.gender) || "",
      nationality: (source?.nationality ?? prev.nationality) || "",
      phone: (source?.phone ?? prev.phone) || "",
      address: (source?.address ?? prev.address) || "",
      traits: Array.isArray(source?.traits) ? source.traits : (user?.traits ?? prev.traits),
    }));
    if (ac) {
      if (ac.theme && ac.theme !== "system") updateTheme(ac.theme);
      if (ac.font) updateFontFamily(ac.font);
      if (ac.icon !== undefined) updateConfig({ seed: String(ac.icon) });
    }
  }, [open, profile, user?.id, user?.name, user?.birth_date, user?.gender, user?.nationality, user?.phone, user?.address, user?.traits]);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const toggleTrait = useCallback((traitId: string) => {
    setFormData((prev) => ({
      ...prev,
      traits: prev.traits.includes(traitId)
        ? prev.traits.filter((t) => t !== traitId)
        : [...prev.traits, traitId],
    }));
  }, []);

  const handleFinish = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const theme = settings.theme === "dark" ? "dark" : "light";
      const icon = config.seed?.trim() || user.name || `user_${user.id}`;
      const body = {
        theme,
        font: settings.fontFamily,
        icon,
      };
      if (formData.name?.trim()) body.name = formData.name.trim();
      if (formData.birth_date) body.birth_date = formData.birth_date;
      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits) body.phone = phoneDigits;
      if (formData.gender) body.gender = formData.gender;
      if (formData.nationality) body.nationality = formData.nationality;
      if (formData.address?.trim()) body.address = formData.address.trim();
      if (formData.traits.length > 0) body.traits = formData.traits;

      const response = await submitOnboarding(body as Parameters<typeof submitOnboarding>[0]);
      const updatedUser = response.user as User;
      const userId = updatedUser?.id ?? user.id;
      if (updatedUser && userId) {
        const apiAvatar = updatedUser?.avatar_config as Record<string, unknown> | null | undefined;
        const seedFromApi = apiAvatar && (typeof apiAvatar.seed === "string" ? apiAvatar.seed : typeof apiAvatar.icon !== "undefined" ? String(apiAvatar.icon) : undefined);
        const mergedAvatarConfig = {
          ...(typeof apiAvatar === "object" && apiAvatar !== null ? apiAvatar : {}),
          ...config,
          seed: config.seed?.trim() || seedFromApi || updatedUser?.name || user?.name || `user_${user.id}`,
        };
        setOnboardingComplete({
          ...updatedUser,
          avatar_config: mergedAvatarConfig,
        });
        try {
          await updateAvatarConfig(mergedAvatarConfig);
        } catch (e) {
          console.warn("Erro ao persistir avatar_config no servidor:", e);
        }
        const settingsToSave = {
          theme: (body.theme ?? (settings.theme === "dark" ? "dark" : "light")) as "light" | "dark",
          fontFamily: body.font ?? settings.fontFamily,
          fontSize: settings.fontSize || "100%",
        };
        saveSettings(userId, settingsToSave);
        await loadAndApplySettings(userId);
        try {
          await persistSettings();
        } catch (e) {
          console.warn("Erro ao persistir tema/fonte no servidor (configurações):", e);
        }
      }
      toast.success(response.message || "Conta configurada! Bem-vindo ao sistema.");
      onComplete();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Erro ao salvar. Tente novamente.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [user, formData, config, settings.theme, settings.fontFamily, setOnboardingComplete, onComplete, updateAvatarConfig]);

  const progress = ((step + 1) / STEPS.length) * 100;
  const isLastStep = step === STEPS.length - 1;

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        className={cn(
          "max-w-lg sm:max-w-xl max-h-[95vh] overflow-y-auto",
          "border-2 border-[#7B3FE4]/30 dark:border-[#a78bfa]/30",
          "bg-gradient-to-b from-background to-[#f5f0ff]/30 dark:to-[#1e1b4b]/30",
          "shadow-2xl shadow-[#7B3FE4]/10 dark:shadow-[#7B3FE4]/20",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          "duration-300 ease-out"
        )}
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-desc"
        aria-modal="true"
        role="dialog"
      >
        <DialogHeader className="space-y-1 sm:space-y-2 text-center sm:text-left">
          <DialogTitle
            id="onboarding-title"
            className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#7B3FE4] to-[#a78bfa] bg-clip-text text-transparent"
          >
            Configure sua conta
          </DialogTitle>
          <DialogDescription id="onboarding-desc">
            Passo {step + 1} de {STEPS.length}: {STEPS[step].description}
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de progresso */}
        <div className="space-y-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da configuração">
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all duration-300",
                  step >= s.id
                    ? "bg-[#7B3FE4] dark:bg-[#a78bfa]"
                    : "bg-muted"
                )}
                aria-current={step === s.id ? "step" : undefined}
                aria-label={`Ir para passo ${s.id + 1}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Conteúdo do passo com animação */}
        <div
          key={step}
          className="min-h-[280px] sm:min-h-[320px] animate-in fade-in-50 slide-in-from-right-4 duration-300 fill-mode-both"
        >
          {/* Passo 0: Aparência */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Modo escuro</Label>
                <div className="flex items-center justify-between rounded-xl border bg-card p-4">
                  <span className="text-sm text-muted-foreground">Usar tema escuro</span>
                  <Switch
                    checked={settings.theme === "dark"}
                    onCheckedChange={(checked) => updateTheme(checked ? "dark" : "light")}
                    aria-label="Alternar modo escuro"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="onboarding-font" className="text-base font-medium">Fonte do sistema</Label>
                <Select
                  value={settings.fontFamily}
                  onValueChange={updateFontFamily}
                >
                  <SelectTrigger id="onboarding-font" className="w-full">
                    <Type className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Passo 1: Avatar */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-shrink-0">
                  <AvatarPreview
                    config={{
                      ...config,
                      seed: config.seed?.trim() || user?.name || "avatar",
                    }}
                    size={120}
                    className="rounded-2xl border-4 border-[#7B3FE4]/20 dark:border-[#a78bfa]/30"
                  />
                </div>
                <div className="flex-1 w-full space-y-3">
                  <Label htmlFor="onboarding-seed">Nome único do avatar (seed)</Label>
                  <Input
                    id="onboarding-seed"
                    value={config.seed || ""}
                    onChange={(e) => updateConfig({ seed: e.target.value })}
                    placeholder={user?.name || "Seu nome"}
                    className="border-[#7B3FE4]/30 focus:ring-[#7B3FE4]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-[#7B3FE4]/40 text-[#7B3FE4] hover:bg-[#7B3FE4]/10"
                    onClick={() =>
                      updateConfig({
                        seed: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                      })
                    }
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar aleatório
                  </Button>
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Personalize rosto, cabelo, acessórios e fundo. As alterações serão salvas ao concluir.
                </p>
                <AvatarCustomizer
                  config={config}
                  onConfigChange={updateConfig}
                  onSave={async () => {}}
                  isSaving={false}
                  hideSaveButton
                />
              </div>
            </div>
          )}

          {/* Passo 2: Dados pessoais */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-birth">Data de nascimento</Label>
                  <Input
                    id="ob-birth"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData((p) => ({ ...p, birth_date: e.target.value }))}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-gender">Gênero</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(v) => setFormData((p) => ({ ...p, gender: v }))}
                  >
                    <SelectTrigger id="ob-gender">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-nationality">Nacionalidade</Label>
                <Select
                  value={formData.nationality}
                  onValueChange={(v) => setFormData((p) => ({ ...p, nationality: v }))}
                >
                  <SelectTrigger id="ob-nationality">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-phone">Telefone</Label>
                <Input
                  id="ob-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-address">Endereço</Label>
                <Input
                  id="ob-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Rua, número, complemento"
                />
              </div>
              <div className="space-y-2">
                <Label>Características</Label>
                <p className="text-xs text-muted-foreground">Selecione as que combinam com você</p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_TRAITS.map((t) => {
                    const Icon = t.icon;
                    const selected = formData.traits.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTrait(t.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 min-h-[44px]",
                          selected
                            ? `${t.color} border-[#7B3FE4]/50 dark:border-[#a78bfa]/50`
                            : "bg-muted/50 border-transparent hover:border-[#7B3FE4]/30"
                        )}
                        aria-pressed={selected}
                      >
                        <Icon className="h-4 w-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-4 border-t">
          <div className="w-full sm:w-auto">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="w-full sm:w-auto border-[#7B3FE4]/40 text-[#7B3FE4] hover:bg-[#7B3FE4]/10"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            ) : (
              <span />
            )}
          </div>
          <div className="w-full sm:w-auto">
            {isLastStep ? (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="w-full sm:w-auto bg-gradient-to-r from-[#7B3FE4] to-[#a78bfa] hover:opacity-90 text-white min-h-[44px]"
                aria-label="Concluir e acessar o sistema"
              >
                {saving ? (
                  "Salvando..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Concluir e acessar
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto bg-gradient-to-r from-[#7B3FE4] to-[#a78bfa] hover:opacity-90 text-white min-h-[44px]"
                aria-label="Próximo passo"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
