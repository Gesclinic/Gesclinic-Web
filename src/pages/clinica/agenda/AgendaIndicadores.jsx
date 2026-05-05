import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';

export default function AgendaIndicadores() {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Aqui será implementada a lógica de indicadores
    console.log('AgendaIndicadores carregado para clínica:', clinicId);
  }, [clinicId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Indicadores de Agenda</h1>
          <p className="text-gray-600">Acompanhe métricas e desempenho dos agendamentos</p>
        </div>

        {/* Conteúdo principal */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <svg
                className="w-24 h-24 text-green-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Indicadores</h2>
              <p className="text-gray-600 w-full">
                Esta página está em desenvolvimento. Aqui você poderá acompanhar indicadores e
                métricas de desempenho da agenda.
              </p>

              {/* Status Info */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Taxa de Ocupação</p>
                  <p className="text-2xl font-bold text-blue-600">--</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Falta de Pacientes</p>
                  <p className="text-2xl font-bold text-green-600">--</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Tempo Médio</p>
                  <p className="text-2xl font-bold text-indigo-600">--</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
