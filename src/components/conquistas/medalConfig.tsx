import React from "react";
import { Medal, Award, Trophy, Crown } from "lucide-react";
import type { MedalhaTipo } from "@/services/conquistasApi";

export const MEDALHA_LABEL: Record<MedalhaTipo, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
  platina: "Platina",
};

/** Estilos para badges/chips e bordas (texto e fundo) */
export const MEDALHA_STYLES: Record<
  MedalhaTipo,
  { bg: string; border: string; text: string }
> = {
  bronze:
    "bg-amber-700/90 border-amber-600 text-amber-100 dark:bg-amber-800 dark:border-amber-700",
  prata:
    "bg-slate-400/90 border-slate-500 text-slate-100 dark:bg-slate-600 dark:border-slate-500",
  ouro:
    "bg-yellow-500/90 border-yellow-600 text-yellow-100 dark:bg-yellow-600 dark:border-yellow-500",
  platina:
    "bg-violet-400/90 border-violet-500 text-violet-100 dark:bg-violet-600 dark:border-violet-500",
};

/** Cards bem coloridos por medalha: bronze, prata, ouro e platina com cor forte + texto claro */
export const MEDALHA_CARD_VIDD: Record<MedalhaTipo, string> = {
  bronze:
    "bg-gradient-to-br from-amber-600 to-amber-800 dark:from-amber-700 dark:to-amber-900 border-2 border-amber-500 dark:border-amber-600 text-amber-50 shadow-lg shadow-amber-800/30",
  prata:
    "bg-gradient-to-br from-slate-400 to-slate-600 dark:from-slate-500 dark:to-slate-700 border-2 border-slate-300 dark:border-slate-500 text-slate-50 shadow-lg shadow-slate-600/30",
  ouro:
    "bg-gradient-to-br from-yellow-400 to-amber-500 dark:from-yellow-500 dark:to-amber-600 border-2 border-yellow-400 dark:border-amber-400 text-yellow-50 shadow-lg shadow-amber-500/30",
  platina:
    "bg-gradient-to-br from-violet-400 to-purple-600 dark:from-violet-500 dark:to-purple-700 border-2 border-violet-400 dark:border-violet-500 text-violet-50 shadow-lg shadow-violet-600/30",
};

/** Borda e fundo sutil para card bloqueado (mostra a cor da medalha que representa) */
export const MEDALHA_CARD_BLOQUEADO: Record<MedalhaTipo, string> = {
  bronze:
    "border-l-4 border-amber-500 dark:border-amber-600 bg-amber-500/10 dark:bg-amber-600/10 border border-amber-500/30 dark:border-amber-600/30",
  prata:
    "border-l-4 border-slate-400 dark:border-slate-500 bg-slate-400/10 dark:bg-slate-500/10 border border-slate-400/30 dark:border-slate-500/30",
  ouro:
    "border-l-4 border-yellow-500 dark:border-amber-500 bg-yellow-500/10 dark:bg-amber-500/10 border border-yellow-500/30 dark:border-amber-500/30",
  platina:
    "border-l-4 border-violet-500 dark:border-violet-500 bg-violet-500/10 dark:bg-violet-600/10 border border-violet-500/30 dark:border-violet-600/30",
};

/** Cores fortes para cards grandes: fundo gradiente e borda por medalha */
export const MEDALHA_CARD_STYLES: Record<
  MedalhaTipo,
  { card: string; iconBg: string }
> = {
  bronze: {
    card:
      "bg-gradient-to-br from-amber-600 to-amber-800 dark:from-amber-700 dark:to-amber-900 border-2 border-amber-500 dark:border-amber-600 text-amber-50 shadow-lg shadow-amber-800/25 ring-1 ring-amber-400/50 dark:ring-amber-500/40",
    iconBg: "bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 shadow-lg shadow-amber-700/40",
  },
  prata: {
    card:
      "bg-gradient-to-br from-slate-400 to-slate-600 dark:from-slate-500 dark:to-slate-700 border-2 border-slate-300 dark:border-slate-500 text-slate-50 shadow-lg shadow-slate-600/25 ring-1 ring-slate-300/50 dark:ring-slate-400/40",
    iconBg: "bg-gradient-to-br from-slate-400 to-slate-600 text-slate-100 shadow-lg shadow-slate-600/40",
  },
  ouro: {
    card:
      "bg-gradient-to-br from-yellow-400 to-amber-500 dark:from-yellow-500 dark:to-amber-600 border-2 border-yellow-400 dark:border-amber-400 text-yellow-50 shadow-lg shadow-amber-500/25 ring-1 ring-yellow-400/50 dark:ring-amber-400/40",
    iconBg: "bg-gradient-to-br from-yellow-500 to-amber-500 text-yellow-100 shadow-lg shadow-amber-500/40",
  },
  platina: {
    card:
      "bg-gradient-to-br from-violet-400 to-purple-600 dark:from-violet-500 dark:to-purple-700 border-2 border-violet-400 dark:border-violet-500 text-violet-50 shadow-lg shadow-violet-600/25 ring-1 ring-violet-400/50 dark:ring-violet-500/40",
    iconBg: "bg-gradient-to-br from-violet-400 to-purple-500 text-violet-100 shadow-lg shadow-violet-600/40",
  },
};

/** Fundo do ícone por medalha (círculo/quadrado atrás do ícone) */
export const MEDALHA_ICON_BG: Record<MedalhaTipo, string> = {
  bronze:
    "bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 shadow-lg shadow-amber-700/40",
  prata:
    "bg-gradient-to-br from-slate-400 to-slate-600 text-slate-100 shadow-lg shadow-slate-600/40",
  ouro:
    "bg-gradient-to-br from-yellow-500 to-amber-500 text-yellow-100 shadow-lg shadow-amber-500/40",
  platina:
    "bg-gradient-to-br from-violet-400 to-purple-500 text-violet-100 shadow-lg shadow-violet-600/40",
};

const MEDALHA_ICONS: Record<MedalhaTipo, React.ElementType> = {
  bronze: Medal,
  prata: Award,
  ouro: Trophy,
  platina: Crown,
};

interface MedalIconProps {
  tipo: MedalhaTipo;
  className?: string;
  size?: number;
  /** Se true, mostra dentro do círculo colorido */
  withBg?: boolean;
}

export function MedalIcon({
  tipo,
  className = "",
  size = 20,
  withBg = false,
}: MedalIconProps) {
  const Icon = MEDALHA_ICONS[tipo];
  const bgClass = MEDALHA_ICON_BG[tipo];

  if (withBg) {
    return (
      <div
        className={`flex items-center justify-center rounded-full flex-shrink-0 ${bgClass} ${className}`}
        style={{ width: size * 1.6, height: size * 1.6 }}
      >
        <Icon className="text-current" style={{ width: size, height: size }} />
      </div>
    );
  }

  return <Icon className={className} style={{ width: size, height: size }} />;
}
