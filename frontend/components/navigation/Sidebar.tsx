import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  Target, 
  Calculator, 
  BarChart3, 
  Settings,
  Wallet,
  Tag
} from 'lucide-react';
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

export default function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Finora</h1>
      </div>
      
      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
