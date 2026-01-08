'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UsersIcon, UserPlusIcon, UserIcon, LayoutDashboardIcon, FolderIcon, LogOutIcon, TargetIcon, MenuIcon, XIcon } from 'lucide-react';

interface TopNavProps {
  isAdmin?: boolean;
  userRank?: number | null;
  userName?: string;
}

export default function TopNav({ isAdmin = false, userRank = null, userName = 'User' }: TopNavProps) {
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

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <Link href={isAdmin ? '/admin' : '/home'} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                88
              </div>
              <div className="hidden sm:block">
                <h2 className="text-xl font-bold text-white">88XP</h2>
                <p className="text-xs text-slate-400 -mt-1">
                  {isAdmin ? 'Admin Panel' : 'Employee Portal'}
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {getIcon(item.icon)}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* User Info & Logout - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userName}</p>
                {!isAdmin && userRank && (
                  <p className="text-xs text-slate-400">Rank #{userRank}</p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-red-600/80 text-slate-300 hover:text-white transition-all"
              >
                <LogOutIcon className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <XIcon className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-900">
            <div className="px-4 py-4 space-y-2">
              {/* User Info - Mobile */}
              <div className="px-4 py-3 bg-slate-800/50 rounded-lg mb-3">
                <p className="text-sm font-medium text-white">{userName}</p>
                {!isAdmin && userRank && (
                  <p className="text-xs text-slate-400">Rank #{userRank}</p>
                )}
              </div>

              {/* Navigation Items - Mobile */}
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {getIcon(item.icon)}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              {/* Logout - Mobile */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-700/50 hover:bg-red-600/80 text-slate-300 hover:text-white transition-all"
              >
                <LogOutIcon className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 mt-16"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
