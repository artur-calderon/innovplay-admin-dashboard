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

// Função para extrair thumbnail de URLs de vídeo (mantida para compatibilidade)
export function getVideoThumbnail(url: string): string | null {
  if (!url) return null;

  try {
    // YouTube
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        // Retornar maxresdefault primeiro, mas o componente deve ter fallback
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

// Função para obter lista de tentativas de thumbnails ordenadas por prioridade
export function getVideoThumbnailAttempts(url: string): string[] {
  if (!url) return [];

  try {
    // Extrair videoId do YouTube
    let videoId: string | null = null;
    
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1] || null;
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.match(/youtube\.com\/embed\/([^&\n?#]+)/)?.[1] || null;
    }

    if (videoId) {
      // Lista completa de tentativas do YouTube em ordem de prioridade
      return [
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // Máxima resolução
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,     // Alta qualidade
        `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,     // Definição padrão
        `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,     // Qualidade média
        `https://img.youtube.com/vi/${videoId}/0.jpg`,             // Primeiro frame
        `https://img.youtube.com/vi/${videoId}/1.jpg`,             // Segundo frame
        `https://img.youtube.com/vi/${videoId}/2.jpg`,             // Terceiro frame
        `https://img.youtube.com/vi/${videoId}/3.jpg`,             // Quarto frame
        `https://img.youtube.com/vi/${videoId}/default.jpg`,       // Thumbnail padrão (sempre disponível)
      ];
    }

    // Vimeo
    let vimeoId: string | null = null;
    if (url.includes('vimeo.com')) {
      vimeoId = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || null;
    } else if (url.includes('player.vimeo.com')) {
      vimeoId = url.match(/player\.vimeo\.com\/video\/(\d+)/)?.[1] || null;
    }

    if (vimeoId) {
      return [
        `https://vumbnail.com/${vimeoId}.jpg`,
        `https://i.vimeocdn.com/video/${vimeoId}_640.jpg`,
        `https://i.vimeocdn.com/video/${vimeoId}_295x166.jpg`,
      ];
    }

    // Se for uma URL de imagem direta, retornar como única tentativa
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return [url];
    }

    return [];
  } catch (error) {
    console.error('Erro ao extrair tentativas de thumbnail:', error);
    return [];
  }
}