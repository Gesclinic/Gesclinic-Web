import React from "react";

export default function EvolucaoAtendimentoTab({ evolucao }) {
  return (
    <div>
      <textarea
        className="input w-full min-h-[120px]"
        value={evolucao || ''}
        placeholder="Anamnese, evolução, procedimentos realizados, CID..."
        readOnly
      />
    </div>
  );
}
