import React, { useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Package, AlertTriangle, Download, FileText, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { stockItemsApi, stockMovementsApi } from '@/lib/stockApi';
import { formatLocalDate } from '@/utils/timezoneHelpers';

export default function EstoqueRelatorios() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Relatórios' },
  ]);

  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const [activeReport, setActiveReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    posicao: { location_id: '', status: 'all' },
    movimentacao: { startDate: '', endDate: '', movement_type: 'all' },
    criticos: { min_stock_only: true },
    abc: { start_date: '', end_date: '' },
  });
  const [loading, setLoading] = useState(false);

  const relatorios = [
    {
      title: 'Posição de Estoque',
      description: 'Saldos atuais por produto e localização',
      icon: Package,
      color: 'bg-blue-500',
      id: 'posicao',
    },
    {
      title: 'Movimentação por Período',
      description: 'Entradas, saídas e transferências',
      icon: TrendingUp,
      color: 'bg-green-500',
      id: 'movimentacao',
    },
    {
      title: 'Itens Críticos',
      description: 'Produtos abaixo do estoque mínimo',
      icon: AlertTriangle,
      color: 'bg-red-500',
      id: 'criticos',
    },
    {
      title: 'Curva ABC',
      description: 'Classificação por valor e giro',
      icon: BarChart3,
      color: 'bg-purple-500',
      id: 'abc',
    },
  ];

  const generateReportData = async (reportId) => {
    if (!clinicId) {
      return null;
    }

    try {
      const reportFilters = filters[reportId];

      if (reportId === 'posicao') {
        // Gera relatório de posição de estoque
        const items = await stockItemsApi.list(clinicId);
        return {
          title: 'Posição de Estoque',
          columns: ['Produto', 'SKU', 'Unidade', 'Categoria', 'Saldo', 'Mín.', 'Máx.', 'Status'],
          data: items.map((item) => ({
            name: item.name,
            sku: item.sku,
            unidade: item.unit_symbol || 'un',
            category: item.category_name || '-',
            balance: item.total_balance || 0,
            min: item.min_stock || 0,
            max: item.max_stock || 0,
            status: item.is_active ? 'Ativo' : 'Inativo',
          })),
        };
      } else if (reportId === 'criticos') {
        // Relatório de itens críticos
        const items = await stockItemsApi.list(clinicId);
        const criticos = items.filter((item) => item.total_balance < item.min_stock);
        return {
          title: 'Itens Críticos',
          columns: ['Produto', 'SKU', 'Unidade', 'Saldo Atual', 'Mínimo', 'Falta'],
          data: criticos.map((item) => ({
            name: item.name,
            sku: item.sku,
            unidade: item.unit_symbol || 'un',
            balance: item.total_balance || 0,
            min: item.min_stock || 0,
            falta: Math.max(0, (item.min_stock || 0) - (item.total_balance || 0)),
          })),
        };
      }

      return {
        title: relatorios.find((r) => r.id === reportId)?.title || 'Relatório',
        columns: ['Coluna 1', 'Coluna 2'],
        data: [],
      };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    }
  };

  const handleGenerateReport = async (reportId) => {
    if (!clinicId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Clínica não identificada' });
      return;
    }

    setLoading(true);
    try {
      const data = await generateReportData(reportId);
      setReportData({ ...data, id: reportId, timestamp: new Date() });
      setShowReport(true);
      setActiveReport(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar relatório',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadAsCSV = () => {
    if (!reportData) {
      return;
    }

    const csv = [
      [`Relatório: ${reportData.title}`],
      [`Gerado em: ${reportData.timestamp.toLocaleString('pt-BR')}`],
      [],
      reportData.columns.join(','),
      ...reportData.data.map((row) =>
        reportData.columns
          .map((col) => {
            const key = col
              .toLowerCase()
              .replace(/ã|á/g, 'a')
              .replace(/ç/g, 'c')
              .replace(/\s+/g, '_');
            return row[key] || '-';
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileDate = formatLocalDate(new Date().toISOString().slice(0, 10)).replace(/\//g, '-');
    a.download = `relatorio_${reportData.id}_${fileDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({ title: 'Download iniciado', description: `${reportData.title} baixado com sucesso` });
  };

  const downloadAsHTML = () => {
    if (!reportData) {
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${reportData.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .info { color: #666; font-size: 12px; margin-bottom: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${reportData.title}</h1>
        <div class="info">Gerado em: ${reportData.timestamp.toLocaleString('pt-BR')}</div>
        <table>
          <thead>
            <tr>${reportData.columns.map((col) => `<th>${col}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${reportData.data
              .map(
                (row) => `
              <tr>
                ${reportData.columns
                  .map((col) => {
                    const key = col
                      .toLowerCase()
                      .replace(/ã|á/g, 'a')
                      .replace(/ç/g, 'c')
                      .replace(/\s+/g, '_');
                    return `<td>${row[key] || '-'}</td>`;
                  })
                  .join('')}
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileDate = formatLocalDate(new Date().toISOString().slice(0, 10)).replace(/\//g, '-');
    a.download = `relatorio_${reportData.id}_${fileDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({ title: 'Download iniciado', description: `${reportData.title} baixado com sucesso` });
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Relatórios de Estoque"
      subtitle="Análises e indicadores para gestão eficiente do estoque."
    >
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {relatorios.map((relatorio) => (
          <Card key={relatorio.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${relatorio.color} text-white`}>
                  <relatorio.icon className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">{relatorio.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{relatorio.description}</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setActiveReport(relatorio.id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog Posição de Estoque */}
      <Dialog open={activeReport === 'posicao'} onOpenChange={() => setActiveReport(null)}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Filtros - Posição de Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status do Item</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={filters.posicao.status}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    posicao: { ...filters.posicao, status: e.target.value },
                  })
                }
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveReport(null)}>
              Cancelar
            </Button>
            <Button onClick={() => handleGenerateReport('posicao')} disabled={loading}>
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Movimentação por Período */}
      <Dialog open={activeReport === 'movimentacao'} onOpenChange={() => setActiveReport(null)}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Filtros - Movimentação por Período</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium mb-1">
                Data Inicial
              </label>
              <input
                id="start-date"
                type="date"
                className="w-full border rounded px-2 py-1"
                value={filters.movimentacao.startDate}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    movimentacao: { ...filters.movimentacao, startDate: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium mb-1">
                Data Final
              </label>
              <input
                id="end-date"
                type="date"
                className="w-full border rounded px-2 py-1"
                value={filters.movimentacao.endDate}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    movimentacao: { ...filters.movimentacao, endDate: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Movimento</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={filters.movimentacao.movement_type}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    movimentacao: { ...filters.movimentacao, movement_type: e.target.value },
                  })
                }
              >
                <option value="all">Todos</option>
                <option value="entry">Entradas</option>
                <option value="exit">Saídas</option>
                <option value="adjustment">Ajustes</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveReport(null)}>
              Cancelar
            </Button>
            <Button onClick={() => handleGenerateReport('movimentacao')} disabled={loading}>
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Itens Críticos */}
      <Dialog open={activeReport === 'criticos'} onOpenChange={() => setActiveReport(null)}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Filtros - Itens Críticos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="min-stock"
                className="rounded"
                checked={filters.criticos.min_stock_only}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    criticos: { min_stock_only: e.target.checked },
                  })
                }
              />
              <label htmlFor="min-stock" className="text-sm font-medium">
                Mostrar apenas itens abaixo do mínimo
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveReport(null)}>
              Cancelar
            </Button>
            <Button onClick={() => handleGenerateReport('criticos')} disabled={loading}>
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Curva ABC */}
      <Dialog open={activeReport === 'abc'} onOpenChange={() => setActiveReport(null)}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Filtros - Curva ABC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="abc-start" className="block text-sm font-medium mb-1">
                Data Inicial (últimos 12 meses)
              </label>
              <input
                id="abc-start"
                type="date"
                className="w-full border rounded px-2 py-1"
                value={filters.abc.start_date}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    abc: { ...filters.abc, start_date: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label htmlFor="abc-end" className="block text-sm font-medium mb-1">
                Data Final
              </label>
              <input
                id="abc-end"
                type="date"
                className="w-full border rounded px-2 py-1"
                value={filters.abc.end_date}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    abc: { ...filters.abc, end_date: e.target.value },
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveReport(null)}>
              Cancelar
            </Button>
            <Button onClick={() => handleGenerateReport('abc')} disabled={loading}>
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exibição do Relatório */}
      {showReport && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h2 className="text-xl font-bold">{reportData.title}</h2>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="text-sm text-gray-600 mb-4">
                Gerado em: {reportData.timestamp.toLocaleString('pt-BR')}
              </div>

              {reportData.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum dado encontrado para os filtros selecionados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        {reportData.columns.map((col, idx) => (
                          <th
                            key={idx}
                            className="border px-3 py-2 text-left text-sm font-semibold"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 border-t">
                          {reportData.columns.map((col, colIdx) => {
                            const key = col
                              .toLowerCase()
                              .replace(/ã|á/g, 'a')
                              .replace(/ç/g, 'c')
                              .replace(/\s+/g, '_');
                            const value = row[key];
                            return (
                              <td key={colIdx} className="border px-3 py-2 text-sm">
                                {typeof value === 'number' ? value.toFixed(2) : value || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowReport(false)}>
                Fechar
              </Button>
              <Button onClick={downloadAsCSV} className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Baixar CSV
              </Button>
              <Button onClick={downloadAsHTML} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Baixar HTML
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
