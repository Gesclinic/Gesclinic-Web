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

export function AgendamentoFormWithRBAC({ appointment = null, onSubmit, onCancel }) {
  const auth = useAuthorization();
  
  const [form, setForm] = useState({
    date: appointment?.date || '',
    startTime: appointment?.startTime || '',
    endTime: appointment?.endTime || '',
    patientName: appointment?.patientName || '',
    professionalName: appointment?.professionalName || '',
    value: appointment?.value || '',
    status: appointment?.status || 'agendado',
    notes: appointment?.notes || '',
  });

  // ============================================================
  // VERIFICAR PERMISSÕES
  // ============================================================

  // Se não pode criar agendamento, bloquear acesso
  if (!appointment && !auth.canCreateAppointment) {
    return (
      <div style={{
        padding: 24,
        background: '#fff3e0',
        border: '1px solid #ffb74d',
        borderRadius: 8,
      }}>
        <h3 style={{ color: '#e65100', marginBottom: 12 }}>🔒 Acesso Negado</h3>
        <p style={{ color: '#666' }}>Seu perfil ({auth.currentRole}) não tem permissão para criar agendamentos.</p>
      </div>
    );
  }

  // Se não pode editar agendamento, bloquear edição
  if (appointment && !auth.canEditAppointment) {
    return (
      <div style={{
        padding: 24,
        background: '#fff3e0',
        border: '1px solid #ffb74d',
        borderRadius: 8,
      }}>
        <h3 style={{ color: '#e65100', marginBottom: 12 }}>🔒 Acesso Negado</h3>
        <p style={{ color: '#666' }}>Seu perfil ({auth.currentRole}) não tem permissão para editar agendamentos.</p>
      </div>
    );
  }

  // ============================================================
  // HANDLERS
  // ============================================================

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
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
    const payload = { ...form };
    if (!auth.canEditAppointmentValue) {
      delete payload.value;
    }

    onSubmit(payload);
  }

  // ============================================================
  // RENDERIZAR FORMULÁRIO COM RBAC
  // ============================================================

  return (
    <form onSubmit={handleSubmit} style={{
      padding: 24,
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e0e0e0',
    }}>
      <h2 style={{ marginBottom: 24 }}>
        {appointment ? '✏️ Editar Agendamento' : '➕ Novo Agendamento'}
      </h2>

      {/* Data e Horários - Sempre visível */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Data *</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Hora Inicial *</label>
          <input
            type="time"
            name="startTime"
            value={form.startTime}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Hora Final *</label>
          <input
            type="time"
            name="endTime"
            value={form.endTime}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* Paciente e Profissional - Sempre visível */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Paciente *</label>
          <input
            type="text"
            name="patientName"
            value={form.patientName}
            onChange={handleChange}
            placeholder="Nome do paciente"
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Profissional</label>
          <input
            type="text"
            name="professionalName"
            value={form.professionalName}
            onChange={handleChange}
            placeholder="Nome do profissional"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* CAMPO DE VALOR - Apenas visível se tem permissão */}
      {auth.canEditAppointmentValue ? (
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
            💰 Valor (R$) {auth.canEditAppointmentValue && <span style={{ color: '#1976d2', fontSize: '0.85em' }}>✓ Habilitado</span>}
          </label>
          <input
            type="number"
            name="value"
            value={form.value}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
        </div>
      ) : (
        <div style={{
          padding: 12,
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: 4,
          marginBottom: 24,
          color: '#999',
          fontSize: '0.9em',
        }}>
          🔒 Campo "Valor" desabilitado para seu perfil ({auth.currentRole})
        </div>
      )}

      {/* Status */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Status *</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 4,
          }}
        >
          <option value="agendado">Agendado</option>
          <option value="confirmado">Confirmado</option>
          <option value="atendido">Atendido</option>
          <option value="cancelado">Cancelado</option>
          <option value="falta">Falta</option>
        </select>
      </div>

      {/* Observações */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Observações</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Observações adicionais..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 4,
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Badge de Permissões (Debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          padding: 12,
          background: '#e3f2fd',
          border: '1px solid #90caf9',
          borderRadius: 4,
          marginBottom: 24,
          fontSize: '0.85em',
          color: '#1565c0',
        }}>
          👤 <strong>{auth.currentRole}</strong>
          {auth.canCreateAppointment && ' ✓ Criar'}
          {auth.canEditAppointment && ' ✓ Editar'}
          {auth.canEditAppointmentValue && ' ✓ Editar Valor'}
          {auth.canDeleteAppointment && ' ✓ Deletar'}
        </div>
      )}

      {/* Botões */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 12,
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 18px',
            background: '#eee',
            border: '1px solid #ccc',
            borderRadius: 4,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          style={{
            padding: '8px 18px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {appointment ? 'Salvar Alterações' : 'Criar Agendamento'}
        </button>
      </div>
    </form>
  );
}

export default AgendamentoFormWithRBAC;