import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';
import { applyStoredSettings } from './hooks/useSettings';

// Aplicar configurações salvas antes de renderizar
applyStoredSettings();

createRoot(document.getElementById("root")!).render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}> {/* ADD THIS PROP */}
        <App />
    </BrowserRouter>
);
