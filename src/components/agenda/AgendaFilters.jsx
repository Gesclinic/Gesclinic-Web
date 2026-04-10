import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";

export default function AgendaFilters({
  professionalId, setProfessionalId, professionals = [],
  roomId, setRoomId, rooms = [],
  status, setStatus, showStatus = true,
  patientId, setPatientId, patients = [],
  showProfessional = true,
  showRoom = true,
  showPatient = true,
}) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      {showProfessional && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 220 }}>
          <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Profissional</label>
          <Select value={professionalId} onValueChange={setProfessionalId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name || p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {showRoom && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180 }}>
          <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Sala</label>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {showStatus && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180 }}>
          <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="scheduled">Agendado</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="completed">Finalizado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {showPatient && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 220 }}>
          <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Paciente</label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name || p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
