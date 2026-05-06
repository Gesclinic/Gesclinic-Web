import React, { useEffect } from 'react';
// import { BrowserRouter } from "react-router-dom";
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from '@/lib/customSupabaseClient';
import { clearClinicContextCache } from '@/lib/getClinicContext';

export default function App() {
  useEffect(() => {
    // Listener de mudança de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
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
