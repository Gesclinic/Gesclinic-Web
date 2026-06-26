import { getClinicLogoPublicURL } from '@/lib/clinicBranding';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCpf = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return escapeHtml(value || '');
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatMedication = (medication) => {
  const details = [medication.dose, medication.forma_farmaceutica, medication.via_administracao]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' - ');

  return `
    <article class="medication-card">
      <div class="medication-header">
        <h3>${escapeHtml(medication.nome || 'Medicamento')}</h3>
        ${medication.quantidade_total ? `<span>${escapeHtml(medication.quantidade_total)} ${escapeHtml(medication.unidade_quantidade || '')}</span>` : ''}
      </div>
      ${details ? `<p class="medication-dose">${details}</p>` : ''}
      <dl class="medication-grid">
        ${medication.frequencia ? `<div><dt>Frequencia</dt><dd>${escapeHtml(medication.frequencia)}</dd></div>` : ''}
        ${medication.duracao_dias ? `<div><dt>Duracao</dt><dd>${escapeHtml(medication.duracao_dias)} dias</dd></div>` : ''}
        ${medication.repeticoes ? `<div><dt>Repeticoes</dt><dd>${escapeHtml(medication.repeticoes)}</dd></div>` : ''}
      </dl>
      ${medication.instrucoes ? `<p class="medication-instructions"><strong>Orientacoes:</strong> ${escapeHtml(medication.instrucoes)}</p>` : ''}
    </article>`;
};

export function generatePrescriptionHtml({
  receitaData = {},
  medicamentos = [],
  assinaturaDigital = false,
  validationUrl = '',
} = {}) {
  const issueDate = receitaData.data_emissao || new Date().toLocaleDateString('pt-BR');
  const clinicLine = [receitaData.clinic_cnpj && `CNPJ ${receitaData.clinic_cnpj}`, receitaData.clinic_phone]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' | ');
  const addressLine = [receitaData.clinic_address, receitaData.clinic_city, receitaData.clinic_state]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' - ');
  const logoUrl = getClinicLogoPublicURL(receitaData.clinic_logo);
   const councilLabel = receitaData.professional_council_label || 'Conselho';
  const clinicInitials = String(receitaData.clinic_name || 'Clinica')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receita Medica</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    html { width: 100%; }
    body {
      margin: 0;
      background: #f3f4f6;
      color: #111827;
      font-family: Georgia, 'Times New Roman', serif;
      line-height: 1.45;
      overflow-x: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .prescription-page {
      width: min(780px, calc(100vw - 32px));
      min-height: 1040px;
      margin: 28px auto;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
      padding: 24px 28px 22px;
      position: relative;
      overflow: hidden;
    }
    .top-rule { height: 5px; border-radius: 999px; background: #0f766e; margin-bottom: 22px; }
    .header { display: grid; grid-template-columns: 82px 1fr auto; gap: 18px; align-items: center; }
    .logo-box {
      width: 82px; height: 82px; border: 1px solid #d1d5db; border-radius: 14px; background: #f8fafc;
      display: flex; align-items: center; justify-content: center; overflow: hidden; color: #6b7280;
      font: 700 18px Arial, sans-serif; text-align: center;
    }
    .logo-box img { display: block; width: 100%; height: 100%; object-fit: contain; padding: 6px; }
    .clinic-name { margin: 0; font-size: 22px; letter-spacing: 0.01em; color: #0f172a; }
    .clinic-meta { margin: 3px 0 0; color: #4b5563; font: 13px Arial, sans-serif; }
    .document-badge {
      border: 1px solid #99f6e4; background: #ecfdf5; color: #115e59;
      border-radius: 999px; padding: 8px 12px; font: 700 12px Arial, sans-serif; text-transform: uppercase;
    }
    .title-block { margin: 28px 0 18px; text-align: center; }
    .title-block h2 { margin: 0; font-size: 28px; letter-spacing: 0.12em; color: #111827; }
    .title-block p { margin: 6px 0 0; color: #64748b; font: 13px Arial, sans-serif; }
    .info-grid { display: grid; grid-template-columns: 1.35fr 0.8fr; gap: 12px; margin-bottom: 18px; }
    .info-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 13px 15px; background: #fafafa; }
    .info-card label { display: block; color: #64748b; font: 700 11px Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; }
    .info-card p { margin: 5px 0 0; font-size: 16px; color: #111827; overflow-wrap: anywhere; }
    .section-title { margin: 22px 0 10px; color: #0f172a; font-size: 16px; border-bottom: 2px solid #0f766e; padding-bottom: 7px; }
    .medication-list { display: grid; gap: 12px; }
    .medication-card { border: 1px solid #e5e7eb; border-left: 5px solid #0f766e; border-radius: 10px; padding: 13px 15px; break-inside: avoid; }
    .medication-header { display: flex; justify-content: space-between; gap: 14px; align-items: start; }
    .medication-header h3 { margin: 0; font-size: 18px; color: #111827; overflow-wrap: anywhere; }
    .medication-header span { white-space: nowrap; color: #0f766e; font: 700 13px Arial, sans-serif; }
    .medication-dose { margin: 5px 0 10px; font-size: 16px; }
    .medication-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0; }
    .medication-grid div { background: #f8fafc; border-radius: 8px; padding: 8px 10px; }
    .medication-grid dt { color: #64748b; font: 700 10px Arial, sans-serif; text-transform: uppercase; }
    .medication-grid dd { margin: 2px 0 0; font-size: 14px; }
    .medication-instructions { margin: 11px 0 0; color: #374151; overflow-wrap: anywhere; }
    .notes { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 10px; padding: 12px 14px; color: #1e3a8a; white-space: pre-wrap; }
    .signature-area { display: grid; grid-template-columns: 1fr 160px; gap: 22px; align-items: end; margin-top: 34px; }
    .signature-area.no-qr { grid-template-columns: 1fr; }
    .signature-card { text-align: center; padding-top: 18px; }
    .signature-line { border-top: 1.5px solid #111827; width: 82%; margin: 30px auto 10px; }
    .signature-pill { display: block; margin: 0 auto; font: 800 12px Arial, sans-serif; color: #334155; letter-spacing: 0.04em; text-transform: uppercase; }
    .professional-name { margin: 12px 0 2px; font-weight: 700; }
    .professional-meta { margin: 0; color: #4b5563; font: 13px Arial, sans-serif; }
    .qr { text-align: center; color: #64748b; font: 11px Arial, sans-serif; }
    .qr img { width: 116px; height: 116px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px; }
    .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #6b7280; text-align: center; font: 12px Arial, sans-serif; }
    @media (max-width: 720px) {
      .prescription-page { width: calc(100vw - 18px); margin: 9px; padding: 18px; }
      .header { grid-template-columns: 64px 1fr; }
      .logo-box { width: 64px; height: 64px; }
      .document-badge { grid-column: 1 / -1; justify-self: start; }
      .info-grid, .signature-area, .medication-grid { grid-template-columns: 1fr; }
      .title-block h2 { font-size: 24px; }
    }
    @media print {
      body { background: #fff; }
      .prescription-page { width: auto; min-height: auto; margin: 0; border: 0; box-shadow: none; border-radius: 0; padding: 0; overflow: visible; }
    }
  </style>
</head>
<body>
  <main class="prescription-page">
    <div class="top-rule"></div>
    <header class="header">
      <div class="logo-box">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo da clinica" onerror="this.remove();this.parentElement.textContent='${escapeHtml(clinicInitials || 'GC')}'" />` : escapeHtml(clinicInitials || 'GC')}</div>
      <div>
        <h1 class="clinic-name">${escapeHtml(receitaData.clinic_name || 'Clinica')}</h1>
        ${clinicLine ? `<p class="clinic-meta">${clinicLine}</p>` : ''}
        ${addressLine ? `<p class="clinic-meta">${addressLine}</p>` : ''}
      </div>
      <div class="document-badge">Receita médica</div>
    </header>

    <section class="title-block">
      <h2>PRESCRIÇÃO</h2>
      <p>Emitida em ${escapeHtml(issueDate)}${receitaData.hora_emissao ? ` as ${escapeHtml(receitaData.hora_emissao)}` : ''}</p>
    </section>

    <section class="info-grid">
      <div class="info-card">
        <label>Paciente</label>
        <p>${escapeHtml(receitaData.patient_name || '')}</p>
      </div>
      <div class="info-card">
        <label>CPF</label>
        <p>${formatCpf(receitaData.patient_cpf) || 'Nao informado'}</p>
      </div>
      ${receitaData.protocol_name ? `<div class="info-card" style="grid-column: 1 / -1;"><label>Protocolo / diagnostico</label><p>${escapeHtml(receitaData.protocol_name)}</p></div>` : ''}
    </section>

    <h2 class="section-title">Medicamentos prescritos</h2>
    <section class="medication-list">
      ${(medicamentos || []).map(formatMedication).join('') || '<p>Nenhum medicamento informado.</p>'}
    </section>

    ${receitaData.observacoes ? `<h2 class="section-title">Observacoes</h2><section class="notes">${escapeHtml(receitaData.observacoes)}</section>` : ''}

    <section class="signature-area ${validationUrl ? '' : 'no-qr'}">
      <div class="signature-card">
        <div class="signature-line"></div>
        <span class="signature-pill">${assinaturaDigital ? 'Assinatura digital' : 'Assinatura manual'}</span>
        <p class="professional-name">${escapeHtml(receitaData.professional_name || 'Profissional')}</p>
        <p class="professional-meta">${escapeHtml(councilLabel)}: ${escapeHtml(receitaData.professional_crm || '_____')} / ${escapeHtml(receitaData.professional_uf || '_____')}${receitaData.professional_rqe ? ` | RQE: ${escapeHtml(receitaData.professional_rqe)}` : ''}</p>
      </div>
      ${validationUrl ? `<div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(validationUrl)}" alt="QR Code" /><p>Validar receita</p></div>` : ''}
    </section>

    <footer class="footer">Emitido pelo sistema Gesclinic</footer>
  </main>
</body>
</html>`;
}