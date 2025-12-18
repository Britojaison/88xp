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
        { href: '/admin', label: 'Home', icon: '🏠' },
        { href: '/admin/add-user', label: 'Add User', icon: '➕' },
        { href: '/admin/profile', label: 'Profile', icon: '👤' },
      ]
    : [
        { href: '/home', label: 'Home', icon: '🏠' },
        { href: '/projects', label: 'Projects', icon: '📁' },
        { href: '/profile', label: 'Profile', icon: '👤' },
      ];

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6">
        {isAdmin ? 'Admin Panel' : 'Employee Dashboard'}
      </h2>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-left"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}
