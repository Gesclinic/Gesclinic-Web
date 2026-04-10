import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/use-toast";

export default function BillingReportsExport({ reportId, filename = "relatorio_faturamento" }) {
  const [exporting, setExporting] = useState(null);
  const { toast } = useToast();

  const exportPDF = async () => {
    const element = document.getElementById(reportId);
    if (!element) {
      toast({ title: "Erro", description: "Elemento do relatório não encontrado.", variant: "destructive" });
      return;
    }

    setExporting("pdf");
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 15;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 15;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const pageCount = pdf.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 10, pageHeight - 10);
        pdf.text("Sistema Gesclinic - Faturamento TISS", pageWidth - 60, pageHeight - 10);
        pdf.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save(`${filename}.pdf`);
      toast({ title: "Sucesso", description: "Relatório PDF exportado." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao gerar PDF", description: error.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    const reportElement = document.getElementById(reportId);
    const tables = reportElement ? reportElement.querySelectorAll("table") : [];
    if (tables.length === 0) {
      toast({ title: "Aviso", description: "Nenhuma tabela encontrada no relatório para exportar.", variant: "default" });
      return;
    }

    setExporting("excel");
    try {
      const wb = XLSX.utils.book_new();
      tables.forEach((table, index) => {
        const ws = XLSX.utils.table_to_sheet(table);
        XLSX.utils.book_append_sheet(wb, ws, `Tabela ${index + 1}`);
      });
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast({ title: "Sucesso", description: "Relatório Excel exportado." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao gerar Excel", description: error.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2 justify-end print-hide">
      <Button
        onClick={exportPDF}
        disabled={exporting}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {exporting === 'pdf' ? <Loader2 className="animate-spin w-4 h-4" /> : <FileText className="w-4 h-4" />}
        Exportar PDF
      </Button>

      <Button
        onClick={exportExcel}
        disabled={exporting}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {exporting === 'excel' ? (
          <Loader2 className="animate-spin w-4 h-4" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        Exportar Excel
      </Button>
    </div>
  );
}

