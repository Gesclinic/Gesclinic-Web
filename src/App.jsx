import React, { useEffect } from 'react';
// import { BrowserRouter } from "react-router-dom";
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from '@/lib/customSupabaseClient';
import { clearClinicContextCache } from '@/lib/getClinicContext';

// 🔍 Debug: Log env vars in production
if (import.meta.env.PROD) {
  console.log('🔍 [PROD] import.meta.env vars:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? '✓ SET' : '❌ UNDEFINED',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ SET' : '❌ UNDEFINED',
  });
}

export default function App() {
  useEffect(() => {
    // 🔄 Listener de mudança de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log('🔄 Auth mudou:', event);
      clearClinicContextCache();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}
