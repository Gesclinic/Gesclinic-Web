import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgendaConfig } from "@/hooks/useAgendaConfig";
import { format, isSameDay } from "date-fns";
import { utcToZonedTime, format as formatTz } from "date-fns-tz";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  User,
  Edit,
  UserCheck,
  Trash2,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";

/* ================================
   AGENDA TABLE VIEW
================================ */
export default function AgendaTableView({
  appointments = [],
  professionals = [],
  selectedDate,
  onEditClick,
  onDeleteClick,
  onNewAppointment,
  onCheckin,
  labelForStatus,
}) {
  const navigate = useNavigate();
  const agendaConfig = useAgendaConfig();

  /* ============================================
     1) HORÁRIOS — slots conforme configuração
  ============================================ */
  const timeSlots = useMemo(() => {
    const slots = [];
    const [startHour, startMinute] = (agendaConfig.horario_abertura || "08:00").split(":").map(Number);
    const [endHour, endMinute] = (agendaConfig.horario_fechamento || "18:00").split(":").map(Number);
    const slotSize = agendaConfig.slot_agenda || agendaConfig.tempo_medio_atendimento || 15;

    // Almoço
    const almocoInicio = agendaConfig.horario_almoco_inicio;
    const almocoFim = agendaConfig.horario_almoco_fim;
    let almocoStart = null, almocoEnd = null;

    if (almocoInicio && almocoFim) {
      const [h1, m1] = almocoInicio.split(":").map(Number);
      const [h2, m2] = almocoFim.split(":").map(Number);
      almocoStart = h1 * 60 + m1;
      almocoEnd = h2 * 60 + m2;
    }

    let current = new Date(selectedDate);
    current.setHours(startHour, startMinute, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(endHour, endMinute, 0, 0);

    while (current <= end) {
      const hours = current.getHours().toString().padStart(2, "0");
      const minutes = current.getMinutes().toString().padStart(2, "0");
      const time = `${hours}:${minutes}`;

      const totalMinutes = current.getHours() * 60 + current.getMinutes();

      const isAlmoco = almocoStart !== null && totalMinutes >= almocoStart && totalMinutes < almocoEnd;

      slots.push({ time, isAlmoco });

      current.setMinutes(current.getMinutes() + slotSize);
    }

    return slots;
  }, [agendaConfig, selectedDate]);

  /* ============================================
     2) ORGANIZAR AGENDAMENTOS POR HORÁRIO
     (timezone corrigido + agrupamento por profissional)
  ============================================ */
  const appointmentsByTime = useMemo(() => {
    const map = {};

    appointments.forEach((apt) => {
      if (!isSameDay(new Date(apt.start_time), selectedDate)) return;

      const zoned = utcToZonedTime(apt.start_time, "America/Sao_Paulo");
      const key = formatTz(zoned, "HH:mm", { timeZone: "America/Sao_Paulo" });

      if (!map[key]) map[key] = {};
      map[key][apt.professional_id || "unassigned"] = apt;
    });

    return map;
  }, [appointments, selectedDate]);

  /* ============================================
     3) CRIAR OU EDITAR AGENDAMENTO
  ============================================ */
  const handleCellClick = (time, professionalId) => {
    const start = new Date(selectedDate);
    const [h, m] = time.split(":").map(Number);
    start.setHours(h, m, 0, 0);

    const existing = appointmentsByTime[time]?.[professionalId];

    if (existing) {
      onEditClick?.(existing);
      return;
    }

    onNewAppointment?.({
      start_time: start.toISOString(),
      professional_id: professionalId,
      is_free: true,
    });
  };

  /* ============================================
     4) SE NÃO HÁ PROFISSIONAIS, MOSTRAR COLUNAS FAKE
  ============================================ */
  const displayProfessionals =
    professionals.length > 0
      ? professionals
      : [
          { id: "p1", name: "Profissional 1" },
          { id: "p2", name: "Profissional 2" },
          { id: "p3", name: "Profissional 3" },
        ];

  /* ============================================
     5) CORES POR STATUS
  ============================================ */
  const statusColors = (status, isFit) => {
    if (isFit) return "bg-yellow-100 text-yellow-800 border-yellow-200";

    if (!status || status === "livre") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    const s = status.toLowerCase();

    if (s.includes("confirm")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (s.includes("cancel")) return "bg-red-100 text-red-800 border-red-200";
    if (s.includes("atend")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    return "bg-purple-100 text-purple-800 border-purple-200";
  };

  /* ============================================
     6) RENDER
  ============================================ */
  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-20 text-center font-semibold border-r">Horário</TableHead>

            {displayProfessionals.map((p) => (
              <TableHead
                key={p.id}
                className="text-center font-semibold border-r last:border-r-0"
              >
                <div>
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.specialty}</div>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {timeSlots.map(({ time, isAlmoco }) => (
            <TableRow key={time} className={isAlmoco ? "bg-yellow-50" : ""}>
              {/* HORÁRIO */}
              <TableCell className="text-sm font-medium bg-gray-50 border-r text-center">
                {time}
                {isAlmoco && (
                  <span className="ml-1 text-yellow-700 font-semibold">Almoço</span>
                )}
              </TableCell>

              {/* PROFISSIONAIS */}
              {displayProfessionals.map((prof) => {
                const apt = appointmentsByTime[time]?.[prof.id];

                const isFree = !apt;
                const isBlocked = apt?.is_blocked;

                return (
                  <TableCell
                    key={prof.id}
                    onClick={() => handleCellClick(time, prof.id)}
                    className={`min-h-[80px] border-r cursor-pointer ${
                      isAlmoco ? "bg-yellow-50" : "hover:bg-blue-50"
                    }`}
                  >
                    {/* 1) Horário de almoço */}
                    {isAlmoco && (
                      <span className="text-yellow-700 font-semibold">
                        Horário de Almoço
                      </span>
                    )}

                    {/* 2) Livre */}
                    {isFree && !isAlmoco && (
                      <div className="h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col justify-center items-center text-gray-400 hover:text-blue-600">
                        <PlusCircle className="w-5 h-5" />
                        <span className="text-xs">Novo</span>
                      </div>
                    )}

                    {/* 3) Bloqueado */}
                    {isBlocked && (
                      <Card className="p-2 border-l-4 bg-red-50 border-red-400">
                        <div className="text-sm text-red-700 font-semibold flex gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Horário Bloqueado
                        </div>
                        <div className="text-xs text-red-600">
                          {apt.block_reason || apt.notes || "Motivo não informado"}
                        </div>
                        <Badge className="mt-2 bg-red-100 text-red-800">Bloqueado</Badge>
                      </Card>
                    )}

                    {/* 4) Agendado */}
                    {apt && !isBlocked && (
                      <Card className={`p-2 border-l-4 ${statusColors(apt.status, apt.is_fit)}`}>
                        {/* Nome do paciente */}
                        <div className="font-semibold flex items-center gap-1 text-sm">
                          <User className="w-3 h-3" />
                          <span className="truncate text-blue-700">
                            {(() => {
                              const raw = apt.patient_name || "";
                              return raw.replace(/\s*\(?\d{2,3}\)?\s*\d{4,5}[-.\s]?\d{4}$/, "").trim();
                            })()}
                          </span>
                        </div>

                        {/* Serviço */}
                        <div className="text-xs text-gray-700 truncate">
                          {apt.service_name}
                        </div>

                        {/* Convênio */}
                        {apt.payer_name && (
                          <div className="text-xs text-gray-500 truncate">
                            {apt.payer_name}
                          </div>
                        )}

                        {/* Status */}
                        <div className="flex justify-between mt-2">
                          <Badge className={`text-xs ${statusColors(apt.status)}`}>
                            {labelForStatus?.(apt.status) || apt.status}
                          </Badge>

                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditClick?.(apt);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCheckin?.(apt);
                              }}
                            >
                              <UserCheck className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClick?.(apt);
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
