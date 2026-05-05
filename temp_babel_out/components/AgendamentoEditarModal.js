// src/pages/clinica/agenda/components/AgendamentoEditarModal.jsx
import React, { useEffect, useState } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { usePacientes, useProfissionais, useSalas, useAgendamentoMutation } from '@/modules/agenda/hooks';
import useAuthorization from '@/modules/agenda/hooks/useAuthorization';
import { buscarAgendamentoPorId, listarServicosPorProfissional, listarConvenios, listarPlanosPorConvenio } from '@/modules/agenda/services/agenda.api.queries';
import { mapAgendaItem } from '@/modules/agenda/services/agendaMapper';
import { format } from 'date-fns';
export default function AgendamentoEditarModal({
  agendamentoId,
  onClose,
  onSuccess
}) {
  const {
    clinic
  } = useClinicContext();

  // RBAC - Verificar permissões
  const {
    canEditAppointment,
    canEditAppointmentValue
  } = useAuthorization();

  // Se não tem permissão, renderizar erro
  if (!canEditAppointment) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#fff',
        borderRadius: 10,
        minWidth: 420,
        maxWidth: 600,
        padding: 32,
        boxShadow: '0 2px 16px #0002'
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontWeight: 700,
        fontSize: 22,
        marginBottom: 18,
        color: '#d32f2f'
      }
    }, "\u274C Permiss\xE3o Negada"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: '#666',
        marginBottom: 24
      }
    }, "Voc\xEA n\xE3o tem permiss\xE3o para editar agendamentos."), /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      style: {
        padding: '8px 18px',
        background: '#1976d2',
        color: '#fff',
        border: 0,
        borderRadius: 4,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, "Fechar")));
  }

  // Hooks para carregar dados
  const {
    data: pacientes
  } = usePacientes({
    clinicId: clinic?.id
  });
  const {
    data: profissionais
  } = useProfissionais({
    clinicId: clinic?.id
  });
  const {
    data: salas
  } = useSalas({
    clinicId: clinic?.id
  });
  const {
    atualizarAgendamento,
    loading: mutationLoading
  } = useAgendamentoMutation();
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Carregar dados do agendamento e listas de convênios
  useEffect(() => {
    if (!agendamentoId || !clinic?.id) return;
    setLoading(true);
    Promise.all([buscarAgendamentoPorId(agendamentoId), listarConvenios({
      clinicId: clinic.id
    })]).then(([ag, convs]) => {
      const mapped = mapAgendaItem(ag.data);
      setOriginal(mapped);
      setForm({
        id: mapped.id,
        date: mapped.date || (mapped.startTime ? format(mapped.startTime, 'yyyy-MM-dd') : ''),
        startTime: mapped.startTime ? format(mapped.startTime, 'HH:mm') : '',
        endTime: mapped.endTime ? format(mapped.endTime, 'HH:mm') : '',
        patientId: mapped.patientId || '',
        professionalId: mapped.professionalId || '',
        serviceId: mapped.serviceId || '',
        roomId: mapped.roomId || '',
        payerId: mapped.payerId || '',
        planId: mapped.planId || '',
        status: mapped.status || 'scheduled',
        notes: mapped.notes || ''
      });
      setConvenios(convs);
      setLoading(false);
    });
  }, [agendamentoId, clinic?.id]);

  // Carregar serviços ao trocar profissional
  useEffect(() => {
    if (form?.professionalId) {
      listarServicosPorProfissional({
        profissionalId: form.professionalId
      }).then(setServicos);
    } else {
      setServicos([]);
    }
    setForm(f => f ? {
      ...f,
      serviceId: ''
    } : f);
  }, [form?.professionalId]);

  // Carregar planos ao trocar convênio
  useEffect(() => {
    if (form?.payerId && form.payerId !== '' && form.payerId !== '~') {
      listarPlanosPorConvenio({
        convenioId: form.payerId
      }).then(planos => {
        setPlanos(planos);
        // Se não houver planos, limpa seleção
        if (!planos.length) {
          setForm(f => f ? {
            ...f,
            planId: ''
          } : f);
        }
      });
    } else {
      setPlanos([]);
      setForm(f => f ? {
        ...f,
        planId: ''
      } : f);
    }
  }, [form?.payerId]);
  function validar() {
    if (!form.date) throw new Error("Data obrigatória");
    if (!form.startTime) throw new Error("Horário obrigatório");
    if (!form.endTime) throw new Error("Horário obrigatório");
    if (form.startTime >= form.endTime) throw new Error("Hora final deve ser maior que inicial");
    if (!form.patientId) throw new Error("Paciente obrigatório");
    return true;
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      validar();
      // PASSO 5: Enviar payload correto com id e form
      await atualizarAgendamento({
        id: agendamentoId,
        form: form
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      // Tratar erro de conflito de concorrência
      if (err?.code === 'conflict_detected') {
        const conflictMsg = '⚠️ Este agendamento foi atualizado por outro usuário.\n\nCarregue novamente para ver as alterações.';
        setError(conflictMsg);
      } else {
        const errorMessage = err?.message?.includes('obrigatório') ? err.message : err?.message || 'Erro ao salvar alterações. Tente novamente.';
        setError(errorMessage);
      }
    }
  }
  function handleChange(e) {
    const {
      name,
      value
    } = e.target;
    setForm(f => ({
      ...f,
      [name]: value
    }));
  }
  if (loading || !form) return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderRadius: 10,
      minWidth: 420,
      maxWidth: 600,
      padding: 32,
      boxShadow: '0 2px 16px #0002',
      maxHeight: '90vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontWeight: 700,
      fontSize: 22,
      marginBottom: 18
    }
  }, "Editar Agendamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      color: '#888',
      padding: 32
    }
  }, "Carregando...")));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("form", {
    onClick: e => e.stopPropagation(),
    onSubmit: handleSubmit,
    style: {
      background: '#fff',
      borderRadius: 10,
      minWidth: 420,
      maxWidth: 600,
      padding: 32,
      boxShadow: '0 2px 16px #0002',
      maxHeight: '90vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontWeight: 700,
      fontSize: 22,
      marginBottom: 18
    }
  }, "Editar Agendamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Data *"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    name: "date",
    value: form.date,
    onChange: handleChange,
    min: new Date().toISOString().slice(0, 10),
    required: true,
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Hora Inicial *"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    name: "startTime",
    value: form.startTime,
    onChange: handleChange,
    required: true,
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Hora Final *"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    name: "endTime",
    value: form.endTime,
    onChange: handleChange,
    required: true,
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Paciente *"), /*#__PURE__*/React.createElement("select", {
    name: "patientId",
    value: form.patientId,
    onChange: handleChange,
    required: true,
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), pacientes.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Profissional"), /*#__PURE__*/React.createElement("select", {
    name: "professionalId",
    value: form.professionalId,
    onChange: handleChange,
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), profissionais.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Servi\xE7o"), /*#__PURE__*/React.createElement("select", {
    name: "serviceId",
    value: form.serviceId,
    onChange: handleChange,
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), servicos.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name, " ", s.duration ? `(${s.duration} min)` : '')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Sala"), /*#__PURE__*/React.createElement("select", {
    name: "roomId",
    value: form.roomId,
    onChange: handleChange,
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Sem sala"), salas.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Conv\xEAnio"), /*#__PURE__*/React.createElement("select", {
    name: "payerId",
    value: form.payerId,
    onChange: handleChange,
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Particular"), convenios.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Plano"), /*#__PURE__*/React.createElement("select", {
    name: "planId",
    value: form.planId,
    onChange: handleChange,
    style: {
      width: '100%'
    },
    disabled: !planos.length
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), planos.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Status *"), /*#__PURE__*/React.createElement("select", {
    name: "status",
    value: form.status,
    onChange: handleChange,
    required: true,
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "scheduled"
  }, "Agendado"), /*#__PURE__*/React.createElement("option", {
    value: "confirmed"
  }, "Confirmado"), /*#__PURE__*/React.createElement("option", {
    value: "completed"
  }, "Atendido"), /*#__PURE__*/React.createElement("option", {
    value: "cancelled"
  }, "Cancelado"), /*#__PURE__*/React.createElement("option", {
    value: "no_show"
  }, "Falta"))), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1/3'
    }
  }, /*#__PURE__*/React.createElement("label", null, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("textarea", {
    name: "notes",
    value: form.notes,
    onChange: handleChange,
    rows: 2,
    style: {
      width: '100%'
    }
  }))), error && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'red',
      marginTop: 16
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    style: {
      padding: '8px 18px',
      background: '#eee',
      border: 0,
      borderRadius: 4,
      fontWeight: 600
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: mutationLoading,
    style: {
      padding: '8px 18px',
      background: '#1976d2',
      color: '#fff',
      border: 0,
      borderRadius: 4,
      fontWeight: 600,
      cursor: mutationLoading ? 'not-allowed' : 'pointer',
      opacity: mutationLoading ? 0.6 : 1
    }
  }, mutationLoading ? 'Salvando...' : 'Salvar Alterações'))));
}