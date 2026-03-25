import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Moon, Sun, Type, ZoomIn, Palette } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { useStudentPreferences } from "@/context/StudentPreferencesContext";
import { storeApi } from "@/services/store/storeService";
import type { StudentPurchase } from "@/types/store";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getNonStudentSidebarThemeFromStorage,
  setNonStudentSidebarThemeInStorage,
} from "@/constants/sidebarThemes";
import type { SidebarThemeId } from "@/constants/sidebarThemes";

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
];

const FONT_SIZE_OPTIONS = [
  { value: 90, label: "90%", display: "Muito Pequeno" },
  { value: 95, label: "95%", display: "Pequeno" },
  { value: 100, label: "100%", display: "Padrão" },
  { value: 110, label: "110%", display: "Grande" },
  { value: 120, label: "120%", display: "Muito Grande" },
  { value: 130, label: "130%", display: "Extra Grande" },
];

const SIDEBAR_THEME_LABELS: Record<string, string> = {
  blue: "Tema azul",
  green: "Tema verde",
  violet: "Tema violeta",
  amber: "Tema âmbar",
  rose: "Tema rosa",
  dark: "Tema escuro",
  cyan: "Tema ciano",
  indigo: "Tema índigo",
  emerald: "Tema esmeralda",
  orange: "Tema laranja",
  fuchsia: "Tema fúcsia",
  teal: "Tema teal",
};

/** Cor de prévia para cada tema (mesma cor predominante do tema) */
const SIDEBAR_THEME_PREVIEW_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  violet: "#7c3aed",
  amber: "#d97706",
  rose: "#f43f5e",
  dark: "#64748b",
  cyan: "#06b6d4",
  indigo: "#6366f1",
  emerald: "#10b981",
  orange: "#ea580c",
  fuchsia: "#c026d3",
  teal: "#14b8a6",
  __padrao__: "#7c3aed",
};

function ThemeOption({ themeId, label }: { themeId: string; label: string }) {
  const color = SIDEBAR_THEME_PREVIEW_COLORS[themeId] ?? SIDEBAR_THEME_PREVIEW_COLORS.__padrao__;
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-border shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

export default function Settings() {
  const { settings, updateTheme, updateFontFamily, updateFontSize, resetToDefaults, persistSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const studentPrefs = useStudentPreferences();
  const [sidebarPurchases, setSidebarPurchases] = useState<StudentPurchase[]>([]);
  const [sidebarThemesLoading, setSidebarThemesLoading] = useState(false);
  const [nonStudentThemeId, setNonStudentThemeId] = useState<SidebarThemeId>(null);

  const isStudent = user?.role === "aluno";
  const selectedSidebarThemeId = isStudent
    ? (studentPrefs?.preferences?.sidebar_theme_id ?? null)
    : nonStudentThemeId;

  useEffect(() => {
    if (!isStudent) setNonStudentThemeId(getNonStudentSidebarThemeFromStorage());
  }, [isStudent]);

  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;
    setSidebarThemesLoading(true);
    storeApi
      .getMyPurchases({ limit: 100, offset: 0 })
      .then(({ data }) => {
        if (!cancelled) {
          const list = data?.purchases ?? [];
          const themes = list.filter(
            (p) => String(p.reward_type ?? "").trim().toLowerCase() === "sidebar_theme"
          );
          setSidebarPurchases(themes);
        }
      })
      .catch(() => {
        if (!cancelled) setSidebarPurchases([]);
      })
      .finally(() => {
        if (!cancelled) setSidebarThemesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isStudent]);

  const handleThemeToggle = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";
    updateTheme(newTheme);
    toast.success(`Tema alterado para ${newTheme === "dark" ? "escuro" : "claro"}`);
  };

  const handleFontFamilyChange = (value: string) => {
    updateFontFamily(value);
    toast.success(`Fonte alterada para ${value}`);
  };

  const handleFontSizeChange = (values: number[]) => {
    const fontSize = `${values[0]}%`;
    updateFontSize(fontSize);
  };

  const handleReset = () => {
    resetToDefaults();
    toast.success("Configurações restauradas para os valores padrão");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await persistSettings();
      toast.success("Configurações salvas e confirmadas no servidor");
    } catch (error: any) {
      const backendMessage = error?.response?.data?.erro || error?.message || "Não foi possível salvar as configurações";
      toast.error(backendMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Converter fontSize para string (API pode devolver número ex.: 110) e depois para número do slider
  const rawFontSize = settings?.fontSize;
  const fontSizeValue =
    rawFontSize != null
      ? typeof rawFontSize === "number"
        ? `${rawFontSize}%`
        : String(rawFontSize)
      : "100%";
  const fontSizeNumber = parseInt(String(fontSizeValue).replace(/%/g, ""), 10) || 100;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
            <SettingsIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            Configurações
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Personalize a aparência e preferências do sistema
          </p>
        </div>

        {/* Seção: Aparência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Configure o tema, fonte e tamanho de texto do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tema Escuro */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme-toggle" className="text-base font-medium flex items-center gap-2">
                  {settings.theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Tema Escuro
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ative o modo escuro para reduzir o cansaço visual
                </p>
              </div>
              <Switch
                id="theme-toggle"
                checked={settings.theme === "dark"}
                onCheckedChange={handleThemeToggle}
                aria-label="Alternar tema escuro"
              />
            </div>

            <Separator />

            {/* Seleção de Fonte */}
            <div className="space-y-2">
              <Label htmlFor="font-family" className="text-base font-medium flex items-center gap-2">
                <Type className="h-4 w-4" />
                Fonte do Sistema
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Escolha a fonte que será aplicada em todo o sistema
              </p>
              <Select value={settings.fontFamily} onValueChange={handleFontFamilyChange}>
                <SelectTrigger id="font-family" className="w-full md:w-[300px]">
                  <SelectValue placeholder="Selecione uma fonte" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Fonte atual: <span style={{ fontFamily: settings.fontFamily }}>{settings.fontFamily}</span>
              </p>
            </div>

            <Separator />

            {/* Tamanho de Fonte */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="font-size" className="text-base font-medium flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Tamanho da Fonte
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ajuste o tamanho base da fonte do sistema
                </p>
              </div>
              
              <div className="space-y-3">
                <Slider
                  id="font-size"
                  value={[fontSizeNumber]}
                  onValueChange={handleFontSizeChange}
                  min={90}
                  max={130}
                  step={5}
                  className="w-full"
                  aria-label="Tamanho da fonte"
                />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">90%</span>
                  <div className="text-center">
                    <span className="font-medium">{fontSizeValue}</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {FONT_SIZE_OPTIONS.find((opt) => opt.value === fontSizeNumber)?.display || "Personalizado"}
                    </p>
                  </div>
                  <span className="text-muted-foreground">130%</span>
                </div>

                {/* Preview */}
                <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <p style={{ fontSize: fontSizeValue }}>
                    Esta é uma amostra de texto com o tamanho selecionado. O tamanho será aplicado em todo o sistema.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tema do menu lateral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Tema do menu lateral
            </CardTitle>
            <CardDescription>
              {isStudent
                ? "Escolha a cor do menu lateral. Só aparecem temas que você comprou na loja."
                : "Escolha a cor do menu lateral e das páginas. Todos os temas estão disponíveis."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isStudent && sidebarThemesLoading ? (
              <Skeleton className="h-10 w-full max-w-[300px] rounded-md" />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="sidebar-theme" className="text-base font-medium">
                  Tema atual
                </Label>
                <Select
                  value={selectedSidebarThemeId ?? "__padrao__"}
                  onValueChange={(value) => {
                    const themeId = (value === "__padrao__" ? null : value) as SidebarThemeId;
                    if (isStudent) {
                      studentPrefs?.setPreferences({ sidebar_theme_id: themeId });
                      toast.success(themeId ? "Tema do menu atualizado" : "Tema do menu restaurado ao padrão");
                    } else {
                      setNonStudentSidebarThemeInStorage(themeId);
                      setNonStudentThemeId(themeId);
                      toast.success(themeId ? "Tema aplicado" : "Tema restaurado ao padrão");
                    }
                  }}
                >
                  <SelectTrigger id="sidebar-theme" className="w-full md:w-[300px]">
                    <SelectValue placeholder="Selecione o tema">
                      <ThemeOption
                        themeId={selectedSidebarThemeId ?? "__padrao__"}
                        label={selectedSidebarThemeId ? SIDEBAR_THEME_LABELS[selectedSidebarThemeId] ?? selectedSidebarThemeId : "Padrão (cor original do menu)"}
                      />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__padrao__">
                      <ThemeOption themeId="__padrao__" label="Padrão (cor original do menu)" />
                    </SelectItem>
                    {isStudent
                      ? (() => {
                          const themeEntries = sidebarPurchases
                            .map((p) => {
                              const id = (p.reward_data ?? p.store_item_id ?? "").trim() || null;
                              if (!id) return null;
                              const label = p.item_name?.trim() || SIDEBAR_THEME_LABELS[id] || id;
                              return [id, label] as const;
                            })
                            .filter((e): e is [string, string] => e != null);
                          const byId = new Map(themeEntries);
                          if (selectedSidebarThemeId && !byId.has(selectedSidebarThemeId)) {
                            byId.set(
                              selectedSidebarThemeId,
                              SIDEBAR_THEME_LABELS[selectedSidebarThemeId] ?? selectedSidebarThemeId
                            );
                          }
                          return Array.from(byId.entries()).map(([id, label]) => (
                            <SelectItem key={id} value={id}>
                              <ThemeOption themeId={id} label={label} />
                            </SelectItem>
                          ));
                        })()
                      : (Object.entries(SIDEBAR_THEME_LABELS) as [string, string][]).map(([id, label]) => (
                          <SelectItem key={id} value={id}>
                            <ThemeOption themeId={id} label={label} />
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                {isStudent && sidebarPurchases.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Você ainda não comprou temas na loja. Compre na Loja para desbloquear novas cores.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão de Reset */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Restaurar Padrões</h3>
                <p className="text-sm text-muted-foreground">
                  Restaura todas as configurações para os valores padrão do sistema
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                aria-label="Restaurar configurações padrão"
              >
                Restaurar Padrões
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Salvar Configurações</h3>
                <p className="text-sm text-muted-foreground">
                  Aplica as configurações atuais para o seu usuário no servidor
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                aria-label="Salvar configurações do usuário"
              >
                {isSaving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

