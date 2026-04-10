// src/pages/clinica/agenda/views/NovoAgendamento.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClinicContext } from '@/contexts/ClinicContext';
import { listarPacientes, listarProfissionais, listarServicosPorProfissional, listarSalas, listarConvenios, listarConveniosPorProfissional, listarPlanosPorConvenio, criarAgendamento } from '../services/agendaService';

const STATUS_OPTIONS = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'encaixe', label: 'Encaixe' },
];

export default function NovoAgendamento() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clinic } = useClinicContext();
  const patientIdFromUrl = searchParams.get('patientId');
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    pacienteId: patientIdFromUrl || '',
    profissionalId: '',
    servicoId: '',
    salaId: '',
    convenioId: '',
    planoId: '',
    status: 'agendado',
    observacoes: '',
  });
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [salas, setSalas] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Carregar listas iniciais
  useEffect(() => {
    if (!clinic?.id) return;
    listarPacientes({ clinicId: clinic.id }).then(setPacientes);
    listarProfissionais({ clinicId: clinic.id }).then(setProfissionais);
    listarSalas({ clinicId: clinic.id }).then(setSalas);
  }, [clinic?.id]);

  // Pré-selecionar paciente se veio da URL
  useEffect(() => {
    if (patientIdFromUrl && pacientes.length > 0) {
      const pacienteEncontrado = pacientes.find(p => p.id === patientIdFromUrl);
      if (pacienteEncontrado) {
        setForm(f => ({
          ...f,
          pacienteId: patientIdFromUrl,
        }));
      }
    }
  }, [patientIdFromUrl, pacientes]);

  // Preencher CPF e Telefone ao selecionar paciente
  useEffect(() => {
    if (form.pacienteId && pacientes.length > 0) {
      const pacienteSelecionado = pacientes.find(p => p.id === form.pacienteId);
      if (pacienteSelecionado) {
        setForm(f => ({
          ...f,
          cpf: pacienteSelecionado.document_id || pacienteSelecionado.cpf || '',
          telefone: pacienteSelecionado.phone || pacienteSelecionado.cell_phone || '',
        }));
      }
    }
  }, [form.pacienteId, pacientes]);

  // Carregar serviços ao trocar profissional
  useEffect(() => {
    if (form.profissionalId) {
      listarServicosPorProfissional({ profissionalId: form.profissionalId }).then(setServicos);
      // Carregar convênios do profissional
      listarConveniosPorProfissional({ profissionalId: form.profissionalId }).then(setConvenios);
    } else {
      setServicos([]);
      setConvenios([]);
    }
    setForm(f => ({ ...f, servicoId: '', convenioId: '' }));
  }, [form.profissionalId]);

  // Carregar planos ao trocar convênio
  useEffect(() => {
    if (form.convenioId) {
      listarPlanosPorConvenio({ convenioId: form.convenioId }).then(setPlanos);
    } else {
      setPlanos([]);
    }
    setForm(f => ({ ...f, planoId: '' }));
  }, [form.convenioId]);

  // Validação
  function validar() {
    if (!form.date || !form.startTime || !form.endTime) return 'Data e horários obrigatórios';
    if (form.startTime >= form.endTime) return 'Hora final deve ser maior que inicial';
    if (!form.pacienteId) return 'Selecione um paciente';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const erro = validar();
    if (erro) return setError(erro);
    setLoading(true);
    try {
      await criarAgendamento({
        clinicId: clinic.id,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        pacienteId: form.pacienteId,
        profissionalId: form.profissionalId,
        servicoId: form.servicoId,
        salaId: form.salaId,
        convenioId: form.convenioId,
        planoId: form.planoId,
        status: form.status,
        observacoes: form.observacoes,
      });
      setSuccess(true);
      setTimeout(() => navigate('/clinica/agenda/unificada'), 1200);
    } catch (err) {
      setError('Erro ao salvar agendamento.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 700, margin: '32px auto', background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 2px 16px #0001' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Novo Agendamento</h2>
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
          <select name="planoId" value={form.planoId} onChange={handleChange} style={{ width: '100%' }}>
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
      </div>
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 16 }}>Agendamento salvo com sucesso!</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
        <button type="button" onClick={() => navigate('/clinica/agenda/unificada')} style={{ padding: '8px 18px', background: '#eee', border: 0, borderRadius: 4, fontWeight: 600 }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{ padding: '8px 18px', background: '#1976d2', color: '#fff', border: 0, borderRadius: 4, fontWeight: 600 }}>Salvar Agendamento</button>
      </div>
    </form>
  );
}

