import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Exportar para Excel
 */
export const exportToExcel = (data, filename) => {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, filename);
};

/**
 * Exportar para PDF
 */
export const exportToPDF = (title, content, filename) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  doc.setFontSize(10);
  doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);

  if (content.summary) {
    const summaryData = content.summary;
    doc.setFontSize(12);
    doc.text('RESUMO', 14, 40);
    doc.setFontSize(10);
    
    let yPos = 50;
    Object.entries(summaryData).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, yPos);
      yPos += 7;
    });
  }

  if (content.tableData && content.tableHeaders) {
    doc.autoTable({
      head: [content.tableHeaders],
      body: content.tableData,
      startY: 100,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 133, 244], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: content.columnStyles || {},
    });
  }

  doc.save(filename);
};

/**
 * Importar arquivo Excel/CSV
 */
export const importFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error(`Erro ao importar arquivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Baixar template Excel para importação
 */
export const downloadTemplate = (columns, filename) => {
  const data = [columns]; // Header
  exportToExcel(data, filename);
};

/**
 * Formatar moeda para exibição
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

/**
 * Formatar data para exibição
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

/**
 * Formatar hora para exibição
 */
export const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Validar dados importados
 */
export const validateImportedData = (data, requiredFields) => {
  const errors = [];
  
  data.forEach((row, index) => {
    requiredFields.forEach((field) => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push(`Linha ${index + 2}: Campo "${field}" obrigatório`);
      }
    });
  });

  return errors;
};

/**
 * Converter dados de importação para formato do banco
 */
export const convertImportedDataToPayload = (data, fieldMapping) => {
  return data.map((row) => {
    const payload = {};
    Object.entries(fieldMapping).forEach(([key, sourceField]) => {
      payload[key] = row[sourceField];
    });
    return payload;
  });
};
