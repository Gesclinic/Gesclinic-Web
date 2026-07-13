import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Plus, RefreshCcw, Search, XCircle } from 'lucide-react';
import PageLayout from '@/components/ui/PageLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { listInvoices } from '@/lib/invoiceService';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText },
  issued: { label: 'Emitida', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  sent: { label: 'Enviada', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle2 },
  canceled: { label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  paid: { label: 'Paga', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function getInvoiceAmount(invoice) {
  return Number(invoice.net_amount ?? invoice.net_value ?? invoice.amount ?? invoice.gross_amount ?? 0);
}

function StatusBadge({ status }) {
  const key = String(status || 'draft').toLowerCase();
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function NotasFiscais() {
  const { clinicId: contextClinicId } = useClinicContext();
  const { clinicId: authClinicId } = useAuth();
  const clinicId = contextClinicId || authClinicId;
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Faturamento', path: '/clinica/faturamento' },
    { label: 'Notas Fiscais' },
  ]);

  const loadInvoices = async () => {
    if (!clinicId) return;
    setLoading(true);
    setError('');

    try {
      const rows = await listInvoices(clinicId);
      setInvoices(rows || []);
    } catch (err) {
      console.error('Erro ao carregar notas fiscais:', err);
      setError(err.message || 'Nao foi possivel carregar as notas fiscais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [clinicId]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices;

    return invoices.filter((invoice) => {
      const haystack = [
        invoice.invoice_number,
        invoice.description,
        invoice.status,
        invoice.appointment_id,
        invoice.patient_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [invoices, search]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        const status = String(invoice.status || 'draft').toLowerCase();
        const amount = getInvoiceAmount(invoice);
        acc.total += amount;
        acc.count += 1;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { total: 0, count: 0 },
    );
  }, [invoices]);

  return (
    <PageLayout
      title="Notas Fiscais"
      subtitle="Consulte, acompanhe e audite as NFS-e ja emitidas ou vinculadas aos atendimentos."
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadInvoices} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
          <Button asChild>
            <a href="/clinica/faturamento/centro-fiscal">
              <Plus className="mr-2 h-4 w-4" />
              Nova NF
            </a>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Notas</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{totals.count}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Emitidas</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-emerald-700">{totals.issued || 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Rascunhos</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-700">{totals.draft || 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">Valor fiscal</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{currency.format(totals.total)}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Lista de Notas</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Tela dedicada para notas fiscais, separada da emissao inteligente.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar numero, atendimento ou status"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando notas fiscais...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Nenhuma nota fiscal encontrada para os filtros atuais.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Emissao</TableHead>
                      <TableHead>Atendimento</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number || '-'}</TableCell>
                        <TableCell><StatusBadge status={invoice.status} /></TableCell>
                        <TableCell>{formatDate(invoice.emission_date || invoice.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{invoice.appointment_id || '-'}</TableCell>
                        <TableCell className="max-w-md truncate">{invoice.description || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{currency.format(getInvoiceAmount(invoice))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
