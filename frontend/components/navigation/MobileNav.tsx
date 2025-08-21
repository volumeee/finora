import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Home, CreditCard, Wallet, Tag, Target, Calculator, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Transaksi', href: '/dashboard/transactions', icon: CreditCard },
  { name: 'Akun', href: '/dashboard/accounts', icon: Wallet },
  { name: 'Kategori', href: '/dashboard/categories', icon: Tag },
  { name: 'Tujuan', href: '/dashboard/goals', icon: Target },
  { name: 'Kalkulator', href: '/dashboard/calculators', icon: Calculator },
  { name: 'Laporan', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Pengaturan', href: '/dashboard/settings', icon: Settings },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="p-2"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setIsOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="text-xl font-bold text-gray-900">Finora</h1>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="mt-4 px-3">
              <ul className="space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        )
                      }
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}