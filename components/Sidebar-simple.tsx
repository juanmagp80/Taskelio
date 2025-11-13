'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, LogOut } from 'lucide-react';

interface SidebarProps {
  userEmail?: string;
  onLogout: () => void;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Clientes',
    href: '/dashboard/clients',
    icon: Users,
  },
];

export default function Sidebar({ userEmail, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-56 flex-col fixed inset-y-0 z-50 bg-slate-50 border-r border-slate-200 shadow-lg">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-slate-200 px-4 bg-white">
        <h1 className="text-lg font-bold text-slate-900">
          Taskelio
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'text-slate-700 hover:bg-slate-100'
                }
              `}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3">
          <p className="text-xs text-slate-500">Conectado como:</p>
          <p className="text-sm font-medium text-slate-900 truncate">{userEmail}</p>
        </div>
        <button
          onClick={() => {
            if (onLogout) {
              onLogout();
            }
          }}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
