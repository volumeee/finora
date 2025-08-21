import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/components/ui/use-toast';

export default function TenantSettings() {
  const { getCurrentTenant } = useTenant();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const currentTenant = getCurrentTenant();
  const [formData, setFormData] = useState({
    nama: currentTenant?.nama || '',
    sub_domain: currentTenant?.sub_domain || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement tenant update API call
      toast({
        title: "Organisasi diperbarui",
        description: "Informasi organisasi berhasil diperbarui",
      });
    } catch (error: unknown) {
      console.error('Tenant update error:', error);
      toast({
        title: "Gagal memperbarui organisasi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub_domain">Subdomain</Label>
            <div className="flex">
              <Input
                id="sub_domain"
                name="sub_domain"
                value={formData.sub_domain}
                onChange={handleChange}
                className="rounded-r-none"
                required
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                .finora.id
              </span>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
