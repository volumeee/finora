import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface TenantContextType {
  currentTenant: string | null;
  setCurrentTenant: (tenantId: string) => void;
  getCurrentTenant: () => any;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenants } = useAuth();
  const [currentTenant, setCurrentTenantState] = useState<string | null>(
    localStorage.getItem('current_tenant') || (tenants.length > 0 ? tenants[0].id : null)
  );

  const setCurrentTenant = (tenantId: string) => {
    setCurrentTenantState(tenantId);
    localStorage.setItem('current_tenant', tenantId);
  };

  const getCurrentTenant = () => {
    return tenants.find(t => t.id === currentTenant);
  };

  return (
    <TenantContext.Provider value={{
      currentTenant,
      setCurrentTenant,
      getCurrentTenant
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
