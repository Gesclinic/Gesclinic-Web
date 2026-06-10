import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ClinicProvider } from '@/contexts/ClinicContext';

import Sidebar from './Sidebar';
import Header from './Header';
import RealtimeAlertsManager from '@/components/financeiro/RealtimeAlertsManager';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => {
        console.log('Notification permission denied:', err);
      });
    }
  }, []);

  return (
    <ClinicProvider>
      <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        {/* SIDEBAR */}
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* REAL-TIME ALERTS */}
          <RealtimeAlertsManager />

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
    </ClinicProvider>
  );
}
