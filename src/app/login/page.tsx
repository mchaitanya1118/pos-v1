'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import { Delete } from 'lucide-react';

export default function LoginPage() {
  const [passcode, setPasscode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState<boolean>(true);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const router = useRouter();
  const login = useSessionStore(state => state.login);
  const isAuthenticated = useSessionStore(state => state.isAuthenticated);
  const activeSettings = useSessionStore(state => state.activeSettings);

  // If already logged in, direct to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleKeyPress = useCallback(async (num: string) => {
    if (error) setError(null);
    if (passcode.length >= 4) return;

    const newPasscode = passcode + num;
    setPasscode(newPasscode);

    if (newPasscode.length === 4) {
      // Auto-submit at 4 digits
      const success = await login(newPasscode, remember);
      if (success) {
        router.push('/dashboard');
      } else {
        setIsShaking(true);
        setError("Invalid Passcode. Please try again.");
        setPasscode('');
        setTimeout(() => setIsShaking(false), 500);
      }
    }
  }, [passcode, remember, login, router, error]);

  const handleDelete = useCallback(() => {
    if (passcode.length > 0) {
      setPasscode(passcode.slice(0, -1));
    }
  }, [passcode]);

  const handleClear = useCallback(() => {
    setPasscode('');
    setError(null);
  }, []);

  // Map physical keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleDelete, handleClear]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat px-4 relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* Background Overlay to ensure readability and contrast */}
      <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/45 pointer-events-none"></div>

      {/* Visual Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-slate-200/20 dark:bg-slate-800/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-200/20 dark:bg-slate-800/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm">
        {/* Pinpad Main Container */}
        <div className={`bg-white dark:bg-[#0b1120] rounded-[32px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all duration-300 ${isShaking ? 'animate-shake' : ''}`}>
          <div className="flex flex-col items-center">
            {/* Brand Logo inside passcode section */}
            <div className="flex items-center justify-center gap-3 mb-8 select-none">
              <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                <span className="text-slate-800 dark:text-white">neqtra</span><span className="text-slate-400 ml-0.5">pos</span>
              </h1>
            </div>

            {/* Subtext */}
            <span className="text-xs font-bold tracking-wider text-slate-400 mb-8 uppercase">
              Enter Passcode
            </span>

            {/* Dotted Input indicators */}
            <div className="flex justify-center gap-6 mb-10 select-none">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-300 border-2 ${error
                    ? 'bg-red-500 border-red-500 scale-110 shadow-lg shadow-red-500/20'
                    : index < passcode.length
                      ? 'bg-slate-800 border-slate-800 scale-110 shadow-lg shadow-slate-800/20 dark:bg-slate-200 dark:border-slate-200'
                      : 'border-slate-200 dark:border-slate-700 bg-transparent'
                    }`}
                />
              ))}
            </div>

            {/* Error Message Box */}
            <div className="h-6 mb-8 text-center select-none">
              {error && (
                <span className="text-xs font-bold tracking-wide text-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-1.5 rounded-full">
                  {error}
                </span>
              )}
            </div>

            {/* Touch Numpad */}
            <div className="grid grid-cols-3 gap-x-8 gap-y-4 w-full max-w-[280px] mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="w-16 h-16 rounded-2xl bg-transparent hover:bg-[#f3f4f6] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-3xl font-medium flex items-center justify-center transition-colors active:bg-slate-200 dark:active:bg-slate-700 mx-auto"
                >
                  {num}
                </button>
              ))}

              {/* Clear (C) Key */}
              <button
                type="button"
                onClick={handleClear}
                className="w-16 h-16 rounded-2xl bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 text-xl font-medium flex items-center justify-center transition-colors active:bg-red-100 dark:active:bg-red-500/20 mx-auto"
              >
                C
              </button>

              {/* 0 Key */}
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="w-16 h-16 rounded-2xl bg-transparent hover:bg-[#f3f4f6] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-3xl font-medium flex items-center justify-center transition-colors active:bg-slate-200 dark:active:bg-slate-700 mx-auto"
              >
                0
              </button>

              {/* Backspace Key */}
              <button
                type="button"
                onClick={handleDelete}
                className="w-16 h-16 rounded-2xl bg-transparent hover:bg-[#f3f4f6] dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center transition-colors active:bg-slate-200 dark:active:bg-slate-700 mx-auto"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            {/* Options Panel (Remember me) */}
            <div className="flex items-center justify-center w-full max-w-[280px] px-2 text-slate-400 mt-6 text-[11px] font-bold uppercase tracking-wide">
              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 dark:hover:text-slate-300 transition-colors duration-150">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-slate-800 dark:text-slate-200 focus:ring-slate-800 w-4 h-4 transition-colors"
                />
                Remember Me
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
