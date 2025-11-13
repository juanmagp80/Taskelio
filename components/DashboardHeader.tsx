'use client';

import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';

interface DashboardHeaderProps {
  userEmail?: string;
  onLogout: () => void;
}

export default function DashboardHeader({ userEmail, onLogout }: DashboardHeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Logo/Título (opcional, puedes personalizarlo) */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden md:block">
          Taskelio
        </h1>
      </div>

      {/* Acciones del header */}
      <div className="flex items-center gap-3">
        {/* Notificaciones */}
        <NotificationBell />
        
        {/* Menú de usuario */}
        <UserMenu userEmail={userEmail} onLogout={onLogout} />
      </div>
    </header>
  );
}
