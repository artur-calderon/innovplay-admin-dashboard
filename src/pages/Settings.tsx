import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings as SettingsIcon, Moon, Sun, Type, ZoomIn, Info } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "react-toastify";
import { useState } from "react";

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

export default function Settings() {
  const { settings, updateTheme, updateFontFamily, updateFontSize, resetToDefaults, persistSettings, isLoading } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

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
      toast.success("Configurações salvas com sucesso");
    } catch (error: any) {
      const backendMessage = error?.response?.data?.erro || error?.message || "Não foi possível salvar as configurações";
      toast.error(backendMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Converter fontSize string para número para o slider
  const fontSizeValue = settings.fontSize ?? "100%";
  const fontSizeNumber = parseInt(fontSizeValue.replace("%", "")) || 100;

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-1">
            Personalize a aparência e preferências do sistema
          </p>
        </div>

        {/* Aviso de desenvolvimento */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Em fase de desenvolvimento</AlertTitle>
          <AlertDescription>
            Esta funcionalidade está em fase de desenvolvimento. Algumas configurações podem não estar completamente funcionais.
          </AlertDescription>
        </Alert>

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

