import React, { useState } from 'react';

export default function AgendaIndisponibilidadeForm({ onSave, initial }) {
  const [motivo, setMotivo] = useState(initial?.motivo || '');
  const [inicio, setInicio] = useState(initial?.inicio || '');
  const [fim, setFim] = useState(initial?.fim || '');

  // Atualiza campos ao editar
  React.useEffect(() => {
    setMotivo(initial?.motivo || '');
    setInicio(initial?.inicio || '');
    setFim(initial?.fim || '');
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motivo || !inicio || !fim) {
      return;
    }
    onSave({ motivo, inicio, fim });
    setMotivo('');
    setInicio('');
    setFim('');
  };

  return (
    <form className="p-2 border rounded mb-2" onSubmit={handleSubmit}>
      <div className="mb-2">
        <label className="block text-xs font-medium">Motivo</label>
        <input
          className="border px-2 py-1 w-full"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
        />
      </div>
      <div className="mb-2">
        <label className="block text-xs font-medium">Início</label>
        <input
          type="datetime-local"
          className="border px-2 py-1 w-full"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          required
        />
      </div>
      <div className="mb-2">
        <label className="block text-xs font-medium">Fim</label>
        <input
          type="datetime-local"
          className="border px-2 py-1 w-full"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          required
        />
      </div>
      <button className="bg-blue-600 text-white px-4 py-1 rounded" type="submit">
        {initial ? 'Salvar edição' : 'Indisponibilizar'}
      </button>
    </form>
  );
}
