import React from 'react';
import {
  Sparkles,
  Star,
  Heart,
  Trophy,
  Medal,
  Gift,
  Package,
  Palette,
  Shield,
  Zap,
  Flame,
  Snowflake,
  Sun,
  Moon,
  Music,
  Camera,
  BookOpen,
  Gamepad2,
  Award,
  Target,
  Flag,
  Bell,
  Bookmark,
  Coffee,
  Compass,
  Crown,
  Gem,
  Key,
  Lightbulb,
  MapPin,
  Mic,
  Music2,
  PenTool,
  Pizza,
  Rocket,
  Smile,
  ThumbsUp,
  TreePine,
  Umbrella,
  GraduationCap,
  Laptop,
  Smartphone,
  Headphones,
  Film,
  Image,
  type LucideIcon,
} from 'lucide-react';

/** Mapa de nome do ícone para componente Lucide (para exibir na loja) */
export const STORE_ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Star,
  Heart,
  Trophy,
  Medal,
  Gift,
  Package,
  Palette,
  Shield,
  Zap,
  Flame,
  Snowflake,
  Sun,
  Moon,
  Music,
  Camera,
  BookOpen,
  Gamepad2,
  Award,
  Target,
  Flag,
  Bell,
  Bookmark,
  Coffee,
  Compass,
  Crown,
  Gem,
  Key,
  Lightbulb,
  MapPin,
  Mic,
  Music2,
  PenTool,
  Pizza,
  Rocket,
  Smile,
  ThumbsUp,
  TreePine,
  Umbrella,
  GraduationCap,
  Laptop,
  Smartphone,
  Headphones,
  Film,
  Image,
};

/** Lista de ícones para o seletor no admin (valor = nome, label = nome legível) */
export const STORE_ICON_OPTIONS = Object.keys(STORE_ICON_MAP).map((name) => ({
  value: name,
  label: name.replace(/([A-Z])/g, ' $1').trim(),
}));

export function getStoreIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  return STORE_ICON_MAP[name] ?? null;
}

/** Cores de destaque para ícone na loja (chave → classes Tailwind para fundo gradiente) */
export const STORE_ICON_COLORS: { value: string; label: string; gradient: string }[] = [
  { value: 'amber', label: 'Âmbar', gradient: 'from-amber-400 to-yellow-500' },
  { value: 'blue', label: 'Azul', gradient: 'from-blue-400 to-blue-600' },
  { value: 'green', label: 'Verde', gradient: 'from-emerald-400 to-green-600' },
  { value: 'violet', label: 'Violeta', gradient: 'from-violet-400 to-purple-600' },
  { value: 'rose', label: 'Rosa', gradient: 'from-rose-400 to-pink-500' },
  { value: 'orange', label: 'Laranja', gradient: 'from-orange-400 to-amber-500' },
  { value: 'cyan', label: 'Ciano', gradient: 'from-cyan-400 to-teal-500' },
  { value: 'sky', label: 'Céu', gradient: 'from-sky-400 to-blue-500' },
  { value: 'emerald', label: 'Esmeralda', gradient: 'from-emerald-500 to-green-600' },
  { value: 'fuchsia', label: 'Fúcsia', gradient: 'from-fuchsia-400 to-pink-600' },
  { value: 'indigo', label: 'Índigo', gradient: 'from-indigo-400 to-violet-600' },
  { value: 'lime', label: 'Lima', gradient: 'from-lime-400 to-green-500' },
  { value: 'red', label: 'Vermelho', gradient: 'from-red-400 to-rose-600' },
  { value: 'slate', label: 'Cinza', gradient: 'from-slate-400 to-slate-600' },
  { value: 'dark', label: 'Escuro', gradient: 'from-slate-500 to-slate-700' },
];

export function getStoreIconGradient(colorKey: string | null | undefined): string {
  if (!colorKey) return 'from-amber-400 to-yellow-500';
  const found = STORE_ICON_COLORS.find((c) => c.value === colorKey);
  return found?.gradient ?? 'from-amber-400 to-yellow-500';
}
