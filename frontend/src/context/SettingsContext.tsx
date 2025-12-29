import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ExternalFormsConfig {
  baseUrl: string;
  listEndpoint: string;
  apiKey: string;
  enabled: boolean;
}

export interface ExternalProjectsConfig {
  baseUrl: string;
  listEndpoint: string;
  apiKey: string;
  enabled: boolean;
}

export interface TenantConfig {
  tenantId: string;
  orgId: string;
}

export interface ApiKeysServiceConfig {
  baseUrl: string;
  listEndpoint: string;
  apiKey: string;
  enabled: boolean;
}

export interface PLMSettings {
  externalForms: ExternalFormsConfig;
  externalProjects: ExternalProjectsConfig;
  tenant: TenantConfig;
  apiKeysService: ApiKeysServiceConfig;
}

interface SettingsContextType {
  settings: PLMSettings;
  updateExternalFormsConfig: (config: Partial<ExternalFormsConfig>) => void;
  updateExternalProjectsConfig: (config: Partial<ExternalProjectsConfig>) => void;
  updateTenantConfig: (config: Partial<TenantConfig>) => void;
  updateApiKeysServiceConfig: (config: Partial<ApiKeysServiceConfig>) => void;
  isConfigured: boolean;
  isProjectsConfigured: boolean;
  isTenantConfigured: boolean;
  isApiKeysConfigured: boolean;
}

const defaultSettings: PLMSettings = {
  externalForms: {
    baseUrl: '',
    listEndpoint: '/data-entry-forms/external/list',
    apiKey: '',
    enabled: false,
  },
  externalProjects: {
    baseUrl: '',
    listEndpoint: '/projects',
    apiKey: '',
    enabled: false,
  },
  tenant: {
    tenantId: '',
    orgId: '',
  },
  apiKeysService: {
    baseUrl: '',
    listEndpoint: '/api-keys',
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
          externalProjects: {
            ...defaultSettings.externalProjects,
            ...parsed.externalProjects,
          },
          tenant: {
            ...defaultSettings.tenant,
            ...parsed.tenant,
          },
          apiKeysService: {
            ...defaultSettings.apiKeysService,
            ...parsed.apiKeysService,
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

  const updateExternalProjectsConfig = (config: Partial<ExternalProjectsConfig>) => {
    setSettings((prev) => ({
      ...prev,
      externalProjects: {
        ...prev.externalProjects,
        ...config,
      },
    }));
  };

  const updateTenantConfig = (config: Partial<TenantConfig>) => {
    setSettings((prev) => ({
      ...prev,
      tenant: {
        ...prev.tenant,
        ...config,
      },
    }));
  };

  const updateApiKeysServiceConfig = (config: Partial<ApiKeysServiceConfig>) => {
    setSettings((prev) => ({
      ...prev,
      apiKeysService: {
        ...prev.apiKeysService,
        ...config,
      },
    }));
  };

  const isConfigured = Boolean(
    settings.externalForms.baseUrl &&
    settings.externalForms.apiKey &&
    settings.externalForms.enabled
  );

  const isProjectsConfigured = Boolean(
    settings.externalProjects.baseUrl &&
    settings.externalProjects.apiKey &&
    settings.externalProjects.enabled
  );

  const isTenantConfigured = Boolean(
    settings.tenant.tenantId &&
    settings.tenant.orgId
  );

  const isApiKeysConfigured = Boolean(
    settings.apiKeysService.baseUrl &&
    settings.apiKeysService.apiKey &&
    settings.apiKeysService.enabled
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateExternalFormsConfig,
        updateExternalProjectsConfig,
        updateTenantConfig,
        updateApiKeysServiceConfig,
        isConfigured,
        isProjectsConfigured,
        isTenantConfigured,
        isApiKeysConfigured,
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
