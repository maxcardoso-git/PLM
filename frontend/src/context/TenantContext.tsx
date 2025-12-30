import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { Tenant, Organization } from '../types';

interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  tenantId: string;
  orgId?: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  organization: Organization | null;
  user: AuthUser | null;
  setTenantContext: (tenant: Tenant, organization: Organization) => void;
  clearContext: () => void;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Helper to get cookie value
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [organization, setOrganizationState] = useState<Organization | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from cookie or localStorage
  useEffect(() => {
    const init = async () => {
      setLoading(true);

      // Check URL for auth callback params
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      const authMessage = urlParams.get('message');

      if (authStatus === 'success') {
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        console.log('TAH authentication successful');
      } else if (authStatus === 'error') {
        console.error('TAH authentication failed:', authMessage);
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Check for auth cookie (set by backend after TAH callback)
      const authCookie = getCookie('plm_auth');
      if (authCookie) {
        try {
          const authData = JSON.parse(authCookie) as AuthUser;
          setUser(authData);

          if (authData.tenantId) {
            const t: Tenant = {
              id: authData.tenantId,
              name: authData.email?.split('@')[0] || 'Tenant',
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            const o: Organization = {
              id: authData.orgId || 'default-org',
              tenantId: authData.tenantId,
              name: authData.orgId || 'Default Organization',
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            setTenantState(t);
            setOrganizationState(o);
            api.setTenant(authData.tenantId);
            api.setOrganization(authData.orgId || 'default-org');
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse plm_auth cookie:', e);
        }
      }

      // Check for PLM Settings (from Settings page)
      const plmSettings = localStorage.getItem('plm_settings');
      if (plmSettings) {
        try {
          const settings = JSON.parse(plmSettings);
          const tenantId = settings.tenant?.tenantId;
          const orgId = settings.tenant?.orgId;

          if (tenantId && orgId) {
            const t: Tenant = {
              id: tenantId,
              name: 'Tenant',
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            const o: Organization = {
              id: orgId,
              tenantId: tenantId,
              name: orgId,
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            setTenantState(t);
            setOrganizationState(o);
            api.setTenant(tenantId);
            api.setOrganization(orgId);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse plm_settings:', e);
        }
      }

      // Fallback: Check for TAH session data (legacy)
      const tahTenantId = localStorage.getItem('tah_tenant_id');
      const tahOrgId = localStorage.getItem('tah_organization_id');
      const tahTenantName = localStorage.getItem('tah_tenant_name');
      const tahOrgName = localStorage.getItem('tah_organization_name');

      if (tahTenantId && tahOrgId) {
        const t: Tenant = {
          id: tahTenantId,
          name: tahTenantName || 'Tenant',
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        const o: Organization = {
          id: tahOrgId,
          tenantId: tahTenantId,
          name: tahOrgName || 'Organization',
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        setTenantState(t);
        setOrganizationState(o);
        api.setTenant(tahTenantId);
        api.setOrganization(tahOrgId);
        setLoading(false);
        return;
      }

      // Auto-select first tenant if none configured
      try {
        const { items: tenants } = await api.getTenants();
        if (tenants && tenants.length > 0) {
          const firstTenant = tenants[0];
          const defaultOrgId = 'default-org';

          const t: Tenant = firstTenant;
          const o: Organization = {
            id: defaultOrgId,
            tenantId: firstTenant.id,
            name: 'Default Organization',
            status: 'active',
            createdAt: new Date().toISOString(),
          };

          setTenantState(t);
          setOrganizationState(o);
          api.setTenant(firstTenant.id);
          api.setOrganization(defaultOrgId);

          // Save to localStorage for persistence
          localStorage.setItem('tah_tenant_id', firstTenant.id);
          localStorage.setItem('tah_organization_id', defaultOrgId);
          localStorage.setItem('tah_tenant_name', firstTenant.name);
          localStorage.setItem('tah_organization_name', 'Default Organization');
        }
      } catch (e) {
        console.warn('Failed to auto-select tenant:', e);
      }

      setLoading(false);
    };
    init();

    // Listen for plm_settings changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'plm_settings' && e.newValue) {
        try {
          const settings = JSON.parse(e.newValue);
          const tenantId = settings.tenant?.tenantId;
          const orgId = settings.tenant?.orgId;
          if (tenantId && orgId) {
            const t: Tenant = {
              id: tenantId,
              name: 'Tenant',
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            const o: Organization = {
              id: orgId,
              tenantId: tenantId,
              name: orgId,
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            setTenantState(t);
            setOrganizationState(o);
            api.setTenant(tenantId);
            api.setOrganization(orgId);
          }
        } catch (e) {
          console.warn('Failed to parse plm_settings:', e);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for tenant updates from Settings page (same tab)
    const handleTenantUpdate = (event: CustomEvent<{ tenantId: string; orgId: string }>) => {
      const { tenantId, orgId } = event.detail;
      if (tenantId && orgId) {
        const t: Tenant = {
          id: tenantId,
          name: 'Tenant',
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        const o: Organization = {
          id: orgId,
          tenantId: tenantId,
          name: orgId,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        setTenantState(t);
        setOrganizationState(o);
        api.setTenant(tenantId);
        api.setOrganization(orgId);
      }
    };
    window.addEventListener('plm:tenant-updated', handleTenantUpdate as EventListener);

    // Listen for TAH auth events
    const handleTahAuth = (event: CustomEvent) => {
      const { tenant, organization } = event.detail;
      if (tenant && organization) {
        setTenantContext(tenant, organization);
      }
    };

    window.addEventListener('tah:authenticated', handleTahAuth as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('plm:tenant-updated', handleTenantUpdate as EventListener);
      window.removeEventListener('tah:authenticated', handleTahAuth as EventListener);
    };
  }, []);

  const setTenantContext = useCallback((t: Tenant, org: Organization) => {
    setTenantState(t);
    setOrganizationState(org);
    api.setTenant(t.id);
    api.setOrganization(org.id);

    // Store for persistence
    localStorage.setItem('tah_tenant_id', t.id);
    localStorage.setItem('tah_organization_id', org.id);
    localStorage.setItem('tah_tenant_name', t.name);
    localStorage.setItem('tah_organization_name', org.name);
  }, []);

  const clearContext = useCallback(() => {
    setTenantState(null);
    setOrganizationState(null);
    setUser(null);
    api.setTenant('');
    api.setOrganization('');

    localStorage.removeItem('tah_tenant_id');
    localStorage.removeItem('tah_organization_id');
    localStorage.removeItem('tah_tenant_name');
    localStorage.removeItem('tah_organization_name');
  }, []);

  const logout = useCallback(async () => {
    try {
      // Call backend logout endpoint
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('Logout request failed:', e);
    }

    // Clear local state
    clearContext();

    // Clear cookies by setting expired
    document.cookie = 'plm_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'plm_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Reload to reset app state
    window.location.href = '/';
  }, [clearContext]);

  const isAuthenticated = Boolean(tenant && organization);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        organization,
        user,
        setTenantContext,
        clearContext,
        logout,
        loading,
        isAuthenticated,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
