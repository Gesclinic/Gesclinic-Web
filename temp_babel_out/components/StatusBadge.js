import React from "react";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, APPOINTMENT_STATUSES } from "@/lib/appointmentStatusConstants";
export default function StatusBadge({
  status,
  size = "md"
}) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG[APPOINTMENT_STATUSES.SCHEDULED];

  // ✅ Tamanhos: 'sm' (compacto), 'md' (padrão), 'lg' (expandido para mais espaço)
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-sm px-4 py-2"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: cn("border rounded-md font-medium inline-flex items-center gap-1 whitespace-nowrap", sizeClasses[size] || sizeClasses.md, cfg.color, cfg.borderColor, cfg.textColor)
  }, /*#__PURE__*/React.createElement("span", null, cfg.icon), /*#__PURE__*/React.createElement("span", null, cfg.label));
}