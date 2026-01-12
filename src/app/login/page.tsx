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
  // Create client lazily only on client side
  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') {
      return createClient();
    }
    return null;
  });

  // Handle password input with delayed masking
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const newValue = input.value;
    const cursorPos = input.selectionStart || 0;
    
    // Determine what changed
    const lengthDiff = newValue.length - password.length;
    
    if (lengthDiff > 0) {
      // Characters added - find the new character(s)
      const newChars = newValue.slice(cursorPos - lengthDiff, cursorPos);
      const beforeCursor = '•'.repeat(cursorPos - lengthDiff);
      const afterCursor = '•'.repeat(newValue.length - cursorPos);
      
      // Show the new character(s) briefly
      setMaskedDisplay(beforeCursor + newChars + afterCursor);
      
      // Clear existing timeout
      if (maskTimeoutRef.current) {
        clearTimeout(maskTimeoutRef.current);
      }
      
      // Mask after 1.5 seconds
      maskTimeoutRef.current = setTimeout(() => {
        setMaskedDisplay('•'.repeat(newValue.length));
      }, 1500);
    } else {
      // Characters deleted - just update mask
      setMaskedDisplay('•'.repeat(newValue.length));
    }
    
    setPassword(newValue);
  };

  // Handle input when showing masked display
  const handleMaskedInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplay = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    // Figure out what changed by comparing lengths
    if (newDisplay.length > maskedDisplay.length) {
      // Character(s) added - extract the new character
      const addedCount = newDisplay.length - maskedDisplay.length;
      const newChar = newDisplay.slice(cursorPos - addedCount, cursorPos);
      
      // Insert into actual password at same position
      const newPassword = password.slice(0, cursorPos - addedCount) + newChar + password.slice(cursorPos - addedCount);
      setPassword(newPassword);
      
      // Update display with new char visible
      const beforeCursor = '•'.repeat(cursorPos - addedCount);
      const afterCursor = '•'.repeat(newPassword.length - cursorPos);
      setMaskedDisplay(beforeCursor + newChar + afterCursor);
      
      // Clear existing timeout
      if (maskTimeoutRef.current) {
        clearTimeout(maskTimeoutRef.current);
      }
      
      // Mask after 1.5 seconds
      maskTimeoutRef.current = setTimeout(() => {
        setMaskedDisplay('•'.repeat(newPassword.length));
      }, 1500);
    } else if (newDisplay.length < maskedDisplay.length) {
      // Character(s) deleted
      const deletedCount = maskedDisplay.length - newDisplay.length;
      const newPassword = password.slice(0, cursorPos) + password.slice(cursorPos + deletedCount);
      setPassword(newPassword);
      setMaskedDisplay('•'.repeat(newPassword.length));
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (maskTimeoutRef.current) {
        clearTimeout(maskTimeoutRef.current);
      }
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Client not initialized. Please refresh the page.');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('is_admin')
      .ilike('email', data.user?.email || '')
      .single();

    if (empError) {
      console.error('Employee lookup error:', empError);
    }

    if (employee?.is_admin === true) {
      router.push('/admin');
    } else {
      router.push('/home');
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-black">
      {/* Left side - Illustrations (hidden on mobile, visible on lg+) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* 88 XP Logo */}
        <div className="absolute top-4 left-4 xl:top-8 xl:left-8 flex items-center gap-3 z-20">
          <img src="/image 6.png" alt="88 XP" className="h-10 xl:h-12 w-auto" />
          <span className="text-white text-xl xl:text-2xl font-semibold">88 XP</span>
        </div>

        {/* 1. Business person (8669076 1) - Top right with Vector2 background */}
        <div className="absolute top-8 right-8 xl:top-16 xl:right-16 z-9">
          {/* Vector2 background behind business person */}
          <img src="/Vector (2).png" alt="" className="absolute -top-0 -left-1 w-[200px] xl:w-[280px] 2xl:w-[320px] h-auto" />
          {/* Business person illustration */}
          <img src="/8669076 1.png" alt="Business person" className="relative z-10 w-[180px] xl:w-[240px] 2xl:w-[280px] h-auto" />
        </div>

        {/* 2. Working together (070ee491...) - Center diagonal position with Vector3 and Vector4 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          {/* Vector3 background */}
          <img src="/Vector (3).png" alt="" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] xl:w-[400px] 2xl:w-[450px] h-auto" />
          {/* Vector4 background */}
          <img src="/Vector (4).png" alt="" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[280px] xl:w-[350px] 2xl:w-[500px] h-auto" />
          {/* Working together illustration - centered */}
          <img src="/070ee491-fb67-4e89-805b-d3fcbfab3b8a 1.png" alt="Working together" className="relative z-10 w-[220px] xl:w-[280px] 2xl:w-[320px] h-auto" />
        </div>

        {/* 3. Team illustration (4898275 1) - Bottom left with Vector5 background */}
        <div className="absolute bottom-8 left-8 xl:bottom-16 xl:left-16 z-10 flex items-center justify-center">
          {/* Vector5 background behind team - centered */}
          <img src="/Vector (5).png" alt="" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[280px] xl:w-[350px] 2xl:w-[400px] h-auto" />
          {/* Team illustration - centered */}
          <img src="/4898275 1.png" alt="Team illustration" className="relative z-10 w-[200px] xl:w-[240px] 2xl:w-[280px] h-auto" />
        </div>
      </div>

      {/* Right side - Login form with gradient background */}
      <div 
        className="w-full lg:w-[400px] xl:w-[450px] 2xl:w-[500px] min-h-screen lg:min-h-0 flex items-center justify-center relative"
        style={{
          background: 'linear-gradient(135deg, #B57BC5 0%, #7A96C9 100%)'
        }}
      >
        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 flex items-center gap-3 lg:hidden">
          <img src="/image 6.png" alt="88 XP" className="h-10 w-auto" />
          <span className="text-white text-xl font-semibold">88 XP</span>
        </div>

        <div className="w-full max-w-[300px] sm:max-w-sm px-4 sm:px-6 xl:px-11">
          <h1 className="text-white text-[32px] sm:text-[40px] xl:text-[40px] font-bold mb-4 sm:mb-6 xl:mb-4 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>Login</h1>

          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4 xl:space-y-5">
            <div>
              <label className="block text-white text-xs sm:text-sm mb-1.5 sm:mb-2">Email ID</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your Email ID"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 xl:py-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-xs sm:text-sm xl:text-base"
                required
              />
            </div>
            
            <div>
              <label className="block text-white text-xs sm:text-sm mb-1.5 sm:mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'text'}
                  value={showPassword ? password : maskedDisplay}
                  onChange={showPassword ? handlePasswordChange : handleMaskedInput}
                  placeholder="Enter your Password"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 xl:py-3 pr-10 sm:pr-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 font-mono tracking-wide text-xs sm:text-sm xl:text-base"
                  required
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-red-200 text-xs sm:text-sm text-center">{error}</p>}
            
            <div className="flex justify-center pt-1 sm:pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[30px] sm:h-[32px] xl:h-[35px] text-white font-medium disabled:opacity-50 transition-all duration-200 text-xs sm:text-sm xl:text-base rounded-full"
                style={{ 
                  backgroundColor: '#B57BC5'
                }}
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
