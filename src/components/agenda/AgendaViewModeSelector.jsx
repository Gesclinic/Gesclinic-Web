import React from 'react';

export default function AgendaViewModeSelector({ mode, onChange }) {
  return (
    <div className="flex gap-2 mb-2">
      <button
        className={`px-3 py-1 rounded ${mode === 'dia' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        onClick={() => onChange('dia')}
      >
        Dia
      </button>
      <button
        className={`px-3 py-1 rounded ${mode === 'semana' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        onClick={() => onChange('semana')}
      >
        Semana
      </button>
      <button
        className={`px-3 py-1 rounded ${mode === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        onClick={() => onChange('mes')}
      >
        Mês
      </button>
    </div>
  );
}
