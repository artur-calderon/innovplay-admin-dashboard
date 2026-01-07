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

// Função para extrair thumbnail de URLs de vídeo
export function getVideoThumbnail(url: string): string | null {
  if (!url) return null;

  try {
    // YouTube
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // YouTube embed
    if (url.includes('youtube.com/embed/')) {
      const videoId = url.match(/youtube\.com\/embed\/([^&\n?#]+)/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
      if (videoId) {
        // Vimeo requer API para thumbnail, mas podemos tentar uma URL padrão
        return `https://vumbnail.com/${videoId}.jpg`;
      }
    }

    // Vimeo embed
    if (url.includes('player.vimeo.com')) {
      const videoId = url.match(/player\.vimeo\.com\/video\/(\d+)/)?.[1];
      if (videoId) {
        return `https://vumbnail.com/${videoId}.jpg`;
      }
    }

    // Se for uma URL de imagem direta, retornar como está
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return url;
    }

    return null;
  } catch (error) {
    console.error('Erro ao extrair thumbnail:', error);
    return null;
  }
}