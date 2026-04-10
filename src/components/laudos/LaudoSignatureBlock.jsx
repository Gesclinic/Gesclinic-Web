import React from 'react';
import { hasStoredLaudoSignature, normalizeLaudoSignature } from '@/lib/laudoSignature';

export default function LaudoSignatureBlock({ signature = {}, compact = false }) {
  const normalized = normalizeLaudoSignature(signature);

  if (!hasStoredLaudoSignature(normalized) && !normalized.signed_by_name) {
    return null;
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5'} shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assinatura do laudo</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{normalized.signed_by_name || 'Responsável não informado'}</p>
          {normalized.certificate_id ? <p className="mt-1 text-xs text-slate-600">Certificado: {normalized.certificate_id}</p> : null}
          {normalized.signature_hash ? <p className="mt-1 break-all text-[11px] text-slate-500">Hash SHA-256: {normalized.signature_hash}</p> : null}
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          Assinatura híbrida
        </span>
      </div>

      {normalized.visual_signature_data_url ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <img src={normalized.visual_signature_data_url} alt="Assinatura do profissional" className="h-20 w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}