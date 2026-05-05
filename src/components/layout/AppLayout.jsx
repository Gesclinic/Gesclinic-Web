import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* SIDEBAR */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <Header onToggleMenu={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* CONTEÚDO DAS ROTAS */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full">
            {/* Aqui o React Router 6 injeta a rota correta */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
