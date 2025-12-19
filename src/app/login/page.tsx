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
  const supabase = createClient();

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">88XP Dashboard</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'text'}
                value={showPassword ? password : maskedDisplay}
                onChange={showPassword ? handlePasswordChange : handleMaskedInput}
                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono tracking-wide"
                required
                autoComplete="off"
                spellCheck={false}
              />
              {/* Show/Hide toggle button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
