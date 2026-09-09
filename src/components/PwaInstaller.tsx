'use client';

import React from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

export default function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);

  React.useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('88XP SW registered:', reg.scope))
          .catch((err) => console.error('88XP SW registration failed:', err));
      });
    }

    // 2. Check standalone mode (already installed as PWA)
    const isStandaloneMode =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://'));

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return;
    }

    // Check if dismissed recently (within 7 days)
    const dismissedTime = localStorage.getItem('88xp-pwa-dismissed');
    const isDismissed =
      dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000;

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Capture Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS Safari and not standalone, show install prompt if not dismissed
    if (isIosDevice && !isStandaloneMode && !isDismissed) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem('88xp-pwa-dismissed', Date.now().toString());
    } catch (e) {
      console.warn('Failed to save PWA dismissed state:', e);
    }
  };

  if (isStandalone || (!showPrompt && !showIOSGuide)) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom App Install Banner */}
      {showPrompt && !showIOSGuide && (
        <aside
          aria-label="Install 88XP Application"
          className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#1E1E1E]/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 text-white animate-in fade-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#000509] border border-white/15 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
              <img
                src="/icons/icon-192x192.png"
                alt="88XP App Icon"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white tracking-wide truncate">
                  Install 88XP App
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 font-medium rounded-full border border-blue-500/30">
                  Fast
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">
                Add to home screen for 1-tap app access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-medium text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              {isIOS ? (
                <>
                  <Share className="w-3.5 h-3.5" />
                  <span>How to Add</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Install</span>
                </>
              )}
            </button>
            <button
              onClick={dismissPrompt}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Dismiss"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* iOS Safari Step-by-Step Guidance Modal */}
      {showIOSGuide && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-modal-title"
        >
          <div className="w-full max-w-sm bg-[#18181B] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-center text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#000509] border border-white/15 flex items-center justify-center overflow-hidden">
                  <img src="/icons/icon-192x192.png" alt="88XP" className="w-6 h-6 object-contain" />
                </div>
                <h3 id="ios-modal-title" className="text-sm font-bold text-white tracking-wide">Install 88XP on iPhone</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed text-left">
              Safari lets you add 88XP to your home screen so it runs in full-screen standalone mode without address bars:
            </p>

            <div className="space-y-3 text-left text-xs bg-black/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  1
                </span>
                <div>
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    Tap Share <Share className="w-3.5 h-3.5 text-blue-400" />
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Tap the Share icon at the bottom of Safari (or top in iPad).
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  2
                </span>
                <div>
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    Select &quot;Add to Home Screen&quot; <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Scroll down the sheet and tap <strong>Add to Home Screen</strong>.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  3
                </span>
                <div>
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    Tap &quot;Add&quot;
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Confirm in the top-right corner. 88XP will appear instantly as an app icon!
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSGuide(false);
                setShowPrompt(false);
                try {
                  localStorage.setItem('88xp-pwa-dismissed', Date.now().toString());
                } catch (e) {}
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-98 transition-all py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-lg shadow-blue-600/20"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
