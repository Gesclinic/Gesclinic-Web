import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Download, Eye, FileArchive, FileText, Loader2, Mail, RefreshCcw, Search, Send, UploadCloud } from 'lucide-react';
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

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function hasXml(invoice) {
  return Boolean(invoice.xml_url || invoice.xml_path || invoice.xml_content || invoice.xml);
}

function hasPdf(invoice) {
  return Boolean(invoice.pdf_url || invoice.pdf_path || invoice.danfse_url || invoice.pdf);
}

function DocumentBadge({ available, label }) {
  return (
    <Badge
      variant="outline"
      className={available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}
    >
      {available ? 'Disponivel' : 'Pendente'} {label}
    </Badge>
  );
}

export default function XmlPdfFiscal() {
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
    { label: 'XML e PDF Fiscal' },
  ]);

  const loadDocuments = async () => {
    if (!clinicId) return;
    setLoading(true);
    setError('');

    try {
      const rows = await listInvoices(clinicId);
      setInvoices(rows || []);
    } catch (err) {
      console.error('Erro ao carregar documentos fiscais:', err);
      setError(err.message || 'Nao foi possivel carregar os documentos fiscais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
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
        invoice.xml_path,
        invoice.pdf_path,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [invoices, search]);

  const summary = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        acc.total += 1;
        if (hasXml(invoice)) acc.xml += 1;
        if (hasPdf(invoice)) acc.pdf += 1;
        if (!hasXml(invoice) || !hasPdf(invoice)) acc.pending += 1;
        return acc;
      },
      { total: 0, xml: 0, pdf: 0, pending: 0 },
    );
  }, [invoices]);

  return (
    <PageLayout
      title="XML e PDF Fiscal"
      subtitle="Central de documentos fiscais da NFS-e: XML, PDF/DANFSE, envio por email e contabilidade."
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDocuments} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
          <Button asChild>
            <a href="/clinica/faturamento/centro-fiscal">
              <FileText className="mr-2 h-4 w-4" />
              Emitir NF
            </a>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Notas fiscais</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">XML disponíveis</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold text-emerald-700">{summary.xml}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">PDF/DANFSE</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold text-blue-700">{summary.pdf}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Pendências</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold text-amber-700">{summary.pending}</CardContent>
          </Card>
        </div>

        <Card className="border-blue-100 bg-blue-50/40">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="rounded-lg border border-blue-200 bg-white p-2 text-blue-700">
              <FileArchive className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Documentos fiscais, nao XML TISS</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                Esta tela cuida de XML/PDF/DANFSE de NFS-e. O envio de lotes XML TISS permanece no menu Envio XML.
              </p>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Arquivo fiscal por nota</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Audite disponibilidade, baixe documentos e prepare envio para paciente ou contabilidade.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar nota, atendimento ou arquivo"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando documentos fiscais...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Nenhum documento fiscal encontrado para os filtros atuais.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nota</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Atendimento</TableHead>
                      <TableHead>XML</TableHead>
                      <TableHead>PDF/DANFSE</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number || '-'}</TableCell>
                        <TableCell>{formatDate(invoice.emission_date || invoice.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{invoice.appointment_id || '-'}</TableCell>
                        <TableCell><DocumentBadge available={hasXml(invoice)} label="XML" /></TableCell>
                        <TableCell><DocumentBadge available={hasPdf(invoice)} label="PDF" /></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Download">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Enviar email">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Enviar contabilidade">
                              <UploadCloud className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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
