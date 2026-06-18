/**
 * Utilitários para adicionar header com logo + nome da clínica em PDFs/relatórios
 */

export async function addClinicHeaderToPDF(doc, clinic) {
  if (!clinic || !doc) {
    return;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Altura disponível para o header
  const headerHeight = 30;
  
  // Cor de fundo (cinza claro)
  doc.setFillColor(248, 250, 252); // bg-slate-50
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Borda inferior do header
  doc.setDrawColor(226, 232, 240); // border-slate-200
  doc.setLineWidth(0.5);
  doc.line(0, headerHeight, pageWidth, headerHeight);

  let logoX = 14;
  let logoY = 5;
  let logoWidth = 20;
  let logoHeight = 20;
  let textX = 40;

  // Adicionar logo se disponível
  if (clinic.logo_url) {
    try {
      // Suporta URLs diretas ou paths do Supabase
      const logoUrl = clinic.logo_url.startsWith('http') 
        ? clinic.logo_url 
        : clinic.logo_url;
      
      doc.addImage(logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (err) {
      console.warn('Erro ao adicionar logo ao PDF:', err);
      // Se falhar, adiciona um ícone de building em vez de logo
      drawBuildingIcon(doc, logoX, logoY, logoWidth, logoHeight);
    }
  } else {
    // Desenha um ícone padrão se não houver logo
    drawBuildingIcon(doc, logoX, logoY, logoWidth, logoHeight);
  }

  // Adicionar nome da clínica
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // text-slate-900
  doc.setFont(undefined, 'bold');
  doc.text(
    clinic.name || clinic.fantasy_name || 'Clínica',
    textX,
    12
  );

  // Adicionar subtítulo ou CNPJ
  if (clinic.cnpj) {
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 99); // text-slate-600
    doc.setFont(undefined, 'normal');
    doc.text(
      `CNPJ: ${formatCNPJ(clinic.cnpj)}`,
      textX,
      18
    );
  }

  // Adicionar data/hora no canto direito
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // text-slate-500
  doc.setFont(undefined, 'normal');
  const now = new Date().toLocaleString('pt-BR');
  doc.text(
    `Emitido em: ${now}`,
    pageWidth - 14,
    12,
    { align: 'right' }
  );

  // Retornar a próxima posição Y após o header
  return headerHeight + 5;
}

/**
 * Desenha um ícone simples de building quando não há logo
 */
function drawBuildingIcon(doc, x, y, width, height) {
  const mainColor = [26, 91, 138]; // primary color
  doc.setDrawColor(...mainColor);
  doc.setFillColor(...mainColor);
  
  // Corpo do prédio (quadrado)
  doc.rect(x + 3, y + 3, width - 6, height - 6, 'FD');
  
  // Janelas
  const windowSize = 2;
  const windowSpacing = 1.5;
  
  doc.setFillColor(255, 255, 255); // branco
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const wx = x + 5 + i * windowSpacing;
      const wy = y + 5 + j * windowSpacing;
      doc.rect(wx, wy, windowSize, windowSize, 'FD');
    }
  }
}

/**
 * Formata CNPJ para exibição
 */
function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
}

/**
 * Formata valor em moeda
 */
export function formatCurrency(value) {
  if (typeof value !== 'number') {
    value = parseFloat(value) || 0;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata data
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

/**
 * Retorna a próxima posição Y após adicionar espaço
 */
export function getNextYPosition(doc, currentY, spacing = 5) {
  return currentY + spacing;
}
