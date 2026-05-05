// src/views/AgendaProfissional.jsx
import React, { useState } from 'react';
import { useClinicContext } from '../contexts/useClinicContext';
import { listarAgenda } from '@/modules/agenda/services/agenda.api.complex';
import { mapAgendaItem } from '@/modules/agenda/services/agendaMapper';
import AgendamentoDetalhesModal from '../components/AgendamentoDetalhesModal';

export function AgendaProfissional() {
  const { clinic } = useClinicContext();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [agendas, setAgendas] = useState([]);
  const [error, setError] = useState(null);

  async function fetchAgenda() {
    setLoading(true);
    setError(null);
    const { data, error } = await listarAgenda({ clinicId: clinic.id, date });
    if (error) {
      setError('Erro ao buscar agendamentos');
    }
    setAgendas(Array.isArray(data) ? data.map(mapAgendaItem) : []);
    setLoading(false);
  }

  React.useEffect(() => {
    if (clinic?.id && date) {
      fetchAgenda();
    }
    // eslint-disable-next-line
  }, [clinic?.id, date]);

  // Agrupa por profissional
  const profissionais = {};
  agendas.forEach((a) => {
    const nome = a.professional || 'Sem profissional';
    if (!profissionais[nome]) {
      profissionais[nome] = [];
    }
    profissionais[nome].push(a);
  });
  const [modalDetalhesId, setModalDetalhesId] = useState(null);

  return (
    <div>
      <h2>Agenda por Profissional</h2>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {loading && <p>Carregando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && agendas.length === 0 && <p>Nenhum agendamento encontrado</p>}
      {!loading && Object.keys(profissionais).length > 0 && (
        <div>
          {Object.entries(profissionais).map(([nome, ags]) => (
            <div key={nome} style={{ marginBottom: 24 }}>
              <h3>{nome}</h3>
              <ul>
                {ags
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((a) => (
                    <li
                      key={a.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setModalDetalhesId(a.id)}
                    >
                      {a.startTime
                        ? a.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                      {' — '}
                      {a.patient}
                      {' — '}
                      {a.service}
                      {' — '}
                      {a.room}
                      {' — '}
                      {a.status}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {modalDetalhesId && (
        <AgendamentoDetalhesModal
          agendamentoId={modalDetalhesId}
          onClose={() => setModalDetalhesId(null)}
        />
      )}
    </div>
  );
}
