// src/views/AgendaUnificada.jsx
import React, { useState } from 'react';
import { useClinicContext } from '../contexts/useClinicContext';
import { listarAgenda } from '@/modules/agenda/services/agenda.api.complex';
import { mapAgendaItem } from '@/modules/agenda/services/agendaMapper';

export function AgendaUnificada() {
  const { clinic } = useClinicContext();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [agendas, setAgendas] = useState([]);
  const [error, setError] = useState(null);

  async function fetchAgenda() {
    setLoading(true);
    setError(null);
    const { data, error } = await listarAgenda({ clinicId: clinic.id, date });
    if (error) setError('Erro ao buscar agendamentos');
    setAgendas(Array.isArray(data) ? data.map(mapAgendaItem) : []);
    setLoading(false);
  }

  React.useEffect(() => {
    if (clinic?.id && date) fetchAgenda();
    // eslint-disable-next-line
  }, [clinic?.id, date]);

  return (
    <div>
      <h2>Agenda Unificada</h2>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      {loading && <p>Carregando...</p>}
      {error && <p style={{color: 'red'}}>{error}</p>}
      {!loading && agendas.length === 0 && <p>Nenhum agendamento encontrado</p>}
      {!loading && agendas.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Paciente</th>
              <th>Profissional</th>
              <th>Serviço</th>
              <th>Sala</th>
              <th>Convênio</th>
              <th>Plano</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {agendas
              .sort((a, b) => a.startTime - b.startTime)
              .map(a => (
                <tr key={a.id}>
                  <td>{a.startTime ? a.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{a.patient}</td>
                  <td>{a.professional}</td>
                  <td>{a.service}</td>
                  <td>{a.room}</td>
                  <td>{a.payer}</td>
                  <td>{a.plan}</td>
                  <td>{a.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
