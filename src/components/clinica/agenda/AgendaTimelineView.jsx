import React, { useMemo } from "react";
import { useAgendaConfig } from "@/hooks/useAgendaConfig";
import { format, addMinutes, isSameDay } from "date-fns";
import { utcToZonedTime, format as formatTz } from 'date-fns-tz';
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Clock,
  User,
  Edit,
  UserCheck,
  Trash2,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";
import StatusSelector from "./StatusSelector";

export default function AgendaTimelineView({
  appointments = [],
  professionals = [],
  selectedDate,
  onEditClick,
  onDeleteClick,
  onNewAppointment,
  onCheckin,
  labelForStatus,
  onRefresh,
}) {
  console.log('🔍 Timeline - Profissionais:', professionals);
  console.log('🔍 Timeline - Appointments:', appointments);
  console.log('🔍 Timeline - Appointments bloqueados:', appointments.filter(apt => apt.is_blocked));
  console.log('🔍 Timeline - Data selecionada:', selectedDate);

  const agendaConfig = useAgendaConfig();

  // Gerar horários dinâmicos conforme configuração da clínica
  const timeSlots = useMemo(() => {
    const slots = [];
    const [startHour, startMinute] = (agendaConfig.horario_abertura || "08:00").split(":").map(Number);
    const [endHour, endMinute] = (agendaConfig.horario_fechamento || "18:00").split(":").map(Number);
    const slotSize = agendaConfig.slot_agenda || agendaConfig.tempo_medio_atendimento || 15;
    // Almoço
    const almocoInicio = agendaConfig.horario_almoco_inicio || null;
    const almocoFim = agendaConfig.horario_almoco_fim || null;
    let almocoStart = null, almocoEnd = null;
    if (almocoInicio && almocoFim) {
      const [almocoStartHour, almocoStartMinute] = almocoInicio.split(":").map(Number);
      const [almocoEndHour, almocoEndMinute] = almocoFim.split(":").map(Number);
      almocoStart = almocoStartHour * 60 + almocoStartMinute;
      almocoEnd = almocoEndHour * 60 + almocoEndMinute;
    }
    let current = new Date(selectedDate);
    // Forçar fuso horário local ao exibir slots
    current.setHours(startHour, startMinute, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(endHour, endMinute, 0, 0);
    while (current <= end) {
      const time = `${current.getHours().toString().padStart(2, '0')}:${current.getMinutes().toString().padStart(2, '0')}`;
      let isAlmoco = false;
      if (almocoStart !== null && almocoEnd !== null) {
        const currentMinutes = current.getHours() * 60 + current.getMinutes();
        if (currentMinutes >= almocoStart && currentMinutes < almocoEnd) {
          isAlmoco = true;
        }
      }
      slots.push({ time, isAlmoco });
      current.setMinutes(current.getMinutes() + slotSize);
      if (current > end) break;
    }
    return slots;
  }, [agendaConfig, selectedDate]);

  // Se não há profissionais, criar pelo menos 1 coluna
  const displayProfessionals = professionals.length > 0 ? professionals : [
    { id: 'default', name: 'Centro Avançado da Endoscopia', specialty: 'Clínica Geral' },
  ];

  // Organizar appointments por profissional e horário
  const appointmentsByProfessional = useMemo(() => {
    const byProf = {};
    
    displayProfessionals.forEach(prof => {
      byProf[prof.id] = [];
    });
    
    appointments.forEach(apt => {
      if (!isSameDay(new Date(apt.start_time), selectedDate)) return;
      
      const profId = apt.professional_id || 'default';
      if (!byProf[profId]) byProf[profId] = [];
      byProf[profId].push(apt);
    });

    // Todos os campos ficam vazios para edição
    
    return byProf;
  }, [appointments, selectedDate, displayProfessionals]);

  // Função para obter cor do status (apenas status válidos)
  const getStatusColor = (status) => {
    const statusMap = {
      'confirmado': 'bg-green-500',
      'agendado': 'bg-purple-500',
      'cancelado': 'bg-red-500',
      'faltou': 'bg-red-400',
      'presente': 'bg-blue-500',
      'atendido': 'bg-emerald-500',
    };
    
    return statusMap[status?.toLowerCase()] || 'bg-purple-500';
  };

  // Calcular posição e tamanho do bloco
  const calculateBlockStyle = (appointment) => {
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time || addMinutes(startTime, 30));
    
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    
    // Posição inicial (7h = 0%)
    const startPosition = ((startHour - 7) * 60 + startMinute) / (12 * 60) * 100;
    
    // Duração em minutos
    const duration = (endHour - startHour) * 60 + (endMinute - startMinute);
    const width = (duration / (12 * 60)) * 100;
    
    return {
      left: `${Math.max(0, startPosition)}%`,
      width: `${Math.min(width, 100 - startPosition)}%`,
    };
  };

  const formatTime = (dateTime) => {
    const zoned = utcToZonedTime(dateTime, 'America/Sao_Paulo');
    return formatTz(zoned, 'HH:mm', { timeZone: 'America/Sao_Paulo' });
  };

  const handleTimeSlotClick = (time, professionalId) => {
    console.log('🎯 Clique no horário:', { time, professionalId, selectedDate });
    
    const startDateTime = new Date(selectedDate);
    const [hour, minute] = time.split(':').map(Number);
    startDateTime.setHours(hour, minute, 0, 0);
    
    const appointmentData = {
      start_time: startDateTime.toISOString(),
      professional_id: professionalId === 'default' ? null : professionalId,
      is_free: true,
    };
    
    console.log('🎯 Dados do agendamento preparados:', appointmentData);
    console.log('🎯 start_time ISO:', appointmentData.start_time);
    console.log('🎯 Data/hora local:', startDateTime.toLocaleString('pt-BR'));
    
    onNewAppointment?.(appointmentData);
  };

  // Função para alterar status (adicionada para evitar erro)
  const handleStatusChange = (appointment, newStatus) => {
    // Implemente a lógica de alteração de status conforme necessário
    if (labelForStatus) labelForStatus(appointment, newStatus);
  };

  return (
    <div className="h-full bg-white">
      {/* Cabeçalho com colunas melhor alinhado */}
      <div className="sticky top-0 z-20 bg-white border-b-2 border-gray-300">
        <div className="grid grid-cols-12 text-sm font-semibold text-gray-700 bg-gray-50">
          <div className="col-span-1 p-4 border-r border-gray-300 text-center bg-gray-100">Data</div>
          <div className="col-span-1 p-4 border-r border-gray-300 text-center bg-gray-100">Horário</div>
          <div className="col-span-1 p-4 border-r border-gray-300 text-center">Prontuário</div>
          <div className="col-span-2 p-4 border-r border-gray-300 text-center">Paciente</div>
          <div className="col-span-2 p-4 border-r border-gray-300 text-center">Serviço</div>
          <div className="col-span-1 p-4 border-r border-gray-300 text-center">Convênio</div>
          <div className="col-span-2 p-4 border-r border-gray-300 text-center">Status</div>
          <div className="col-span-2 p-4 text-center">Profissional responsável</div>
        </div>
      </div>

      {/* Conteúdo da Timeline em Linhas Horizontais */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y border-b">
          
          {/* Renderizar todos os slots de horário do dia */}
          {timeSlots.map(({ time, isAlmoco }) => {
            const [hour, minute] = time.split(':').map(Number);
            const slotDateTime = new Date(selectedDate);
            slotDateTime.setHours(hour, minute, 0, 0);
            
            // Renderização especial para horário de almoço
            if (isAlmoco) {
              return (
                <div key={`almoco-${time}`} className="grid grid-cols-12 bg-yellow-50 border-b border-yellow-200 min-h-[64px] items-center">
                  <div className="col-span-12 text-center py-4 text-yellow-700 font-semibold">
                    <Clock className="inline-block mr-2 text-yellow-600" /> Horário de Almoço ({time})
                  </div>
                </div>
              );
            }
            
            // Buscar TODOS os agendamentos para este horário exato
            const appointmentsAtTime = appointments.filter(apt => {
              if (!isSameDay(new Date(apt.start_time), selectedDate)) return false;
              const aptTime = new Date(apt.start_time);
              return aptTime.getHours() === hour && aptTime.getMinutes() === minute;
            });
            
            // Se houver agendamentos, renderizar uma linha para cada um
            if (appointmentsAtTime.length > 0) {
              return appointmentsAtTime.map((appointment, idx) => {
                const isBlocked = appointment?.is_blocked;
                return (
                  <div 
                    key={`${time}-${appointment.id}-${idx}`} 
                    className={`grid grid-cols-12 hover:bg-gray-50 transition-colors border-b border-gray-200 min-h-[64px] items-center ${isBlocked ? 'bg-red-50 border-red-200' : ''}`}
                  >
                {/* Data */}
                <div className="col-span-1 p-3 border-r border-gray-200 text-center text-sm flex items-center justify-center bg-gray-50">
                  <span className="text-xs text-gray-600 font-medium">{format(selectedDate, 'dd/MM/yyyy')}</span>
                </div>
                {/* Horário */}
                <div className="col-span-1 p-3 border-r border-gray-200 text-center font-mono text-sm flex items-center justify-center bg-gray-50">
                  <span className="font-bold text-gray-800 text-base">{time}</span>
                </div>
                {appointment && isBlocked ? (
                  <>
                    {/* Prontuário */}
                    <div className="col-span-1 p-2 border-r border-gray-200 text-center text-sm flex items-center justify-center">
                      <span className="text-red-600 font-medium">-</span>
                    </div>
                    {/* Paciente */}
                    <div className="col-span-2 p-2 border-r border-gray-200 text-sm flex items-center">
                      <div className="flex items-center gap-2 text-red-700 font-semibold">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span>Horário Bloqueado</span>
                      </div>
                    </div>
                    {/* Serviço */}
                    <div className="col-span-2 p-2 border-r border-gray-200 text-sm flex items-center">
                      <div className="text-red-600 text-sm italic">
                        {appointment.notes || appointment.block_reason || 'Motivo não informado'}
                      </div>
                    </div>
                    {/* Convênio */}
                    <div className="col-span-1 p-2 border-r border-gray-200 text-center text-sm flex items-center justify-center">
                      <span className="text-red-600 font-medium">-</span>
                    </div>
                    
                    {/* Status */}
                    <div className="col-span-2 p-2 border-r border-gray-200 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="bg-red-500 text-white">
                          Bloqueado
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick?.(appointment);
                          }}
                          title="Editar bloqueio"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClick?.(appointment);
                          }}
                          title="Excluir bloqueio"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Profissional */}
                    <div className="col-span-2 p-2 text-sm flex items-center justify-center">
                      <span className="text-red-600 font-medium italic">Sistema</span>
                    </div>
                  </>
                ) : appointment ? (
                  <>
                    {/* Prontuário */}
                    <div className="col-span-1 p-2 border-r border-gray-200 text-center text-sm flex items-center justify-center">
                      <span className="font-mono text-xs text-gray-700">
                        {appointment.patient?.id?.slice(0,8) || '12345678'}
                      </span>
                    </div>
                    
                    {/* Paciente */}
                    <div className="col-span-2 p-2 border-r border-gray-200 text-sm flex items-center">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-800">
                          {appointment.patient?.name || 'Fernando Cooper Medeiros'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Serviço */}
                    <div className="col-span-2 p-2 border-r border-gray-200 text-sm flex items-center">
                      <div className="text-gray-700">
                        <span className="font-medium">
                          {appointment.service_name || 'Consulta'}
                        </span>
                        {appointment.notes && (
                          <div className="text-xs text-gray-500 mt-1">{appointment.notes}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Convênio */}
                    <div className="col-span-1 p-2 border-r border-gray-200 text-center text-sm flex items-center justify-center">
                      <span className="text-gray-700 font-medium">
                        {appointment.payer_name || 'Particular'}
                      </span>
                    </div>
                    
                    {/* Status */}
                    <div className="col-span-2 p-2 border-r border-gray-200 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <StatusSelector
                          appointment={appointment}
                          onStatusChange={handleStatusChange}
                          compact={true}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:text-gray-700 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick?.(appointment);
                          }}
                          title="Editar agendamento"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClick?.(appointment);
                          }}
                          title="Excluir agendamento"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Profissional */}
                    <div className="col-span-2 p-2 text-sm flex items-center justify-center">
                      <div className="text-center">
                        <div className="font-medium text-gray-800">
                          {appointment.professional?.name || displayProfessionals[0]?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {appointment.professional?.specialty || displayProfessionals[0]?.specialty}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            }
            
            // Se não há agendamentos neste horário, renderizar slot vazio clicável
            return (
              <div 
                key={`empty-${time}`} 
                className="grid grid-cols-12 hover:bg-gray-50 transition-colors border-b border-gray-200 min-h-[64px] items-center"
              >
                {/* Data */}
                <div className="col-span-1 p-2 border-r-2 border-green-200 text-center text-sm text-green-600 cursor-pointer bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 flex items-center justify-center transition-all duration-200 font-medium rounded-sm"
                  onClick={() => handleTimeSlotClick(time, 'default')}
                  title="Clique para agendar">
                  <span>-</span>
                </div>
                {/* Horário e Mensagem */}
                <div 
                  className="col-span-2 p-2 border-r-2 border-green-200 text-sm text-green-600 cursor-pointer bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 flex items-center justify-center transition-all duration-200 rounded-sm"
                  onClick={() => handleTimeSlotClick(time, 'default')}
                  title="Clique para agendar">
                  <div className="text-center text-xs">
                    <PlusCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
                    <span className="font-medium">{time}</span>
                  </div>
                </div>
                {/* Prontuário */}
                <div 
                  className="col-span-2 p-2 border-r-2 border-green-200 text-sm text-green-600 cursor-pointer bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 flex items-center justify-center transition-all duration-200 rounded-sm"
                  onClick={() => handleTimeSlotClick(time, 'default')}
                  title="Clique para agendar">
                  <span>-</span>
                </div>
                {/* Serviço */}
                <div 
                  className="col-span-1 p-2 border-r-2 border-green-200 text-sm text-green-600 cursor-pointer bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 flex items-center justify-center transition-all duration-200 rounded-sm"
                  onClick={() => handleTimeSlotClick(time, 'default')}
                  title="Clique para agendar">
                  <span>-</span>
                </div>
                {/* Convênio */}
                <div 
                  className="col-span-2 p-2 border-r-2 border-green-200 text-sm text-green-600 cursor-pointer bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 flex items-center justify-center transition-all duration-200 rounded-sm"
                  onClick={() => handleTimeSlotClick(time, 'default')}
                  title="Clique para agendar">
                  <span>-</span>
                </div>
                {/* Status */}
                <div 
                  className="col-span-2 p-2 text-sm text-green-600 cursor-pointer bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 flex items-center justify-center transition-all duration-200 rounded-sm font-medium"
                  onClick={() => handleTimeSlotClick(time, 'default')}
                  title="Clique para agendar">
                  <span className="text-xs">✓ Disponível</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
