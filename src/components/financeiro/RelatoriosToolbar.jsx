/**
 * RelatoriosToolbar Component
 * Botões reutilizáveis: Exportar, Importar, Template, Imprimir, Relatório
 * Com suporte a Excel, PDF, impressão
 */

import React, { useState } from 'react';
import { Download, Upload, FileText, Printer, BarChart3, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addClinicHeaderToPDF } from '@/lib/reportHeaderUtils';

export default function RelatoriosToolbar({
  title = 'Relatório',
  data = [],
  columns = [],
  onImport = null,
  onGenerateReport = null,
  templateFileName = 'template',
  clinic = null
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  /**
   * Exportar para Excel com formatação
   * columns: [{ key: 'field', label: 'Coluna Nome', width: 20 }, ...]
   */
  const handleExport = () => {
    setIsExporting(true);
    try {
      // Transformar dados para formato da planilha
      const worksheet_data = [
        columns.map(col => col.label), // Headers
        ...data.map(row =>
          columns.map(col => {
            const value = row[col.key];
            // Formatar valores
            if (typeof value === 'number' && col.format === 'currency') {
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(value);
            }
            if (typeof value === 'number' && col.format === 'percent') {
              return `${value.toFixed(2)}%`;
            }
            if (value instanceof Date) {
              return value.toLocaleDateString('pt-BR');
            }
            return value || '';
          })
        )
      ];

      // Criar workbook
      const ws = XLSX.utils.aoa_to_sheet(worksheet_data);

      // Aplicar estilos (largura de colunas)
      ws['!cols'] = columns.map(col => ({
        wch: col.width || 15
      }));

      // Formatar cabeçalho (negrito, fundo cinza)
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4B5563' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };
      }

      // Criar arquivo
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');

      // Download
      const fileName = `${title}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      console.log(`✅ Arquivo exportado: ${fileName}`);
    } catch (error) {
      console.error('❌ Erro ao exportar:', error.message);
      alert(`Erro ao exportar: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCellValue = (value, col) => {
    if (typeof value === 'number' && col.format === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    }
    if (typeof value === 'number' && col.format === 'percent') {
      return `${value.toFixed(2)}%`;
    }
    if (value instanceof Date) {
      return value.toLocaleDateString('pt-BR');
    }
    return value ?? '';
  };

  const handleExportCsv = () => {
    try {
      const rows = [
        columns.map(col => col.label),
        ...data.map(row => columns.map(col => formatCellValue(row[col.key], col)))
      ];
      const csv = rows
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))
        .join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${templateFileName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Erro ao exportar CSV:', error.message);
      alert(`Erro ao exportar CSV: ${error.message}`);
    }
  };

  const handleExportPdf = async () => {
    try {
      const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });
      
      // Adicionar header com logo e nome da clínica
      let startY = 30;
      if (clinic) {
        startY = await addClinicHeaderToPDF(doc, clinic);
        startY += 10;
      }
      
      doc.setFontSize(14);
      doc.text(title, 14, startY);
      doc.setFontSize(9);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, startY + 7);
      
      autoTable(doc, {
        head: [columns.map(col => col.label)],
        body: data.map(row => columns.map(col => formatCellValue(row[col.key], col))),
        startY: startY + 12,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [75, 85, 99] },
      });
      doc.save(`${templateFileName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('❌ Erro ao exportar PDF:', error.message);
      alert(`Erro ao exportar PDF: ${error.message}`);
    }
  };

  /**
   * Importar de Excel
   */
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const importedData = XLSX.utils.sheet_to_json(worksheet);

        console.log('✅ Dados importados:', importedData);

        if (onImport) {
          onImport(importedData);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('❌ Erro ao importar:', error.message);
      alert(`Erro ao importar: ${error.message}`);
    }
  };

  /**
   * Baixar template vazio
   */
  const handleDownloadTemplate = () => {
    try {
      const worksheet_data = [
        columns.map(col => col.label), // Headers
        Array(columns.length).fill('') // Uma linha vazia de exemplo
      ];

      const ws = XLSX.utils.aoa_to_sheet(worksheet_data);
      ws['!cols'] = columns.map(col => ({
        wch: col.width || 15
      }));

      // Formatar cabeçalho
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4B5563' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
        };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      const fileName = `${templateFileName}_template_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      console.log(`✅ Template baixado: ${fileName}`);
    } catch (error) {
      console.error('❌ Erro ao baixar template:', error.message);
      alert(`Erro ao baixar template: ${error.message}`);
    }
  };

  /**
   * Imprimir tabela
   */
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { 
              background-color: #4B5563; 
              color: white; 
              padding: 12px; 
              text-align: left; 
              font-weight: bold;
              border: 1px solid #ddd;
            }
            td { 
              padding: 10px; 
              border: 1px solid #ddd;
              border-bottom: 1px solid #ddd;
            }
            tr:nth-child(even) { background-color: #f9f9f9; }
            tr:hover { background-color: #f0f0f0; }
            .currency { text-align: right; }
            .percent { text-align: right; }
            @media print {
              body { margin: 0; }
              table { font-size: 11px; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${columns.map(col => {
                    let value = row[col.key];
                    let className = '';
                    
                    if (typeof value === 'number' && col.format === 'currency') {
                      value = new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(value);
                      className = 'currency';
                    } else if (typeof value === 'number' && col.format === 'percent') {
                      value = `${value.toFixed(2)}%`;
                      className = 'percent';
                    } else if (value instanceof Date) {
                      value = value.toLocaleDateString('pt-BR');
                    }
                    
                    return `<td class="${className}">${value || ''}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  /**
   * Gerar relatório detalhado
   */
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      if (onGenerateReport) {
        await onGenerateReport();
      } else {
        alert('Função de relatório não configurada');
      }
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error.message);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Exportar para Excel */}
      <button
        onClick={handleExport}
        disabled={isExporting || !data.length}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        title="Exportar dados para Excel"
      >
        <Download size={18} />
        <span className="hidden sm:inline">Exportar</span>
      </button>

      <button
        onClick={handleExportCsv}
        disabled={!data.length}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:bg-gray-400 transition-colors"
        title="Exportar dados para CSV"
      >
        <FileSpreadsheet size={18} />
        <span className="hidden sm:inline">CSV</span>
      </button>

      <button
        onClick={handleExportPdf}
        disabled={!data.length}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
        title="Exportar relatório em PDF"
      >
        <FileText size={18} />
        <span className="hidden sm:inline">PDF</span>
      </button>

      {/* Importar de Excel */}
      {onImport && (
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
          <Upload size={18} />
          <span className="hidden sm:inline">Importar</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      )}

      {/* Template */}
      <button
        onClick={handleDownloadTemplate}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        title="Baixar template vazio"
      >
        <FileText size={18} />
        <span className="hidden sm:inline">Template</span>
      </button>

      {/* Imprimir */}
      <button
        onClick={handlePrint}
        disabled={!data.length}
        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
        title="Imprimir relatório"
      >
        <Printer size={18} />
        <span className="hidden sm:inline">Imprimir</span>
      </button>

      {/* Gerar Relatório */}
      <button
        onClick={handleGenerateReport}
        disabled={isGeneratingReport}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
        title="Gerar relatório detalhado em PDF"
      >
        <BarChart3 size={18} />
        <span className="hidden sm:inline">Relatório</span>
      </button>
    </div>
  );
}
