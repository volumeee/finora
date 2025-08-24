import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface TenantContextType {
  currentTenant: string | null;
  setCurrentTenant: (tenantId: string) => void;
  getCurrentTenant: () => any;
  refreshCurrentTenant: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenants } = useAuth();
  const [currentTenant, setCurrentTenantState] = useState<string | null>(
    localStorage.getItem('current_tenant')
  );

  // Auto-select first tenant when tenants change and no tenant is selected
  useEffect(() => {
    const storedTenant = localStorage.getItem('current_tenant');
    if (tenants.length > 0) {
      if (!storedTenant || !tenants.find(t => t.id === storedTenant)) {
        // Auto-select first tenant if none selected or stored tenant not found
        setCurrentTenant(tenants[0].id);
      } else if (storedTenant && !currentTenant) {
        // Set current tenant from storage if not already set
        setCurrentTenantState(storedTenant);
      }
    }
  }, [tenants, currentTenant]);

  const setCurrentTenant = (tenantId: string) => {
    setCurrentTenantState(tenantId);
    localStorage.setItem('current_tenant', tenantId);
  };

  const getCurrentTenant = () => {
    return tenants.find(t => t.id === currentTenant);
  };

  const refreshCurrentTenant = () => {
    // Force re-render by updating the context
    // This will cause components using getCurrentTenant to re-render with fresh data
    setCurrentTenantState(currentTenant);
  };

  return (
    <TenantContext.Provider value={{
      currentTenant,
      setCurrentTenant,
      getCurrentTenant,
      refreshCurrentTenant
    }}>
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
