'use client';

interface SidebarProps {
  userEmail?: string;
  onLogout: () => void;
}

export default function Sidebar({ userEmail, onLogout }: SidebarProps) {
  
  return (
    <div className="flex h-full w-56 flex-col fixed inset-y-0 z-50 bg-red-500 border-r border-slate-200">
      <div className="p-4">
        <h1 className="text-white font-bold">DEBUG SIDEBAR</h1>
        <p className="text-white text-sm">Email: {userEmail}</p>
        <button 
          onClick={onLogout}
          className="mt-4 bg-white text-red-500 px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
