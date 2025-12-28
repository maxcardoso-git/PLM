import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { Tenant, Organization } from '../types';

interface TenantContextType {
  tenant: Tenant | null;
  organization: Organization | null;
  tenants: Tenant[];
  organizations: Organization[];
  setTenant: (tenant: Tenant) => void;
  setOrganization: (org: Organization) => void;
  loading: boolean;
  refreshTenants: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [organization, setOrganizationState] = useState<Organization | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTenants = async () => {
    try {
      const { items } = await api.getTenants();
      setTenants(items);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const refreshOrganizations = async () => {
    if (!tenant) return;
    try {
      const { items } = await api.getOrganizations();
      setOrganizations(items);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshTenants();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (tenant) {
      api.setTenant(tenant.id);
      refreshOrganizations();
    }
  }, [tenant]);

  const setTenant = (t: Tenant) => {
    setTenantState(t);
    setOrganizationState(null);
    localStorage.setItem('plm_tenant_id', t.id);
  };

  const setOrganization = (org: Organization) => {
    setOrganizationState(org);
    api.setOrganization(org.id);
    localStorage.setItem('plm_organization_id', org.id);
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        organization,
        tenants,
        organizations,
        setTenant,
        setOrganization,
        loading,
        refreshTenants,
        refreshOrganizations,
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
