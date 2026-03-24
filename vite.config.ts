import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const apiUrl = process.env.VITE_API_BASE_URL || "https://demo-api.afirmeplay.com.br/";
  
  return {
    server: {
      host: "::",
      port: 8080,
      // Proxy para evitar CORS em desenvolvimento
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          secure: apiUrl.startsWith('https'),
          rewrite: (path) => path.replace(/^\/api/, ""),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(`[${req.method}] ${req.url} -> ${apiUrl}${req.url}`);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log(`[${proxyRes.statusCode}] ${req.url}`);
            });
          },
        },
      },
    },
    // ✅ CONFIGURAÇÃO OPCIONAL DE HTTPS PARA DESENVOLVIMENTO
    // Descomente as linhas abaixo se quiser HTTPS local
    // https: {
    //   key: fs.readFileSync('./certs/localhost-key.pem'),
    //   cert: fs.readFileSync('./certs/localhost.pem'),
    // },
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
      __VITE_API_BASE_URL__: JSON.stringify(apiUrl),
      __VITE_DEBUG_MODE__: JSON.stringify(process.env.VITE_DEBUG_MODE || 'false'),
    },
    // Expõe variáveis VITE_* e SUBDOMAIN_* para uso no frontend
    envPrefix: ['VITE_', 'SUBDOMAIN_'],
  };
});
