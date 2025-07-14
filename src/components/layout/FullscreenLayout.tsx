import { ReactNode, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

type FullscreenLayoutProps = {
  children?: ReactNode;
};

export default function FullscreenLayout({ children }: FullscreenLayoutProps) {
  useEffect(() => {
    // Adicionar classe para ocultar scrollbars e garantir tela cheia
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Cleanup ao desmontar o componente
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className={cn(
      "fixed inset-0 z-50",
      "bg-white overflow-hidden",
      "flex flex-col h-screen w-screen"
    )}>
      {/* Conteúdo em tela cheia */}
      <main className="flex-1 overflow-hidden">
        {children || <Outlet />}
      </main>
    </div>
  );
}