import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function BuscarAgendamentoModal({ isOpen = true, onClose, onSelect }) {
  const [term, setTerm] = useState('');
  const [date, setDate] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setError(null);
    setLoading(true);
    try {
      console.log('BuscarAgendamentoModal: buscando', { term, date });
      const params = new URLSearchParams();
      if (term) {
        params.append('q', term);
      }
      if (date) {
        params.append('date', date);
      }
      // Ajuste a URL conforme sua API real
      const res = await fetch(`/api/appointments/search?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
      setError('Falha ao buscar. Veja o console para detalhes.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    if (onSelect) {
      onSelect(item);
    }
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h3>Buscar Agendamento</h3>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <form onSubmit={handleSearch} className="modal-body">
          <div className="form-row">
            <input
              type="text"
              placeholder="Paciente"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {/* botão de submit: type="submit" para funcionar com onSubmit */}
            <button type="submit" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="results-table">
            {results.length === 0 && !loading ? (
              <div className="empty">Nenhum resultado encontrado.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Paciente</th>
                    <th>Profissional</th>
                    <th>Serviço</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id || `${r.date}-${r.patient_id}`}>
                      <td>{r.date}</td>
                      <td>{r.time}</td>
                      <td>{r.patient_name}</td>
                      <td>{r.professional_name}</td>
                      <td>{r.service_name}</td>
                      <td>
                        <button type="button" onClick={() => handleSelect(r)}>
                          Selecionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
