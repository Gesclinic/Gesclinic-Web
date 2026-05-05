import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

// Remove duplicidade de 'Selecione' dos arrays de opções
function removeDuplicadoSelecione(arr, key = 'label') {
  if (!Array.isArray(arr)) return arr;
  let found = false;
  return arr.filter(opt => {
    const label = (opt[key] || opt.name || opt.value || opt) + '';
    if (label.trim().toLowerCase() === 'selecione') {
      if (found) return false;
      found = true;
    }
    return true;
  });
}
export default function AgendamentoDetalhesModal({
  agendamentoId,
  dados,
  loading,
  error,
  onClose,
  onEditSuccess,
  profissionais = [],
  servicos = [],
  pacientes = [],
  payers = []
}) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // ✅ Sincronizar form quando editando muda
  useEffect(() => {
    if (editando && dados) {
      let payerId = dados.payerId || '';
      if (!payerId && dados.payer && Array.isArray(payers) && payers.length > 0) {
        const found = payers.find(p => (p.name || '').toLowerCase() === String(dados.payer).toLowerCase());
        if (found) payerId = found.id;
      }
      setForm({
        startTime: dados.startTime ? new Date(dados.startTime).toISOString().slice(0, 16) : '',
        patient: dados.patientId || '',
        patientRecord: dados.prontuario || dados.patientRecord || dados.prontuarioNumero || '',
        service: dados.serviceId || dados.service || '',
        payer: payerId,
        plan: dados.planId || dados.plan || '',
        serviceValue: dados.serviceValue !== null && dados.serviceValue !== undefined ? dados.serviceValue : '',
        room: dados.roomId || dados.room || '',
        professional: dados.professionalId || dados.professional || '',
        status: dados.status || '',
        notes: dados.notes || '',
        internalNotes: dados.internalNotes || ''
      });
    }
  }, [editando, dados, payers]);

  // =========================
  // MOCKS / LISTAS SIMPLES
  // =========================
  const tiposServico = [{
    value: '',
    label: 'Selecione'
  }, {
    value: 'Consulta',
    label: 'Consulta'
  }, {
    value: 'Exame',
    label: 'Exame'
  }];
  const planos = [{
    value: '',
    label: 'Selecione'
  }, {
    value: 'Plano A',
    label: 'Plano A'
  }, {
    value: 'Plano B',
    label: 'Plano B'
  }];
  const statusList = [{
    value: '',
    label: 'Selecione'
  }, {
    value: 'scheduled',
    label: 'Agendado'
  }, {
    value: 'confirmed',
    label: 'Confirmado'
  }, {
    value: 'cancelled',
    label: 'Cancelado'
  }];
  const salas = [{
    value: '',
    label: 'Selecione'
  }, {
    value: 'Sem sala',
    label: 'Sem sala'
  }, {
    value: 'Sala 1',
    label: 'Sala 1'
  }];

  // =========================
  // RENDER
  // =========================
  return /*#__PURE__*/React.createElement(Dialog, {
    open: !!agendamentoId,
    onOpenChange: o => !o && onClose()
  }, /*#__PURE__*/React.createElement(DialogContent, {
    className: "app-dialog-shell app-dialog-shell--content"
  }, /*#__PURE__*/React.createElement(DialogHeader, {
    className: "border-b border-gray-200 px-6 pb-4 pt-6 text-left"
  }, /*#__PURE__*/React.createElement(DialogTitle, null, "Agendamento")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-6 py-6"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "text-center text-gray-400 py-8"
  }, "Carregando...") : error ? /*#__PURE__*/React.createElement("div", {
    className: "text-center text-red-600 py-8"
  }, error) : /*#__PURE__*/React.createElement(React.Fragment, null, validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 bg-red-50 border border-red-200 rounded-lg p-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-red-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\u26A0\uFE0F"), " Informa\xE7\xF5es Inv\xE1lidas:"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-1"
  }, validationErrors.map((err, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx,
    className: "text-red-800 text-sm flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-red-600 mt-0.5"
  }, "\u2022"), /*#__PURE__*/React.createElement("span", null, err))))), /*#__PURE__*/React.createElement("form", {
    onSubmit: async e => {
      e.preventDefault();

      // Limpar erros anteriores
      setValidationErrors([]);

      // Validação: UUID simples (versão 4)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const errors = [];
      if (form?.payer && !uuidRegex.test(form.payer)) {
        errors.push('Convênio selecionado é inválido. Por favor, selecione um convênio válido.');
      }
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      // Monta o payload correto para atualização
      const payload = {
        agendamentoId,
        date: form?.startTime ? form.startTime.slice(0, 10) : '',
        startTime: form?.startTime ? form.startTime.slice(11, 16) : '',
        endTime: form?.endTime || null,
        pacienteId: form?.patient || null,
        profissionalId: form?.professional || null,
        servicoId: form?.service || null,
        salaId: form?.room || null,
        convenioId: form?.payer || null,
        planoId: form?.plan || null,
        status: form?.status || '',
        observacoes: form?.notes || '',
        observacoesInternas: form?.internalNotes || ''
      };
      try {
        // Chame a função de atualização aqui se necessário
        if (typeof window.atualizarAgendamento === 'function') {
          await window.atualizarAgendamento(agendamentoId, payload);
        }
        onEditSuccess?.(form);
        setEditando(false);
        setValidationErrors([]);
      } catch (err) {
        setValidationErrors([`Erro ao salvar agendamento: ${err.message}`]);
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Data"), editando ? /*#__PURE__*/React.createElement("input", {
    type: "date",
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.startTime ? format(new Date(form.startTime), 'yyyy-MM-dd') : '',
    onChange: e => setForm(f => ({
      ...f,
      startTime: e.target.value
    }))
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.startTime ? format(new Date(dados.startTime), 'dd/MM/yyyy') : '—')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Hora Inicial"), editando ? /*#__PURE__*/React.createElement("input", {
    type: "time",
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.startTime ? format(new Date(form.startTime), 'HH:mm') : '',
    onChange: e => setForm(f => ({
      ...f,
      startTime: e.target.value
    }))
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.startTime ? format(new Date(dados.startTime), 'HH:mm') : '—')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1 md:col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Paciente"), editando && Array.isArray(pacientes) && pacientes.length > 0 ? /*#__PURE__*/React.createElement("select", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.patient || '',
    onChange: e => setForm(f => ({
      ...f,
      patient: e.target.value
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), pacientes.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.full_name || p.nome))) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.patient || '—')), /*#__PURE__*/React.createElement("div", {
    className: "w-full md:w-40 flex flex-col"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Prontu\xE1rio"), editando ? /*#__PURE__*/React.createElement("input", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.patientRecord || dados?.prontuario || dados?.patient?.record_number || '',
    placeholder: "N\xBA",
    readOnly: true
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.prontuario || dados?.patientRecord || dados?.prontuarioNumero || dados?.patient?.record_number || '—')))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Servi\xE7o"), editando && Array.isArray(servicos) && servicos.length > 0 ? /*#__PURE__*/React.createElement("select", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.service || '',
    onChange: e => setForm(f => ({
      ...f,
      service: e.target.value
    }))
  }, servicos.some(s => (s.id || s.value || s) === '') ? null : /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), servicos.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id || s.value || s,
    value: s.id || s.value || s
  }, s.name || s.label || s))) : editando ? /*#__PURE__*/React.createElement("select", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.service || '',
    onChange: e => setForm(f => ({
      ...f,
      service: e.target.value
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione")) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.service || '—')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Conv\xEAnio"), editando ? /*#__PURE__*/React.createElement("select", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.payer || '',
    onChange: e => setForm(f => ({
      ...f,
      payer: e.target.value
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), payers.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.name))) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.payer || '—')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Plano"), editando ? /*#__PURE__*/React.createElement("select", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.plan || '',
    onChange: e => setForm(f => ({
      ...f,
      plan: e.target.value
    })),
    disabled: !form?.payer
  }, Array.isArray(planos) && planos.length > 0 && form?.payer && planos.filter(p => !form?.payer || p.payerId === form.payer || p.convenioId === form.payer || p.payer === form.payer).some(p => (p.value || p.id || p) === '') ? null : /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), Array.isArray(planos) && planos.length > 0 && form?.payer && planos.filter(p => !form?.payer || p.payerId === form.payer || p.convenioId === form.payer || p.payer === form.payer).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.value || p.id || p,
    value: p.value || p.id || p
  }, p.label || p.name || p))) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.plan || '—')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Valor"), editando ? /*#__PURE__*/React.createElement("input", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.serviceValue || '',
    onChange: e => setForm(f => ({
      ...f,
      serviceValue: e.target.value
    }))
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.serviceValue !== null && dados?.serviceValue !== undefined ? dados?.serviceValue : '—')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Sala"), editando ? /*#__PURE__*/React.createElement("select", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.room || '',
    onChange: e => setForm(f => ({
      ...f,
      room: e.target.value
    }))
  }, salas.some(s => (s.value || s.id || s) === '') ? null : /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), salas.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.value || s.id || s,
    value: s.value || s.id || s
  }, s.label || s.name || s))) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.room || '—')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Profissional"), editando ? /*#__PURE__*/React.createElement("select", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.professional || '',
    onChange: e => setForm(f => ({
      ...f,
      professional: e.target.value
    }))
  }, profissionais.some(p => (p.value || p.id || p) === '') ? null : /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), profissionais.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.value || p.id || p,
    value: p.value || p.id || p
  }, p.label || p.name || p))) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.professional || '—')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Status"), editando ? /*#__PURE__*/React.createElement("select", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.status || '',
    onChange: e => setForm(f => ({
      ...f,
      status: e.target.value
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: "scheduled"
  }, "Agendado"), /*#__PURE__*/React.createElement("option", {
    value: "confirmed"
  }, "Confirmado"), /*#__PURE__*/React.createElement("option", {
    value: "cancelled"
  }, "Cancelado")) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.status === 'scheduled' ? 'Agendado' : dados?.status === 'confirmed' ? 'Confirmado' : dados?.status === 'cancelled' ? 'Cancelado' : dados?.status || '—')), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Observa\xE7\xE3o"), editando ? /*#__PURE__*/React.createElement("input", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.notes || '',
    onChange: e => setForm(f => ({
      ...f,
      notes: e.target.value
    }))
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.notes || '—')), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2 flex flex-col gap-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-semibold text-gray-700"
  }, "Observa\xE7\xF5es Internas"), editando ? /*#__PURE__*/React.createElement("input", {
    className: "input px-2 py-1 rounded border border-gray-300",
    value: form?.internalNotes || '',
    onChange: e => setForm(f => ({
      ...f,
      internalNotes: e.target.value
    }))
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-gray-900"
  }, dados?.internalNotes || '—'))), /*#__PURE__*/React.createElement(DialogFooter, {
    className: "mt-6 gap-2"
  }, /*#__PURE__*/React.createElement(DialogClose, {
    asChild: true
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary"
  }, "Fechar")), editando ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setEditando(false),
    className: "btn-muted"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "btn-primary"
  }, "Salvar")) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setEditando(true),
    className: "btn-primary"
  }, "Editar")))))));
}