'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  isAdmin?: boolean;
}

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = isAdmin
    ? [
        { href: '/admin', label: 'Employees', icon: '👥' },
        { href: '/admin/add-user', label: 'Add User', icon: '➕' },
        { href: '/admin/profile', label: 'Profile', icon: '👤' },
      ]
    : [
        { href: '/home', label: 'Dashboard', icon: '📊' },
        { href: '/projects', label: 'Projects', icon: '📁' },
        { href: '/profile', label: 'Profile', icon: '👤' },
      ];

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white min-h-screen p-6 shadow-2xl">
      {/* Logo/Brand */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
            88
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">88XP</h2>
            <p className="text-xs text-slate-400">
              {isAdmin ? 'Admin Panel' : 'Employee Portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3 px-4">
          Navigation
        </p>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              pathname === item.href
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout button at bottom */}
      <div className="absolute bottom-6 left-6 right-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-red-600/80 text-slate-300 hover:text-white transition-all group"
        >
          <span className="text-lg">🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
