import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useClinicContext } from "@/contexts/useClinicContext.jsx";

export default function Layout({ children }) {
  const { clinic } = useClinicContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-800">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 bg-background rounded-tl-2xl shadow-inner">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}