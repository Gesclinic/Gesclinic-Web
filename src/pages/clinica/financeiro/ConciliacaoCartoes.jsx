import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CreditCard, FileUp, RefreshCw, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { importCardStatementEntries, listCardReconciliationItems, listCardStatementEntries, parseCardStatementCsv } from '@/lib/cardReconciliationApi';

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function dateOnly(value) {
  if (!value) return '-';
  return new Date(`${String(value).split('T')[0]}T00:00:00`).toLocaleDateString('pt-BR');
}

function todayMinus(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

export default function ConciliacaoCartoes() {
  const navigate = useNavigate();
  const { clinicId } = useClinicContext();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ count: 0, grossAmount: 0, expectedFee: 0, expectedNet: 0, missingFee: 0 });
  const [processors, setProcessors] = useState([]);
  const [statementEntries, setStatementEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [draggingStatementFile, setDraggingStatementFile] = useState(false);
  const [error, setError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [filters, setFilters] = useState({
    startDate: todayMinus(30),
    endDate: new Date().toISOString().split('T')[0],
    processorId: 'all',
  });

  const loadData = async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      setError('');
      const result = await listCardReconciliationItems({
        clinicId,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        processorId: filters.processorId === 'all' ? null : filters.processorId,
      });
      setRows(result.rows || []);
      setSummary(result.summary || {});
      setProcessors(result.processors || []);
      const importedEntries = await listCardStatementEntries({
        clinicId,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        processorId: filters.processorId === 'all' ? null : filters.processorId,
      });
      setStatementEntries(importedEntries || []);
    } catch (err) {
      console.error('Erro ao carregar conciliação de cartões:', err);
      setError(err.message || 'Erro ao carregar conciliação de cartões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const importStatementFile = async (file) => {
    if (!file || !clinicId) return;

    try {
      setImporting(true);
      setError('');
      setImportMessage('');
      const text = await file.text();
      const entries = parseCardStatementCsv(text);
      if (!entries.length) {
        setError('Nenhum lançamento reconhecido no arquivo. Verifique se é CSV com cabeçalho.');
        return;
      }

      const result = await importCardStatementEntries({
        clinicId,
        processorId: filters.processorId === 'all' ? null : filters.processorId,
        fileName: file.name,
        entries,
      });
      setImportMessage(`Extrato importado: ${result.imported} lançamento(s), ${result.duplicates} duplicata(s) ignorada(s).`);
      await loadData();
    } catch (err) {
      console.error('Erro ao importar extrato de cartão:', err);
      setError(err.message || 'Erro ao importar extrato de cartão');
    } finally {
      setImporting(false);
    }
  };

  const handleStatementFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await importStatementFile(file);
  };

  const handleStatementDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingStatementFile(false);
    const file = event.dataTransfer.files?.[0];
    await importStatementFile(file);
  };

  const handleStatementDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingStatementFile(true);
  };

  const grouped = useMemo(() => {
    return rows.reduce((acc, row) => {
      const key = row.processorName || 'Sem operadora';
      if (!acc[key]) acc[key] = { count: 0, gross: 0, fee: 0, net: 0 };
      acc[key].count += 1;
      acc[key].gross += row.grossAmount;
      acc[key].fee += row.expectedFee;
      acc[key].net += row.expectedNet;
      return acc;
    }, {});
  }, [rows]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900">
            <CreditCard className="h-8 w-8 text-sky-700" />
            Conciliação de Cartões
          </h1>
          <p className="mt-1 text-slate-600">
            Confira vendas em cartão, taxa esperada, líquido previsto e parametrização por operadora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate('/clinica/financeiro/cartoes-taxas-operadoras')}>
            <Settings2 className="h-4 w-4" />
            Taxas
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate('/clinica/financeiro/cartoes-operadoras')}>
            <Settings2 className="h-4 w-4" />
            Operadoras
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Data inicial</Label>
            <Input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
          </div>
          <div>
            <Label>Data final</Label>
            <Input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
          </div>
          <div>
            <Label>Operadora</Label>
            <Select value={filters.processorId} onValueChange={(value) => setFilters((current) => ({ ...current, processorId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as operadoras</SelectItem>
                {processors.map((processor) => (
                  <SelectItem key={processor.id} value={processor.id}>{processor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" className="w-full gap-2" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div
        className={`rounded-lg border p-4 transition ${draggingStatementFile ? 'border-sky-500 bg-sky-100 ring-2 ring-sky-200' : 'border-sky-100 bg-sky-50'}`}
        onDragEnter={handleStatementDrag}
        onDragOver={handleStatementDrag}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!event.currentTarget.contains(event.relatedTarget)) setDraggingStatementFile(false);
        }}
        onDrop={handleStatementDrop}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-sky-950">
              <FileUp className="h-5 w-5" />
              Extrato da operadora de cartão
            </h2>
            <p className="mt-1 text-sm text-sky-800">
              Arraste o CSV da operadora aqui ou use o botão para comparar vendas, taxas cobradas e líquido recebido.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-800">
              {statementEntries.length} item(ns) importado(s) no período
            </span>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800">
              <FileUp className="h-4 w-4" />
              {importing ? 'Importando...' : 'Importar CSV'}
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleStatementFile} disabled={importing} />
            </label>
          </div>
        </div>
        {importMessage && <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-emerald-700">{importMessage}</p>}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Vendas</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.count || 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Bruto em cartão</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{money(summary.grossAmount)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Taxa esperada</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{money(summary.expectedFee)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Líquido previsto</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{money(summary.expectedNet)}</p>
        </div>
      </div>

      {summary.missingFee > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{summary.missingFee} venda(s) sem taxa parametrizada.</p>
            <p>Cadastre a combinação de operadora, bandeira e prazo de liquidação em Taxas por Operadora.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Resumo por operadora</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(grouped).length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma venda em cartão no período.</p>
            ) : Object.entries(grouped).map(([name, values]) => (
              <div key={name} className="rounded border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{name}</p>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{values.count}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>Bruto {money(values.gross)}</span>
                  <span>Taxa {money(values.fee)}</span>
                  <span className="col-span-2 font-medium text-emerald-700">Líquido {money(values.net)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-lg font-semibold text-slate-900">Vendas para conciliar</h2>
          </div>
          <div className="max-h-[62vh] overflow-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Venda</th>
                  <th className="px-3 py-3">Liquidação</th>
                  <th className="px-3 py-3">Pagador</th>
                  <th className="px-3 py-3">Operadora</th>
                  <th className="px-3 py-3">Bandeira</th>
                  <th className="px-3 py-3 text-right">Bruto</th>
                  <th className="px-3 py-3 text-right">Taxa</th>
                  <th className="px-3 py-3 text-right">Líquido</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && rows.length === 0 ? (
                  <tr><td colSpan="9" className="px-3 py-10 text-center text-slate-500">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="9" className="px-3 py-10 text-center text-slate-500">Nenhuma venda em cartão encontrada.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">{dateOnly(row.saleDate)}</td>
                    <td className="px-3 py-3">{dateOnly(row.settlementDate)}</td>
                    <td className="px-3 py-3"><div className="font-medium text-slate-900">{row.payer}</div><div className="text-xs text-slate-500">{row.description}</div></td>
                    <td className="px-3 py-3">{row.processorName}</td>
                    <td className="px-3 py-3">{row.brand}</td>
                    <td className="px-3 py-3 text-right font-medium">{money(row.grossAmount)}</td>
                    <td className="px-3 py-3 text-right text-red-700">{money(row.expectedFee)}<div className="text-xs text-slate-500">{row.feePercent}%</div></td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700">{money(row.expectedNet)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${row.status === 'missing_fee' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {row.status === 'missing_fee' ? 'Parametrizar taxa' : 'Parametrizado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
