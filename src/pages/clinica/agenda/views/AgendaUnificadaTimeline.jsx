import React, { useEffect, useState } from 'react';
import { listarAgenda } from '@/modules/agenda/services/agenda.api.complex';
import { mapAgendaPorProfissional } from '@/modules/agenda/services/agendaPorProfissionalMapper';
import { useClinicContext } from '@/contexts/ClinicContext';
import { format } from 'date-fns';

export default function AgendaUnificadaTimeline() {
  const { clinic } = useClinicContext();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clinic?.id) {
      return;
    }
    setLoading(true);
    listarAgenda({ clinicId: clinic.id, date }).then((data) => {
      setGrouped(mapAgendaPorProfissional(data));
      setLoading(false);
    });
  }, [clinic?.id, date]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Agenda Unificada — Timeline</h1>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border rounded px-3 py-2"
      />

      {loading && <p>Carregando agenda…</p>}

      {!loading && Object.keys(grouped).length === 0 && <p>Nenhum agendamento</p>}

      {Object.entries(grouped).map(([professional, items]) => (
        <div key={professional} className="border rounded bg-white">
          <div className="bg-gray-100 px-4 py-2 font-medium">{professional}</div>

          <div className="divide-y">
            {items.map((a) => (
              <div key={a.appointment_id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <strong>{format(new Date(a.start_time), 'HH:mm')}</strong> — {a.service_name}
                  <div className="text-sm text-gray-600">{a.patient_name}</div>
                </div>

                <span
                  className={`px-2 py-1 rounded text-xs ${
                    a.status === 'agendado'
                      ? 'bg-blue-100 text-blue-700'
                      : a.status === 'confirmado'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
