// src/pages/clinica/agenda/components/AgendamentoEditarModal.jsx
import React, { useEffect, useState } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { usePacientes, useProfissionais, useSalas, useAgendamentoMutation } from '@/modules/agenda/hooks';
import useAuthorization from '@/modules/agenda/hooks/useAuthorization';
import { buscarAgendamentoPorId, listarServicosPorProfissional, listarConvenios, listarPlanosPorConvenio } from '@/modules/agenda/services/agenda.api.queries';
import { mapAgendaItem } from '@/modules/agenda/services/agendaMapper';
import { format } from 'date-fns';

export default function AgendamentoEditarModal({ agendamentoId, onClose, onSuccess }) {
  const { clinic } = useClinicContext();
  
  // RBAC - Verificar permissões
  const { canEditAppointment, canEditAppointmentValue } = useAuthorization();
  
  // Se não tem permissão, renderizar erro
  if (!canEditAppointment) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: '#fff', borderRadius: 10, minWidth: 420, maxWidth: 600, padding: 32, boxShadow: '0 2px 16px #0002' }}>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18, color: '#d32f2f' }}>❌ Permissão Negada</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>Você não tem permissão para editar agendamentos.</p>
          <button onClick={onClose} style={{ padding: '8px 18px', background: '#1976d2', color: '#fff', border: 0, borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>Fechar</button>
        </div>
      </div>
    );
  }
  
  // Hooks para carregar dados
  const { data: pacientes } = usePacientes({ clinicId: clinic?.id });
  const { data: profissionais } = useProfissionais({ clinicId: clinic?.id });
  const { data: salas } = useSalas({ clinicId: clinic?.id });
  const { atualizarAgendamento, loading: mutationLoading } = useAgendamentoMutation();
  
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
    Promise.all([
      buscarAgendamentoPorId(agendamentoId),
      listarConvenios({ clinicId: clinic.id })
    ]).then(([ag, convs]) => {
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
        notes: mapped.notes || '',
      });
      setConvenios(convs);
      setLoading(false);
    });
  }, [agendamentoId, clinic?.id]);

  // Carregar serviços ao trocar profissional
  useEffect(() => {
    if (form?.professionalId) {
      listarServicosPorProfissional({ profissionalId: form.professionalId }).then(setServicos);
    } else {
      setServicos([]);
    }
    setForm(f => f ? { ...f, serviceId: '' } : f);
  }, [form?.professionalId]);

  // Carregar planos ao trocar convênio
  useEffect(() => {
    if (form?.payerId && form.payerId !== '' && form.payerId !== '~') {
      listarPlanosPorConvenio({ convenioId: form.payerId }).then(planos => {
        setPlanos(planos);
        // Se não houver planos, limpa seleção
        if (!planos.length) {
          setForm(f => f ? { ...f, planId: '' } : f);
        }
      });
    } else {
      setPlanos([]);
      setForm(f => f ? { ...f, planId: '' } : f);
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
        const errorMessage = err?.message?.includes('obrigatório')
          ? err.message
          : err?.message || 'Erro ao salvar alterações. Tente novamente.';
        setError(errorMessage);
      }
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
            <select name="patientId" value={form.patientId} onChange={handleChange} required style={{ width: '100%' }}>
              <option value="">Selecione</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Profissional */}
          <div>
            <label>Profissional</label>
            <select name="professionalId" value={form.professionalId} onChange={handleChange} style={{ width: '100%' }}>
              <option value="">Selecione</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Serviço */}
          <div>
            <label>Serviço</label>
            <select name="serviceId" value={form.serviceId} onChange={handleChange} style={{ width: '100%' }}>
              <option value="">Selecione</option>
              {servicos.map(s => <option key={s.id} value={s.id}>{s.name} {s.duration ? `(${s.duration} min)` : ''}</option>)}
            </select>
          </div>
          {/* Sala */}
          <div>
            <label>Sala</label>
            <select name="roomId" value={form.roomId} onChange={handleChange} style={{ width: '100%' }}>
              <option value="">Sem sala</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {/* Convênio */}
          <div>
            <label>Convênio</label>
            <select name="payerId" value={form.payerId} onChange={handleChange} style={{ width: '100%' }}>
              <option value="">Particular</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Plano */}
          <div>
            <label>Plano</label>
            <select name="planId" value={form.planId} onChange={handleChange} style={{ width: '100%' }} disabled={!planos.length}>
              <option value="">Selecione</option>
              {planos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Status */}
          <div>
            <label>Status *</label>
            <select name="status" value={form.status} onChange={handleChange} required style={{ width: '100%' }}>
              <option value="scheduled">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Atendido</option>
              <option value="cancelled">Cancelado</option>
              <option value="no_show">Falta</option>
            </select>
          </div>
          {/* Observações */}
          <div style={{ gridColumn: '1/3' }}>
            <label>Observações</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} style={{ width: '100%' }} />
          </div>
        </div>
        {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', background: '#eee', border: 0, borderRadius: 4, fontWeight: 600 }}>Cancelar</button>
          <button type="submit" disabled={mutationLoading} style={{ padding: '8px 18px', background: '#1976d2', color: '#fff', border: 0, borderRadius: 4, fontWeight: 600, cursor: mutationLoading ? 'not-allowed' : 'pointer', opacity: mutationLoading ? 0.6 : 1 }}>{mutationLoading ? 'Salvando...' : 'Salvar Alterações'}</button>
        </div>
      </form>
    </div>
  );
}

