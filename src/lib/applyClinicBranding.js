export function applyClinicBranding(clinic) {
  const root = document.documentElement;
  if (!root) return;

  if (clinic) {
    root.style.setProperty("--color-primary", clinic.primary_color || "#1A5B8A");
    root.style.setProperty("--color-secondary", clinic.secondary_color || "#0B63F6");
    root.style.setProperty("--color-background", clinic.background_color || "#F8FAFC");
  } else {
    // Fallback to default colors if no clinic is loaded
    root.style.setProperty("--color-primary", "#1A5B8A");
    root.style.setProperty("--color-secondary", "#0B63F6");
    root.style.setProperty("--color-background", "#F8FAFC");
  }
}