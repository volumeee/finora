import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

export default function TenantSwitcher() {
  const { tenants } = useAuth();
  const { currentTenant, setCurrentTenant, getCurrentTenant } = useTenant();
  const [open, setOpen] = React.useState(false);

  const selectedTenant = getCurrentTenant();

  return (
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}
