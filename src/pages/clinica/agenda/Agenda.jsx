// src/pages/clinica/agenda/Agenda.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import AgendaLayout from './layout/AgendaLayout';

export default function Agenda() {
  return (
    <AgendaLayout>
      <Outlet />
    </AgendaLayout>
  );
}
