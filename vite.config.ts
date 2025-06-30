import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Definir variáveis de ambiente se não estiverem definidas
    __VITE_API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:5000'),
    __VITE_DEBUG_MODE__: JSON.stringify(process.env.VITE_DEBUG_MODE || 'false'),
  },
  envPrefix: 'VITE_', // Prefixo para variáveis de ambiente
}));
