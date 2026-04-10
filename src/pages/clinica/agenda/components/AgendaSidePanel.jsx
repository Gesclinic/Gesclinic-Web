import React from "react";
import { X } from "lucide-react";

export default function AgendaSidePanel({
  open,
  onClose,
  data,
  logs = [],
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-xl p-5 z-50 animate-slide-left">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-primary">Detalhes</h2>
        <button onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* CONTEÚDO */}
      {data ? (
        <div className="space-y-3 text-sm">
          <p><b>Paciente:</b> {data.patient_name}</p>
          <p><b>Profissional:</b> {data.professional_name}</p>
          <p><b>Serviço:</b> {data.service_name}</p>
          <p><b>Horário:</b> {data.start_time?.slice(11, 16)}</p>

          <div className="pt-3">
            <button
              className="w-full bg-green-600 text-white py-2 rounded-md mb-2"
              onClick={() => onConfirm(data)}
            >
              Confirmar
            </button>

            <button
              className="w-full bg-red-600 text-white py-2 rounded-md"
              onClick={() => onCancel(data)}
            >
              Cancelar
            </button>
          </div>

          <hr className="my-3" />

          <div>
            <h3 className="font-bold text-gray-700 mb-2">Histórico</h3>
            {logs.length ? (
              logs.map((l, i) => (
                <p key={i} className="text-xs text-gray-600">
                  {l.created_at} — {l.message}
                </p>
              ))
            ) : (
              <p className="text-xs text-gray-400">Nenhum log registrado.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Nenhum item selecionado.</p>
      )}
    </div>
  );
}

