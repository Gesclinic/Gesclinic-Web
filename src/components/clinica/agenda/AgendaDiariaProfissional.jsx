import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, ChevronLeft, ChevronRight, Search } from "lucide-react";
import AppointmentDialog from "@/components/clinica/AppointmentDialog.jsx";
import {
  fetchProfessionalsForSelect,
  listAvailableSlots,
} from "@/lib/appointmentsApi";
import { listAppointmentsRange } from "@/lib/agendaApi";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/lib/appointmentsPersist";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NONE, asUuidOrNull } from "@/lib/selectUtils";
import { labelForStatus } from "@/lib/statusLabels";
import AgendaSlotsTable from "@/components/clinica/agenda/AgendaSlotsTable.jsx";
import CheckinDialog from "@/components/clinica/agenda/CheckinDialog.jsx";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import ConfirmationDialog from "@/components/clinica/ConfirmationDialog";
import { utcToZonedTime, format as formatTz } from 'date-fns-tz';

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const overlaps = (aStart, aEnd, bStart, bEnd) =>
  new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);

const localDateISO = (date) => {
  if (!date || isNaN(date)) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const ensureDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const s = v.includes("T") ? v : v.replace(" ", "T");
    return new Date(s);
  }
  return new Date(v);
};

export default function AgendaDiariaProfissional() {
  const { clinicId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(NONE);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);

  const [isCheckinDialogOpen, setIsCheckinDialogOpen] = useState(false);
  const [checkinAppointment, setCheckinAppointment] = useState(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAppointment, setDeletingAppointment] = useState(null);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const d = selectedDate;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return { rangeStart: start, rangeEnd: addDays(start, 1) };
  }, [selectedDate]);

  const formattedDate = useMemo(() => localDateISO(selectedDate), [selectedDate]);

  const loadProfessionals = useCallback(async () => {
    if (!clinicId) return;
    try {
      const data = await fetchProfessionalsForSelect(clinicId);
      setProfessionals(data || []);
      if (data?.length > 0 && (selectedProfessional === NONE || !data.some(p => p.id === selectedProfessional))) {
        setSelectedProfessional(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error?.message);
      setProfessionals([]);
    }
  }, [clinicId]);

  const loadAppointments = useCallback(async () => {
    if (!clinicId) return;
    try {
      const profIdForFilter = asUuidOrNull(selectedProfessional);

      const fetchedAppointments = await listAppointmentsRange(
        clinicId,
        rangeStart,
        rangeEnd,
        searchTerm,
        profIdForFilter
      );

      let allRows = (fetchedAppointments || []).map((apt) => ({
        ...apt,
        start_time: ensureDate(apt.start_time),
        end_time: ensureDate(apt.end_time),
      }));

      if (profIdForFilter) {
        const available = await listAvailableSlots({
          clinicId,
          professionalId: profIdForFilter,
          dateISO: formattedDate,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
        });

        const freeNormalized = (available ?? []).map((slot) => ({
          start: ensureDate(slot.start_time_iso || slot.start_time),
          end: ensureDate(slot.end_time_iso || slot.end_time),
        })).filter(s => s.start && s.end);

        const freeFiltered = freeNormalized.filter(
          (slot) =>
            !allRows.some((apt) =>
              overlaps(
                apt.start_time,
                apt.end_time,
                slot.start,
                slot.end
              )
            )
        );
        
        const currentProfessional = professionals.find(p => p.id === profIdForFilter);
        const profName = currentProfessional?.name || '';
        
        const freeRows = freeFiltered.map((slot) => ({
          id: `free-${slot.start.getTime()}-${slot.end.getTime()}`,
          start_time: slot.start,
          end_time: slot.end,
          status: "livre",
          is_free: true,
          professional_id: profIdForFilter,
          professional_name: profName,
          patient_name: "Livre",
        }));

        allRows.push(...freeRows);
      }

      allRows.sort((a, b) => {
        const aZoned = utcToZonedTime(a.start_time, 'America/Sao_Paulo');
        const bZoned = utcToZonedTime(b.start_time, 'America/Sao_Paulo');
        return +aZoned - +bZoned;
      });
      const dedup = Array.from(new Map(allRows.map((item) => [item.id, item])).values());

      setAppointments(dedup);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error?.message);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar agendamentos: " + (error?.message || ""),
      });
      setAppointments([]);
    }
  }, [
    clinicId,
    selectedProfessional,
    rangeStart,
    rangeEnd,
    searchTerm,
    toast,
    formattedDate,
    professionals
  ]);

  useEffect(() => {
    loadProfessionals();
  }, [clinicId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleDateChange = (e) => {
    const value = e.target.value;
    if (!value) {
        setSelectedDate(new Date());
        return;
    }
    const [year, month, day] = value.split("-").map(Number);
    const newDate = new Date(year, month - 1, day);
    setSelectedDate(newDate);
  };

  const handleNavDate = (direction) => {
    const increment = direction === "next" ? 1 : -1;
    setSelectedDate((prev) => addDays(prev, increment));
  };

  const handleNewAppointmentClick = async (slot) => {
    let initial = {};
    const profId = asUuidOrNull(selectedProfessional);

    if (slot?.start_time) {
      // Extrai HH:mm do objeto Date
      let horaInicio = "";
      if (slot.start_time) {
        const zoned = utcToZonedTime(slot.start_time, 'America/Sao_Paulo');
        horaInicio = formatTz(zoned, 'HH:mm', { timeZone: 'America/Sao_Paulo' });
      }
      initial = {
        start_time: horaInicio,
        professional_id: slot.professional_id || profId,
      };
    } else {
      let start_iso = `${formattedDate}T09:00:00.000Z`;
      if (profId) {
        try {
          const available = await listAvailableSlots({
            clinicId,
            professionalId: profId,
            dateISO: formattedDate,
          });
          const first = (available ?? [])[0];
          const firstStart = first?.start_time_iso || first?.start_time;
          if (firstStart) {
            const parsed = ensureDate(firstStart);
            if (parsed) start_iso = parsed.toISOString();
          }
        } catch (err) {
          console.warn("Não foi possível buscar próximo horário livre.", err?.message || err);
        }
      }
      initial = { start_iso, professional_id: profId };
    }

    setEditingAppointment(initial);
    setIsAppointmentDialogOpen(true);
  };

  const handleEditAppointment = (appointment) => {
    // Extrai data e horários como strings prontas para os inputs
    const getDateStr = (dt) => {
      if (dt instanceof Date) return dt.toISOString().slice(0,10);
      if (typeof dt === "string" && dt.length >= 10) return dt.slice(0,10);
      return "";
    };
    const getTimeStr = (dt) => {
      if (dt instanceof Date) return dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
      if (typeof dt === "string" && dt.length >= 16) return dt.slice(11,16);
      return "";
    };
    setEditingAppointment({
      ...appointment,
      date: getDateStr(appointment.start_time),
      start_time: getTimeStr(appointment.start_time),
      end_time: getTimeStr(appointment.end_time)
    });
    setIsAppointmentDialogOpen(true);
  };

  const handleAppointmentSubmit = async (payload) => {
    setAppointmentLoading(true);
    try {
      if (editingAppointment?.id && !String(editingAppointment.id).startsWith("free-")) {
        await updateAppointment(editingAppointment.id, clinicId, payload);
        toast({ title: "Sucesso", description: "Agendamento atualizado." });
        setIsAppointmentDialogOpen(false);
        setEditingAppointment(null);
        loadAppointments();
      } else {
        const created = await createAppointment(clinicId, payload);
        toast({ title: "Sucesso", description: "Agendamento criado." });
        setIsAppointmentDialogOpen(false);
        setEditingAppointment(null);
        loadAppointments();
        if (created?.id) {
          navigate(`/clinica/atendimento/${created.id}`);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error?.message);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao salvar agendamento: " + error.message,
      });
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handleDeleteClick = (appointment) => {
    setDeletingAppointment(appointment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingAppointment) return;
    try {
      await deleteAppointment(deletingAppointment.id, clinicId);
      toast({ title: "Sucesso", description: "Agendamento excluído." });
      loadAppointments();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error?.message);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao excluir agendamento: " + error.message,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingAppointment(null);
    }
  };

  const handleCheckin = (appointment) => {
    setCheckinAppointment(appointment);
    setIsCheckinDialogOpen(true);
  };

  const handleCheckinComplete = async (encounterId) => {
    setIsCheckinDialogOpen(false);
    setCheckinAppointment(null);
    loadAppointments();
    if (encounterId && checkinAppointment) {
      navigate(
        `/clinica/prontuario?patient_id=${checkinAppointment.patient_id}&appointment_id=${checkinAppointment.id}&professional_id=${checkinAppointment.professional_id}`
      );
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAppointments();
  };

  return (
    <>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => handleNavDate("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Input type="date" value={formattedDate} onChange={handleDateChange} className="pr-8" />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <Button variant="outline" size="icon" onClick={() => handleNavDate("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
              Hoje
            </Button>
          </div>

          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Todos os Profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Todos os Profissionais</SelectItem>
              {professionals.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome, CPF ou data de nascimento (dd/mm/aaaa)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>

        <div className="overflow-x-auto">
          <AgendaSlotsTable
            slots={appointments}
            onEditClick={handleEditAppointment}
            onCheckin={handleCheckin}
            labelForStatus={labelForStatus}
            onNewClick={handleNewAppointmentClick}
            onRowClick={(apt) => {
              if (apt.status === "livre" || apt.is_free) {
                handleNewAppointmentClick(apt);
              } else {
                handleEditAppointment(apt);
              }
            }}
            onDoubleClick={(apt) => {
              if (apt.status !== "livre" && !apt.is_free) {
                handleEditAppointment(apt);
              }
            }}
            onDeleteClick={handleDeleteClick}
            onStatusChange={async (id, status) => {
              await updateAppointment(id, clinicId, { status });
              loadAppointments();
            }}
          />
        </div>
      </div>

      <AppointmentDialog
        open={isAppointmentDialogOpen}
        onOpenChange={(isOpen) => {
          setIsAppointmentDialogOpen(isOpen);
          if (!isOpen) setEditingAppointment(null);
        }}
        onSubmit={handleAppointmentSubmit}
        initialData={editingAppointment}
        loading={appointmentLoading}
      />

      {checkinAppointment && (
        <CheckinDialog
          open={isCheckinDialogOpen}
          onOpenChange={setIsCheckinDialogOpen}
          appointment={checkinAppointment}
          onCheckinComplete={handleCheckinComplete}
        />
      )}

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita."
      />
    </>
  );
}