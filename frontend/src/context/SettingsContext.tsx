import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useTenant } from './TenantContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface ExternalFormsConfig {
  baseUrl: string;
  listEndpoint: string;
  schemaEndpoint: string;
  dataEndpoint: string;
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
  updateExternalFormsConfig: (config: Partial<ExternalFormsConfig>) => Promise<void>;
  updateExternalProjectsConfig: (config: Partial<ExternalProjectsConfig>) => Promise<void>;
  updateTenantConfig: (config: Partial<TenantConfig>) => void;
  updateApiKeysServiceConfig: (config: Partial<ApiKeysServiceConfig>) => Promise<void>;
  isConfigured: boolean;
  isProjectsConfigured: boolean;
  isTenantConfigured: boolean;
  isApiKeysConfigured: boolean;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: PLMSettings = {
  externalForms: {
    baseUrl: '',
    listEndpoint: '/forms',
    schemaEndpoint: '/forms/{formId}',
    dataEndpoint: '/submissions?formId={formId}',
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

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PLMSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const { isAuthenticated } = useTenant();

  // Fetch settings from backend
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tenant-settings`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          externalForms: {
            ...defaultSettings.externalForms,
            ...data.externalForms,
          },
          externalProjects: {
            ...defaultSettings.externalProjects,
            ...data.externalProjects,
          },
          apiKeysService: {
            ...defaultSettings.apiKeysService,
            ...data.apiKeysService,
          },
        }));
        setHasFetched(true);
      } else if (response.status === 401) {
        // Not authenticated yet, just use defaults
        console.log('Not authenticated, using default settings');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Save settings to backend
  const saveSettings = useCallback(async (newSettings: Partial<PLMSettings>) => {
    if (!isAuthenticated) {
      console.warn('Cannot save settings: not authenticated');
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/tenant-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newSettings),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [isAuthenticated]);

  // Fetch settings when authentication state changes
  useEffect(() => {
    if (isAuthenticated && !hasFetched) {
      fetchSettings();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, hasFetched, fetchSettings]);

  const updateExternalFormsConfig = async (config: Partial<ExternalFormsConfig>) => {
    const newExternalForms = {
      ...settings.externalForms,
      ...config,
    };
    setSettings((prev) => ({
      ...prev,
      externalForms: newExternalForms,
    }));
    await saveSettings({ externalForms: newExternalForms });
  };

  const updateExternalProjectsConfig = async (config: Partial<ExternalProjectsConfig>) => {
    const newExternalProjects = {
      ...settings.externalProjects,
      ...config,
    };
    setSettings((prev) => ({
      ...prev,
      externalProjects: newExternalProjects,
    }));
    await saveSettings({ externalProjects: newExternalProjects });
  };

  const updateTenantConfig = (config: Partial<TenantConfig>) => {
    // Tenant config is read-only from JWT, not saved to backend
    setSettings((prev) => ({
      ...prev,
      tenant: {
        ...prev.tenant,
        ...config,
      },
    }));
  };

  const updateApiKeysServiceConfig = async (config: Partial<ApiKeysServiceConfig>) => {
    const newApiKeysService = {
      ...settings.apiKeysService,
      ...config,
    };
    setSettings((prev) => ({
      ...prev,
      apiKeysService: newApiKeysService,
    }));
    await saveSettings({ apiKeysService: newApiKeysService });
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
        loading,
        refreshSettings: fetchSettings,
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
