/**
 * Componente: OperationalDashboard
 * 
 * Dashboard operacional completo da recepção
 * Mostra: Próximo, Em Atendimento, Finalizados, Aguardando
 */

import React, { useMemo } from 'react';
import { getReceptionOperationalData } from '../services/receptionApi';
import { useQuery } from '@tanstack/react-query';
import { ReceptionOperationalData } from '../types/reception';
import OfficialStatusBadge from '../../constants/officialStatusModel';

interface OperationalDashboardProps {
  clinic_id: string;
  compact?: boolean;
}

/**
 * Dashboard operacional principal
 * 
 * Uso:
 * ```
 * <OperationalDashboard clinic_id="clinic-123" />
 * ```
 */
const OperationalDashboard = React.memo(
  ({ clinic_id, compact = false }: OperationalDashboardProps) => {
    // Query: Dados operacionais
    const { data: operationalData, isLoading } = useQuery({
      queryKey: ['reception_operations', clinic_id],
      queryFn: () => getReceptionOperationalData(clinic_id),
      staleTime: 5000,
      gcTime: 30000,
      enabled: !!clinic_id,
    });

    const data: ReceptionOperationalData | undefined = operationalData?.data;

    if (isLoading || !data) {
      return (
        <div className="flex items-center justify-center gap-2 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <span className="text-gray-600">Carregando dashboard...</span>
        </div>
      );
    }

    return (
      <div className={compact ? 'space-y-4' : 'space-y-6'}>
        {/* Grid 2x2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* SEÇÃO 1: Próximo Paciente */}
          <SectionProximo next={data.next_appointments[0]} compact={compact} />

          {/* SEÇÃO 2: Em Atendimento */}
          <SectionEmAtendimento list={data.in_progress} compact={compact} />
        </div>

        {/* Grid simples */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* SEÇÃO 3: Finalizados */}
          <SectionFinalizados list={data.in_progress} compact={compact} />

          {/* SEÇÃO 4: Aguardando Confirmação */}
          <SectionAguardandoConfirmacao list={data.awaiting_confirmation} compact={compact} />
        </div>
      </div>
    );
  }
);

OperationalDashboard.displayName = 'OperationalDashboard';

/**
 * Seção: Próximo Paciente
 */
const SectionProximo = React.memo(
  ({ next, compact }: { next?: any; compact?: boolean }) => {
    if (!next) {
      return (
        <SectionContainer title="📍 Próximo Paciente" compact={compact}>
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500">Nenhum paciente na fila</span>
          </div>
        </SectionContainer>
      );
    }

    return (
      <SectionContainer title="📍 Próximo Paciente" compact={compact}>
        <div className="rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 p-6 border-2 border-purple-300">
          <div className="text-4xl font-bold text-purple-900 mb-2">🎯</div>
          <h4 className="text-xl font-bold text-purple-900 mb-2">{next.patient_id}</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-purple-700">Hora Agendada</div>
              <div className="font-semibold text-purple-900">
                {new Date(next.scheduled_date).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <div>
              <div className="text-xs text-purple-700">Tempo de Espera</div>
              <div className="font-semibold text-purple-900">{next.tempo_espera_minutos}min</div>
            </div>
          </div>

          {next.professional_id && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="text-xs text-purple-700">Profissional</div>
              <div className="font-semibold text-purple-900">{next.professional_id}</div>
            </div>
          )}
        </div>
      </SectionContainer>
    );
  }
);

/**
 * Seção: Em Atendimento
 */
const SectionEmAtendimento = React.memo(
  ({ list = [], compact }: { list?: any[]; compact?: boolean }) => {
    return (
      <SectionContainer
        title={`👨‍⚕️ Em Atendimento (${list.length})`}
        compact={compact}
      >
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              Ninguém em atendimento
            </div>
          ) : (
            list.slice(0, 3).map((apt) => (
              <div
                key={apt.appointment_id}
                className="flex items-center justify-between rounded-lg bg-blue-50 p-3 border border-blue-200"
              >
                <div>
                  <div className="font-semibold text-blue-900">{apt.patient_id}</div>
                  <div className="text-xs text-blue-700">Sala: {apt.room_id || '-'}</div>
                </div>
                <div className="text-xs font-semibold text-blue-900 bg-blue-100 px-2 py-1 rounded">
                  {apt.tempo_espera_minutos}min
                </div>
              </div>
            ))
          )}
          {list.length > 3 && (
            <div className="text-xs text-gray-500 text-center py-2">
              +{list.length - 3} mais em atendimento
            </div>
          )}
        </div>
      </SectionContainer>
    );
  }
);

/**
 * Seção: Finalizados
 */
const SectionFinalizados = React.memo(
  ({ list = [], compact }: { list?: any[]; compact?: boolean }) => {
    const finalizados = list.filter((a) => a.official_status === 'completed').slice(0, 5);

    return (
      <SectionContainer
        title={`✅ Finalizados (${finalizados.length})`}
        compact={compact}
      >
        <div className="space-y-2">
          {finalizados.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              Nenhum finalizado ainda
            </div>
          ) : (
            finalizados.map((apt) => (
              <div
                key={apt.appointment_id}
                className="flex items-center justify-between rounded-lg bg-green-50 p-3 border border-green-200"
              >
                <div>
                  <div className="font-semibold text-green-900">{apt.patient_id}</div>
                </div>
                <div className="text-xs font-semibold text-green-900">✓</div>
              </div>
            ))
          )}
        </div>
      </SectionContainer>
    );
  }
);

/**
 * Seção: Aguardando Confirmação
 */
const SectionAguardandoConfirmacao = React.memo(
  ({ list = [], compact }: { list?: any[]; compact?: boolean }) => {
    return (
      <SectionContainer
        title={`⏳ Aguardando Confirmação (${list.length})`}
        compact={compact}
      >
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              Nenhum aguardando
            </div>
          ) : (
            list.slice(0, 3).map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between rounded-lg bg-yellow-50 p-3 border border-yellow-200"
              >
                <div>
                  <div className="font-semibold text-yellow-900">{apt.patient_id}</div>
                  <div className="text-xs text-yellow-700">Status: Confirmado</div>
                </div>
              </div>
            ))
          )}
          {list.length > 3 && (
            <div className="text-xs text-gray-500 text-center py-2">
              +{list.length - 3} mais aguardando
            </div>
          )}
        </div>
      </SectionContainer>
    );
  }
);

/**
 * Componente auxiliar: Container de seção
 */
const SectionContainer = React.memo(
  ({
    title,
    children,
    compact,
  }: {
    title: string;
    children: React.ReactNode;
    compact?: boolean;
  }) => (
    <div
      className={compact ? 'rounded-lg border border-gray-200 bg-white p-4' : 'rounded-lg border border-gray-200 bg-white p-6'}
    >
      <h3 className={compact ? 'font-semibold text-gray-900 mb-3' : 'font-semibold text-gray-900 mb-4'}>
        {title}
      </h3>
      {children}
    </div>
  )
);

export default OperationalDashboard;
