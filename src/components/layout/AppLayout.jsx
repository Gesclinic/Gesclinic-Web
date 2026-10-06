import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import Header from './Header';
import RealtimeAlertsManager from '@/components/financeiro/RealtimeAlertsManager';
import { useClinicContext } from '@/contexts/ClinicContext';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { activeCompanyId, clinicId } = useClinicContext();
  const activeClinicKey = activeCompanyId || clinicId || 'no-active-clinic';

  return (
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
            <Outlet key={activeClinicKey} />
          </div>
          <footer className="mt-8 flex flex-wrap gap-4 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-700">
            <Link to="/termos-de-uso">Termos</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/politica-de-cookies">Cookies</Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
