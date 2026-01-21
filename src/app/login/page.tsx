'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [maskedDisplay, setMaskedDisplay] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const maskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') return createClient();
    return null;
  });

  /* PASSWORD MASK */
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setMaskedDisplay('•'.repeat(val.length));
  };

  useEffect(() => {
    return () => {
      if (maskTimeoutRef.current) clearTimeout(maskTimeoutRef.current);
    };
  }, []);

  /* LOGIN */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError('');

    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('is_admin')
      .ilike('email', data.user?.email || '')
      .single();

    router.push(employee?.is_admin ? '/admin' : '/home');
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden">

      {/* NAVBAR LOGO */}
      <div className="absolute top-5 left-8 flex items-center gap-3 z-20">
        <img src="/image 6.png" className="h-10" />
        <span className="text-white text-xl font-semibold">
          88 XP
        </span>
      </div>

      {/* CENTER WRAPPER */}
      <div className="flex items-center justify-center min-h-screen relative">

        {/* ORBS AROUND CARD */}

        {/* Top Orb */}
        <img
          src="/Ellipse 42.png"
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-[200px] blur-3xl opacity-90"
        />

        {/* Bottom Left Orb */}
        <img
          src="/Ellipse 41.png"
          className="absolute -bottom-0.5 left-[35%] w-[200px] blur-3xl opacity-90"
        />

        {/* Bottom Right Orb */}
        <img
          src="/Ellipse 43.png"
          className="absolute -bottom-0.5   right-[30%] w-[200px] blur-3xl opacity-70"
        />

        {/* LOGIN CARD */}
<div
  className="w-[360px] p-10 rounded-[24px] border border-white/30 relative z-10 shadow-2xl"
  style={{
    background: `
      linear-gradient(
        135deg,
        rgba(216, 214, 214, 0.12),
        rgba(255,255,255,0.03)
      )
    `,
    
    WebkitBackdropFilter: 'blur(40px)',
    boxShadow: `
      inset 0 0 30px rgba(255,255,255,0.08),
      0 0 40px rgba(150,120,255,0.15)
    `
  }}
>
          <h2 className="text-white text-2xl font-semibold mb-10 text-center">
            Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">

            {/* EMAIL */}
            <div>
              <label className="text-white text-sm mb-2 block">
                Email ID
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your Email ID"
                className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 text-sm"
                required
              />
            </div>

            {/* PASSWORD */}
            <div>
            <label className="text-white text-sm mb-2 block">
             Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your Password"
                className="w-full px-4 py-3 pr-12 rounded-full bg-transparent border border-white/30 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 text-sm"
                required
              />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2"
    >
      <img
        src={showPassword ? '/eye.png' : '/open eye.png'}
        alt="Toggle password"
        className="w-5 h-5 opacity-80 hover:opacity-100 transition"
      />
    </button>
  </div>
</div>


            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-medium rounded-full transition disabled:opacity-60"
              style={{
                background:
                  'linear-gradient(90deg,#7A96C9 0%,#9B86C6 52%,#B37DC5 100%)'
              }}
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
