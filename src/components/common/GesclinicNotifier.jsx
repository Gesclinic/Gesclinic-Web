import React, { useEffect } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext.jsx";
import { supabase } from "@/lib/customSupabaseClient.js";

export default function GesclinicNotifier() {
  // defensive: useAuth() might be undefined during boot if provider not mounted yet
  const auth = useAuth() || {};
  const session = auth.session ?? null;
  const user = auth.user ?? null;

  useEffect(() => {
    if (!session && !user) {
      // nothing to do
      return;
    }
    // exemplo: log; substitua por lógica real de notificações
    console.log("GesclinicNotifier: session present:", !!session, "user:", user?.email);
    // se for necessário usar supabase e session, verifique antes de chamar APIs
    // exemplo de proteção em chamadas que poderiam tentar refresh token automaticamente:
    // try { ... } catch(err) { console.warn("Notif error", err); }
  }, [session, user]);

  return null;
}
