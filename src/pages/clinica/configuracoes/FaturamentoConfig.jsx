import React, { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Plus, RefreshCw, Save } from 'lucide-react';
import PageLayout from '@/components/ui/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/ClinicContext';
import { listHealthInsurances } from '@/lib/healthInsurancesApi';
import { listBillingCalendars, saveBillingCalendar } from '@/lib/billingOperationsApi';

const emptyForm = {
  payer_id: '',
  competency_date: new Date().toISOString().slice(0, 7),
  production_cutoff_date: '',
  billing_close_date: '',
  submission_due_date: '',
  invoice_due_date: '',
  expected_payment_date: '',
  appeal_due_date: '',
  status: 'planned',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR');
}

export default function FaturamentoConfig() {
  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const [insurances, setInsurances] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const breadcrumbs = useBreadcrumbs([
    { label: 'Clínica', path: '/clinica' },
    { label: 'Configurações' },
    { label: 'Faturamento' },
  ]);

  const loadData = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [payerRows, calendarRows] = await Promise.all([
        listHealthInsurances(clinicId, { includeInactive: false }),
        listBillingCalendars(clinicId),
      ]);
      setInsurances(payerRows);
      setCalendars(calendarRows);
    } catch (error) {
      toast({
        title: 'Erro ao carregar parametrizações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const editCalendar = (calendar) => {
    setForm({
      id: calendar.id,
      payer_id: calendar.payer_id || '',
      competency_date: String(calendar.competency_date || '').slice(0, 7),
      production_cutoff_date: calendar.production_cutoff_date || '',
      billing_close_date: calendar.billing_close_date || '',
      submission_due_date: calendar.submission_due_date || '',
      invoice_due_date: calendar.invoice_due_date || '',
      expected_payment_date: calendar.expected_payment_date || '',
      appeal_due_date: calendar.appeal_due_date || '',
      status: calendar.status || 'planned',
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const payer = insurances.find((row) => row.id === form.payer_id);
    if (!payer || !form.competency_date || !form.billing_close_date) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe convênio, competência e fechamento.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await saveBillingCalendar(clinicId, {
        ...form,
        payer_name: payer.fantasy_name || payer.name,
        competency_date: `${form.competency_date}-01`,
      });
      toast({
        title: 'Calendário salvo',
        description: `${payer.fantasy_name || payer.name} · ${form.competency_date}`,
      });
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      toast({
        title: 'Erro ao salvar calendário',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Configurações de Faturamento"
      subtitle="Calendário contratual e prazos operacionais por convênio."
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Calendário de faturamento
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure corte da produção, fechamento, envio, nota fiscal, pagamento e recurso.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSave}>
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="payer">Convênio *</Label>
                <select
                  id="payer"
                  value={form.payer_id}
                  onChange={(event) => updateField('payer_id', event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione o convênio</option>
                  {insurances.map((payer) => (
                    <option key={payer.id} value={payer.id}>
                      {payer.fantasy_name || payer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="competency">Competência *</Label>
                <Input
                  id="competency"
                  type="month"
                  value={form.competency_date}
                  onChange={(event) => updateField('competency_date', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Situação</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="planned">Planejado</option>
                  <option value="open">Aberto</option>
                  <option value="closed">Fechado</option>
                  <option value="completed">Concluído</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cutoff">Corte da produção</Label>
                <Input
                  id="cutoff"
                  type="date"
                  value={form.production_cutoff_date}
                  onChange={(event) => updateField('production_cutoff_date', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="close">Fechamento *</Label>
                <Input
                  id="close"
                  type="date"
                  value={form.billing_close_date}
                  onChange={(event) => updateField('billing_close_date', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submission">Limite de envio</Label>
                <Input
                  id="submission"
                  type="date"
                  value={form.submission_due_date}
                  onChange={(event) => updateField('submission_due_date', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice">Nota fiscal</Label>
                <Input
                  id="invoice"
                  type="date"
                  value={form.invoice_due_date}
                  onChange={(event) => updateField('invoice_due_date', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment">Previsão de pagamento</Label>
                <Input
                  id="payment"
                  type="date"
                  value={form.expected_payment_date}
                  onChange={(event) => updateField('expected_payment_date', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appeal">Prazo de recurso</Label>
                <Input
                  id="appeal"
                  type="date"
                  value={form.appeal_due_date}
                  onChange={(event) => updateField('appeal_due_date', event.target.value)}
                />
              </div>
              <div className="flex items-end gap-2 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar calendário'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competências parametrizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Convênio</th>
                    <th className="px-3 py-2 text-left">Competência</th>
                    <th className="px-3 py-2 text-left">Fechamento</th>
                    <th className="px-3 py-2 text-left">Envio</th>
                    <th className="px-3 py-2 text-left">Pagamento</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {calendars.map((calendar) => (
                    <tr key={calendar.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{calendar.payer_name}</td>
                      <td className="px-3 py-2 font-mono">
                        {String(calendar.competency_date).slice(0, 7)}
                      </td>
                      <td className="px-3 py-2">{formatDate(calendar.billing_close_date)}</td>
                      <td className="px-3 py-2">{formatDate(calendar.submission_due_date)}</td>
                      <td className="px-3 py-2">{formatDate(calendar.expected_payment_date)}</td>
                      <td className="px-3 py-2 uppercase text-muted-foreground">
                        {calendar.status}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => editCalendar(calendar)}>
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!loading && calendars.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-3 py-8 text-center text-muted-foreground">
                        Nenhuma competência parametrizada.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan="7" className="px-3 py-8 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
