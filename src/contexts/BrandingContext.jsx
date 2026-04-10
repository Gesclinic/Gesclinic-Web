import { createContext, useContext, useEffect } from "react";
import { useClinic } from "./ClinicContext";

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const { clinic } = useClinic();

  // aplica no :root
  useEffect(() => {
    if (!clinic) return;

    const root = document.documentElement;

    root.style.setProperty("--primary", clinic.primary_color || "#1A5B8A");
    root.style.setProperty("--secondary", clinic.secondary_color || "#5DB053");
    root.style.setProperty("--brand-color", clinic.brand_color || "#1A5B8A");
  }, [clinic]);

  return (
    <BrandingContext.Provider value={{ brand: clinic }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
