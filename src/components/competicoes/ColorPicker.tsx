import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

// Paleta de cores organizada por categoria
const colorPalette = {
  'Azuis': [
    { hex: '#3B82F6', name: 'Azul' },
    { hex: '#0EA5E9', name: 'Azul Céu' },
    { hex: '#06B6D4', name: 'Ciano' },
    { hex: '#1E40AF', name: 'Azul Escuro' },
    { hex: '#6366F1', name: 'Índigo' },
  ],
  'Verdes': [
    { hex: '#22C55E', name: 'Verde' },
    { hex: '#10B981', name: 'Esmeralda' },
    { hex: '#14B8A6', name: 'Teal' },
    { hex: '#84CC16', name: 'Lima' },
    { hex: '#16A34A', name: 'Verde Escuro' },
  ],
  'Quentes': [
    { hex: '#EF4444', name: 'Vermelho' },
    { hex: '#F97316', name: 'Laranja' },
    { hex: '#F59E0B', name: 'Âmbar' },
    { hex: '#EAB308', name: 'Amarelo' },
    { hex: '#EC4899', name: 'Rosa' },
  ],
  'Roxos': [
    { hex: '#8B5CF6', name: 'Violeta' },
    { hex: '#A855F7', name: 'Roxo' },
    { hex: '#D946EF', name: 'Fúcsia' },
    { hex: '#7C3AED', name: 'Violeta Escuro' },
    { hex: '#C026D3', name: 'Magenta' },
  ],
  'Neutros': [
    { hex: '#64748B', name: 'Cinza' },
    { hex: '#475569', name: 'Cinza Escuro' },
    { hex: '#78716C', name: 'Pedra' },
    { hex: '#0F172A', name: 'Slate Escuro' },
    { hex: '#1F2937', name: 'Grafite' },
  ],
};

// Converter HEX para HSL
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 210, s: 100, l: 50 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

// Converter HSL para HEX
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [hsl, setHsl] = useState(hexToHsl(value));

  // Sincronizar quando o valor externo muda
  useEffect(() => {
    setHexInput(value);
    setHsl(hexToHsl(value));
  }, [value]);

  const handleSelect = (color: string) => {
    onChange(color);
    setHexInput(color);
    setHsl(hexToHsl(color));
  };

  const handleHexChange = (newHex: string) => {
    setHexInput(newHex);
    // Validar formato hex
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      onChange(newHex.toUpperCase());
      setHsl(hexToHsl(newHex));
    }
  };

  const handleHueChange = (newHue: number[]) => {
    const newH = newHue[0];
    setHsl(prev => ({ ...prev, h: newH }));
    const newHex = hslToHex(newH, hsl.s, hsl.l);
    setHexInput(newHex);
    onChange(newHex);
  };

  const handleSaturationChange = (newSat: number[]) => {
    const newS = newSat[0];
    setHsl(prev => ({ ...prev, s: newS }));
    const newHex = hslToHex(hsl.h, newS, hsl.l);
    setHexInput(newHex);
    onChange(newHex);
  };

  const handleLightnessChange = (newLight: number[]) => {
    const newL = newLight[0];
    setHsl(prev => ({ ...prev, l: newL }));
    const newHex = hslToHex(hsl.h, hsl.s, newL);
    setHexInput(newHex);
    onChange(newHex);
  };

  // Gerar gradiente para a barra de matiz
  const hueGradient = 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
  
  // Gerar gradiente para saturação
  const satGradient = `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))`;
  
  // Gerar gradiente para luminosidade
  const lightGradient = `linear-gradient(to right, hsl(${hsl.h}, ${hsl.s}%, 0%), hsl(${hsl.h}, ${hsl.s}%, 50%), hsl(${hsl.h}, ${hsl.s}%, 100%))`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full h-14 justify-start gap-3"
      >
        <div 
          className="w-10 h-10 rounded-lg border-2 border-white shadow-md"
          style={{ backgroundColor: value }}
        />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">Cor selecionada</span>
          <span className="text-xs text-muted-foreground font-mono">{value}</span>
        </div>
        <Palette className="w-4 h-4 ml-auto text-muted-foreground" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Escolher Cor
            </DialogTitle>
            <DialogDescription>
              Selecione uma cor para a competição
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Input de código HEX e preview */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="hex-input">Código HEX</Label>
                <Input
                  id="hex-input"
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#3B82F6"
                  className="font-mono text-lg"
                  maxLength={7}
                />
              </div>
              <div 
                className="w-14 h-10 rounded-lg border-2 border-muted shadow-inner"
                style={{ backgroundColor: value }}
              />
            </div>

            {/* Barras de seleção */}
            <div className="space-y-4">
              {/* Barra de Matiz (Hue) */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Matiz</Label>
                <div className="relative">
                  <div 
                    className="h-4 rounded-full"
                    style={{ background: hueGradient }}
                  />
                  <Slider
                    value={[hsl.h]}
                    onValueChange={handleHueChange}
                    max={360}
                    step={1}
                    className="absolute inset-0 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md"
                  />
                </div>
              </div>

              {/* Barra de Saturação */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Saturação</Label>
                <div className="relative">
                  <div 
                    className="h-4 rounded-full"
                    style={{ background: satGradient }}
                  />
                  <Slider
                    value={[hsl.s]}
                    onValueChange={handleSaturationChange}
                    max={100}
                    step={1}
                    className="absolute inset-0 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md"
                  />
                </div>
              </div>

              {/* Barra de Luminosidade */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Luminosidade</Label>
                <div className="relative">
                  <div 
                    className="h-4 rounded-full"
                    style={{ background: lightGradient }}
                  />
                  <Slider
                    value={[hsl.l]}
                    onValueChange={handleLightnessChange}
                    max={100}
                    step={1}
                    className="absolute inset-0 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-md"
                  />
                </div>
              </div>
            </div>

            {/* Paleta de cores rápidas */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Cores Rápidas</Label>
              <div className="grid grid-cols-5 gap-2">
                {Object.values(colorPalette).flat().slice(0, 15).map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => handleSelect(color.hex)}
                    className={cn(
                      "w-full aspect-square rounded-lg border-2 transition-all duration-200",
                      "hover:scale-105 hover:shadow-lg focus:outline-none",
                      value.toUpperCase() === color.hex.toUpperCase()
                        ? "border-white ring-2 ring-offset-2 ring-blue-500 scale-105" 
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {value.toUpperCase() === color.hex.toUpperCase() && (
                      <Check className="w-4 h-4 text-white mx-auto drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg text-xl"
              style={{ backgroundColor: value }}
            >
              🏆
            </div>
            <div>
              <p className="text-sm font-medium">Preview</p>
              <p className="text-xs text-muted-foreground font-mono">{value}</p>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="ml-auto"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ColorPicker;

