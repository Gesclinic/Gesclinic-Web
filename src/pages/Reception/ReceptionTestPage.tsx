/**
 * Página: Reception Test
 * Legado: testes do antigo módulo de recepção separado.
 * 
 * Página de testes para validar componentes Reception
 * Use para desenvolvimento e QA
 */

import React, { useState } from 'react';
import {
  CheckInButton,
  QueueStatusBadge,
  WaitingQueuePanel,
  useWaitingQueue,
  useReceptionRealtimeSync,
} from '@/modules/agenda/reception';

/**
 * Página de Testes - Para validar componentes
 */
export function ReceptionTestPage() {
  const [testClinicId] = useState('test-clinic-id-here'); // Substitua com ID real

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Testes - Módulo Recepção</h1>
          <p className="text-gray-600">Validação de componentes e hooks</p>
          <p className="text-sm text-gray-500 mt-2">
            Clinic ID: <code className="bg-gray-200 px-2 py-1 rounded">{testClinicId}</code>
          </p>
        </div>

        {/* Teste 1: CheckInButton */}
        <TestSection title="Teste 1: CheckInButton">
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <p className="text-gray-600">Teste com diferentes status:</p>

            <div className="flex flex-wrap gap-4">
              <CheckInButton
                appointment_id="test-apt-1"
                clinic_id={testClinicId}
                status="confirmed"
                patient_name="João Silva"
                scheduled_time="14:30"
                onSuccess={() => alert('✅ Check-in realizado!')}
                onError={(err) => alert(`❌ Erro: ${err}`)}
              />

              <CheckInButton
                appointment_id="test-apt-2"
                clinic_id={testClinicId}
                status="scheduled"
                patient_name="Maria Santos"
                disabled
              />

              <CheckInButton
                appointment_id="test-apt-3"
                clinic_id={testClinicId}
                status="checked_in"
                patient_name="Pedro Costa"
                disabled
              />
            </div>

            <p className="text-sm text-gray-600 mt-4">
              ℹ️ Botão só está habilitado quando status = 'confirmed'
            </p>
          </div>
        </TestSection>

        {/* Teste 2: QueueStatusBadge */}
        <TestSection title="Teste 2: QueueStatusBadge">
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <p className="text-gray-600">Status badges em 3 estados:</p>

            <div className="flex flex-wrap gap-4">
              <QueueStatusBadge
                tempo_espera_minutos={5}
                wait_priority="normal"
                showTime
                animate
              />

              <QueueStatusBadge
                tempo_espera_minutos={18}
                wait_priority="warning"
                showTime
                animate
              />

              <QueueStatusBadge
                tempo_espera_minutos={45}
                wait_priority="critical"
                showTime
                animate
              />
            </div>

            <p className="text-sm text-gray-600 mt-4">
              ℹ️ Verde: &lt;15min | Amarelo: 15-30min | Vermelho: &gt;30min (com animação)
            </p>
          </div>
        </TestSection>

        {/* Teste 3: WaitingQueuePanel */}
        <TestSection title="Teste 3: WaitingQueuePanel">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <WaitingQueuePanel
              clinic_id={testClinicId}
              maxItems={10}
              showSearch
              onSelectAppointment={(apt) => console.log('Selected:', apt)}
            />
            <p className="text-sm text-gray-600 mt-4">
              ℹ️ Mostra fila com busca em tempo real
            </p>
          </div>
        </TestSection>

        {/* Teste 4: useWaitingQueue Hook */}
        <TestSection title="Teste 4: useWaitingQueue Hook">
          <HookTestComponent clinic_id={testClinicId} />
        </TestSection>

        {/* Teste 5: useReceptionRealtimeSync Hook */}
        <TestSection title="Teste 5: useReceptionRealtimeSync Hook">
          <SyncTestComponent clinic_id={testClinicId} />
        </TestSection>

        {/* Resumo */}
        <div className="mt-12 rounded-lg bg-green-50 border border-green-200 p-6">
          <h3 className="font-semibold text-green-900 mb-2">✅ Testes Disponíveis</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>☐ Teste 1: CheckInButton (validar habilitação/desabilitação)</li>
            <li>☐ Teste 2: QueueStatusBadge (validar 3 estados)</li>
            <li>☐ Teste 3: WaitingQueuePanel (validar lista e search)</li>
            <li>☐ Teste 4: useWaitingQueue (validar hook e stats)</li>
            <li>☐ Teste 5: useReceptionRealtimeSync (validar sync cross-tab)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente auxiliar: Teste Hook useWaitingQueue
 */
function HookTestComponent({ clinic_id }: { clinic_id: string }) {
  const { queue, stats, loading, is_live, error } = useWaitingQueue(clinic_id);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <span>Carregando fila...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
      {error && <div className="p-2 bg-red-50 text-red-800 rounded text-sm">❌ {error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Total na fila</div>
          <div className="text-2xl font-bold">{queue.length}</div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Tempo médio</div>
          <div className="text-2xl font-bold">{stats.average_wait_time_minutes}min</div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Máximo</div>
          <div className="text-2xl font-bold">{stats.max_wait_time_minutes}min</div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Críticos</div>
          <div className="text-2xl font-bold">{stats.critical_count}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div className={`h-2 w-2 rounded-full ${is_live ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span>{is_live ? '🟢 AO VIVO' : '⚪ Offline'}</span>
      </div>

      <p className="text-sm text-gray-600">ℹ️ Hook retorna: queue, stats, loading, is_live, refetch</p>
    </div>
  );
}

/**
 * Componente auxiliar: Teste Hook useReceptionRealtimeSync
 */
function SyncTestComponent({ clinic_id }: { clinic_id: string }) {
  const { sync_state, on_event, off_event } = useReceptionRealtimeSync(clinic_id);
  const [eventCount, setEventCount] = React.useState(0);

  React.useEffect(() => {
    const handler = () => {
      setEventCount((c) => c + 1);
    };

    on_event(handler);
    return () => off_event(handler);
  }, [on_event, off_event]);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${
            sync_state.is_connected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="font-semibold">
          {sync_state.is_connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Eventos recebidos</div>
          <div className="text-2xl font-bold">{eventCount}</div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Pendentes</div>
          <div className="text-2xl font-bold">{sync_state.pending_updates}</div>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        Último sync: {new Date(sync_state.last_sync).toLocaleTimeString('pt-BR')}
      </div>

      {sync_state.error && (
        <div className="p-2 bg-red-50 text-red-800 rounded text-sm">
          ⚠️ {sync_state.error}
        </div>
      )}

      <p className="text-sm text-gray-600">
        ℹ️ Hook sincroniza entre múltiplas abas com deduplicação
      </p>
    </div>
  );
}

/**
 * Componente auxiliar: Container de seção
 */
function TestSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default ReceptionTestPage;
