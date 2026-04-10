import React, { useState, useEffect } from "react";
import useRooms from "@/hooks/useRooms";
import { useClinicContext } from "@/contexts/useClinicContext";
import AgendaIndisponibilidadeForm from "@/components/agenda/AgendaIndisponibilidadeForm";

// Estrutura inicial para configuração centralizada dos horários e vinculação de salas
export default function AgendaConfigScreen() {
  const clinicContext = useClinicContext() || {};
  const { clinic } = clinicContext;
  const { rooms } = useRooms(clinic?.id);
  const [config, setConfig] = useState({
    startHour: 7,
    endHour: 19,
    slotDuration: 30,
    daysOfWeek: [1,2,3,4,5],
    salasVinculadas: [],
  });

  // Carregar configuração existente (mock)
  useEffect(() => {
    // TODO: Buscar configuração real do backend
    // setConfig(...)
  }, [clinic]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setConfig((c) => ({ ...c, [name]: checked }));
    } else {
      setConfig((c) => ({ ...c, [name]: value }));
    }
  };

  const handleSalasChange = (id) => {
    setConfig((c) => ({
      ...c,
      salasVinculadas: c.salasVinculadas.includes(id)
        ? c.salasVinculadas.filter((s) => s !== id)
        : [...c.salasVinculadas, id],
    }));
  };

  const handleSave = () => {
    // TODO: Salvar configuração no backend
    alert("Configuração salva!");
  };

  // Estado para feriados/férias/indisponibilidades
  const [indisponibilidades, setIndisponibilidades] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const handleAddIndisponibilidade = (item) => {
    if (editIdx !== null) {
      setIndisponibilidades((prev) => prev.map((v, i) => i === editIdx ? item : v));
      setEditIdx(null);
      setEditItem(null);
    } else {
      setIndisponibilidades((prev) => [...prev, item]);
    }
    // TODO: Salvar no backend
  };

  const handleEdit = (idx) => {
    setEditIdx(idx);
    setEditItem(indisponibilidades[idx]);
  };

  const handleRemove = (idx) => {
    setIndisponibilidades((prev) => prev.filter((_, i) => i !== idx));
    // TODO: Remover do backend
    if (editIdx === idx) {
      setEditIdx(null);
      setEditItem(null);
    }
  };

  return (
    <div className="p-4 w-full">
      <h2 className="text-xl font-bold mb-4">Configuração de Horários da Agenda</h2>
      <div className="mb-2">
        <label>Início: </label>
        <input type="number" name="startHour" min={0} max={23} value={config.startHour} onChange={handleChange} className="border px-2 py-1 w-16" />
        <span className="ml-2">h</span>
      </div>
      <div className="mb-2">
        <label>Fim: </label>
        <input type="number" name="endHour" min={0} max={23} value={config.endHour} onChange={handleChange} className="border px-2 py-1 w-16" />
        <span className="ml-2">h</span>
      </div>
      <div className="mb-2">
        <label>Duração do slot: </label>
        <input type="number" name="slotDuration" min={5} max={120} step={5} value={config.slotDuration} onChange={handleChange} className="border px-2 py-1 w-16" />
        <span className="ml-2">min</span>
      </div>
      <div className="mb-2">
        <label>Dias da semana: </label>
        {[1,2,3,4,5,6,0].map((d) => (
          <label key={d} className="ml-2">
            <input
              type="checkbox"
              checked={config.daysOfWeek.includes(d)}
              onChange={() => setConfig((c) => ({
                ...c,
                daysOfWeek: c.daysOfWeek.includes(d)
                  ? c.daysOfWeek.filter((x) => x !== d)
                  : [...c.daysOfWeek, d],
              }))}
            />
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]}
          </label>
        ))}
      </div>
      <div className="mb-4">
        <label className="block font-medium mb-1">Salas vinculadas:</label>
        {rooms && rooms.length > 0 ? rooms.map((r) => (
          <label key={r.id} className="block ml-2">
            <input
              type="checkbox"
              checked={config.salasVinculadas.includes(r.id)}
              onChange={() => handleSalasChange(r.id)}
            /> {r.name}
          </label>
        )) : <span className="text-gray-400">Nenhuma sala cadastrada</span>}
      </div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSave}>Salvar</button>

      <hr className="my-6" />
      <h3 className="text-lg font-semibold mb-2">Feriados, Férias e Indisponibilidades</h3>
      <AgendaIndisponibilidadeForm onSave={handleAddIndisponibilidade} initial={editItem} />
      <ul className="mb-4">
        {indisponibilidades.length === 0 && <li className="text-gray-400">Nenhum registro</li>}
        {indisponibilidades.map((item, idx) => (
          <li key={idx} className="mb-1 text-sm flex items-center gap-2">
            <span><b>{item.motivo}</b>: {item.inicio} até {item.fim}</span>
            <button className="text-xs text-blue-600 underline" onClick={() => handleEdit(idx)}>Editar</button>
            <button className="text-xs text-red-600 underline" onClick={() => handleRemove(idx)}>Remover</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

