import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getReceivableById, listReceivables, updateReceivable, uploadReceivableNfFile, arStatusOptions } from '@/lib/receivablesApi';
import { listRevenueAccountPlans, listCostCenters } from '@/lib/financeApi';
import { listFinancialPlanAccounts } from '@/modules/financeiro/plano-financeiro/services/financialPlanApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listPayers } from '@/lib/payersApi';
import { listCardProcessors } from '@/lib/cardProcessorsApi';
import { listServices } from '@/lib/servicesApi';
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

function pickText(...values) {
  return values.find((value) => {
    if (value === null || value === undefined) {
      return false;
    }
    return String(value).trim() !== '';
  }) || '';
}

function normalizePaymentMethodForForm(value) {
  if (!value) {
    return '';
  }
  const normalize = (text) => String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedValue = normalize(value);
  return paymentMethodOptions.find((option) => {
    const normalizedOptionValue = normalize(option.value);
    const normalizedOptionLabel = normalize(option.label);
    return normalizedOptionValue === normalizedValue || normalizedOptionLabel === normalizedValue;
  })?.value || value;
}

function normalizePayerTypeForForm(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (['paciente', 'patient', 'particular'].includes(normalized)) return 'paciente';
  if (['convenio', 'insurance', 'health_insurance', 'plano'].includes(normalized)) return 'convenio';
  if (['empresa', 'company', 'corporativo'].includes(normalized)) return 'empresa';
  return normalized || 'manual';
}

function normalizePaymentBreakdownItem(item = {}, fallbackDate = '') {
  const method = normalizePaymentMethodForForm(item.method || item.payment_method || item.paymentMethod || '');
  const amount = Number(item.amount ?? item.value ?? item.valor ?? 0);
  const installments = item.installments || item.parcelas || item.total_parcelas || '';
  const installmentDates = item.installment_dates || item.card_installment_dates || '';
  return {
    method,
    amount,
    reference: item.reference || item.pix_transaction_id || item.cheque_number || item.boleto_number || '',
    installments,
    installmentDates: Array.isArray(installmentDates) ? installmentDates : String(installmentDates || '').split('|').filter(Boolean),
    dueDate: item.payment_due_date || item.cheque_due_date || item.payment_date || fallbackDate || '',
    cardBrand: item.card_brand || '',
    observation: item.observation || item.notes || '',
  };
}

function normalizePaymentBreakdownRows(rows) {
  if (!rows) return [];
  if (Array.isArray(rows)) return rows;
  try {
    const parsed = JSON.parse(rows);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function getPaymentBreakdown(data = {}) {
  const receivable = data || {};
  const appointment = Array.isArray(receivable.appointments) ? receivable.appointments[0] : receivable.appointments;
  const metadata = receivable.metadata || {};
  const paymentData = metadata.payment_data || {};
  const receivableSplit = normalizePaymentBreakdownRows(receivable.payment_split);
  const lastPaymentMethods = normalizePaymentBreakdownRows(metadata.last_payment?.methods);
  const paymentDataSplits = normalizePaymentBreakdownRows(paymentData.payment_splits);
  const appointmentSplits = normalizePaymentBreakdownRows(appointment?.payment_splits);
  const rawItems = receivableSplit.length > 0
    ? receivableSplit
    : lastPaymentMethods.length > 0
      ? lastPaymentMethods
      : paymentDataSplits.length > 0
        ? paymentDataSplits
        : appointmentSplits.length > 0
          ? appointmentSplits
        : [];

  return rawItems
    .map((item) => normalizePaymentBreakdownItem(item, receivable.received_date || metadata.last_payment?.payment_date))
    .filter((item) => item.method || item.amount > 0);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPaymentDate(value) {
  return isoToDisplayDate(value) || value || '';
}

function buildReceivableBreadcrumbLabel(receivable = {}) {
  const safeReceivable = receivable || {};
  const label = pickText(
    safeReceivable.patient_name,
    safeReceivable.payer_name,
    safeReceivable.payer_display,
    safeReceivable.procedure_name,
    safeReceivable.service_description,
    safeReceivable.description,
  );

  if (!label || label === 'Recebimento registrado pela agenda') {
    return 'Recebimento';
  }

  return label.length > 42 ? `${label.slice(0, 39)}...` : label;
}

function getReceivableAppointment(receivable = {}) {
  return Array.isArray(receivable.appointments) ? receivable.appointments[0] : receivable.appointments;
}

function getReceivableAppointmentId(receivable = {}) {
  const safeReceivable = receivable || {};
  const metadata = safeReceivable.metadata || {};
  return safeReceivable.appointment_id
    || safeReceivable.agendamento_id
    || getReceivableAppointment(safeReceivable)?.id
    || metadata.appointment_id
    || metadata.agendamento_id
    || metadata.appointment?.id
    || metadata.payment_data?.appointment_id
    || metadata.last_payment?.appointment_id
    || null;
}

function getReceivableAppointmentDate(receivable = {}) {
  const safeReceivable = receivable || {};
  const appointment = getReceivableAppointment(safeReceivable) || {};
  const metadata = safeReceivable.metadata || {};
  const paymentData = metadata.payment_data || {};
  const appointmentData = metadata.appointment || paymentData.appointment || {};
  return pickText(
    appointment.scheduled_date,
    appointmentData.scheduledDate,
    appointmentData.scheduled_date,
    paymentData.scheduledDate,
    paymentData.scheduled_date,
    safeReceivable.due_date,
    safeReceivable.invoice_date,
    safeReceivable.competency_date,
  ).split('T')[0];
}

function buildReceivableOriginPath(receivable = {}) {
  const safeReceivable = receivable || {};
  const appointmentId = getReceivableAppointmentId(safeReceivable);
  const isAgendaReceivable = Boolean(
    appointmentId
    || safeReceivable.origem === 'Agenda'
    || safeReceivable.origin === 'Agenda'
    || safeReceivable.metadata?.source === 'payment_registration_api',
  );

  if (!isAgendaReceivable || !appointmentId) {
    return undefined;
  }

  const appointmentDate = getReceivableAppointmentDate(safeReceivable);
  const params = new URLSearchParams({ appointmentId, mode: 'edit', appointmentTab: 'resumo' });
  if (appointmentDate) {
    params.set('appointmentDate', appointmentDate);
  }
  return `/clinica/agenda?${params.toString()}`;
}

function getServiceCategoryLabel(service = {}) {
  if (!service) {
    return '';
  }
  const labels = {
    consultation: 'Consultas',
    exam: 'Exames',
    procedure: 'Procedimentos',
    surgery: 'Cirurgias',
    other: 'Outros',
  };
  return labels[service.service_category] || '';
}

function getStoredClinicId() {
  try {
    return JSON.parse(localStorage.getItem('gesclinic_session') || '{}')?.clinic_id || null;
  } catch {
    return null;
  }
}

function isMissingReceivableText(value) {
  const text = String(value || '').trim().toLowerCase();
  return !text
    || text === 'não informado'
    || text === 'nao informado'
    || text === 'não identificado'
    || text === 'nao identificado'
    || text === 'recebimento registrado pela agenda';
}

function mergeEditableReceivable(base = {}, enriched = {}) {
  if (!enriched) return base;

  const merged = { ...base };
  const textFields = [
    'payer_display',
    'patient_name',
    'payer_name',
    'description',
    'service_description',
    'procedure_name',
    'professional_name',
    'profissional_name',
    'unit_name',
    'unidade_name',
    'specialty_name',
    'service_group',
    'registered_service_name',
    'registered_service_group',
    'convenio_name',
    'plano_contas_name',
  ];
  const idFields = [
    'appointment_id',
    'patient_id',
    'payer_id',
    'professional_id',
    'profissional_id',
    'procedure_id',
    'unit_id',
    'room_id',
    'specialty_id',
    'chart_account_id',
    'plano_contas_id',
    'financial_plan_account_id',
    'centro_custo_id',
    'cost_center_id',
  ];

  textFields.forEach((field) => {
    if (isMissingReceivableText(merged[field]) && !isMissingReceivableText(enriched[field])) {
      merged[field] = enriched[field];
    }
  });

  idFields.forEach((field) => {
    if (!merged[field] && enriched[field]) {
      merged[field] = enriched[field];
    }
  });

  if (isMissingReceivableText(merged.description) && !isMissingReceivableText(merged.service_description)) {
    merged.description = merged.service_description;
  }
  if (isMissingReceivableText(merged.patient_name) && !isMissingReceivableText(merged.payer_display)) {
    merged.patient_name = merged.payer_display;
    merged.payer_name = merged.payer_display;
  }
  if (!merged.profissional_id && merged.professional_id) {
    merged.profissional_id = merged.professional_id;
  }
  if (!merged.professional_id && merged.profissional_id) {
    merged.professional_id = merged.profissional_id;
  }

  return merged;
}

async function getEditableReceivableById(id, clinicId) {
  const clinicIds = Array.from(new Set([clinicId, getStoredClinicId()].filter(Boolean)));
  let lastError = null;

  for (const currentClinicId of clinicIds) {
    try {
      const detail = await getReceivableById(id, currentClinicId);
      const rows = await listReceivables({ clinicId: currentClinicId, limit: 20000, offset: 0 });
      const enriched = (rows || []).find((row) => row.id === id || row.appointment_id === id || row.id === detail?.id || row.appointment_id === detail?.appointment_id);
      return mergeEditableReceivable(detail, enriched);
    } catch (error) {
      lastError = error;
      const rows = await listReceivables({ clinicId: currentClinicId, limit: 20000, offset: 0 });
      const found = (rows || []).find((row) => row.id === id || row.appointment_id === id);
      if (found) {
        return found;
      }
    }
  }

  try {
    return await getReceivableById(id);
  } catch (error) {
    throw lastError || error;
  }
}

export default function EditarRecebimento() {
  const { clinicId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const returnTo = getSafeInternalReturnPath(searchParams.get('returnTo'));
  const backLabel = returnTo?.startsWith('/clinica/financeiro/resultado') ? 'Voltar para DRE' : 'Voltar para Contas a Receber';
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
  const [financialPlanAccounts, setFinancialPlanAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [services, setServices] = useState([]);
  const [cardProcessors, setCardProcessors] = useState([]);
  const [cardFeeCalc, setCardFeeCalc] = useState(null);
  const [nfFile, setNfFile] = useState(null);
  const [documentExtraction, setDocumentExtraction] = useState(null);

  useEffect(() => {
    const activeClinicId = clinicId || getStoredClinicId();
    if (!activeClinicId || !id) {
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const [rec, ps, cs, financialPlanRows, professionalsData, payersData, processorsData, servicesData] = await Promise.all([
          getEditableReceivableById(id, activeClinicId),
          listRevenueAccountPlans(activeClinicId),
          listCostCenters(activeClinicId),
          listFinancialPlanAccounts(activeClinicId),
          listProfessionals(activeClinicId),
          listPayers(activeClinicId),
          listCardProcessors(activeClinicId),
          listServices(activeClinicId),
        ]);

        const metadataExtraction = rec.metadata?.document_extraction || null;
        const extractionFields = metadataExtraction?.fields || {};
        const appointment = Array.isArray(rec.appointments) ? rec.appointments[0] : rec.appointments;
        const paymentData = rec.metadata?.payment_data || {};
        const appointmentData = rec.metadata?.appointment || paymentData.appointment || {};
        const appointmentServiceId = appointment?.service_id || appointment?.services?.id;
        const appointmentProfessionalId = appointment?.professional_id
          || appointment?.professionals?.id
          || appointmentData.professionalId
          || appointmentData.professional_id
          || paymentData.professionalId
          || paymentData.professional_id;
        const appointmentRoomId = appointment?.room_id || appointment?.rooms?.id;
        const selectedService = (servicesData || []).find((service) => service.id === (rec.procedure_id || appointmentServiceId)) || null;
        const metadataProfessionalName = pickText(
          appointmentData.professionalName,
          appointmentData.professional_name,
          paymentData.professionalName,
          paymentData.professional_name,
          appointment?.professionals?.name,
          appointment?.professional_name,
          rec.professional_name,
          rec.profissional_name,
        );
        const professionalIdFromName = metadataProfessionalName
          ? findProfessionalIdByDocumentName(professionalsData || [], metadataProfessionalName)
          : '';
        const selectedProfessional = (professionalsData || []).find((professional) => professional.id === (rec.professional_id || rec.profissional_id || appointmentProfessionalId || professionalIdFromName)) || null;
        const metadataText = JSON.stringify(rec.metadata || {});
        const paymentMethod = normalizePaymentMethodForForm(
          rec.payment_method
          || rec.received_payment_method
          || rec.forma_prevista
          || appointment?.payment_method
          || rec.metadata?.last_payment?.methods?.[0]?.method
        );
        const savedPaymentRows = getPaymentBreakdown(rec);
        const maxInstallments = Math.max(
          0,
          ...savedPaymentRows.map((payment) => Number.parseInt(payment.installments || 0, 10) || 0),
        );
        const patientName = pickText(rec.patient_name, rec.payer_name, appointment?.patients?.name, appointment?.patient_name, appointmentData.patientName, appointmentData.patient_name);
        const serviceName = pickText(rec.procedure_name, selectedService?.name, appointmentData.serviceName, appointmentData.service_name, paymentData.serviceName, paymentData.service_name, appointment?.services?.name, appointment?.service_name);
        const professionalId = rec.professional_id || rec.profissional_id || appointmentProfessionalId || professionalIdFromName || '';
        const professionalName = pickText(rec.professional_name, rec.profissional_name, selectedProfessional?.name, metadataProfessionalName);
        const unitName = pickText(rec.unit_name, rec.unidade_name, appointmentData.unitName, appointmentData.unit_name, appointmentData.roomName, appointmentData.room_name, paymentData.unitName, paymentData.unit_name, paymentData.roomName, paymentData.room_name, appointment?.rooms?.unit_name, appointment?.rooms?.name, appointment?.unit_name);
        const isAgendaReceivable = Boolean(rec.appointment_id || appointment?.id || rec.origem === 'Agenda' || rec.metadata?.source === 'payment_registration_api');
        const inferredInvoiceNumber = rec.insurance_invoice_number
          || extractionFields.invoice_number
          || extractionFields.guide_number
          || inferReceivableInvoiceNumberFromFileName(rec.nf_document_name)
          || inferReceivableInvoiceNumberFromFileName(rec.metadata?.source_file_name)
          || inferReceivableInvoiceNumberFromFileName(rec.nf_document_url)
          || inferReceivableInvoiceNumberFromFileName(metadataText);
        const baseData = {
          ...rec,
          origem: isAgendaReceivable ? 'Agenda' : rec.origem || rec.origin || 'Manual',
          payer_type: normalizePayerTypeForForm(rec.payer_type || (rec.patient_id || appointment?.patient_id ? 'paciente' : 'manual')),
          patient_id: rec.patient_id || appointment?.patient_id || '',
          patient_name: patientName,
          payer_name: patientName,
          payment_method: paymentMethod,
          profissional_id: professionalId,
          professional_id: professionalId,
          professional_name: professionalName,
          financial_plan_account_id: rec.financial_plan_account_id || '',
          centro_custo_id: rec.centro_custo_id || rec.cost_center_id || '',
          total_parcelas: rec.total_parcelas || (maxInstallments > 1 ? String(maxInstallments) : ''),
          parcelado: (Number(rec.total_parcelas || 0) > 1) || maxInstallments > 1,
          is_card_payment: isCardPaymentMethod(paymentMethod) || !!rec.processor_id,
          card_brand: rec.card_brand || 'Visa',
          settlement_type: rec.settlement_type || 'D+1',
          competency_date: rec.competency_date || rec.invoice_date || rec.due_date || '',
          guide_number: rec.guide_number || '',
          insurance_invoice_number: inferredInvoiceNumber || '',
          batch_number: rec.batch_number || '',
          description: rec.description === 'Recebimento registrado pela agenda' ? serviceName || rec.description : rec.description,
          service_description: rec.service_description === 'Recebimento registrado pela agenda' ? serviceName || rec.service_description : rec.service_description,
          procedure_id: rec.procedure_id || appointmentServiceId || '',
          procedure_name: serviceName,
          service_group: rec.service_group || getServiceCategoryLabel(selectedService) || rec.metadata?.service_group || '',
          specialty_name: pickText(rec.specialty_name, appointmentData.specialtyName, appointmentData.specialty_name, paymentData.specialtyName, paymentData.specialty_name, appointment?.professionals?.specialty_name, appointment?.specialty_name),
          unit_id: rec.unit_id || appointmentRoomId || '',
          unit_name: unitName,
        };
        setDocumentExtraction(metadataExtraction);
        setData(cleanBrokenTextDeep({
          ...baseData,
          ...mergeMissingExtractionFields(baseData, buildExtractionFormUpdates(extractionFields, professionalsData || [])),
          is_card_payment: isCardPaymentMethod(baseData.payment_method || extractionFields.payment_method) || !!baseData.processor_id,
          notes: mergeDocumentNotes(baseData.notes, extractionFields),
        }));
        setPlans(cleanBrokenTextDeep(ps || []));
        setFinancialPlanAccounts(cleanBrokenTextDeep((financialPlanRows || []).filter((account) => account.is_active !== false && account.accepts_entries !== false)));
        setCostCenters(cleanBrokenTextDeep(cs || []));
        setProfessionals(cleanBrokenTextDeep(professionalsData || []));
        setConvenios(cleanBrokenTextDeep(payersData || []));
        setEmpresas([]);
        setServices(cleanBrokenTextDeep(servicesData || []));
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

  const handlePayerTypeChange = (payerType) => {
    setData((current) => ({
      ...current,
      payer_type: payerType,
      payer_id: payerType === 'convenio' || payerType === 'empresa' ? current.payer_id || null : null,
      convenio_id: payerType === 'convenio' ? current.convenio_id || current.payer_id || null : null,
      empresa_id: payerType === 'empresa' ? current.empresa_id || current.payer_id || null : null,
      patient_id: payerType === 'paciente' ? current.patient_id || null : null,
    }));
  };

  const handleServiceChange = (serviceId) => {
    const selectedService = services.find((service) => service.id === serviceId) || null;
    setData((current) => ({
      ...current,
      procedure_id: serviceId || '',
      procedure_name: selectedService?.name || '',
      service_group: selectedService ? getServiceCategoryLabel(selectedService) : '',
    }));
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
  const paymentBreakdown = useMemo(() => getPaymentBreakdown(data), [data]);
  const paymentBreakdownTotal = paymentBreakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const breadcrumbs = useMemo(() => ([
    { label: 'Clinica', path: '/clinica' },
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Receber', path: '/clinica/financeiro/receber' },
    { label: buildReceivableBreadcrumbLabel(data), path: buildReceivableOriginPath(data) },
    { label: 'Editar' },
  ]), [data]);

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
      const convenioId = data.payer_type === 'convenio' ? data.payer_id || data.convenio_id || null : null;
      const companyId = data.payer_type === 'empresa' ? data.payer_id || data.empresa_id || null : null;

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
        plano_contas_id: data.chart_account_id || data.plano_contas_id || null,
        financial_plan_account_id: data.financial_plan_account_id || null,
        centro_custo_id: data.centro_custo_id || null,
        professional_id: data.profissional_id || data.professional_id || null,
        payer_type: data.payer_type || null,
        payer_id: payerId,
        convenio_id: convenioId,
        company_id: companyId,
        invoice_date: invoiceDate || null,
        competency_date: competencyDate || invoiceDate || dueDate,
        due_date: dueDate,
        guide_number: data.guide_number || null,
        batch_number: data.batch_number || null,
        procedure_id: data.procedure_id || null,
        procedure_name: data.procedure_name || null,
        service_group: data.service_group || null,
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
      <PageLayout title="Editar Recebimento" breadcrumbs={breadcrumbs}>
        <div>Carregando...</div>
      </PageLayout>
    );
  }
  if (error && !data) {
    return (
      <PageLayout title="Editar Recebimento" breadcrumbs={breadcrumbs}>
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
                {backLabel}
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
    <PageLayout title="Editar Recebimento" subtitle="Atualize os dados do titulo mantendo a rastreabilidade financeira." breadcrumbs={breadcrumbs}>
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
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.payer_type || 'manual'} onChange={(e) => handlePayerTypeChange(e.target.value)}>
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
              <select
                className="w-full border rounded h-9 px-2 text-sm"
                value={data.chart_account_id || data.plano_contas_id || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setData((current) => ({ ...current, chart_account_id: value, plano_contas_id: value }));
                }}
              >
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
              <Label>Plano Financeiro</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.financial_plan_account_id || ''} onChange={(e) => handleChange('financial_plan_account_id', e.target.value)}>
                <option value="">Selecione</option>
                {financialPlanAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.code ? `${account.code} - ${account.name}` : account.name}</option>
                ))}
              </select>
            </div>
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

          {paymentBreakdown.length > 0 && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Formas registradas no financeiro</p>
                  <p className="text-xs text-emerald-700">Métodos e parcelas recuperados do atendimento.</p>
                </div>
                <p className="text-sm font-semibold text-emerald-900">Total: {formatMoney(paymentBreakdownTotal)}</p>
              </div>
              <div className="mt-3 space-y-2">
                {paymentBreakdown.map((item, index) => (
                  <div key={`${item.method}-${index}`} className="rounded border border-emerald-100 bg-white px-3 py-2 text-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-slate-900">
                        {item.method || 'Forma nao informada'} {item.installments && item.installments !== '1' ? `- ${item.installments}x` : ''}
                      </p>
                      <p className="font-semibold text-slate-900">{formatMoney(item.amount)}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      {item.dueDate && <span>Vencimento: {formatPaymentDate(item.dueDate)}</span>}
                      {item.reference && <span>Referência: {item.reference}</span>}
                      {item.cardBrand && <span>Bandeira: {item.cardBrand}</span>}
                      {item.installmentDates.length > 0 && <span>Parcelas: {item.installmentDates.map(formatPaymentDate).join(', ')}</span>}
                      {item.observation && <span>Obs.: {item.observation}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </FormSection>

          <FormSection title="Rastreabilidade e anexos">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Serviço</Label>
              <select className="w-full border rounded h-9 px-2 text-sm" value={data.procedure_id || ''} onChange={(e) => handleServiceChange(e.target.value)}>
                <option value="">Selecione um serviço cadastrado</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Grupo</Label>
              <Input value={data.service_group || ''} onChange={(e) => handleChange('service_group', e.target.value)} placeholder="Consulta, Exame..." />
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