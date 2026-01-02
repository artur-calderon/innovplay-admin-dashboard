import { Play, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface VideoPlayerProps {
  url: string;
  title?: string;
}

export const VideoPlayer = ({ url, title }: VideoPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="w-full group relative">
      {/* Container com borda roxa e sombra colorida */}
      <div className="relative rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/10 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/20">
        {embedUrl && !hasError ? (
          <>
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">Carregando vídeo...</p>
                </div>
              </div>
            )}

            {/* Player container */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full border-0 rounded-lg"
                allowFullScreen
                title={title || 'Vídeo'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </div>

            {/* Overlay sutil com gradiente roxo no hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
          </>
        ) : (
          <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-primary/10 via-purple-500/10 to-primary/5">
            <div className="text-center p-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <Play className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground font-medium">Vídeo não disponível</p>
              <p className="text-sm text-muted-foreground/70 mt-2">Verifique se a URL do vídeo está correta</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

