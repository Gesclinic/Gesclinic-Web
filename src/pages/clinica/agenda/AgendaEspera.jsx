import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';

export default function AgendaEspera() {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Aqui será implementada a lógica de lista de espera
    console.log('AgendaEspera carregado para clínica:', clinicId);
  }, [clinicId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⏱️ Lista de Espera</h1>
          <p className="text-gray-600">
            Gerencie a fila de espera de pacientes sem horário disponível
          </p>
        </div>

        {/* Conteúdo principal */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <svg
                className="w-24 h-24 text-orange-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Lista de Espera</h2>
              <p className="text-gray-600 w-full">
                Esta página está em desenvolvimento. Aqui você poderá visualizar e gerenciar todos
                os pacientes na lista de espera para agendamentos.
              </p>

              {/* Status Info */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Em Espera</p>
                  <p className="text-2xl font-bold text-orange-600">--</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Tempo Médio</p>
                  <p className="text-2xl font-bold text-yellow-600">--</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Atendidos</p>
                  <p className="text-2xl font-bold text-purple-600">--</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
