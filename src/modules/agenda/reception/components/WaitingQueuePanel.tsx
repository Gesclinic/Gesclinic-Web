/**
 * Componente: WaitingQueuePanel
 * 
 * Painel da fila de espera com lista em tempo real
 * Inclui search, filtro e atualização live
 */

import React, { useMemo, useState } from 'react';
import { useWaitingQueue } from '../hooks/useWaitingQueue';
import { WaitingQueueAppointment } from '../types/reception';
import QueueStatusBadge from './QueueStatusBadge';

interface WaitingQueuePanelProps {
  clinic_id: string;
  maxItems?: number;
  showSearch?: boolean;
  onSelectAppointment?: (appointment: WaitingQueueAppointment) => void;
}

/**
 * Painel interativo da fila de espera
 * 
 * Uso:
 * ```
 * <WaitingQueuePanel
 *   clinic_id="clinic-123"
 *   maxItems={20}
 *   showSearch
 *   onSelectAppointment={(apt) => console.log(apt)}
 * />
 * ```
 */
const WaitingQueuePanel = React.memo(
  ({
    clinic_id,
    maxItems = 50,
    showSearch = true,
    onSelectAppointment,
  }: WaitingQueuePanelProps) => {
    const { queue, stats, loading, is_live } = useWaitingQueue(clinic_id);
    const [search, setSearch] = useState('');

    // Filtrar por busca
    const filteredQueue = useMemo(() => {
      if (!search) return queue.slice(0, maxItems);

      return queue
        .filter((apt) =>
          apt.patient_id?.toLowerCase().includes(search.toLowerCase()) ||
          apt.appointment_id?.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, maxItems);
    }, [queue, search, maxItems]);

    if (loading && queue.length === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
            <span className="text-gray-600">Carregando fila...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            📋 Fila de Espera
            {is_live && <span className="ml-2 text-xs text-green-600">● AO VIVO</span>}
          </h3>
          <div className="flex gap-2 text-sm text-gray-600">
            <span>Total: {queue.length}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Crítico: {stats.critical_count}
            </span>
          </div>
        </div>

        {/* Estatísticas */}
        {queue.length > 0 && (
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3">
            <div className="text-center">
              <div className="text-sm text-gray-600">Tempo Médio</div>
              <div className="text-lg font-bold text-gray-900">
                {stats.average_wait_time_minutes}min
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Máximo</div>
              <div className="text-lg font-bold text-gray-900">
                {stats.max_wait_time_minutes}min
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Aviso</div>
              <div className="text-lg font-bold text-gray-900">{stats.warning_count}</div>
            </div>
          </div>
        )}

        {/* Search */}
        {showSearch && queue.length > 0 && (
          <div>
            <input
              type="text"
              placeholder="🔍 Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        )}

        {/* Fila */}
        {filteredQueue.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredQueue.map((apt, index) => (
              <div
                key={apt.appointment_id}
                onClick={() => onSelectAppointment?.(apt)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
              >
                {/* Posição + Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {/* Número */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-sm">
                      {index + 1}
                    </div>

                    {/* Paciente */}
                    <div>
                      <div className="font-medium text-gray-900">
                        {apt.patient_id || 'Paciente'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {apt.scheduled_date && new Date(apt.scheduled_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <QueueStatusBadge
                  tempo_espera_minutos={apt.tempo_espera_minutos}
                  wait_priority={apt.wait_priority}
                  showTime
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg bg-gray-50 p-8">
            <div className="text-center">
              <div className="text-3xl mb-2">✨</div>
              <p className="text-gray-600">
                {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente na fila'}
              </p>
            </div>
          </div>
        )}

        {/* Rodapé */}
        {queue.length > maxItems && (
          <div className="text-center text-xs text-gray-600 pt-2">
            Mostrando {filteredQueue.length} de {queue.length}
          </div>
        )}
      </div>
    );
  }
);

WaitingQueuePanel.displayName = 'WaitingQueuePanel';

export default WaitingQueuePanel;
