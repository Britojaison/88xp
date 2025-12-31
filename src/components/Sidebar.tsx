'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UsersIcon, UserPlusIcon, UserIcon, LayoutDashboardIcon, FolderIcon, LogOutIcon, TargetIcon, MenuIcon, XIcon } from 'lucide-react';

interface SidebarProps {
  isAdmin?: boolean;
  userRank?: number | null;
}

export default function Sidebar({ isAdmin = false, userRank = null }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const baseEmployeeItems = [
    { href: '/home', label: 'Dashboard', icon: 'dashboard' },
    { href: '/projects', label: 'Tasks', icon: 'folder' },
    { href: '/profile', label: 'Profile', icon: 'user' },
  ];

  // Add Targets link for Rank 1 users
  const employeeItems = userRank === 1
    ? [...baseEmployeeItems, { href: '/targets', label: 'Targets', icon: 'target' }]
    : baseEmployeeItems;

  const navItems = isAdmin
    ? [
        { href: '/admin', label: 'Employees', icon: 'users' },
        { href: '/admin/add-user', label: 'Add User', icon: 'user-plus' },
        { href: '/admin/profile', label: 'Profile', icon: 'user' },
      ]
    : employeeItems;

  const getIcon = (iconName: string) => {
    const iconProps = { className: "w-5 h-5" };
    switch (iconName) {
      case 'users': return <UsersIcon {...iconProps} />;
      case 'user-plus': return <UserPlusIcon {...iconProps} />;
      case 'user': return <UserIcon {...iconProps} />;
      case 'dashboard': return <LayoutDashboardIcon {...iconProps} />;
      case 'folder': return <FolderIcon {...iconProps} />;
      case 'target': return <TargetIcon {...iconProps} />;
      default: return null;
    }
  };

  const sidebarContent = (
    <>
      {/* Logo/Brand */}
      <div className="mb-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
            88
          </div>
          <div className="text-center">
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
            {getIcon(item.icon)}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
        
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-red-600/80 text-slate-300 hover:text-white transition-all"
        >
          <LogOutIcon className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <XIcon className="w-6 h-6" />
        ) : (
          <MenuIcon className="w-6 h-6" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 w-72 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6 shadow-2xl overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={`lg:hidden flex flex-col fixed left-0 top-0 w-72 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6 shadow-2xl overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
