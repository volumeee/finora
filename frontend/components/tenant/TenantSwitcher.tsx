import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ResponsiveDialog,
  ResponsiveDialogForm,
  ResponsiveDialogActions,
  ResponsiveDialogButton,
} from '@/components/ui/ResponsiveDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';

export default function TenantSwitcher() {
  const { tenants, refreshAuth } = useAuth();
  const { currentTenant, setCurrentTenant, getCurrentTenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ nama: '', sub_domain: '' });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nama = e.target.value;
    const autoSubdomain = nama
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
    
    setFormData({ nama, sub_domain: autoSubdomain });
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const subdomain = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, sub_domain: subdomain }));
  };
  const { toast } = useToast();

  const selectedTenant = getCurrentTenant();

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.sub_domain) return;

    setIsCreating(true);
    try {
      const newTenant = await apiClient.tenant.create(formData);
      
      // Refresh auth to get updated tenants list
      await refreshAuth();
      
      // Auto-select the new tenant
      setCurrentTenant(newTenant.id);
      
      toast({
        title: 'Tenant berhasil dibuat',
        description: `Tenant "${newTenant.nama}" telah dibuat dan dipilih.`,
      });
      
      setShowCreateForm(false);
      setFormData({ nama: '', sub_domain: '' });
    } catch (error: any) {
      toast({
        title: 'Gagal membuat tenant',
        description: error.message || 'Terjadi kesalahan saat membuat tenant.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            {selectedTenant ? selectedTenant.nama : "Pilih tenant..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Cari tenant..." />
            <CommandEmpty>Tidak ada tenant ditemukan.</CommandEmpty>
            <CommandGroup>
              {tenants.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  value={tenant.nama}
                  onSelect={() => {
                    setCurrentTenant(tenant.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentTenant === tenant.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <div className="font-medium">{tenant.nama}</div>
                    <div className="text-xs text-gray-500">{tenant.peran}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  setShowCreateForm(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Buat tenant baru
              </CommandItem>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <ResponsiveDialog
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        title="Buat Tenant Baru"
        size="md"
      >
        <ResponsiveDialogForm onSubmit={handleCreateTenant}>
          <div className="space-y-2">
            <Label htmlFor="nama" className="text-sm font-medium">
              Nama Tenant
            </Label>
            <Input
              id="nama"
              value={formData.nama}
              onChange={handleNameChange}
              placeholder="Nama perusahaan/organisasi"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sub_domain" className="text-sm font-medium">
              Subdomain
            </Label>
            <div className="flex">
              <Input
                id="sub_domain"
                value={formData.sub_domain}
                onChange={handleSubdomainChange}
                placeholder="subdomain"
                className="rounded-r-none"
                required
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-sm">
                .finora.id
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Otomatis dibuat dari nama tenant. Hanya huruf kecil, angka, dan tanda hubung.
            </p>
          </div>
          
          <ResponsiveDialogActions>
            <ResponsiveDialogButton
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setFormData({ nama: '', sub_domain: '' });
              }}
              disabled={isCreating}
            >
              Batal
            </ResponsiveDialogButton>
            <ResponsiveDialogButton
              type="submit"
              disabled={isCreating || !formData.nama || !formData.sub_domain}
            >
              {isCreating ? 'Membuat...' : 'Buat Tenant'}
            </ResponsiveDialogButton>
          </ResponsiveDialogActions>
        </ResponsiveDialogForm>
      </ResponsiveDialog>
    </>
  );
}
