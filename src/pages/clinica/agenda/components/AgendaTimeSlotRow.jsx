// src/pages/clinica/agenda/components/AgendaTimeSlotRow.jsx
import React from 'react';
import { getStatusStyle } from '@/utils/helpers/getStatusStyle';

/**
 * props:
 * - horario: string ("08:00")
 * - agendamento: objeto do agendamento OU null
 * - onClick: função
 * - status: 'livre' | 'ocupado' | 'confirmado' | 'cancelado' (DEPRECATED - usar agendamento.status)
 */
export default function AgendaTimeSlotRow({ horario, agendamento, onClick, status }) {
  // Obter cor baseada no status real do agendamento
  let bg = '#f6f6f6'; // cinza claro padrão para slots livres
  let textColor = '#000';

  if (agendamento?.status) {
    // Usar o status real do agendamento
    const { background, color } = getStatusStyle(agendamento.status);
    bg = background;
    textColor = color;
  } else if (status) {
    // Fallback para status genérico (compatibilidade)
    const statusColors = {
      livre: '#f6f6f6',
      ocupado: '#e3f0ff',
      confirmado: '#d1f7d6',
      cancelado: '#ffe3e3',
    };
    bg = statusColors[status] || '#fff';
  }

  return (
    <tr
      style={{ background: bg, color: textColor, cursor: 'pointer', transition: 'background 0.2s' }}
      onClick={onClick}
      title={!agendamento ? 'Novo agendamento' : 'Ver detalhes'}
    >
      <td
        style={{ fontWeight: 600, background: '#f9f9f9', position: 'sticky', left: 0, zIndex: 2 }}
      >
        {horario}
      </td>
      <td>{agendamento?.protocolo || '—'}</td>
      <td>{agendamento?.paciente || (!agendamento ? 'Disponível' : '—')}</td>
      <td>{agendamento?.servico || '—'}</td>
      <td>{agendamento?.convenio || '—'}</td>
      <td>{agendamento?.plano || '—'}</td>
      <td>{agendamento?.valor ? `R$ ${Number(agendamento.valor).toFixed(2)}` : '—'}</td>
      <td>{agendamento?.profissional || '—'}</td>
      <td>{agendamento?.sala || '—'}</td>
      <td>{agendamento?.observacao || '—'}</td>
    </tr>
  );
}
