
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { listarAgenda } from "../services/agendaService";
import { mapAgendaItem } from "@/modules/agenda/services/agendaMapper";
import { useClinicContext } from "@/contexts/ClinicContext";
import AgendaFilters from '@/components/agenda/AgendaFilters';
import AgendamentoDetalhesModal from '../components/AgendamentoDetalhesModal';
import ModalCriarAgendamento from '../components/ModalCriarAgendamento';
import { listProfessionals } from '@/lib/professionalsApi';
import { listServices } from '@/lib/servicesApi';
import { listPayers } from '@/lib/payersApi';

function AgendaSala() {
  const [modalDetalhesId, setModalDetalhesId] = useState(null);
  const [novoAgendamento, setNovoAgendamento] = useState(null);
  const { clinic } = useClinicContext();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  // Filtro padronizado
  const [roomId, setRoomId] = useState(undefined);

  useEffect(() => {
    if (!clinic?.id) return;
    listarAgenda({ clinicId: clinic.id, date })
      .then((data) => data.map(mapAgendaItem))
      .then(setItems);
    listProfessionals(clinic.id).then(setProfessionals);
    listServices(clinic.id).then(setServices);
    listPayers(clinic.id).then(setPayers);
  }, [clinic, date]);

  // Salas para filtro
  const rooms = useMemo(() => Array.from(new Set(items.map(a => a.roomId && a.room ? JSON.stringify({ id: a.roomId, name: a.room }) : null).filter(Boolean))).map(str => JSON.parse(str)), [items]);
  // Filtrar por sala
  const filteredItems = useMemo(() => {
    if (!roomId || roomId === 'all') return items;
    return items.filter(a => a.roomId === roomId);
  }, [items, roomId]);
  const grouped = filteredItems.reduce((acc, a) => {
    acc[a.room] = acc[a.room] || [];
    acc[a.room].push(a);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Agenda por Sala</h2>
        <div className="flex gap-4 items-center">
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <AgendaFilters
            roomId={roomId}
            setRoomId={setRoomId}
            rooms={rooms}
            showProfessional={false}
            showStatus={false}
            showPatient={false}
          />
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500 text-center py-10">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-8">
          {Object.keys(grouped).map((room) => (
            <div key={room} className="bg-white rounded shadow p-4">
              <h4 className="font-semibold text-blue-800 mb-2">{room}</h4>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1">Hora</th>
                    <th className="px-2 py-1">Paciente</th>
                    <th className="px-2 py-1">Profissional</th>
                    <th className="px-2 py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[room].map((a) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td colSpan={4} style={{ padding: 0 }}>
                        <AgendaSlotCard
                          id={a.id}
                          data={date}
                          horario={format(new Date(a.startTime), "HH:mm")}
                          profissionalId={a.professionalId}
                          salaId={a.roomId}
                          agendamento={a}
                          onClick={() => {
                            if (a && a.id) {
                              setModalDetalhesId(a.id);
                            } else {
                              setNovoAgendamento({
                                horario: format(new Date(a.startTime), "HH:mm"),
                                date,
                                professionalId: a.professionalId,
                                salaId: a.roomId
                              });
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      {/* Modal de detalhes do agendamento */}
      {modalDetalhesId && (
        <AgendamentoDetalhesModal agendamentoId={modalDetalhesId} onClose={() => setModalDetalhesId(null)} />
      )}
      {/* Modal de novo agendamento */}
      {novoAgendamento && (
        <ModalCriarAgendamento
          open={!!novoAgendamento}
          onOpenChange={open => { if (!open) setNovoAgendamento(null); }}
          data={{
            date: novoAgendamento.date,
            time: novoAgendamento.horario,
            professionalId: novoAgendamento.professionalId,
            salaId: novoAgendamento.salaId
          }}
          professionals={professionals}
          services={services}
          payers={payers}
        />
      )}
    </div>
  );
}

export default AgendaSala;

