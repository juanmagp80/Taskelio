"use client";

import NotificationBell from '@/components/NotificationBell';
import UserMenu from '@/components/UserMenu';

interface HeaderProps {
  userEmail?: string;
  onLogout?: () => void;
}

export default function Header({ userEmail, onLogout }: HeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-end">
      <div className="flex items-center gap-3">
        <div className="relative">
          <NotificationBell userEmail={userEmail} />
        </div>

        <UserMenu userEmail={userEmail} onLogout={onLogout} />
      </div>
    </header>
  );
}
