import React, { useState } from "react";
import Sidebar from "@/components/Sidebar.jsx";
import Header from "@/components/Header.jsx";
import { ClinicProvider } from "@/contexts/useClinicContext";

export default function MainLayout({ children }) {
  console.log("!!! MainLayout RENDERING !!!");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ClinicProvider>
      <div className="h-screen flex overflow-hidden bg-gray-50">

        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        {/* Conteúdo */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header onToggleMenu={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ClinicProvider>
  );
}
