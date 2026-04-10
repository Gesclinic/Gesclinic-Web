import React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/customSupabaseClient";
import { LogOut, Home, CalendarDays, Settings } from "lucide-react";

export default function Header() {
  const clinic = JSON.parse(localStorage.getItem("clinic") || "null");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("clinic");
    window.location.href = "/login";
  };

  return (
    <header className="w-full bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
      {/* ESQUERDA */}
      <div className="flex items-center gap-4">
        <Link
          to="/clinica/dashboard"
          className="text-xl font-semibold text-gray-800"
        >
          Gesclinic Web
        </Link>

        {clinic && (
          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md">
            {clinic.name} — {clinic.code}
          </span>
        )}
      </div>

      {/* DIREITA */}
      <nav className="flex items-center gap-6">
        <Link
          to="/clinica/dashboard"
          className="flex items-center gap-1 text-gray-600 hover:text-black"
        >
          <Home size={18} /> Dashboard
        </Link>

        <Link
          to="/clinica/agenda"
          className="flex items-center gap-1 text-gray-600 hover:text-black"
        >
          <CalendarDays size={18} /> Agenda
        </Link>

        <Link
          to="/clinica/configuracoes"
          className="flex items-center gap-1 text-gray-600 hover:text-black"
        >
          <Settings size={18} /> Configurações
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-red-600 hover:text-red-800 ml-4"
        >
          <LogOut size={18} /> Sair
        </button>
      </nav>
    </header>
  );
}
