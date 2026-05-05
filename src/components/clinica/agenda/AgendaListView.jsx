import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgendaConfig } from '@/hooks/useAgendaConfig';
import { utcToZonedTime, format as formatTz } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusSelector from './StatusSelector';

/* Formata data YYYY-MM-DD → DD/MM/YYYY */
function formatDate(dateStr) {
  try {
    return format(parseISO(dateStr), "dd 'de' MMMM, yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export default function AgendaListView({ appointments = [], onAppointmentClick, onStatusChange }) {
  const navigate = useNavigate();
  const agendaConfig = useAgendaConfig();

  /* Agrupamento por data (corrigido para timezone SP) */
  const groupedAppointments = useMemo(() => {
    return appointments.reduce((acc, apt) => {
      try {
        const zoned = utcToZonedTime(apt.start_time, 'America/Sao_Paulo');
        const dateKey = format(zoned, 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(apt);
      } catch {
        if (!acc['Indefinido']) {
          acc['Indefinido'] = [];
        }
        acc['Indefinido'].push(apt);
      }
      return acc;
    }, {});
  }, [appointments]);

  return (
    <div className="agenda-list w-full">
      {/* Loop por dia */}
      {Object.entries(groupedAppointments).map(([date, dayAppointments]) => (
        <div key={date} className="mb-8 border-b pb-4">
          {/* Cabeçalho do dia */}
          <h3 className="text-lg font-bold text-gray-800 mb-4">{formatDate(date)}</h3>

          <div className="space-y-3">
            {/* Ordenação correta por horário */}
            {dayAppointments
              .sort((a, b) => {
                const t1 = utcToZonedTime(a.start_time, 'America/Sao_Paulo');
                const t2 = utcToZonedTime(b.start_time, 'America/Sao_Paulo');
                return t1 - t2;
              })
              .map((appointment) => {
                const zoned = utcToZonedTime(appointment.start_time, 'America/Sao_Paulo');
                const time = formatTz(zoned, 'HH:mm', { timeZone: 'America/Sao_Paulo' });

                const patientName =
                  appointment.patient_name ||
                  appointment.patient?.full_name ||
                  'Paciente não informado';

                return (
                  <div
                    key={appointment.id}
                    onClick={() => onAppointmentClick?.(appointment)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      {/* Conteúdo principal */}
                      <div className="flex-1">
                        {/* Horário + Nome */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-600 w-16">{time}</span>

                          <span
                            className="font-medium text-blue-700 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/clinica/atendimento/${appointment.id}`);
                            }}
                          >
                            {/* Limpa telefone do nome se vier junto */}
                            {patientName.replace(/\s*\(?\d{2,3}\)?\s*\d{4,5}[-.\s]?\d{4}$/, '')}
                          </span>

                          <StatusSelector
                            appointment={appointment}
                            onStatusChange={onStatusChange}
                            compact={true}
                          />
                        </div>

                        {/* Serviço + Profissional */}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                          <span>{appointment.service_name || 'Procedimento não informado'}</span>

                          {appointment.professional_name && (
                            <>
                              <span>•</span>
                              <span>Dr(a). {appointment.professional_name}</span>
                            </>
                          )}

                          {appointment.payer_name && (
                            <>
                              <span>•</span>
                              <span>{appointment.payer_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-gray-400 hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick?.(appointment);
                          }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>

                        <button
                          className="p-2 text-gray-400 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange?.(appointment, 'cancelado');
                          }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Sem agendamentos */}
      {appointments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4l6 6m-6-6v6m6-6h-6"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium">Nenhum agendamento</h3>
          <p className="mt-1 text-sm">Não há consultas para exibição.</p>
        </div>
      )}
    </div>
  );
}
