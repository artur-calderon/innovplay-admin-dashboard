import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função utilitária para obter as cores padronizadas das dificuldades SAEB
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Avançado': 
      return 'bg-green-800 text-green-100 border-green-700';
    case 'Adequado': 
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Básico': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Abaixo do Básico': 
      return 'bg-red-100 text-red-800 border-red-300';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

// Função para obter as cores dos pontos indicadores (usados nos selects)
export function getDifficultyDotColor(difficulty: string): string {
  switch (difficulty) {
    case 'Avançado': 
      return 'bg-green-700';
    case 'Adequado': 
      return 'bg-green-400';
    case 'Básico': 
      return 'bg-yellow-500';
    case 'Abaixo do Básico': 
      return 'bg-red-500';
    default: 
      return 'bg-gray-500';
  }
}
