// src/pages/clinica/agenda/layout/AgendaLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AgendaLayout() {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto px-4 py-4">
        <Outlet />
      </div>
    </div>
  );
}
