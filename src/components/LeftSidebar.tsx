'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Shield } from 'lucide-react';

interface LeftSidebarProps {
  userRank: number | null;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
}

export default function LeftSidebar({ userRank, userName, userAvatar }: LeftSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/home', icon: '/Vector (1).png', activeIcon: '/Vector (9).png' },
    { name: 'Task', href: '/projects', icon: '/Vector (6).png', activeIcon: '/Vector (10).png' },
    { name: 'Admin Access', href: '/team', lucideIcon: Shield, requiresRank1: true },
    { name: 'Profile', href: '/profile', icon: '/Vector (7).png', activeIcon: '/Vector (11).png' },
    { name: 'Targets', href: '/targets', icon: '/Group 3 (1).png', activeIcon: '/Group 2.png', requiresRank1: true },
    { name: 'Logout', href: '#', icon: '/Vector%20(13).png', activeIcon: '/Vector%20(14).png', isLogout: true },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.requiresRank1 && userRank !== 1) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/home') return pathname === '/home';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Top Header (< md) */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#000509]/90 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2.5">
          <img src="/image 6.png" alt="88 XP" className="w-7 h-7 object-contain" />
          <span className="text-white font-bold text-base tracking-wider">88XP</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            prefetch={true}
            className="w-8 h-8 rounded-full overflow-hidden border border-white/20 flex items-center justify-center"
            title="My Profile"
          >
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-xs">
                {userName?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141415]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {filteredNavItems.map((item) => {
          const active = isActive(item.href);

          if (item.isLogout) {
            return (
              <button
                key={item.name}
                onClick={() => setShowLogoutModal(true)}
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors text-gray-400 hover:text-white"
                title="Logout"
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-full">
                  <img src={item.icon} alt={item.name} className="w-5 h-5 object-contain opacity-70" />
                </div>
                <span className="text-[10px] font-medium mt-0.5">Exit</span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                active ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
              title={item.name}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                active ? 'bg-white shadow-md shadow-white/20' : 'bg-transparent'
              }`}>
                {item.lucideIcon ? (
                  <item.lucideIcon className={`w-4 h-4 ${active ? 'text-black' : 'text-white'}`} strokeWidth={2} />
                ) : (
                  <img
                    src={active ? item.activeIcon : item.icon}
                    alt={item.name}
                    className="w-4 h-4 object-contain"
                  />
                )}
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${active ? 'text-white font-bold' : 'text-gray-400'}`}>
                {item.name === 'Admin Access' ? 'Admin' : item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Left Sidebar Container (>= md) */}
      <div className="hidden md:flex fixed left-3 sm:left-4 lg:left-5 top-0 h-screen flex-col items-center z-50">
        {/* Logo - Outside the grey box, at top */}
        <div className="pt-4 sm:pt-5 lg:pt-6 mb-4 sm:mb-5 lg:mb-6">
          <img src="/image 6.png" alt="88 XP" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
        </div>

        {/* Navigation Box - Floating grey box, centered vertically */}
        <div className="flex-1 flex items-center">
          <nav className="bg-[#1E1E1E] rounded-[20px] sm:rounded-[24px] lg:rounded-[28px] flex flex-col items-center py-3 sm:py-4 lg:py-5 px-2 sm:px-3 lg:px-4 gap-3 sm:gap-4 lg:gap-5">
            {filteredNavItems.map((item) => {
              const active = isActive(item.href);
              
              if (item.isLogout) {
                return (
                  <button
                    key={item.name}
                    onClick={() => setShowLogoutModal(true)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
                      showLogoutModal ? 'bg-white' : 'hover:bg-white/10'
                    }`}
                    title={item.name}
                  >
                    <img src={showLogoutModal ? item.activeIcon : item.icon} alt={item.name} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 object-contain" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 flex items-center justify-center rounded-full transition-all duration-200 relative ${
                    active 
                      ? 'bg-white' 
                      : 'hover:bg-white/10'
                  }`}
                  title={item.name}
                >
                  {item.lucideIcon ? (
                    <item.lucideIcon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 ${active ? 'text-black' : 'text-white'}`} strokeWidth={1.5} />
                  ) : (
                    <img 
                      src={active ? item.activeIcon : item.icon} 
                      alt={item.name} 
                      className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 object-contain"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Avatar at bottom */}
        <div className="pb-4 sm:pb-5 lg:pb-6">
          <Link
            href="/profile"
            prefetch={true}
            className="block w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/40 transition-colors"
          >
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-[10px] sm:text-xs lg:text-sm">
                {userName?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[#2A2A2A] rounded-[20px] p-6 w-[300px]">
            <h3 className="text-white text-lg font-semibold text-center mb-4">Confirm Logout</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 rounded-full text-white transition-colors"
                style={{
                  backgroundImage: 'url(/Rectangle%20758.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
