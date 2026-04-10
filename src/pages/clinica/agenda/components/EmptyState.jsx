import React from "react";
import { CalendarX } from "lucide-react";

export default function EmptyState({ message = "Nenhum registro encontrado" }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
      <CalendarX className="w-10 h-10 mb-3 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

