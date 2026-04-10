import { useCallback } from "react";

export function useToast() {
  return useCallback(({ title, description, variant }) => {
    // Replace with your preferred toast library (e.g., react-hot-toast, sonner, radix, chakra)
    window.alert(`${title}\n${description}`); // TEMP: Replace with real toast
    // Example for sonner: toast[variant || "default"](title, { description });
  }, []);
}
