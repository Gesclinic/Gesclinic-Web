import React from "react";
import { Loader2 } from "lucide-react";
export default function LoadingOverlay({
  visible
}) {
  if (!visible) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "\r absolute inset-0 bg-white/60 backdrop-blur-sm\r flex items-center justify-center\r z-50\r "
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-2"
  }, /*#__PURE__*/React.createElement(Loader2, {
    className: "h-8 w-8 animate-spin text-[hsl(var(--primary))]"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "Carregando...")));
}