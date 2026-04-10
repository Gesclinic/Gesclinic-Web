
import React from "react";
import { Plus } from "lucide-react";
import { getStatusStyle } from "@/utils/getStatusStyle";

export default function AgendaSlotCard({
  id,
  data,
  horario,
  profissionalId,
  salaId,
  agendamento,
  isActiveColumn,
  onClick
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const isLivre = !agendamento;
  let status = agendamento?.status || (isLivre ? "disponivel" : "");
  const { background, color } = getStatusStyle(status);
  const cardBackground = isActiveColumn ? 'transparent' : background;
  const finalBackground = isHovered ? '#f5f5f5' : cardBackground;
  const cardId = agendamento?.id || id;

  if (isLivre) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 72,
          borderRadius: 0,
          border: "1.5px dashed #999",
          borderBottom: "1px solid #ddd",
          borderLeft: "3px dashed #1976d2",
          background: finalBackground,
          cursor: "pointer",
          transition: "background 0.15s ease-in-out",
          margin: "0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#1976d2" }}>Disponível</span>
          <Plus size={18} color="#1976d2" />
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower.includes("profissional")) {
      return { bg: "#e8f5e9", text: "#2e7d32", label: "Aguardando" };
    }
    if (statusLower.includes("agendado") || statusLower.includes("confirmado")) {
      return { bg: "#e3f2fd", text: "#1565c0", label: "Confirmado" };
    }
    if (statusLower.includes("cancelado")) {
      return { bg: "#ffebee", text: "#c62828", label: "Cancelado" };
    }
    return { bg: "#f5f5f5", text: "#616161", label: status };
  };

  const badge = getStatusBadge(status);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: 72,
        borderRadius: 0,
        border: "1px solid #ddd",
        borderBottom: "1px solid #ddd",
        borderLeft: "3px solid #ccc",
        background: finalBackground,
        cursor: "pointer",
        transition: "background 0.15s",
        margin: "0",
        padding: "8px 0"
      }}
    >
      <div style={{ width: 90, paddingRight: 12, paddingLeft: 12, textAlign: 'center', flexShrink: 0, fontWeight: 600, fontSize: '13px', color: '#0066cc' }}>{horario}</div>
      <div style={{ width: 140, paddingRight: 12, textAlign: 'left', flexShrink: 0, fontSize: '13px', fontWeight: 500, color: '#333' }}>{agendamento.patient || "—"}</div>
      <div style={{ width: 40, paddingRight: 8, textAlign: 'left', flexShrink: 0, fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agendamento.prontuario || "—"}</div>
      <div style={{ width: 160, paddingRight: 12, textAlign: 'left', flexShrink: 0, fontSize: '12px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agendamento.service || "—"}</div>
      <div style={{ width: 50, paddingRight: 8, textAlign: 'left', flexShrink: 0, fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agendamento.payer || "—"}</div>
      <div style={{ minWidth: 120, paddingRight: 12, flex: 1, textAlign: 'left', fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agendamento.plan || agendamento.notes || ""}</div>
      <div style={{ width: 130, paddingRight: 12, textAlign: 'left', flexShrink: 0, fontSize: '12px', fontWeight: 500, color: '#333' }}>{agendamento.professional || "—"}</div>
      <div style={{ 
        width: 200, 
        paddingRight: 12, 
        paddingLeft: 8,
        textAlign: 'center', 
        flexShrink: 0, 
        fontSize: '8px',
        fontWeight: 400,
        background: badge.bg,
        color: badge.text,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.3px'
      }}>{badge.label}</div>
    </div>
  );
}
