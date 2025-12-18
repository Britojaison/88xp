'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Admin only sees Home and Admin panel
  const navItems = isAdmin
    ? [{ href: '/home', label: 'Home', icon: '🏠' }]
    : [
        { href: '/home', label: 'Home', icon: '🏠' },
        { href: '/projects', label: 'Projects', icon: '📁' },
        { href: '/profile', label: 'Profile', icon: '👤' },
      ];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <h2 className="text-xl font-bold mb-8 px-4">
        {isAdmin ? 'Admin Panel' : 'Dashboard'}
      </h2>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              pathname.startsWith('/admin') ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>👥</span>
            <span>Manage Users</span>
          </Link>
        )}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-8 w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <span>🚪</span>
        <span>Logout</span>
      </button>
    </aside>
  );
}
