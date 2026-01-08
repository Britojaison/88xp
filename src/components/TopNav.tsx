'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronDownIcon, MenuIcon, XIcon } from 'lucide-react';

interface TopNavProps {
  isAdmin?: boolean;
  userRank?: number | null;
  userName?: string;
  userEmail?: string;
  userAvatar?: string | null;
}

export default function TopNav({ isAdmin = false, userRank = null, userName = 'User', userEmail = '', userAvatar = null }: TopNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    { href: '/home', label: 'Dashboard' },
    { href: '/projects', label: 'Task' },
    { href: '/profile', label: 'Profile' },
  ];

  // Add Targets link for Rank 1 users
  const employeeItems = userRank === 1
    ? [...baseEmployeeItems, { href: '/targets', label: 'Targets' }]
    : baseEmployeeItems;

  const navItems = isAdmin
    ? [
        { href: '/admin', label: 'Employees' },
        { href: '/admin/add-user', label: 'Add User' },
        { href: '/admin/profile', label: 'Profile' },
      ]
    : employeeItems;

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (userName && userName !== 'User') {
      const names = userName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return userName[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black text-white border-b border-gray-800">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <Link href={isAdmin ? '/admin' : '/home'} className="flex items-center gap-3">
              {/* Circular logo with gb monogram */}
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-purple-400 to-pink-400"></div>
                <div className="relative z-10 flex items-center justify-center w-full h-full">
                  <span className="text-white font-bold text-xs leading-none" style={{ fontFamily: 'sans-serif', letterSpacing: '-0.5px' }}>
                    g<span className="relative">
                      b
                      {/* Small flower icon centered within the 'b' */}
                      <svg 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 text-black" 
                        viewBox="0 0 8 8" 
                        fill="currentColor"
                      >
                        <circle cx="4" cy="4" r="1.2" />
                        <circle cx="2" cy="2" r="0.6" />
                        <circle cx="6" cy="2" r="0.6" />
                        <circle cx="2" cy="6" r="0.6" />
                        <circle cx="6" cy="6" r="0.6" />
                      </svg>
                    </span>
                  </span>
                </div>
              </div>
              <span className="text-white font-medium text-lg">88 XP</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full transition-all ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-300 via-purple-400 to-pink-400 text-white'
                      : 'text-white hover:bg-gray-900'
                  }`}
                >
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              {/* Logout link */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-full text-white hover:bg-gray-900 transition-all"
              >
                <span className="font-medium">Logout</span>
              </button>
            </div>

            {/* User Profile Section - Desktop */}
            <div className="hidden md:flex items-center gap-3 profile-dropdown relative">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                {/* Profile Picture */}
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">{userName}</span>
                  {userEmail && (
                    <span className="text-gray-400 text-xs">{userEmail}</span>
                  )}
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </div>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg border border-gray-800 py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-gray-900 transition-colors"
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
          <div className="md:hidden border-t border-gray-800 bg-black">
            <div className="px-4 py-4 space-y-2">
              {/* User Info - Mobile */}
              <div className="px-4 py-3 bg-gray-900 rounded-lg mb-3 flex items-center gap-3">
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{userName}</p>
                  {userEmail && (
                    <p className="text-xs text-gray-400">{userEmail}</p>
                  )}
                </div>
              </div>

              {/* Navigation Items - Mobile */}
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 rounded-full transition-all ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-300 via-purple-400 to-pink-400 text-white'
                      : 'text-white hover:bg-gray-900'
                  }`}
                >
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              {/* Logout - Mobile */}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-full text-white hover:bg-gray-900 transition-all"
              >
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
