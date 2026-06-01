'use client';

import React, { useEffect } from 'react';
import { useSessionStore } from '@/lib/store';

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const loadSession = useSessionStore(state => state.loadSession);
  const isLoading = useSessionStore(state => state.isLoading);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#090d16] text-[#f8fafc] z-50">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-sm text-slate-400 font-medium tracking-wide animate-pulse">
          Synchronizing POS Engine...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
