import { ReactNode, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useGlobalThemeStyles } from "@/hooks/useGlobalThemeStyles";

type FullscreenLayoutProps = {
  children?: ReactNode;
};

export default function FullscreenLayout({ children }: FullscreenLayoutProps) {
  useScrollToTop();
  const globalThemeStyles = useGlobalThemeStyles();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        "bg-background overflow-hidden",
        "flex flex-col h-screen w-screen"
      )}
      style={Object.keys(globalThemeStyles).length > 0 ? globalThemeStyles : undefined}
    >
      {/* Conteúdo em tela cheia */}
      <main className="flex-1 overflow-hidden">
        {children || <Outlet />}
      </main>
    </div>
  );
}