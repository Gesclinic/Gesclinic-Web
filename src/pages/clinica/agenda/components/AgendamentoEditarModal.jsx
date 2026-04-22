// src/pages/clinica/agenda/components/AgendamentoEditarModal.jsx
import React, { useEffect, useState } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { buscarAgendamentoPorId, listarPacientes, listarProfissionais, listarServicosPorProfissional, listarSalas, listarConvenios, listarPlanosPorConvenio, atualizarAgendamento } from '../services/agendaService';
import { mapAgendaItem } from '@/modules/agenda/services/agendaMapper';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'atendido', label: 'Atendido' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'falta', label: 'Falta' },
];

export default function AgendamentoEditarModal({ agendamentoId, onClose, onSuccess }) {
  const { clinic } = useClinicContext();
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [salas, setSalas] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Carregar dados do agendamento e listas
  useEffect(() => {
    if (!agendamentoId || !clinic?.id) return;
    setLoading(true);
    Promise.all([
      buscarAgendamentoPorId(agendamentoId),
      listarPacientes({ clinicId: clinic.id }),
      listarProfissionais({ clinicId: clinic.id }),
      listarSalas({ clinicId: clinic.id }),
      listarConvenios({ clinicId: clinic.id })
    ]).then(([ag, pacs, profs, salas, convs]) => {
      const mapped = mapAgendaItem(ag.data);
      setOriginal(mapped);
      setForm({
        date: mapped.startTime ? format(mapped.startTime, 'yyyy-MM-dd') : '',
        startTime: mapped.startTime ? format(mapped.startTime, 'HH:mm') : '',
        endTime: mapped.endTime ? format(mapped.endTime, 'HH:mm') : '',
        pacienteId: mapped.patientId,
        profissionalId: mapped.professionalId,
        servicoId: mapped.serviceId,
        salaId: mapped.roomId,
        convenioId: mapped.payerId,
        planoId: mapped.planId,
        status: mapped.status,
        observacoes: mapped.notes,
        observacoesInternas: mapped.internalNotes,
      });
      setPacientes(pacs);
      setProfissionais(profs);
      setSalas(salas);
      setConvenios(convs);
      setLoading(false);
    });
  }, [agendamentoId, clinic?.id]);

  // Carregar serviços ao trocar profissional
  useEffect(() => {
    if (form?.profissionalId) {
      listarServicosPorProfissional({ profissionalId: form.profissionalId }).then(setServicos);
    } else {
      setServicos([]);
    }
    setForm(f => f ? { ...f, servicoId: '' } : f);
  }, [form?.profissionalId]);

  // Carregar planos ao trocar convênio
  useEffect(() => {
    if (form?.convenioId && form.convenioId !== '' && form.convenioId !== '~') {
      listarPlanosPorConvenio({ convenioId: form.convenioId }).then(planos => {
        setPlanos(planos);
        // Se não houver planos, limpa seleção
        if (!planos.length) {
          setForm(f => f ? { ...f, planoId: '' } : f);
        }
      });
    } else {
      setPlanos([]);
      setForm(f => f ? { ...f, planoId: '' } : f);
    }
  }, [form?.convenioId]);

  function validar() {
    if (!form.date || !form.startTime || !form.endTime) return 'Data e horários obrigatórios';
    if (form.startTime >= form.endTime) return 'Hora final deve ser maior que inicial';
    if (!form.pacienteId) return 'Selecione um paciente';
    // TODO: Validar conflito de horário, disponibilidade profissional/sala, faturado/encerrado
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const erro = validar();
    if (erro) return setError(erro);
    setSaving(true);
    try {
      function sanitizeUUID(val) {
        if (!val || val === '' || val === '~') return null;
        // Regex UUID v4
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val)) return val;
        return null;
      }
      // LOG: Verificar valores antes de salvar
      console.log('Salvar agendamento:', {
        convenioId: form.convenioId,
        planoId: form.planoId
      });
      const safeConvenioId = form.convenioId === '~' ? null : form.convenioId;
      const safePlanoId = form.planoId === '~' ? null : form.planoId;
      await atualizarAgendamento(agendamentoId, {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        pacienteId: form.pacienteId,
        profissionalId: form.profissionalId,
        servicoId: form.servicoId,
        salaId: form.salaId,
        convenioId: sanitizeUUID(safeConvenioId),
        planoId: sanitizeUUID(safePlanoId),
        status: form.status,
        observacoes: form.observacoes,
        observacoesInternas: form.observacoesInternas,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  if (loading || !form) return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 10, minWidth: 420, maxWidth: 600, padding: 32, boxShadow: '0 2px 16px #0002', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Editar Agendamento</h2>
        <div style={{ textAlign: 'center', color: '#888', padding: 32 }}>Carregando...</div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, minWidth: 420, maxWidth: 600, padding: 32, boxShadow: '0 2px 16px #0002', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Editar Agendamento</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Data e Horário */}
          <div>
            <label>Data *</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} min={new Date().toISOString().slice(0,10)} required style={{ width: '100%' }} />
          </div>
          <div>
            <label>Hora Inicial *</label>
            <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          <div>
            <label>Hora Final *</label>
            <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required style={{ width: '100%' }} />
          </div>
          {/* Paciente */}
          <div>
            <label>Paciente *</label>
            <select name="pacienteId" value={form.pacienteId} onChange={handleChange} required style={{ width: '100%' }}>
              <option value="">Selecione</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Profissional */}
          <div>
            <label>Profissional</label>
            <select name="profissionalId" value={form.profissionalId} onChange={handleChange} style={{ width: '100%' }}>
              <option value="">Selecione</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Serviço */}
          <div>
            <label>Serviço</label>
            <select name="servicoId" value={form.servicoId} onChange={handleChange} style={{ width: '100%' }}>
              <option value="">Selecione</option>
              {servicos.map(s => <option key={s.id} value={s.id}>{s.name} {s.duration ? `(${s.duration} min)` : ''}</option>)}
            </select>
          </div>
          {/* Sala */}
          <div>
            <label>Sala</label>
            <select name="salaId" value={form.salaId} onChange={handleChange} style={{ width: '100%' }}>
              <option value="">Sem sala</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {/* Convênio */}
          <div>
            <label>Convênio</label>
            <select name="convenioId" value={form.convenioId} onChange={handleChange} style={{ width: '100%' }}>
              <option value="">Particular</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Plano */}
          <div>
            <label>Plano</label>
            <select name="planoId" value={form.planoId} onChange={handleChange} style={{ width: '100%' }} disabled={!planos.length}>
              <option value="">Selecione</option>
              {planos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Status */}
          <div>
            <label>Status *</label>
            <select name="status" value={form.status} onChange={handleChange} required style={{ width: '100%' }}>
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {/* Observações */}
          <div style={{ gridColumn: '1/3' }}>
            <label>Observações</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={2} style={{ width: '100%' }} />
          </div>
          <div style={{ gridColumn: '1/3' }}>
            <label>Observações Internas</label>
            <textarea name="observacoesInternas" value={form.observacoesInternas} onChange={handleChange} rows={2} style={{ width: '100%' }} />
          </div>
        </div>
        {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', background: '#eee', border: 0, borderRadius: 4, fontWeight: 600 }}>Cancelar</button>
          <button type="submit" disabled={saving} style={{ padding: '8px 18px', background: '#1976d2', color: '#fff', border: 0, borderRadius: 4, fontWeight: 600 }}>Salvar Alterações</button>
        </div>
      </form>
    </div>
  );
}

