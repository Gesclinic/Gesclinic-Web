import { getClinicLogoPublicURL } from '@/lib/clinicBranding';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLineBlock(lines) {
  return (lines || []).filter(Boolean).map((line, index) => {
    const cls = index === 0 ? 'font-weight:700;color:#0f172a;font-size:18px;' : 'color:#475569;font-size:13px;';
    return `<div style="${cls}">${escapeHtml(line)}</div>`;
  }).join('');
}

export function buildLaudoPrintHtml({ laudo, patientName = '' }) {
  const letterhead = laudo?.metadata?.letterhead || {};
  const logoUrl = getClinicLogoPublicURL(letterhead?.clinic_logo_url);
  const clinicLines = [
    letterhead?.clinic_display_name,
    letterhead?.clinic_address_line,
    letterhead?.clinic_contact_line,
  ].filter(Boolean);
  const professionalLines = [
    letterhead?.professional_display_name,
    letterhead?.professional_title_line,
    letterhead?.professional_address_line,
    letterhead?.professional_contact_line,
  ].filter(Boolean);
  const signature = laudo?.metadata?.signature || {};
  const examDate = laudo?.exam_date ? new Date(laudo.exam_date).toLocaleDateString('pt-BR') : 'Não informada';
  const createdAt = laudo?.created_at ? new Date(laudo.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(laudo?.title || 'Laudo Clínico')}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; background: #fff; }
        .page { max-width: 900px; margin: 0 auto; padding: 32px; }
        .letterhead { border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 24px; display: flex; gap: 20px; align-items: flex-start; }
        .logo { width: 84px; height: 84px; border: 1px solid #cbd5e1; border-radius: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f8fafc; }
        .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .section { margin-top: 24px; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
        .meta-card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px 14px; background: #f8fafc; }
        .meta-label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 4px; }
        .meta-value { font-size: 14px; color: #0f172a; font-weight: 600; }
        .content { white-space: pre-wrap; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; font-size: 14px; line-height: 1.75; background: #fff; }
        .signature-block { margin-top: 28px; border: 1px solid #e2e8f0; border-radius: 20px; padding: 18px 22px; background: #fff; }
        .signature-image { margin-top: 14px; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 10px; background: #f8fafc; text-align: center; }
        .signature-image img { max-height: 88px; max-width: 100%; object-fit: contain; }
        .footer { margin-top: 32px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 12px; color: #64748b; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="letterhead">
          ${logoUrl ? `<div class="logo"><img src="${escapeHtml(logoUrl)}" alt="Logo da clínica" /></div>` : ''}
          <div style="flex:1;">
            ${renderLineBlock(clinicLines)}
          </div>
        </div>

        <div>
          <h1 style="font-size:28px; margin:0 0 8px 0;">${escapeHtml(laudo?.title || 'Laudo Clínico')}</h1>
          <div style="color:#475569; font-size:14px;">${escapeHtml(laudo?.professional_name || '')}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-card">
            <div class="meta-label">Paciente</div>
            <div class="meta-value">${escapeHtml(patientName || laudo?.metadata?.patient_name || 'Paciente')}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Data do exame</div>
            <div class="meta-value">${escapeHtml(examDate)}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Emitido em</div>
            <div class="meta-value">${escapeHtml(createdAt)}</div>
          </div>
        </div>

        <div class="section">
          <div class="content">${escapeHtml(laudo?.content || '')}</div>
        </div>

        ${professionalLines.length ? `
          <div class="signature-block">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:10px;">Responsável pelo laudo</div>
            ${renderLineBlock(professionalLines)}
            ${signature?.visual_signature_data_url ? `
              <div class="signature-image">
                <img src="${escapeHtml(signature.visual_signature_data_url)}" alt="Assinatura do profissional" />
              </div>
            ` : ''}
            ${signature?.certificate_id ? `<div style="margin-top:12px;color:#475569;font-size:12px;">Certificado: ${escapeHtml(signature.certificate_id)}</div>` : ''}
            ${signature?.signature_hash ? `<div style="margin-top:6px;color:#64748b;font-size:11px;word-break:break-all;">Hash SHA-256: ${escapeHtml(signature.signature_hash)}</div>` : ''}
          </div>
        ` : ''}

        <div class="footer">
          Documento gerado por Gesclinic em ${escapeHtml(new Date().toLocaleDateString('pt-BR'))}.
        </div>
      </div>
    </body>
    </html>
  `;
}

export function printLaudoDocument({ laudo, patientName = '' }) {
  const htmlContent = buildLaudoPrintHtml({ laudo, patientName });
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    window.URL.revokeObjectURL(url);
    throw new Error('Não foi possível abrir a janela de impressão.');
  }

  printWindow.onload = () => {
    printWindow.print();
    window.URL.revokeObjectURL(url);
  };
}