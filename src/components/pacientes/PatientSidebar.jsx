/**
 * ============================================
 * PatientSidebar - Menu Pacientes V2
 * ============================================
 * Menu lateral simplificado para V2 (single-screen)
 * Apenas 2 itens: Lista de Pacientes + Novo Paciente
 */

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Users, Plus } from "lucide-react";

const MenuItems = [
  {
    id: "list",
    label: "Lista de Pacientes",
    path: "/clinica/pacientes",
    icon: Users,
  },
  {
    id: "new",
    label: "Novo Paciente",
    path: "/clinica/pacientes/novo",
    icon: Plus,
  },
];

export default function PatientSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleNavigate(item) {
    navigate(item.path);
  }

  function isActive(item) {
    return location.pathname === item.path;
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
          Pacientes
        </h3>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {MenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon
                size={18}
                className={active ? "text-blue-600" : "text-gray-400"}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
