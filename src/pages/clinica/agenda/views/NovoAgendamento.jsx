// src/pages/clinica/agenda/views/NovoAgendamento.jsx
/**
 * Novo Agendamento com Suporte a Múltiplos Serviços
 * 
 * Permite:
 * - Criar agendamentos com múltiplos serviços
 * - Diferentes tipos de cobrança (consulta, hora, sessão, pacote)
 * - Validação e salvamento automático
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClinicContext } from '@/contexts/ClinicContext';
import { usePacientes, useProfissionais, useSalas, useAgendamentoMutation } from '@/modules/agenda/hooks';
import { listarServicosPorProfissional, listarConvenios, listarPlanosPorConvenio } from '@/modules/agenda/services/agenda.api.queries';
import { listarConveniosPorProfissional } from '@/modules/agenda/services/agenda.api.business';
import ServiceListItem from '@/pages/clinica/agenda/components/ServiceListItem';
import { createAppointmentWithServices } from '@/lib/appointmentsApi';

export default function NovoAgendamento() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clinic } = useClinicContext();
  const patientIdFromUrl = searchParams.get('patientId');
  
  // Hooks para carregar dados
  const { data: pacientes } = usePacientes({ clinicId: clinic?.id });
  const { data: profissionais } = useProfissionais({ clinicId: clinic?.id });
  const { data: salas } = useSalas({ clinicId: clinic?.id });
  const { criarAgendamento, loading: mutationLoading } = useAgendamentoMutation();
  
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    patientId: patientIdFromUrl || '',
    professionalId: '',
    roomId: '',
    payerId: '',
    planId: '',
    status: 'scheduled',
    notes: '',
  });
  
  // 🆕 Múltiplos serviços
  const [appointmentServices, setAppointmentServices] = useState([]);
  
  const [servicos, setServicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pré-selecionar paciente se veio da URL
  useEffect(() => {
    if (patientIdFromUrl && pacientes.length > 0) {
      const patientEncontrado = pacientes.find(p => p.id === patientIdFromUrl);
      if (patientEncontrado) {
        setForm(f => ({
          ...f,
          patientId: patientIdFromUrl,
        }));
      }
    }
  }, [patientIdFromUrl, pacientes]);

  // Preencher CPF e Telefone ao selecionar paciente
  useEffect(() => {
    if (form.patientId && pacientes.length > 0) {
      const patientSelecionado = pacientes.find(p => p.id === form.patientId);
      if (patientSelecionado) {
        setForm(f => ({
          ...f,
          cpf: patientSelecionado.document_id || patientSelecionado.cpf || '',
          phone: patientSelecionado.phone || patientSelecionado.cell_phone || '',
        }));
      }
    }
  }, [form.patientId, pacientes]);

  // Carregar serviços ao trocar profissional
  useEffect(() => {
    if (form.professionalId) {
      listarServicosPorProfissional({ profissionalId: form.professionalId }).then(setServicos);
      // Carregar convênios do profissional
      listarConveniosPorProfissional({ profissionalId: form.professionalId }).then(setConvenios);
    } else {
      setServicos([]);
      setConvenios([]);
    }
    // Limpar serviços selecionados ao trocar profissional
    setAppointmentServices([]);
  }, [form.professionalId]);

  // Carregar planos ao trocar convênio
  useEffect(() => {
    if (form.payerId) {
      listarPlanosPorConvenio({ convenioId: form.payerId }).then(setPlanos);
    } else {
      setPlanos([]);
    }
    setForm(f => ({ ...f, planId: '' }));
  }, [form.payerId]);

  // PASSO 2: Validação
  function validar() {
    if (!form.date) {
      throw new Error('Data obrigatória');
    }
    if (!form.startTime) {
      throw new Error('Horário obrigatório');
    }
    if (!form.endTime) {
      throw new Error('Horário obrigatório');
    }
    if (form.startTime >= form.endTime) {
      throw new Error('Hora final deve ser maior que inicial');
    }
    if (!form.patientId) {
      throw new Error('Paciente obrigatório');
    }
    if (appointmentServices.length === 0) {
      throw new Error('Adicione pelo menos um serviço');
    }
    return true;
  }

  // PASSO 3: Submit
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      validar();
      
      // 🆕 Usar nova função com múltiplos serviços
      const payload = {
        ...form,
        clinicId: clinic?.id,
      };
      
      await createAppointmentWithServices(payload, appointmentServices);
      setSuccess(true);
      setTimeout(() => navigate('/clinica/agenda/unificada'), 1200);
    } catch (err) {
      const errorMessage = err?.message?.includes('obrigatório')
        ? err.message
        : err?.message || 'Erro ao salvar agendamento. Tente novamente.';
      setError(errorMessage);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 900, margin: '32px auto', background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 16px #0001' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>📅 Novo Agendamento</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Data e Horário */}
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Data *</label>
          <input 
            type="date" 
            name="date" 
            value={form.date} 
            onChange={handleChange} 
            min={new Date().toISOString().slice(0,10)} 
            required 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} 
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Hora Inicial *</label>
          <input 
            type="time" 
            name="startTime" 
            value={form.startTime} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} 
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Hora Final *</label>
          <input 
            type="time" 
            name="endTime" 
            value={form.endTime} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }} 
          />
        </div>
        
        {/* Paciente */}
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Paciente *</label>
          <select 
            name="patientId" 
            value={form.patientId} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          >
            <option value="">Selecione</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        
        {/* Profissional */}
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Profissional</label>
          <select 
            name="professionalId" 
            value={form.professionalId} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          >
            <option value="">Selecione</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        
        {/* Sala */}
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Sala</label>
          <select 
            name="roomId" 
            value={form.roomId} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          >
            <option value="">Sem sala</option>
            {salas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        
        {/* Convênio */}
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Convênio</label>
          <select 
            name="payerId" 
            value={form.payerId} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          >
            <option value="">Particular</option>
            {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        {/* Plano */}
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Plano</label>
          <select 
            name="planId" 
            value={form.planId} 
            onChange={handleChange} 
            disabled={!planos.length}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          >
            <option value="">Selecione</option>
            {planos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        
        {/* Status */}
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Status *</label>
          <select 
            name="status" 
            value={form.status} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          >
            <option value="scheduled">Agendado</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Atendido</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Falta</option>
          </select>
        </div>
        
        {/* Observações */}
        <div style={{ gridColumn: '1/3' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Observações</label>
          <textarea 
            name="notes" 
            value={form.notes} 
            onChange={handleChange} 
            rows={2} 
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, fontFamily: 'inherit' }} 
          />
        </div>
      </div>

      {/* 📋 NOVO: Lista de Múltiplos Serviços */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px solid #f0f0f0' }}>
        <ServiceListItem
          services={servicos}
          appointmentServices={appointmentServices}
          onServicesChange={setAppointmentServices}
          onError={setError}
        />
      </div>

      {error && <div style={{ color: '#d32f2f', marginTop: 16, padding: 12, background: '#ffebee', borderRadius: 4, fontSize: 14 }}>❌ {error}</div>}
      {success && <div style={{ color: '#2e7d32', marginTop: 16, padding: 12, background: '#f1f8e9', borderRadius: 4, fontSize: 14 }}>✅ Agendamento salvo com sucesso!</div>}
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
        <button 
          type="button" 
          onClick={() => navigate('/clinica/agenda/unificada')} 
          style={{ padding: '10px 20px', background: '#eee', border: 0, borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={mutationLoading} 
          style={{ 
            padding: '10px 20px', 
            background: '#1976d2', 
            color: '#fff', 
            border: 0, 
            borderRadius: 4, 
            fontWeight: 600, 
            cursor: mutationLoading ? 'not-allowed' : 'pointer', 
            opacity: mutationLoading ? 0.6 : 1 
          }}
        >
          {mutationLoading ? 'Salvando...' : '💾 Salvar Agendamento'}
        </button>
      </div>
    </form>
  );
}

