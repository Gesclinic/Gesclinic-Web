import { urlBase64ToUint8Array } from "./somewhere.js";
import { ensureServiceWorkerRegistered } from "@/utils/swRegister.js";

export async function subscribeToPush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.info("Push not supported in this environment.");
    return null;
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.info("VAPID public key not set (VITE_VAPID_PUBLIC_KEY) — skipping push subscribe.");
    return null;
  }

  try {
    const reg = await ensureServiceWorkerRegistered("/service-worker.js");
    if (!reg) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.info("Notification permission not granted:", permission);
      return null;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // --- envia subscription para Supabase (tabela: push_subscriptions) ---
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const payload = {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          created_at: new Date().toISOString()
          // opcional: user_id, clinic_id - adicione aqui se quiser
        };
        await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/push_subscriptions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: "return=representation"
          },
          body: JSON.stringify(payload),
        });
        console.log("push subscription enviada ao Supabase");
      } catch (err) {
        console.warn("Falha ao enviar subscription para Supabase (ignorado):", err);
      }
    } else {
      // envia para backend alternativo se existir VITE_API_BASE_URL
      const apiBase = import.meta.env.VITE_API_BASE_URL || "";
      if (apiBase) {
        try {
          await fetch(`${apiBase}/api/push/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription }),
          });
          console.log("push subscription enviada ao backend API");
        } catch (err) {
          console.warn("Failed to send subscription to server:", err);
        }
      }
    }

    return subscription;
  } catch (err) {
    console.warn("subscribeToPush error:", err);
    return null;
  }
}