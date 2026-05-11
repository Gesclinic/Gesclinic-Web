/**
 * Página: Reception
 * Rota: /clinica/agenda/recepcao
 * 
 * Dashboard operacional completo da recepção
 * Mostra fila em tempo real, próximo paciente, estatísticas
 */

import React, { useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  OperationalDashboard,
  WaitingQueuePanel,
  useWaitingQueue,
  useReceptionRealtimeSync,
} from '@/modules/agenda/reception';

/**
 * Página Reception - Dashboard Principal
 */
export function ReceptionPage() {
  const { clinicId, clinic } = useClinicContext();
  const { user } = useAuth();
  
  // Hooks - Estado realtime
  const waitingQueueState = useWaitingQueue(clinicId);
  const realtimeSyncState = useReceptionRealtimeSync(clinicId);

  // Atualizar título da página
  useEffect(() => {
    const queueCount = waitingQueueState.data?.length || 0;
    document.title = `Recepção (${queueCount}) - Gesclinic`;
    
    return () => {
      document.title = 'Gesclinic';
    };
  }, [waitingQueueState.data?.length]);

  // Validar contexto
  if (!clinicId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-3xl mb-2">❌</div>
          <p className="text-gray-600">Clínica não disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Esquerda: Título */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📋 Recepção</h1>
              <p className="text-sm text-gray-600 mt-1">
                {clinic?.name || 'Clínica'} • Gerenciamento de check-in e fila
              </p>
            </div>

            {/* Direita: Status e Usuário */}
            <div className="flex items-center gap-4">
              {/* Status Realtime */}
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`h-2 w-2 rounded-full ${
                    realtimeSyncState.isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-gray-600">
                  {realtimeSyncState.isConnected ? '🟢 AO VIVO' : '🔴 Offline'}
                </span>
              </div>

              {/* Usuário */}
              {user && (
                <div className="text-sm text-gray-600">
                  Olá, <span className="font-semibold">{user.email?.split('@')[0] || 'Usuário'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Grid: Dashboard + Fila */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Dashboard Principal (2/3 width) */}
          <div className="lg:col-span-2">
            <OperationalDashboard clinic_id={clinicId} />
          </div>

          {/* Fila Rápida (1/3 width) */}
          <div className="lg:col-span-1">
            <WaitingQueuePanel
              clinic_id={clinicId}
              maxHeight="calc(100vh - 200px)"
            />
          </div>
        </div>

        {/* Seção de Ajuda (Rodapé) */}
        <div className="mt-12 rounded-lg bg-blue-50 border border-blue-200 p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Dicas de Uso</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • <strong>Próximo Paciente:</strong> Clique para iniciar atendimento
                </li>
                <li>
                  • <strong>Fila de Espera:</strong> Use a busca para encontrar pacientes
                </li>
                <li>
                  • <strong>Status em Cores:</strong> Verde (normal), Amarelo (aviso),
                  Vermelho (crítico)
                </li>
                <li>
                  • <strong>Realtime:</strong> Os dados atualizam automaticamente
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ReceptionPage;
