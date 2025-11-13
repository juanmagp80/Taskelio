'use client';

import ClientMessageAlert from '@/components/ClientMessageAlert';
import NotificationBell from '@/components/NotificationBell';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import { cn } from '@/src/lib/utils';
import {
  BarChart3,
  Brain,
  Briefcase,
  Calculator,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  FileText,
  Home,
  LogOut,
  MessageCircle,
  Receipt,
  Settings,
  Star,
  Users,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface SidebarProps {
  userEmail?: string;
  onLogout: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  isNew?: boolean;
  isPremium?: boolean;
  submenu?: {
    name: string;
    href: string;
    icon?: any;
    highlight?: boolean;
  }[];
}

const navigation: NavigationItem[] = [
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
  {
    name: 'Presupuestos',
    href: '/dashboard/budgets',
    icon: Calculator,
  },
  {
    name: 'Contratos',
    href: '/dashboard/contracts',
    icon: FileText,
  },
  {
    name: 'Proyectos',
    href: '/dashboard/projects',
    icon: Briefcase,
  },
  {
    name: 'Templates',
    href: '/dashboard/templates',
    icon: Zap,
  },
  {
    name: 'Automaciones IA',
    href: '/dashboard/ai-automations',
    icon: Brain,
  },
  {
    name: 'Tareas',
    href: '/dashboard/tasks',
    icon: CheckSquare,
  },
  {
    name: 'Tiempo',
    href: '/dashboard/tiempo',
    icon: Clock,
  },
  {
    name: 'Facturas',
    href: '/dashboard/invoices',
    icon: Receipt,
  },
  {
    name: 'Calendario',
    href: '/dashboard/calendar',
    icon: Calendar,
  },
  {
    name: 'Reportes',
    href: '/dashboard/reports',
    icon: BarChart3,
  },
  {
    name: 'Comunicaciones',
    href: '/dashboard/client-communications',
    icon: MessageCircle,
  },
  {
    name: 'Facturación',
    href: '/dashboard/billing',
    icon: CreditCard,
  },
];

export default function Sidebar({ userEmail, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { trialInfo, canUseFeatures } = useTrialStatus(userEmail || '');

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  // Click outside handler para cerrar el menú de usuario
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Verificar si el usuario es PRO (tiene suscripción activa o plan pro)
  const isProUser = trialInfo?.plan === 'pro' && canUseFeatures;

  return (
    <div className="flex h-screen w-48 lg:w-52 xl:w-56 flex-col fixed inset-y-0 z-50 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-3xl border-r border-slate-200/60 dark:border-slate-700/60 shadow-2xl shadow-slate-900/3 dark:shadow-black/40 transition-all duration-300">
      {/* Premium Logo - Más compacto para pantallas normales */}
      <div className="flex h-12 lg:h-14 xl:h-16 items-center border-b border-slate-200/60 dark:border-slate-700/60 px-2 lg:px-3 xl:px-4 pt-1 lg:pt-2 xl:pt-3 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-slate-900/50 dark:to-slate-800/50 transition-all duration-300 flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-sm lg:text-base xl:text-lg font-black tracking-tight relative">
            <span className="relative bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-900 dark:from-slate-100 dark:via-indigo-300 dark:to-violet-300 bg-clip-text text-transparent">
              Taskelio
              <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400 rounded-full opacity-80"></div>
            </span>
          </h1>
          {/* Solo mostrar PRO si el usuario es premium */}
          {isProUser && (
            <span className="ml-1 lg:ml-2 text-xs bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 px-1 lg:px-1.5 py-0.5 rounded-full font-medium transition-colors duration-300">
              PRO
            </span>
          )}

          {/* Campana de notificaciones */}
          <div className="flex items-center gap-0.5 lg:gap-1">
            <NotificationBell userEmail={userEmail} />
            <ClientMessageAlert userEmail={userEmail || ''} />
          </div>
        </div>
      </div>

      {/* Premium Navigation - Más compacta para pantallas normales */}
      <nav className="flex-1 overflow-y-auto space-y-0.5 px-2 py-2 lg:space-y-1 lg:px-3 lg:py-3 xl:py-4 min-h-0">
        {navigation.map((item) => {
          // Lógica especial para Dashboard: solo activo cuando estás exactamente en /dashboard
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          const IconComponent = item.icon;
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isExpanded = expandedMenus.includes(item.name);
          const hasActiveSubmenu = hasSubmenu && item.submenu?.some(sub =>
            pathname === sub.href || pathname.startsWith(sub.href + '/')
          );

          return (
            <div key={item.name}>
              {hasSubmenu ? (
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    'group flex items-center justify-between w-full px-2 py-1.5 lg:px-2.5 lg:py-2 xl:px-3 text-xs lg:text-sm font-semibold rounded-lg transition-all duration-300 relative',
                    isActive || hasActiveSubmenu
                      ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-700 dark:text-slate-300 hover:text-indigo-900 dark:hover:text-indigo-400 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 hover:shadow-md hover:shadow-slate-900/3'
                  )}
                >
                  {(isActive || hasActiveSubmenu) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-violet-400 opacity-20 rounded-lg"></div>
                  )}
                  <div className="flex items-center">
                    <IconComponent
                      className={cn(
                        'mr-1.5 lg:mr-2 xl:mr-3 h-3 lg:h-3.5 xl:h-4 w-3 lg:w-3.5 xl:w-4 flex-shrink-0 transition-transform duration-300',
                        isActive || hasActiveSubmenu
                          ? 'text-white group-hover:scale-110'
                          : 'text-slate-600 group-hover:text-indigo-600 group-hover:scale-110'
                      )}
                    />
                    <span className="relative z-10 text-xs lg:text-sm">{item.name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-3 lg:w-3.5 xl:w-4 h-3 lg:h-3.5 xl:h-4 text-current" />
                  ) : (
                    <ChevronRight className="w-3 lg:w-3.5 xl:w-4 h-3 lg:h-3.5 xl:h-4 text-current" />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-1.5 lg:px-2.5 lg:py-2 xl:px-3 text-xs lg:text-sm font-semibold rounded-lg transition-all duration-300 relative',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-700 dark:text-slate-300 hover:text-indigo-900 dark:hover:text-indigo-400 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 hover:shadow-md hover:shadow-slate-900/3'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-violet-400 opacity-20 rounded-lg"></div>
                  )}
                  <IconComponent
                    className={cn(
                      'mr-1.5 lg:mr-2 xl:mr-3 h-3 lg:h-3.5 xl:h-4 w-3 lg:w-3.5 xl:w-4 flex-shrink-0 transition-transform duration-300',
                      isActive
                        ? 'text-white group-hover:scale-110'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110'
                    )}
                  />
                  <span className="relative z-10 flex-1 text-xs lg:text-sm">{item.name}</span>
                  <div className="flex items-center gap-0.5 lg:gap-1 ml-1">
                    {(item as any).isNew && (
                      <span className="bg-green-500 text-white text-xs font-medium px-1 py-0.5 rounded-full lg:px-1.5">
                        Nuevo
                      </span>
                    )}
                    {(item as any).isPremium && (
                      <span className="bg-purple-500 text-white text-xs font-medium px-1 py-0.5 rounded-full flex items-center gap-0.5 lg:px-1.5 lg:gap-1">
                        <Star className="h-2 w-2 lg:h-2.5 lg:w-2.5" />
                        <span className="hidden lg:inline">Pro</span>
                      </span>
                    )}
                  </div>
                </Link>
              )}

              {/* Submenú - Más compacto para pantallas normales */}
              {hasSubmenu && isExpanded && (
                <div className="ml-3 lg:ml-4 xl:ml-6 mt-0.5 lg:mt-1 space-y-0.5">
                  {item.submenu?.map((subItem) => {
                    const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                    const SubIcon = subItem.icon;

                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={cn(
                          'group flex items-center px-1.5 py-1 lg:px-2 lg:py-1.5 xl:px-3 text-xs lg:text-sm rounded-md transition-all duration-300 relative',
                          isSubActive
                            ? 'bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 font-medium'
                        )}
                      >
                        {SubIcon && (
                          <SubIcon
                            className={cn(
                              'mr-1 lg:mr-1.5 xl:mr-2 h-2.5 lg:h-3 xl:h-3.5 w-2.5 lg:w-3 xl:w-3.5 flex-shrink-0',
                              isSubActive ? 'text-indigo-600' : 'text-current'
                            )}
                          />
                        )}
                        <span className="text-xs lg:text-sm">{subItem.name}</span>
                        {subItem.highlight && (
                          <div className="ml-auto w-1 h-1 lg:w-1.5 lg:h-1.5 bg-indigo-400 rounded-full"></div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Premium User section - Más compacta para pantallas normales */}
      <div className="border-t border-slate-200/60 dark:border-slate-700/60 p-1.5 lg:p-2 xl:p-3 bg-gradient-to-r from-slate-50/50 to-indigo-50/30 dark:from-slate-900/50 dark:to-indigo-900/30 transition-all duration-300 flex-shrink-0">

        {/* Estado de la suscripción */}
        <div className="mb-1.5 lg:mb-2 xl:mb-3">
          <SubscriptionStatus userEmail={userEmail} />
        </div>

        {/* Información del usuario con menú desplegable */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center w-full mb-1.5 lg:mb-2 xl:mb-3 p-1 lg:p-1.5 xl:p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 shadow-md shadow-slate-900/3 dark:shadow-black/10 transition-all duration-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 hover:shadow-lg"
          >
            <div className="flex-shrink-0">
              <div className="h-6 lg:h-7 xl:h-8 w-6 lg:w-7 xl:w-8 rounded-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 dark:shadow-indigo-400/30">
                <span className="text-xs font-bold text-white">
                  {userEmail?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="ml-1 lg:ml-1.5 xl:ml-2 flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate transition-colors duration-300">
                {userEmail?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium transition-colors duration-300 hidden xl:block">
                {userEmail || 'Sin email'}
              </p>
            </div>
            <ChevronUp
              className={cn(
                "h-4 w-4 text-slate-600 dark:text-slate-400 transition-transform duration-200",
                isUserMenuOpen && "rotate-180"
              )}
            />
          </button>

          {/* Menú desplegable hacia arriba */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
              {/* Email header */}
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {userEmail}
                </p>
              </div>

              {/* Opciones del menú */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </Link>

                <Link
                  href="/dashboard/billing"
                  className="flex items-center px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Facturación
                </Link>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}