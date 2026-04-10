export async function ensureServiceWorkerRegistered(scriptPath = "/service-worker.js") {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(scriptPath);
  } catch (err) {
    console.warn("ensureServiceWorkerRegistered: falha ao registrar SW (ignorado):", err);
    return null;
  }
}