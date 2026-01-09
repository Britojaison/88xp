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

export default function TopNav({ isAdmin = false, userName = 'User', userEmail = '', userAvatar = null }: TopNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const openLogoutModal = () => {
    setShowLogoutModal(true);
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const employeeItems = [
    { href: '/home', label: 'Dashboard' },
    { href: '/projects', label: 'Task' },
    { href: '/profile', label: 'Profile' },
    { href: '/targets', label: 'Targets' },
  ];

  const navItems = isAdmin
    ? [
        { href: '/admin', label: 'Employees' },
        { href: '/admin/add-user', label: 'Add User' },
        { href: '/admin/profile', label: 'Profile' },
      ]
    : employeeItems;

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
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black text-white border-b border-[#5E5E5E]">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[80px]">
            <Link href={isAdmin ? '/admin' : '/home'} className="flex items-center gap-3">
              <img src="/image 6.png" alt="88 XP" className="w-10 h-10" />
              <span className="text-white font-medium text-lg">88 XP</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-5 h-[38px] rounded-[20px] transition-all flex items-center justify-center ${
                    pathname === item.href ? 'text-white' : 'text-white hover:bg-gray-900'
                  }`}
                  style={pathname === item.href ? {
                    backgroundImage: 'url(/Rectangle%2010.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {}}
                >
                  <span className="font-medium text-[16px]">{item.label}</span>
                </Link>
              ))}
              <button
                onClick={openLogoutModal}
                className="px-5 h-[38px] rounded-[20px] text-white hover:bg-gray-900 transition-all flex items-center justify-center"
              >
                <span className="font-medium text-[16px]">Logout</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3 profile-dropdown relative">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">{userName}</span>
                  {userEmail && <span className="text-gray-400 text-xs">{userEmail}</span>}
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </div>
              {isProfileDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg border border-gray-800 py-1 z-50">
                  <button onClick={openLogoutModal} className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors rounded-lg">
                    Logout
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-gray-900 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-black">
            <div className="px-4 py-4 space-y-2">
              <div className="px-4 py-3 bg-gray-900 rounded-lg mb-3 flex items-center gap-3">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{userName}</p>
                  {userEmail && <p className="text-xs text-gray-400">{userEmail}</p>}
                </div>
              </div>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 rounded-[20px] transition-all ${
                    pathname === item.href ? 'text-white' : 'text-white hover:bg-gray-900'
                  }`}
                  style={pathname === item.href ? {
                    backgroundImage: 'url(/Rectangle%2010.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {}}
                >
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              <button onClick={openLogoutModal} className="w-full text-left px-4 py-3 rounded-full text-white hover:bg-gray-900 transition-all">
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30 mt-16" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLogoutModal(false)} />
          <div 
            className="relative w-[400px] rounded-[30px] flex flex-col items-center py-8 px-6"
            style={{ backgroundColor: '#2D2C2C' }}
          >
            <h2 className="text-white text-[20px] font-semibold mb-2">Logout</h2>
            <p className="text-gray-400 text-[13px] mb-6">Are you sure you want to Logout</p>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="w-[160px] h-[40px] rounded-[15px] text-white font-semibold text-[14px] transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, #4ECDC4 0%, #44A8B3 50%, #3B82A2 100%)' }}
              >
                Log Out
              </button>
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="text-white text-[14px] font-medium hover:opacity-80 transition-opacity px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
