import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";

export interface Settings {
  theme: "light" | "dark";
  fontFamily: string;
  fontSize: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  fontFamily: "Inter",
  fontSize: "100%",
};

// Função para obter chave de storage baseada no userId
const getStorageKey = (userId: string | null): string => {
  if (!userId) {
    return "app-settings"; // Fallback para usuário não autenticado
  }
  return `app-settings-${userId}`;
};

// Função segura para ler do localStorage
const getFromStorage = (key: string, defaultValue: string): string => {
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue;
    }
    return value;
  } catch (error) {
    console.warn(`Erro ao ler ${key} do localStorage:`, error);
    return defaultValue;
  }
};

// Função segura para escrever no localStorage
const setToStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Erro ao escrever ${key} no localStorage:`, error);
  }
};

// Carregar configurações do localStorage com fallback para valores padrão
export const loadSettings = (userId: string | null): Settings => {
  const storageKey = getStorageKey(userId);
  const stored = getFromStorage(storageKey, "");
  
  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(stored);
    const theme = parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : DEFAULT_SETTINGS.theme;
    const fontFamily = parsed.fontFamily || DEFAULT_SETTINGS.fontFamily;
    const validFontSize = /^\d+%$/.test(parsed.fontSize) || /^\d+px$/.test(parsed.fontSize) 
      ? parsed.fontSize 
      : DEFAULT_SETTINGS.fontSize;

    return {
      theme,
      fontFamily,
      fontSize: validFontSize,
    };
  } catch (error) {
    console.warn("Erro ao fazer parse das configurações:", error);
    return DEFAULT_SETTINGS;
  }
};

// Salvar configurações no localStorage
const saveSettings = (userId: string | null, settings: Settings): void => {
  const storageKey = getStorageKey(userId);
  try {
    setToStorage(storageKey, JSON.stringify(settings));
  } catch (error) {
    console.warn("Erro ao salvar configurações:", error);
  }
};

// API para configurações do usuário (seguindo padrão de user-quick-links)
interface UserSettingsResponse {
  settings: Settings;
}

const settingsApi = {
  // Buscar configurações do usuário
  getUserSettings: async (userId: string): Promise<Settings | null> => {
    try {
      const response = await api.get<UserSettingsResponse>(`/users/user-settings/${userId}`);
      return response.data.settings || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Se não existir configurações, retorna null
        return null;
      }
      console.warn("Erro ao buscar configurações do servidor:", error);
      return null;
    }
  },

  // Salvar configurações do usuário
  saveUserSettings: async (userId: string, settings: Settings): Promise<void> => {
    try {
      await api.post(`/users/user-settings/${userId}`, { settings });
    } catch (error) {
      console.warn("Erro ao salvar configurações no servidor:", error);
      throw error;
    }
  },
};

// Aplicar tema no DOM
export const applyTheme = (theme: "light" | "dark"): void => {
  try {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch (error) {
    console.warn("Erro ao aplicar tema:", error);
  }
};

// Aplicar fonte no DOM
const applyFontFamily = (fontFamily: string): void => {
  try {
    const root = document.documentElement;
    // Aplicar via CSS variable no :root para uso global
    root.style.setProperty("--app-font-family", fontFamily);
    
    // Aplicar também diretamente no body para garantir compatibilidade imediata
    // A fonte será usada junto com o fallback chain do CSS
    const fontStack = `${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`;
    if (document.body) {
      document.body.style.fontFamily = fontStack;
    }
  } catch (error) {
    console.warn("Erro ao aplicar fonte:", error);
  }
};

// Aplicar tamanho de fonte no DOM
const applyFontSize = (fontSize: string): void => {
  try {
    const root = document.documentElement;
    // Aplicar via CSS variable no :root para uso global
    root.style.setProperty("--app-font-size", fontSize);
    
    // Aplicar também diretamente no body para garantir compatibilidade imediata
    if (document.body) {
      document.body.style.fontSize = fontSize;
    }
  } catch (error) {
    console.warn("Erro ao aplicar tamanho de fonte:", error);
  }
};

export const loadAndApplySettings = async (targetUserId: string | null): Promise<Settings> => {
  let loadedSettings: Settings = DEFAULT_SETTINGS;

  try {
    if (targetUserId) {
      const serverSettings = await settingsApi.getUserSettings(targetUserId);
      if (serverSettings) {
        loadedSettings = serverSettings;
        saveSettings(targetUserId, loadedSettings);
      } else {
        const localSettings = loadSettings(targetUserId);
        if (localSettings && JSON.stringify(localSettings) !== JSON.stringify(DEFAULT_SETTINGS)) {
          loadedSettings = localSettings;
          try {
            await settingsApi.saveUserSettings(targetUserId, localSettings);
          } catch (error) {
            console.warn("Erro ao sincronizar configurações locais com servidor:", error);
          }
        } else {
          const currentDarkMode = document.documentElement.classList.contains('dark');
          if (currentDarkMode) {
            loadedSettings = { ...DEFAULT_SETTINGS, theme: 'dark' };
            saveSettings(targetUserId, loadedSettings);
          }
        }
      }
    } else {
      const localSettings = loadSettings(null);
      if (localSettings && JSON.stringify(localSettings) !== JSON.stringify(DEFAULT_SETTINGS)) {
        loadedSettings = localSettings;
      } else {
        const currentDarkMode = document.documentElement.classList.contains('dark');
        if (currentDarkMode) {
          loadedSettings = { ...DEFAULT_SETTINGS, theme: 'dark' };
          saveSettings(null, loadedSettings);
        }
      }
    }
  } catch (error) {
    console.warn("Erro ao carregar configurações:", error);
    const localSettings = loadSettings(targetUserId);
    if (localSettings && JSON.stringify(localSettings) !== JSON.stringify(DEFAULT_SETTINGS)) {
      loadedSettings = localSettings;
    }
  }

  const currentDarkMode = document.documentElement.classList.contains('dark');
  if (loadedSettings.theme === 'dark' && !currentDarkMode) {
    applyTheme(loadedSettings.theme);
  } else if (loadedSettings.theme === 'light' && currentDarkMode) {
    applyTheme(loadedSettings.theme);
  } else if (loadedSettings.theme === 'dark') {
    applyTheme(loadedSettings.theme);
  }
  applyFontFamily(loadedSettings.fontFamily);
  applyFontSize(loadedSettings.fontSize);

  return loadedSettings;
};

export const useSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id || null;

  const loadSettingsFromSources = useCallback(async (targetUserId: string | null) => {
    setIsLoading(true);
    const loaded = await loadAndApplySettings(targetUserId);
    setSettings(loaded);
    setIsLoading(false);
    return loaded;
  }, []);

  useEffect(() => {
    loadSettingsFromSources(userId);
  }, [loadSettingsFromSources, userId]);

  // Função para atualizar tema
  const updateTheme = useCallback(async (theme: "light" | "dark") => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    saveSettings(userId, newSettings);
    applyTheme(theme);
  }, [settings, userId]);

  // Função para atualizar fonte
  const updateFontFamily = useCallback(async (fontFamily: string) => {
    const newSettings = { ...settings, fontFamily };
    setSettings(newSettings);
    saveSettings(userId, newSettings);
    applyFontFamily(fontFamily);
  }, [settings, userId]);

  // Função para atualizar tamanho de fonte
  const updateFontSize = useCallback(async (fontSize: string) => {
    const newSettings = { ...settings, fontSize };
    setSettings(newSettings);
    saveSettings(userId, newSettings);
    applyFontSize(fontSize);
  }, [settings, userId]);

  // Função para resetar para valores padrão
  const resetToDefaults = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(userId, DEFAULT_SETTINGS);
    
    applyTheme(DEFAULT_SETTINGS.theme);
    applyFontFamily(DEFAULT_SETTINGS.fontFamily);
    applyFontSize(DEFAULT_SETTINGS.fontSize);
  }, [userId]);

  const persistSettings = useCallback(async () => {
    if (!userId) {
      throw new Error("Usuário não autenticado");
    }

    try {
      await settingsApi.saveUserSettings(userId, settings);
    } catch (error) {
      console.warn("Erro ao salvar configurações no servidor:", error);
      throw error;
    }
  }, [settings, userId]);

  return {
    settings,
    isLoading,
    updateTheme,
    updateFontFamily,
    updateFontSize,
    resetToDefaults,
    persistSettings,
    loadSettingsFromSources,
  };
};

// Função utilitária para aplicar configurações ao carregar a aplicação (usado em main.tsx)
// Esta função é chamada antes do React renderizar, então não pode usar hooks
export const applyStoredSettings = (): void => {
  try {
    // Tentar obter userId do token JWT se disponível
    let userId: string | null = null;
    try {
      const token = localStorage.getItem("token");
      if (token) {
        // Tentar decodificar o token JWT (formato básico)
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload?.user_id || payload?.id || payload?.sub || null;
        } catch {
          // Se não conseguir decodificar, tentar carregar do localStorage padrão
          // Não aplicar configurações padrão, apenas deixar como está
          const fallbackSettings = loadSettings(null);
          if (fallbackSettings && JSON.stringify(fallbackSettings) !== JSON.stringify(DEFAULT_SETTINGS)) {
            applyTheme(fallbackSettings.theme);
            applyFontFamily(fallbackSettings.fontFamily);
            applyFontSize(fallbackSettings.fontSize);
          }
          return;
        }
      } else {
        // Se não há token, tentar carregar do localStorage padrão
        const fallbackSettings = loadSettings(null);
        if (fallbackSettings && JSON.stringify(fallbackSettings) !== JSON.stringify(DEFAULT_SETTINGS)) {
          applyTheme(fallbackSettings.theme);
          applyFontFamily(fallbackSettings.fontFamily);
          applyFontSize(fallbackSettings.fontSize);
        }
        return;
      }
    } catch {
      // Se houver erro ao obter token, tentar carregar do localStorage padrão
      const fallbackSettings = loadSettings(null);
      if (fallbackSettings && JSON.stringify(fallbackSettings) !== JSON.stringify(DEFAULT_SETTINGS)) {
        applyTheme(fallbackSettings.theme);
        applyFontFamily(fallbackSettings.fontFamily);
        applyFontSize(fallbackSettings.fontSize);
      }
      return;
    }

    // Só aplicar configurações se userId for válido
    const settingsToApply = loadSettings(userId);
    if (settingsToApply && JSON.stringify(settingsToApply) !== JSON.stringify(DEFAULT_SETTINGS)) {
      applyTheme(settingsToApply.theme);
      applyFontFamily(settingsToApply.fontFamily);
      applyFontSize(settingsToApply.fontSize);
    }
  } catch (error) {
    console.warn("Erro ao aplicar configurações salvas:", error);
    // Não aplicar configurações padrão em caso de erro - deixar como está
  }
};

