import React from 'react';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import TenantSwitcher from '@/components/tenant/TenantSwitcher';
import MobileNav from '@/components/navigation/MobileNav';

export default function Header() {
  const { user, logout } = useAuth();
  const { getCurrentTenant } = useTenant();
  
  const currentTenant = getCurrentTenant();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <MobileNav />
          <div className="lg:hidden">
            <h1 className="text-lg font-bold text-gray-900">Finora</h1>
          </div>
          <div className="hidden sm:block min-w-0">
            <TenantSwitcher />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="sm:hidden">
            <TenantSwitcher />
          </div>
          
          <Button variant="ghost" size="sm" className="hidden md:flex h-9 w-9 p-0">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                    {user?.nama_lengkap?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:block truncate max-w-24">
                  {user?.nama_lengkap}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="pb-2">
                <div className="space-y-1">
                  <p className="font-medium truncate">{user?.nama_lengkap}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  {currentTenant && (
                    <p className="text-xs text-blue-600 truncate font-medium">
                      {currentTenant.nama}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
