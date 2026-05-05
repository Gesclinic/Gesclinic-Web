/**
 * AgendamentoFormWithRBAC.jsx
 * 
 * Exemplo de formulário de agendamento com RBAC integrado
 * Mostra como implementar controle de acesso baseado em role
 * 
 * REGRAS:
 * - recepcao: Pode criar e editar (horário, paciente), NÃO pode editar valor
 * - admin/gestor: Pode criar, editar, incluindo valor
 * - medico: Apenas confirmação de presença
 */

import React, { useState } from 'react';
import useAuthorization from '@/modules/agenda/hooks/useAuthorization';
export function AgendamentoFormWithRBAC({
  appointment = null,
  onSubmit,
  onCancel
}) {
  const auth = useAuthorization();
  const [form, setForm] = useState({
    date: appointment?.date || '',
    startTime: appointment?.startTime || '',
    endTime: appointment?.endTime || '',
    patientName: appointment?.patientName || '',
    professionalName: appointment?.professionalName || '',
    value: appointment?.value || '',
    status: appointment?.status || 'agendado',
    notes: appointment?.notes || ''
  });

  // ============================================================
  // VERIFICAR PERMISSÕES
  // ============================================================

  // Se não pode criar agendamento, bloquear acesso
  if (!appointment && !auth.canCreateAppointment) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 24,
        background: '#fff3e0',
        border: '1px solid #ffb74d',
        borderRadius: 8
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        color: '#e65100',
        marginBottom: 12
      }
    }, "\uD83D\uDD12 Acesso Negado"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: '#666'
      }
    }, "Seu perfil (", auth.currentRole, ") n\xE3o tem permiss\xE3o para criar agendamentos."));
  }

  // Se não pode editar agendamento, bloquear edição
  if (appointment && !auth.canEditAppointment) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 24,
        background: '#fff3e0',
        border: '1px solid #ffb74d',
        borderRadius: 8
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        color: '#e65100',
        marginBottom: 12
      }
    }, "\uD83D\uDD12 Acesso Negado"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: '#666'
      }
    }, "Seu perfil (", auth.currentRole, ") n\xE3o tem permiss\xE3o para editar agendamentos."));
  }

  // ============================================================
  // HANDLERS
  // ============================================================

  function handleChange(e) {
    const {
      name,
      value
    } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  }
  function handleSubmit(e) {
    e.preventDefault();

    // Validações básicas
    if (!form.date || !form.startTime || !form.endTime) {
      alert('Data e horários são obrigatórios');
      return;
    }
    if (form.startTime >= form.endTime) {
      alert('Hora final deve ser maior que a hora inicial');
      return;
    }
    if (!form.patientName) {
      alert('Paciente é obrigatório');
      return;
    }

    // Se não pode editar valor, remover do payload
    const payload = {
      ...form
    };
    if (!auth.canEditAppointmentValue) {
      delete payload.value;
    }
    onSubmit(payload);
  }

  // ============================================================
  // RENDERIZAR FORMULÁRIO COM RBAC
  // ============================================================

  return /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    style: {
      padding: 24,
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e0e0e0'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: 24
    }
  }, appointment ? '✏️ Editar Agendamento' : '➕ Novo Agendamento'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 16,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      display: 'block',
      marginBottom: 6
    }
  }, "Data *"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    name: "date",
    value: form.date,
    onChange: handleChange,
    required: true,
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      display: 'block',
      marginBottom: 6
    }
  }, "Hora Inicial *"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    name: "startTime",
    value: form.startTime,
    onChange: handleChange,
    required: true,
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      display: 'block',
      marginBottom: 6
    }
  }, "Hora Final *"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    name: "endTime",
    value: form.endTime,
    onChange: handleChange,
    required: true,
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: 4
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      display: 'block',
      marginBottom: 6
    }
  }, "Paciente *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    name: "patientName",
    value: form.patientName,
    onChange: handleChange,
    placeholder: "Nome do paciente",
    required: true,
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      display: 'block',
      marginBottom: 6
    }
  }, "Profissional"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    name: "professionalName",
    value: form.professionalName,
    onChange: handleChange,
    placeholder: "Nome do profissional",
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: 4
    }
  }))), auth.canEditAppointmentValue ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      display: 'block',
      marginBottom: 6
    }
  }, "\uD83D\uDCB0 Valor (R$) ", auth.canEditAppointmentValue && /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#1976d2',
      fontSize: '0.85em'
    }
  }, "\u2713 Habilitado")), /*#__PURE__*/React.createElement("input", {
    type: "number",
    name: "value",
    value: form.value,
    onChange: handleChange,
    placeholder: "0.00",
    step: "0.01",
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: 4
    }
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      background: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: 4,
      marginBottom: 24,
      color: '#999',
      fontSize: '0.9em'
    }
  }, "\uD83D\uDD12 Campo \"Valor\" desabilitado para seu perfil (", auth.currentRole, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      display: 'block',
      marginBottom: 6
    }
  }, "Status *"), /*#__PURE__*/React.createElement("select", {
    name: "status",
    value: form.status,
    onChange: handleChange,
    required: true,
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "agendado"
  }, "Agendado"), /*#__PURE__*/React.createElement("option", {
    value: "confirmado"
  }, "Confirmado"), /*#__PURE__*/React.createElement("option", {
    value: "atendido"
  }, "Atendido"), /*#__PURE__*/React.createElement("option", {
    value: "cancelado"
  }, "Cancelado"), /*#__PURE__*/React.createElement("option", {
    value: "falta"
  }, "Falta"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      display: 'block',
      marginBottom: 6
    }
  }, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("textarea", {
    name: "notes",
    value: form.notes,
    onChange: handleChange,
    rows: 3,
    placeholder: "Observa\xE7\xF5es adicionais...",
    style: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: 4,
      fontFamily: 'inherit'
    }
  })), process.env.NODE_ENV === 'development' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      background: '#e3f2fd',
      border: '1px solid #90caf9',
      borderRadius: 4,
      marginBottom: 24,
      fontSize: '0.85em',
      color: '#1565c0'
    }
  }, "\uD83D\uDC64 ", /*#__PURE__*/React.createElement("strong", null, auth.currentRole), auth.canCreateAppointment && ' ✓ Criar', auth.canEditAppointment && ' ✓ Editar', auth.canEditAppointmentValue && ' ✓ Editar Valor', auth.canDeleteAppointment && ' ✓ Deletar'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onCancel,
    style: {
      padding: '8px 18px',
      background: '#eee',
      border: '1px solid #ccc',
      borderRadius: 4,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    style: {
      padding: '8px 18px',
      background: '#1976d2',
      color: '#fff',
      border: 'none',
      borderRadius: 4,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, appointment ? 'Salvar Alterações' : 'Criar Agendamento')));
}
export default AgendamentoFormWithRBAC;