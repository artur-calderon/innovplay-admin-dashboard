import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080, // ✅ Pode mudar para 3000, 5173, etc. se preferir
    // ✅ CONFIGURAÇÃO OPCIONAL DE HTTPS PARA DESENVOLVIMENTO
    // Descomente as linhas abaixo se quiser HTTPS local
    // https: {
    //   key: fs.readFileSync('./certs/localhost-key.pem'),
    //   cert: fs.readFileSync('./certs/localhost.pem'),
    // },
  },
  plugins: [
    react(),
  ],
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
