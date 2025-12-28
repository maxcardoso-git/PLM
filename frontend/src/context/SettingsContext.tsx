import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ExternalFormsConfig {
  baseUrl: string;
  listEndpoint: string;
  apiKey: string;
  enabled: boolean;
}

export interface PLMSettings {
  externalForms: ExternalFormsConfig;
}

interface SettingsContextType {
  settings: PLMSettings;
  updateExternalFormsConfig: (config: Partial<ExternalFormsConfig>) => void;
  isConfigured: boolean;
}

const defaultSettings: PLMSettings = {
  externalForms: {
    baseUrl: '',
    listEndpoint: '/data-entry-forms/external/list',
    apiKey: '',
    enabled: false,
  },
};

const STORAGE_KEY = 'plm_settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PLMSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to handle schema migrations
        return {
          ...defaultSettings,
          ...parsed,
          externalForms: {
            ...defaultSettings.externalForms,
            ...parsed.externalForms,
          },
        };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateExternalFormsConfig = (config: Partial<ExternalFormsConfig>) => {
    setSettings((prev) => ({
      ...prev,
      externalForms: {
        ...prev.externalForms,
        ...config,
      },
    }));
  };

  const isConfigured = Boolean(
    settings.externalForms.baseUrl &&
    settings.externalForms.apiKey &&
    settings.externalForms.enabled
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateExternalFormsConfig,
        isConfigured,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
