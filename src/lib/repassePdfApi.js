// src/lib/repassePdfApi.js
/**
 * Exportação de PDF para Repassos
 *
 * Gera recibos profissionais com:
 * - Detalhes do repasse
 * - Assinatura da clínica
 * - Código QR (opcional)
 */

/**
 * Gerar PDF de recibo de repasse
 * Usa html2pdf ou jsPDF para criar documento
 */
export async function gerarReciboPDF(repasse, profissional, clinic) {
  // Importar dinamicamente para não quebrar no servidor
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).jsPDF;

  // Container HTML para o recibo
  const recibosContainer = document.createElement('div');
  recibosContainer.innerHTML = `
    <div style="font-family: Arial, sans-serif; width: 800px; margin: 0 auto; padding: 20px;">
      <!-- Cabeçalho -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
        <h1 style="margin: 0;">${clinic?.brand_name || 'CLÍNICA'}</h1>
        <p style="margin: 5px 0; color: #666;">CNPJ: ${clinic?.cnpj || '---'}</p>
        <p style="margin: 5px 0; color: #666;">${clinic?.address || '---'}</p>
      </div>

      <!-- Título -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0066cc;">RECIBO DE REPASSE PROFISSIONAL</h2>
      </div>

      <!-- Informações -->
      <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            <strong>Profissional:</strong> ${profissional?.name || '---'}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            <strong>CPF:</strong> ${profissional?.cpf || '---'}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            <strong>Período:</strong> ${repasse?.periodo_inicio} a ${repasse?.periodo_fim}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            <strong>Data Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}
          </td>
        </tr>
      </table>

      <!-- Detalhes Financeiros -->
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Detalhes do Repasse</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f0f0f0;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Faturado (Bruto)</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
              R$ ${(repasse?.total_bruto || 0).toFixed(2).replace('.', ',')}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Deduções/Impostos</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
              R$ ${((repasse?.total_bruto || 0) - (repasse?.total_liquido || 0)).toFixed(2).replace('.', ',')}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Líquido</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
              R$ ${(repasse?.total_liquido || 0).toFixed(2).replace('.', ',')}
            </td>
          </tr>
          <tr style="background-color: #fff3cd;">
            <td style="padding: 10px; border: 2px solid #0066cc; font-weight: bold;">Repasse do Profissional</td>
            <td style="padding: 10px; border: 2px solid #0066cc; text-align: right; font-weight: bold; font-size: 18px;">
              R$ ${(repasse?.valor_profissional || 0).toFixed(2).replace('.', ',')}
            </td>
          </tr>
          <tr style="background-color: #e8f5e9;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Lucro da Clínica</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
              R$ ${(repasse?.valor_clinica || 0).toFixed(2).replace('.', ',')}
            </td>
          </tr>
        </table>
      </div>

      <!-- Termos -->
      <div style="margin-bottom: 20px; font-size: 12px; color: #666;">
        <p><strong>Status:</strong> ${repasse?.status || 'pendente'}</p>
        <p>Emitido pelo sistema Gesclinic em ${new Date().toLocaleString('pt-BR')}</p>
      </div>

      <!-- Assinatura -->
      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 40%;">
          <div style="border-top: 1px solid #000; height: 40px;"></div>
          <p style="margin: 0;">Assinatura do Profissional</p>
        </div>
        <div style="text-align: center; width: 40%;">
          <div style="border-top: 1px solid #000; height: 40px;"></div>
          <p style="margin: 0;">Assinatura da Clínica</p>
        </div>
      </div>

      <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #999;">
        <p>Este é um comprovante eletrônico de repasse profissional</p>
      </div>
    </div>
  `;

  // Adicionar ao DOM temporariamente
  document.body.appendChild(recibosContainer);

  try {
    // Converter HTML para Canvas
    const canvas = await html2canvas(recibosContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    // Converter Canvas para PDF
    const pdf = new jsPDF();
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width em mm
    const pageHeight = 297; // A4 height em mm
    let heightLeft = (canvas.height * imgWidth) / canvas.width;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, heightLeft);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, heightLeft);
      heightLeft -= pageHeight;
    }

    // Definir filename
    const filename = `recibo-repasse-${profissional?.name}-${repasse?.periodo_fim}.pdf`;
    pdf.save(filename);

    console.log('✅ PDF gerado:', filename);
  } finally {
    // Remover do DOM
    document.body.removeChild(recibosContainer);
  }
}

/**
 * Gerar relatório em lote (múltiplos repassos em um PDF)
 */
export async function gerarRelatorioPDF(repasses, clinic) {
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).jsPDF;

  const relatorioContainer = document.createElement('div');
  relatorioContainer.innerHTML = `
    <div style="font-family: Arial, sans-serif; width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1>${clinic?.brand_name || 'CLÍNICA'}</h1>
        <h2>RELATÓRIO DE REPASSOS PROFISSIONAIS</h2>
        <p>Período: ${repasses[0]?.periodo_inicio || ''} a ${repasses[repasses.length - 1]?.periodo_fim || ''}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f0f0f0;">
          <th style="padding: 10px; border: 1px solid #ddd;">Profissional</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Período</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total Líquido</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Repasse</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
        </tr>
        ${repasses
    .map(
      (r) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${r.profissional?.name || 'N/A'}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${r.periodo_inicio} a ${r.periodo_fim}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R$ ${(r.total_liquido || 0).toFixed(2).replace('.', ',')}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">R$ ${(r.valor_profissional || 0).toFixed(2).replace('.', ',')}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${r.status}</td>
          </tr>
        `,
    )
    .join('')}
      </table>
    </div>
  `;

  document.body.appendChild(relatorioContainer);

  try {
    const canvas = await html2canvas(relatorioContainer, { scale: 2 });
    const pdf = new jsPDF();
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

    const filename = `relatorio-repassos-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

    console.log('✅ Relatório PDF gerado:', filename);
  } finally {
    document.body.removeChild(relatorioContainer);
  }
}

/**
 * Exportar para Excel (alternativa ao PDF)
 */
export function exportarExcel(repasses, clinic) {
  const headers = [
    'Profissional',
    'Período Início',
    'Período Fim',
    'Total Bruto',
    'Total Líquido',
    'Repasse',
    'Lucro Clínica',
    'Status',
  ];

  const rows = repasses.map((r) => [
    r.profissional?.name || 'N/A',
    r.periodo_inicio,
    r.periodo_fim,
    (r.total_bruto || 0).toFixed(2),
    (r.total_liquido || 0).toFixed(2),
    (r.valor_profissional || 0).toFixed(2),
    (r.valor_clinica || 0).toFixed(2),
    r.status,
  ]);

  // Criar CSV
  let csv = headers.join(',') + '\n';
  rows.forEach((row) => {
    csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `repassos-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log('✅ Excel exportado');
}
