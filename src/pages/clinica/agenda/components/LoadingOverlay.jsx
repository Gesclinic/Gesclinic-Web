import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingOverlay({ visible }) {
  if (!visible) return null;

  return (
    <div className="
      absolute inset-0 bg-white/60 backdrop-blur-sm
      flex items-center justify-center
      z-50
    ">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
        <p className="text-sm text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}

