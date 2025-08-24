import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantSettings } from '@/hooks/useSettings';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function TenantSettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex">
            <Skeleton className="h-10 flex-1 rounded-r-none" />
            <Skeleton className="h-10 w-20 rounded-l-none" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

export default function TenantSettings() {
  const { getCurrentTenant, currentTenant: tenantId, refreshCurrentTenant } = useTenant();
  const { tenants, updateTenants } = useAuth();
  const { getTenant, updateTenant, isLoading } = useTenantSettings();
  const [formData, setFormData] = useState({ nama: '', sub_domain: '' });
  const [initialLoading, setInitialLoading] = useState(true);

  const loadTenant = async () => {
    if (!tenantId) return;
    
    setInitialLoading(true);
    try {
      const tenant = await getTenant(tenantId);
      setFormData({
        nama: tenant.nama || '',
        sub_domain: tenant.sub_domain || ''
      });
    } catch (error) {
      // Fallback to context data if API fails
      const currentTenant = getCurrentTenant();
      if (currentTenant) {
        setFormData({
          nama: currentTenant.nama || '',
          sub_domain: currentTenant.sub_domain || ''
        });
      }
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId) return;
    
    try {
      const updatedTenant = await updateTenant(tenantId, formData);
      
      // Update tenants in AuthContext with the new data
      const updatedTenants = tenants.map(tenant => 
        tenant.id === tenantId 
          ? { ...tenant, nama: updatedTenant.nama, sub_domain: updatedTenant.sub_domain }
          : tenant
      );
      updateTenants(updatedTenants);
      
      // Force refresh of current tenant in TenantContext
      refreshCurrentTenant();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (initialLoading) {
    return <TenantSettingsSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informasi Organisasi</CardTitle>
        <CardDescription>
          Kelola informasi organisasi/tenant Anda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Organisasi</Label>
            <Input
              id="nama"
              value={formData.nama}
              onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub_domain">Subdomain</Label>
            <div className="flex">
              <Input
                id="sub_domain"
                value={formData.sub_domain}
                onChange={(e) => setFormData(prev => ({ ...prev, sub_domain: e.target.value }))}
                className="rounded-r-none"
                disabled={isLoading}
                required
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                .finora.id
              </span>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
