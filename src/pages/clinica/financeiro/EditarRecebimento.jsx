import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getReceivableById, updateReceivable, uploadReceivableNfFile, arStatusOptions } from '@/lib/receivablesApi';
import { listRevenueAccountPlans, listCostCenters } from '@/lib/financeApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listPayers } from '@/lib/payersApi';
import { listCardProcessors } from '@/lib/cardProcessorsApi';
import { calculateProcessingFee } from '@/lib/processingFeeCalculator';
import { buildReceivableDocumentExtractionMetadata, extractReceivableDocument, inferReceivableInvoiceNumberFromFileName } from '@/lib/receivableDocumentExtractor';
import { invalidateDashboardDataCache } from '@/services/dashboardDataService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import ReceivableNfInput from '@/components/financeiro/ReceivableNfInput';
import {
  displayDateToIso,
  findProfessionalIdByDocumentName,
  isCardPaymentMethod,
  isoToDisplayDate,
  maskDisplayDate,
  mergeDocumentNotes,
  paymentMethodOptions,
} from '@/lib/receivableUiHelpers';
import { AlertCircle, PlusCircle, Save } from 'lucide-react';

function FormSection({ title, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-3 p-4">
      {children}
      </div>
    </section>
  );
}

function buildExtractionFormUpdates(fields = {}, professionals = []) {
  const updates = {};
  if (fields.payer_name) updates.patient_name = fields.payer_name;
  if (fields.description) updates.description = fields.description;
  if (fields.amount) updates.amount = fields.amount;
  if (fields.invoice_date) updates.invoice_date = fields.invoice_date;
  if (fields.due_date) updates.due_date = fields.due_date;
  if (fields.competency_date) updates.competency_date = fields.competency_date;
  if (fields.payment_method) updates.payment_method = fields.payment_method;
  if (fields.payment_date) updates.received_date = fields.payment_date;
  if (fields.guide_number) updates.guide_number = fields.guide_number;
  if (fields.invoice_number || fields.guide_number) updates.insurance_invoice_number = fields.invoice_number || fields.guide_number;
  if (fields.doctor_name) {
    const professionalId = findProfessionalIdByDocumentName(professionals, fields.doctor_name);
    if (professionalId) updates.profissional_id = professionalId;
  }
  return updates;
}

function mergeMissingExtractionFields(current = {}, updates = {}) {
  return Object.fromEntries(
    Object.entries(updates).filter(([key, value]) => value && !current[key]),
  );
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function getSafeInternalReturnPath(value) {
  if (!value || !value.startsWith('/clinica/')) return '';
  if (value.startsWith('//')) return '';
  return value;
}

function cleanBrokenText(value) {
  if (typeof value !== 'string' || !value.includes('�')) return value;
  return value
    .replace(/FUNDA�+O/gi, 'FUNDACAO')
    .replace(/PRODU�+O/gi, 'PRODUCAO')
    .replace(/OP�+O/gi, 'OPCAO')
    .replace(/SERVI�+OS?/gi, 'SERVICOS')
    .replace(/M�DICOS?/gi, 'MEDICOS')
    .replace(/PEDI�TRICO/gi, 'PEDIATRICO')
    .replace(/S�O/gi, 'SAO')
    .replace(/N�/gi, 'Nº')
    .replace(/�+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanBrokenTextDeep(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanBrokenTextDeep(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanBrokenTextDeep(item)]));
  }
  return cleanBrokenText(value);
}

export default function EditarRecebimento() {
  const { clinicId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const returnTo = getSafeInternalReturnPath(searchParams.get('returnTo'));
  const goBack = () => {
    if (returnTo) {
      navigate(returnTo, { replace: true });
      return;
    }
    navigate(-1);
  };
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cardProcessors, setCardProcessors] = useState([]);
  const [cardFeeCalc, setCardFeeCalc] = useState(null);
  const [nfFile, setNfFile] = useState(null);
  const [documentExtraction, setDocumentExtraction] = useState(null);

  useEffect(() => {
    if (!clinicId || !id) {
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const [rec, ps, cs, professionalsData, payersData, processorsData] = await Promise.all([
          getReceivableById(id, clinicId),
          listRevenueAccountPlans(clinicId),
          listCostCenters(clinicId),
          listProfessionals(clinicId),
          listPayers(clinicId),
          listCardProcessors(clinicId),
        ]);

        const metadataExtraction = rec.metadata?.document_extraction || null;
        const extractionFields = metadataExtraction?.fields || {};
        const metadataText = JSON.stringify(rec.metadata || {});
        const inferredInvoiceNumber = rec.insurance_invoice_number
          || extractionFields.invoice_number
          || extractionFields.guide_number
          || inferReceivableInvoiceNumberFromFileName(rec.nf_document_name)
          || inferReceivableInvoiceNumberFromFileName(rec.metadata?.source_file_name)
          || inferReceivableInvoiceNumberFromFileName(rec.nf_document_url)
          || inferReceivableInvoiceNumberFromFileName(metadataText);
        const baseData = {
          ...rec,
          origem: rec.origem || rec.origin || 'Manual',
          payer_type: rec.payer_type || 'manual',
          profissional_id: rec.professional_id || rec.profissional_id || '',
          centro_custo_id: rec.centro_custo_id || rec.cost_center_id || '',
          total_parcelas: rec.total_parcelas || '',
          parcelado: !!rec.total_parcelas && Number(rec.total_parcelas) > 1,
          is_card_payment: isCardPaymentMethod(rec.payment_method) || !!rec.processor_id,
          card_brand: rec.card_brand || 'Visa',
          settlement_type: rec.settlement_type || 'D+1',
          competency_date: rec.competency_date || rec.invoice_date || rec.due_date || '',
          guide_number: rec.guide_number || '',
          insurance_invoice_number: inferredInvoiceNumber || '',
          batch_number: rec.batch_number || '',
          procedure_name: rec.procedure_name || rec.service_description || '',
          specialty_name: rec.specialty_name || '',
          unit_name: rec.unit_name || '',
        };
        setDocumentExtraction(metadataExtraction);
        setData(cleanBrokenTextDeep({
          ...baseData,
          ...mergeMissingExtractionFields(baseData, buildExtractionFormUpdates(extractionFields, professionalsData || [])),
          is_card_payment: isCardPaymentMethod(baseData.payment_method || extractionFields.payment_method) || !!baseData.processor_id,
          notes: mergeDocumentNotes(baseData.notes, extractionFields),
        }));
        setPlans(cleanBrokenTextDeep(ps || []));
        setCostCenters(cleanBrokenTextDeep(cs || []));
        setProfessionals(cleanBrokenTextDeep(professionalsData || []));
        setConvenios(cleanBrokenTextDeep(payersData || []));
        setEmpresas([]);
        setCardProcessors(processorsData || []);
      } catch (e) {
        setError(e?.message || 'Erro ao carregar recebível');
      } finally {
        setLoading(false);
      }
    })();
  }, [clinicId, id]);

  useEffect(() => {
    if (!data?.is_card_payment || !data?.processor_id || !data?.amount) {
      setCardFeeCalc(null);
      return;
    }

    (async () => {
      try {
        const feeData = await calculateProcessingFee({
          clinicId,
          processorId: data.processor_id,
          cardBrand: data.card_brand || 'Visa',
          settlementType: data.settlement_type || 'D+1',
          grossAmount: parseFloat(data.amount) || 0,
        });
        setCardFeeCalc(feeData);
      } catch (e) {
        console.error('Erro ao calcular taxa do cartão:', e);
        setCardFeeCalc(null);
      }
    })();
  }, [clinicId, data?.is_card_payment, data?.processor_id, data?.card_brand, data?.settlement_type, data?.amount]);

  const handleChange = (field, value) => {
    setData((current) => ({ ...current, [field]: cleanBrokenText(value) }));
  };

  const getDateInputValue = (field) => {
    const value = data?.[field];
    if (!value) {
      return '';
    }
    return String(value).includes('-') ? isoToDisplayDate(value) : value;
  };

  const handleDateChange = (field, value) => {
    const masked = maskDisplayDate(value);
    const iso = displayDateToIso(masked);
    handleChange(field, iso || masked);
  };

  const handleNfFileSelected = async (file) => {
    setNfFile(file);
    setDocumentExtraction(null);
    if (!file) {
      return;
    }
    try {
      const extraction = await extractReceivableDocument(file);
      setDocumentExtraction(extraction);
      const fields = {
        ...(extraction?.fields || {}),
        invoice_number: extraction?.fields?.invoice_number || inferReceivableInvoiceNumberFromFileName(file.name),
      };
      const updates = buildExtractionFormUpdates(fields, professionals);
      if (Object.keys(updates).length) {
        setData((current) => ({
          ...current,
          ...updates,
          is_card_payment: updates.payment_method ? isCardPaymentMethod(updates.payment_method) : current.is_card_payment,
          notes: mergeDocumentNotes(current.notes, fields),
        }));
        toast({ title: 'Documento lido', description: 'Campos financeiros preenchidos para revisão.' });
      } else if (extraction?.warnings?.length) {
        toast({ title: 'Documento anexado', description: extraction.warnings[0] });
      }
    } catch (e) {
      setDocumentExtraction({ confidence: 'erro', fields: {}, warnings: [e?.message || 'Nao foi possivel ler o documento.'] });
      toast({ variant: 'destructive', title: 'Erro ao ler documento', description: e?.message });
    }
  };

  const amount = Number(data?.amount || 0);
  const discount = Number(data?.discount_value || 0);
  const cardFee = data?.is_card_payment
    ? Number(cardFeeCalc?.feeAmount ?? data?.fee_amount ?? (amount * 0.03))
    : 0;
  const netValue = useMemo(() => Math.max(0, amount - discount - cardFee), [amount, discount, cardFee]);
  const isReceived = data?.status === 'received';

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const dueDate = displayDateToIso(getDateInputValue('due_date'));
      const invoiceDate = displayDateToIso(getDateInputValue('invoice_date'));
      const competencyDate = displayDateToIso(getDateInputValue('competency_date'));
      if (!dueDate) {
        throw new Error('Informe o vencimento no formato dd/mm/aaaa');
      }
      if (getDateInputValue('invoice_date') && !invoiceDate) {
        throw new Error('Informe a emissão no formato dd/mm/aaaa');
      }
      if (getDateInputValue('competency_date') && !competencyDate) {
        throw new Error('Informe a competência no formato dd/mm/aaaa');
      }
      if (data.status === 'received' && getDateInputValue('received_date') && !displayDateToIso(getDateInputValue('received_date'))) {
        throw new Error('Informe o pagamento no formato dd/mm/aaaa');
      }
      if (Number(data.amount || 0) <= 0) {
        throw new Error('Valor bruto deve ser maior que zero');
      }
      let nfPayload = {};
      let uploadWarning = '';
      const isSameAttachedFile = nfFile && data.nf_document_url && nfFile.name === data.nf_document_name;
      if (nfFile && !isSameAttachedFile) {
        try {
          const uploadedNf = await withTimeout(
            uploadReceivableNfFile(clinicId, nfFile),
            12000,
            'Upload da NF demorou demais. Os dados serão salvos sem reenviar o anexo.',
          );
          nfPayload = {
            nf_document_url: uploadedNf?.url,
            nf_document_name: uploadedNf?.name || nfFile.name,
          };
        } catch (uploadError) {
          uploadWarning = uploadError?.message || 'Nao foi possivel anexar a NF agora.';
        }
      }

      const payerId = data.payer_type === 'convenio'
        ? data.payer_id || data.convenio_id || null
        : data.payer_type === 'empresa'
          ? data.payer_id || data.empresa_id || null
          : null;

      await withTimeout(updateReceivable(id, {
        origem: data.origem || 'Manual',
        patient_name: data.patient_name || null,
        patient_id: data.payer_type === 'paciente' ? data.patient_id || null : null,
        description: data.description,
        service_description: data.description,
        amount: Number(data.amount || 0),
        service_value: Number(data.amount || 0),
        discount_value: Number(data.discount_value || 0),
        net_value: netValue,
        received_value: data.status === 'received' ? netValue : Number(data.received_value || 0),
        received_date: data.status === 'received'
          ? displayDateToIso(getDateInputValue('received_date')) || new Date().toISOString().slice(0, 10)
          : null,
        status: data.status,
        payment_method: data.payment_method || null,
        chart_account_id: data.chart_account_id || data.plano_contas_id || null,
        centro_custo_id: data.centro_custo_id || null,
        professional_id: data.profissional_id || data.professional_id || null,
        payer_type: data.payer_type || null,
        payer_id: payerId,
        invoice_date: invoiceDate || null,
        competency_date: competencyDate || invoiceDate || dueDate,
        due_date: dueDate,
        guide_number: data.guide_number || null,
        batch_number: data.batch_number || null,
        procedure_name: data.procedure_name || null,
        specialty_name: data.specialty_name || null,
        unit_name: data.unit_name || null,
        notes: data.notes || null,
        ans_registration: data.ans_registration || null,
        insurance_invoice_number: data.insurance_invoice_number || null,
        insurance_billing_status: data.insurance_billing_status || null,
        tiss_xml_status: data.tiss_xml_status || null,
        insurance_return_status: data.insurance_return_status || null,
        insurance_return_protocol: data.insurance_return_protocol || null,
        insurance_return_date: displayDateToIso(getDateInputValue('insurance_return_date')) || null,
        processor_id: data.is_card_payment ? data.processor_id || null : null,
        card_brand: data.is_card_payment ? data.card_brand || null : null,
        settlement_type: data.is_card_payment ? data.settlement_type || null : null,
        fee_percent: data.is_card_payment ? cardFeeCalc?.feePercent ?? data.fee_percent ?? null : null,
        fee_amount: data.is_card_payment ? cardFee : 0,
        taxes_value: documentExtraction?.fields?.taxes_value ?? data.taxes_value ?? 0,
        metadata: {
          ...(data.metadata || {}),
          document_extraction: {
            ...(documentExtraction
              ? buildReceivableDocumentExtractionMetadata(documentExtraction)
              : data.metadata?.document_extraction || {}),
            fields: {
              ...((documentExtraction
                ? buildReceivableDocumentExtractionMetadata(documentExtraction)
                : data.metadata?.document_extraction || {})?.fields || {}),
              invoice_number: data.insurance_invoice_number || data.metadata?.document_extraction?.fields?.invoice_number || null,
            },
          },
        },
        total_parcelas: data.parcelado ? Number(data.total_parcelas || 1) : null,
        ...nfPayload,
      }, clinicId), 25000, 'Salvamento demorou demais. Verifique sua conexão e tente novamente.');
      invalidateDashboardDataCache(clinicId);
      toast({
        title: 'Recebimento atualizado',
        description: uploadWarning || (data.is_card_payment && !data.processor_id ? 'Taxa de cartão estimada por ausência de operadora selecionada.' : undefined),
      });
      goBack();
    } catch (e) {
      setError(e?.message || 'Erro ao salvar alterações');
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Editar Recebimento">
        <div>Carregando...</div>
      </PageLayout>
    );
  }
  if (error && !data) {
    return (
      <PageLayout title="Editar Recebimento">
        <Card className="max-w-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recebimento nao encontrado</h2>
                <p className="text-sm text-slate-600">
                  Este lancamento pode ter sido excluido, cancelado ou nao pertencer a clinica atual.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={goBack}>
                Voltar para Contas a Receber
              </Button>
            </div>
          </div>
        </Card>
      </PageLayout>
    );
  }
  if (!data) {
    return null;
  }

  return (
    <PageLayout title="Editar Recebimento" subtitle="Atualize os dados do titulo mantendo a rastreabilidade financeira.">
      <div className="w-full mx-auto space-y-4">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Dados do titulo</p>
                <p className="text-xs text-slate-500">Revise informacoes, valores, documentos e classificacao financeira.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4 sm:text-left">
                <div className="rounded border bg-white px-3 py-2">
                  <p className="text-slate-500">Pagador</p>
                  <p className="truncate font-semibold text-slate-900">{data.patient_name || 'Nao informado'}</p>
                </div>
                <div className="rounded border bg-white px-3 py-2">
                  <p className="text-slate-500">Status</p>
                  <p className="font-semibold text-slate-900">{arStatusOptions.find((option) => option.value === data.status)?.label || data.status || 'Em aberto'}</p>
                </div>
                <div className="rounded border bg-white px-3 py-2">
                  <p className="text-slate-500">Vencimento</p>
                  <p className="font-semibold text-slate-900">{getDateInputValue('due_date') || 'Nao definido'}</p>
                </div>
                <div className="rounded border bg-white px-3 py-2">
                  <p className="text-slate-500">Saldo</p>
                  <p className="font-semibold text-slate-900">{(netValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
          {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <FormSection title="Dados do lançamento">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Origem</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.origem || 'Manual'} onChange={(e) => handleChange('origem', e.target.value)}>
                <option>Manual</option>
                <option>Agenda</option>
                <option>Faturamento</option>
                <option>Contrato</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.status || 'open'} onChange={(e) => handleChange('status', e.target.value)}>
                {arStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Forma prevista</Label>
              <select
                className="w-full border rounded h-9 px-2 text-sm"
                value={data.payment_method || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setData((current) => ({ ...current, payment_method: value, is_card_payment: isCardPaymentMethod(value) }));
                }}
              >
                <option value="">Selecione</option>
                {paymentMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Pagador</Label>
              {data.payer_type === 'convenio' && convenios.length > 0 ? (
                <select
                  className="w-full border rounded h-9 px-2 text-sm"
                  value={data.payer_id || data.convenio_id || ''}
                  onChange={(e) => {
                    const item = convenios.find((payer) => String(payer.id) === String(e.target.value));
                    setData((current) => ({
                      ...current,
                      payer_id: e.target.value || null,
                      convenio_id: e.target.value || null,
                      patient_name: item?.name || current.patient_name,
                    }));
                  }}
                >
                  <option value="">Selecione um convênio</option>
                  {convenios.map((payer) => (
                    <option key={payer.id} value={payer.id}>{payer.name}</option>
                  ))}
                </select>
              ) : data.payer_type === 'empresa' && empresas.length > 0 ? (
                <select className="w-full border rounded h-9 px-2 text-sm" value={data.empresa_id || ''} onChange={(e) => handleChange('empresa_id', e.target.value)}>
                  <option value="">Selecione uma empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.name}</option>
                  ))}
                </select>
              ) : (
                <Input value={data.patient_name || ''} onChange={(e) => handleChange('patient_name', e.target.value)} placeholder="Paciente / Convênio / Empresa" />
              )}
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={data.description || ''} onChange={(e) => handleChange('description', e.target.value)} placeholder="Serviço/Contrato" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Tipo de Pagador</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.payer_type || 'manual'} onChange={(e) => handleChange('payer_type', e.target.value)}>
                <option value="manual">Manual</option>
                <option value="paciente">Paciente</option>
                <option value="convenio">Convênio</option>
                <option value="empresa" disabled={!empresas.length}>Empresa</option>
              </select>
            </div>
            <div>
              <Label>Profissional (repasse)</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.profissional_id || data.professional_id || ''} onChange={(e) => handleChange('profissional_id', e.target.value)}>
                <option value="">-</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>{professional.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Plano de Contas</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.chart_account_id || data.plano_contas_id || ''} onChange={(e) => handleChange('chart_account_id', e.target.value)}>
                <option value="">Selecione uma receita</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.code ? `${plan.code} - ${plan.name}` : plan.name}</option>
                ))}
              </select>
            </div>
          </div>
          </FormSection>

          <FormSection title="Classificação financeira">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Centro de Custo</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.centro_custo_id || ''} onChange={(e) => handleChange('centro_custo_id', e.target.value)}>
                <option value="">Selecione</option>
                {costCenters.map((costCenter) => (
                  <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Competência</Label>
              <Input value={getDateInputValue('competency_date')} onChange={(e) => handleDateChange('competency_date', e.target.value)} placeholder="dd/mm/aaaa" inputMode="numeric" />
            </div>
            <div>
              <Label>Unidade</Label>
              <Input value={data.unit_name || ''} onChange={(e) => handleChange('unit_name', e.target.value)} placeholder="Unidade / filial" />
            </div>
          </div>
          </FormSection>

          <FormSection title="Valores e datas">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Valor bruto (R$)</Label>
              <Input type="number" step="0.01" value={data.amount || ''} onChange={(e) => handleChange('amount', e.target.value)} />
            </div>
            <div>
              <Label>Descontos (R$)</Label>
              <Input type="number" step="0.01" value={data.discount_value || ''} onChange={(e) => handleChange('discount_value', e.target.value)} />
            </div>
            <div>
              <Label>Valor líquido</Label>
              <div className="h-9 flex items-center px-2 border rounded bg-gray-50 font-semibold">
                {netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          </div>

          {data.is_card_payment && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">Configurar Taxa de Processamento</p>
                  <p className="text-xs text-blue-700 mt-1">Selecione a operadora e forma de recebimento para recalcular a taxa.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Operadora</Label>
                  <select className="w-full border rounded h-9 px-2 text-sm" value={data.processor_id || ''} onChange={(e) => handleChange('processor_id', e.target.value)}>
                    <option value="">Selecione uma operadora</option>
                    {cardProcessors.map((processor) => (
                      <option key={processor.id} value={processor.id}>{processor.name}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full gap-2 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                    onClick={() => navigate('/clinica/financeiro/cartoes-operadoras')}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Cadastrar/gerenciar operadoras
                  </Button>
                </div>
                <div>
                  <Label>Bandeira</Label>
                  <select className="w-full border rounded h-9 px-2 text-sm" value={data.card_brand || 'Visa'} onChange={(e) => handleChange('card_brand', e.target.value)}>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Elo">Elo</option>
                    <option value="Amex">Amex</option>
                    <option value="Hipercard">Hipercard</option>
                    <option value="Discover">Discover</option>
                  </select>
                </div>
                <div>
                  <Label>Forma de Recebimento</Label>
                  <select className="w-full border rounded h-9 px-2 text-sm" value={data.settlement_type || 'D+1'} onChange={(e) => handleChange('settlement_type', e.target.value)}>
                    <option value="D+0">D+0 (Hoje)</option>
                    <option value="D+1">D+1 (1 dia)</option>
                    <option value="D+30">D+30 (30 dias)</option>
                    <option value="Payment Day">Payment Day (Agendado)</option>
                  </select>
                </div>
              </div>

              {(cardFeeCalc || data.fee_amount) && (
                <div className="bg-white border border-blue-300 rounded p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-600">Taxa</p>
                      <p className="text-lg font-bold text-blue-600">{cardFeeCalc?.feePercent ?? data.fee_percent ?? 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Desconto</p>
                      <p className="font-semibold text-slate-900">{(cardFee || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Recebimento Líquido</p>
                      <p className="text-lg font-bold text-green-600">{(netValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded border bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Receita DRE</p>
              <p className="font-semibold text-slate-900">{(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Descontos e taxas</p>
              <p className="font-semibold text-slate-900">{(discount + cardFee).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Líquido previsto</p>
              <p className="font-semibold text-slate-900">{netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fluxo de caixa</p>
              <p className="font-semibold text-slate-900">{isReceived ? 'Entrada realizada' : 'A receber'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Emissão</Label>
              <Input value={getDateInputValue('invoice_date')} onChange={(e) => handleDateChange('invoice_date', e.target.value)} placeholder="dd/mm/aaaa" inputMode="numeric" />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input value={getDateInputValue('due_date')} onChange={(e) => handleDateChange('due_date', e.target.value)} placeholder="dd/mm/aaaa" inputMode="numeric" />
            </div>
            <div>
              <Label>Pagamento</Label>
              <Input value={getDateInputValue('received_date')} onChange={(e) => handleDateChange('received_date', e.target.value)} placeholder="dd/mm/aaaa" inputMode="numeric" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="parcelado" type="checkbox" checked={!!data.parcelado} onChange={(e) => handleChange('parcelado', e.target.checked)} />
              <Label htmlFor="parcelado">Parcelado</Label>
              {data.parcelado && (
                <Input className="ml-2 w-24" placeholder="Parcelas" value={data.total_parcelas || ''} onChange={(e) => handleChange('total_parcelas', e.target.value)} />
              )}
            </div>
          </div>
          </FormSection>

          <FormSection title="Rastreabilidade e anexos">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Procedimento</Label>
              <Input value={data.procedure_name || ''} onChange={(e) => handleChange('procedure_name', e.target.value)} placeholder="Procedimento/serviço" />
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input value={data.specialty_name || ''} onChange={(e) => handleChange('specialty_name', e.target.value)} placeholder="Especialidade" />
            </div>
            <div>
              <Label>Guia</Label>
              <Input value={data.guide_number || ''} onChange={(e) => handleChange('guide_number', e.target.value)} placeholder="Nº guia/autorização" />
            </div>
            <div>
              <Label>Lote</Label>
              <Input value={data.batch_number || ''} onChange={(e) => handleChange('batch_number', e.target.value)} placeholder="Lote de faturamento" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded border bg-slate-50 p-3">
            <div>
              <Label>ANS</Label>
              <Input value={data.ans_registration || ''} onChange={(e) => handleChange('ans_registration', e.target.value)} placeholder="Registro ANS" />
            </div>
            <div>
              <Label>NF / fatura convênio</Label>
              <Input value={data.insurance_invoice_number || ''} onChange={(e) => handleChange('insurance_invoice_number', e.target.value)} placeholder="Nº NF/fatura" />
            </div>
            <div>
              <Label>Status convênio</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.insurance_billing_status || ''} onChange={(e) => handleChange('insurance_billing_status', e.target.value)}>
                <option value="">Selecione</option>
                <option value="gerada">Gerada</option>
                <option value="enviada">Enviada</option>
                <option value="processada">Processada</option>
                <option value="paga">Paga</option>
                <option value="glosada">Glosada</option>
              </select>
            </div>
            <div>
              <Label>Status XML TISS</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.tiss_xml_status || ''} onChange={(e) => handleChange('tiss_xml_status', e.target.value)}>
                <option value="">Selecione</option>
                <option value="pendente">Pendente</option>
                <option value="gerado">Gerado</option>
                <option value="enviado">Enviado</option>
                <option value="processando">Processando</option>
                <option value="aceito">Aceito</option>
                <option value="rejeitado">Rejeitado</option>
              </select>
            </div>
            <div>
              <Label>Retorno convênio</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.insurance_return_status || ''} onChange={(e) => handleChange('insurance_return_status', e.target.value)}>
                <option value="">Selecione</option>
                <option value="aguardando">Aguardando</option>
                <option value="recebido">Recebido</option>
                <option value="processado">Processado</option>
                <option value="com_glosa">Com glosa</option>
                <option value="rejeitado">Rejeitado</option>
              </select>
            </div>
            <div>
              <Label>Protocolo retorno</Label>
              <Input value={data.insurance_return_protocol || ''} onChange={(e) => handleChange('insurance_return_protocol', e.target.value)} placeholder="Recibo/protocolo" />
            </div>
            <div>
              <Label>Data retorno</Label>
              <Input value={getDateInputValue('insurance_return_date')} onChange={(e) => handleDateChange('insurance_return_date', e.target.value)} placeholder="dd/mm/aaaa" inputMode="numeric" />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <textarea
              className="min-h-[72px] w-full rounded border px-3 py-2 text-sm"
              value={data.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Observações financeiras, operacionais ou de auditoria"
            />
          </div>

          <ReceivableNfInput
            selectedFile={nfFile}
            onFileSelected={handleNfFileSelected}
            currentUrl={data.nf_document_url}
            currentName={data.nf_document_name}
            label="NF anexada"
          />
          {documentExtraction && (
            <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Leitura: {documentExtraction.confidence}. Campos encontrados: {Object.values(documentExtraction.fields || {}).filter(Boolean).length}.
              {documentExtraction.warnings?.[0] ? ` ${documentExtraction.warnings[0]}` : ''}
            </div>
          )}
          </FormSection>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Button variant="outline" onClick={goBack}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 text-white">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}