'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timeout);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse">
      <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-[shimmer_1s_ease-in-out_infinite]" />
    </div>
  );
}
