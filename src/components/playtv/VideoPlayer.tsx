import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  title?: string;
}

export const VideoPlayer = ({ url, title }: VideoPlayerProps) => {
  // Converter URL do YouTube para embed se necessário
  const getEmbedUrl = (videoUrl: string): string => {
    try {
      // Se já for uma URL de embed, retornar como está
      if (videoUrl.includes('embed') || videoUrl.includes('youtube.com/embed')) {
        return videoUrl;
      }

      // Se for URL do YouTube, converter para embed
      if (videoUrl.includes('youtube.com/watch') || videoUrl.includes('youtu.be')) {
        const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // Se for iframe HTML, extrair src
      if (videoUrl.includes('<iframe')) {
        const srcMatch = videoUrl.match(/src=["']([^"']+)["']/);
        if (srcMatch && srcMatch[1]) {
          return srcMatch[1];
        }
      }

      // Caso contrário, retornar URL original (pode ser de outra plataforma)
      return videoUrl;
    } catch (error) {
      console.error('Erro ao processar URL do vídeo:', error);
      return videoUrl;
    }
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="w-full bg-muted rounded-lg overflow-hidden">
      {embedUrl ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full border-0"
            allowFullScreen
            title={title || 'Vídeo'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-muted to-muted/50">
          <div className="text-center">
            <Play className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Vídeo não disponível</p>
          </div>
        </div>
      )}
    </div>
  );
};

