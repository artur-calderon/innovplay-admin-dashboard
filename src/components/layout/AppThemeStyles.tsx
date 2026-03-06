import { ReactNode } from "react";
import { useGlobalThemeStyles } from "@/hooks/useGlobalThemeStyles";

/**
 * Envolve o conteúdo em um div que aplica as variáveis CSS do tema global
 * (primary, ring, accent). Usado em rotas que não estão dentro do Layout
 * (ex.: ChangePassword) para que o tema da loja também se aplique nessas páginas.
 */
export function AppThemeStyles({ children }: { children: ReactNode }) {
  const globalThemeStyles = useGlobalThemeStyles();
  if (Object.keys(globalThemeStyles).length === 0) {
    return <>{children}</>;
  }
  return <div style={globalThemeStyles} className="min-h-screen">{children}</div>;
}
