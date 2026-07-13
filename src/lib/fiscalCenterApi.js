import { supabase } from '@/lib/customSupabaseClient';
import { createInvoice, emitInvoiceAndCreateAR, linkExternalInvoiceToAppointment } from '@/lib/invoiceApi';

const CANCELED_STATUSES = ['canceled', 'cancelled', 'cancelada', 'cancelado'];

function parseSettings(settings) {
  if (!settings) return {};
  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch (_error) {
      return {};
    }
  }
  return settings;
}

function normalizeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildLockedValue(value, source, fallback = '-') {
  return {
    value: value || fallback,
    source,
    locked: true,
  };
}

function isCanceledInvoice(invoice) {
  const status = String(invoice?.status || '').toLowerCase().trim();
  return CANCELED_STATUSES.includes(status) || Boolean(invoice?.canceled_at);
}

async function getOptionalRow(table, id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn(`Centro Fiscal: nao foi possivel carregar ${table}:`, error.message);
    return null;
  }

  return data || null;
}

async function listAppointmentInvoices(clinicId, appointmentId) {
  if (!appointmentId) return [];

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('appointment_id', appointmentId);

  if (error) {
    throw new Error(`Erro ao listar NF: ${error.message}`);
  }

  return data || [];
}

export function calculateFiscalTaxes({ grossValue = 0, discount = 0, additions = 0, issRate = 0.05 } = {}) {
  const gross = normalizeNumber(grossValue);
  const discountValue = normalizeNumber(discount);
  const additionsValue = normalizeNumber(additions);
  const taxableBase = Math.max(0, gross - discountValue + additionsValue);
  const iss = Number((taxableBase * normalizeNumber(issRate)).toFixed(2));
  const cbs = 0;
  const ibs = 0;
  const selectiveTax = 0;
  const pis = 0;
  const cofins = 0;
  const csll = 0;
  const irrf = 0;
  const inss = 0;
  const retentionTotal = iss + cbs + ibs + selectiveTax + pis + cofins + csll + irrf + inss;
  const net = Math.max(0, Number((taxableBase - retentionTotal).toFixed(2)));

  return {
    gross,
    discount: discountValue,
    additions: additionsValue,
    taxableBase,
    taxes: [
      { key: 'iss', label: 'ISS', base: taxableBase, rate: issRate, amount: iss, responsible: 'Prestador', incidence: 'Servico municipal' },
      { key: 'cbs', label: 'CBS', base: taxableBase, rate: 0, amount: cbs, responsible: 'Configuracao fiscal', incidence: 'Reforma tributaria' },
      { key: 'ibs', label: 'IBS', base: taxableBase, rate: 0, amount: ibs, responsible: 'Configuracao fiscal', incidence: 'Reforma tributaria' },
      { key: 'is', label: 'IS', base: taxableBase, rate: 0, amount: selectiveTax, responsible: 'Configuracao fiscal', incidence: 'Imposto seletivo' },
      { key: 'pis', label: 'PIS', base: taxableBase, rate: 0, amount: pis, responsible: 'Configuracao fiscal', incidence: 'Federal' },
      { key: 'cofins', label: 'COFINS', base: taxableBase, rate: 0, amount: cofins, responsible: 'Configuracao fiscal', incidence: 'Federal' },
      { key: 'csll', label: 'CSLL', base: taxableBase, rate: 0, amount: csll, responsible: 'Configuracao fiscal', incidence: 'Federal' },
      { key: 'irrf', label: 'IRRF', base: taxableBase, rate: 0, amount: irrf, responsible: 'Tomador/retencao', incidence: 'Federal' },
      { key: 'inss', label: 'INSS', base: taxableBase, rate: 0, amount: inss, responsible: 'Configuracao fiscal', incidence: 'Previdenciaria' },
    ],
    retentionTotal,
    net,
  };
}

export async function loadFiscalDraft({ clinicId, appointmentId } = {}) {
  if (!clinicId) {
    throw new Error('Clinica obrigatoria para carregar o Centro Fiscal.');
  }

  const [{ data: clinic, error: clinicError }, { data: appointment, error: appointmentError }, invoices] = await Promise.all([
    supabase.from('clinics').select('*').eq('id', clinicId).maybeSingle(),
    appointmentId
      ? supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .eq('clinic_id', clinicId)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    listAppointmentInvoices(clinicId, appointmentId),
  ]);

  if (clinicError) throw new Error(`Erro ao carregar empresa: ${clinicError.message}`);
  if (appointmentError) throw new Error(`Erro ao carregar atendimento: ${appointmentError.message}`);

  const { data: appointmentServices, error: servicesError } = appointmentId
    ? await supabase
      .from('appointment_services')
      .select('*')
      .eq('appointment_id', appointmentId)
    : { data: [], error: null };

  if (servicesError) {
    throw new Error(`Erro ao carregar itens do atendimento: ${servicesError.message}`);
  }

  const serviceIds = [
    appointment?.service_id,
    ...(appointmentServices || []).map((item) => item.service_id),
  ].filter(Boolean);

  const { data: serviceRowsData, error: serviceRowsError } = serviceIds.length
    ? await supabase.from('services').select('*').in('id', serviceIds)
    : { data: [], error: null };

  if (serviceRowsError) {
    console.warn('Centro Fiscal: nao foi possivel carregar servicos:', serviceRowsError.message);
  }

  const serviceById = new Map((serviceRowsData || []).map((service) => [service.id, service]));

  const [patient, professional, payer, room] = await Promise.all([
    getOptionalRow('patients', appointment?.patient_id),
    getOptionalRow('professionals', appointment?.professional_id),
    getOptionalRow('payers', appointment?.payer_id),
    getOptionalRow('rooms', appointment?.room_id),
  ]);

  const settings = parseSettings(clinic?.settings);
  const nfseSettings = settings?.nfse || {};
  const serviceRows = appointmentServices?.length
    ? appointmentServices
    : appointment?.service_id
      ? [{
        service_id: appointment.service_id,
        service_name: appointment.service_name || serviceById.get(appointment.service_id)?.name,
        service_code: appointment.service_code || serviceById.get(appointment.service_id)?.code,
        value: appointment.value,
        discount: appointment.discount,
        quantity: 1,
      }]
      : [];

  const items = serviceRows.map((item, index) => {
    const service = serviceById.get(item.service_id) || item.services || {};
    const quantity = normalizeNumber(item.quantity || 1) || 1;
    const unitValue = normalizeNumber(item.value || item.unit_value || appointment?.value || 0);
    const discount = normalizeNumber(item.discount || 0);
    const total = Math.max(0, unitValue * quantity - discount);

    return {
      id: item.id || `item-${index + 1}`,
      description: item.service_name || service.name || appointment?.service_name || 'Servico do atendimento',
      municipalCode: service.iss_code || item.service_code || '',
      nationalCode: service.national_code || '',
      nbsCode: service.nbs_code || nfseSettings.default_nbs_code || '',
      tussCode: service.tuss_code || service.code || item.service_code || '',
      cbhpmCode: service.cbhpm_code || '',
      susCode: service.sus_code || '',
      quantity,
      unitValue,
      discount,
      additions: normalizeNumber(item.addition || item.additions || 0),
      total,
      professional: professional?.name || appointment?.professional_name || '',
      specialty: professional?.specialty || '',
      payer: payer?.name || appointment?.payer_name || 'Particular',
      plan: appointment?.plan_name || '',
      nature: nfseSettings.tax_situation_code || service.tax_situation_code || '',
      municipality: clinic?.city || clinic?.municipio || '',
      servicePlace: room?.name || appointment?.room_name || clinic?.name || '',
      hospitalEquivalent: Boolean(service.is_hospital_service),
      issWithheld: Boolean(item.iss_withheld || nfseSettings.iss_withheld),
      repasse: normalizeNumber(item.repasse_amount || 0),
      repassePercent: normalizeNumber(item.repasse_percent || 0),
      costCenter: item.cost_center_name || appointment?.cost_center_name || '',
      chartAccount: item.chart_account_name || appointment?.chart_account_name || '',
      financialAccount: item.financial_account_name || appointment?.financial_account_name || '',
      origin: appointmentId ? 'Atendimento' : 'Manual',
      appointmentId,
      guide: appointment?.guide_number || '',
      authorization: appointment?.auth_number || appointment?.authorization_number || '',
      lot: appointment?.lot_number || '',
    };
  });

  const grossValue = items.reduce((sum, item) => sum + item.unitValue * item.quantity, 0);
  const discount = items.reduce((sum, item) => sum + item.discount, 0);
  const additions = items.reduce((sum, item) => sum + item.additions, 0);
  const taxes = calculateFiscalTaxes({
    grossValue,
    discount,
    additions,
    issRate: normalizeNumber(clinic?.iss_rate || nfseSettings.iss_rate || 0.05),
  });
  const activeInvoices = (invoices || []).filter((invoice) => !isCanceledInvoice(invoice));

  return {
    origin: {
      type: appointmentId ? 'Atendimento' : 'Centro Fiscal',
      appointmentId: appointment?.id || appointmentId || null,
      scheduledDate: appointment?.scheduled_date || appointment?.appointment_date || appointment?.date || null,
      patientId: patient?.id || appointment?.patient_id || null,
      payerType: payer?.id ? 'insurance' : 'patient',
      payerId: payer?.id || appointment?.payer_id || null,
      professionalId: professional?.id || appointment?.professional_id || null,
      serviceIds: items.map((item) => item.id),
      activeInvoiceBlock: activeInvoices.length > 0,
      activeInvoices,
    },
    fiscalIdentification: {
      invoiceType: buildLockedValue('NFS-e', 'Configuracao fiscal'),
      scope: buildLockedValue(nfseSettings.scope || 'Municipal', 'Configuracao fiscal'),
      model: buildLockedValue(nfseSettings.model || 'ABRASF/RPS', 'Configuracao fiscal'),
      version: buildLockedValue(nfseSettings.version || '2.04', 'Configuracao fiscal'),
      municipality: buildLockedValue(clinic?.city || clinic?.municipio || '-', 'Cadastro da empresa'),
      environment: buildLockedValue(nfseSettings.environment || 'Homologacao', 'Configuracao fiscal'),
      integration: buildLockedValue(nfseSettings.provider || nfseSettings.integration || 'Pendente de integracao municipal', 'Configuracao fiscal'),
      status: buildLockedValue(activeInvoices[0]?.status || 'Rascunho', 'Sistema'),
      number: buildLockedValue(activeInvoices[0]?.invoice_number || '-', 'Prefeitura/Sistema'),
      series: buildLockedValue(activeInvoices[0]?.series || nfseSettings.series || '-', 'Configuracao fiscal'),
      lot: buildLockedValue(activeInvoices[0]?.lot_number || '-', 'Sistema'),
      rps: buildLockedValue(activeInvoices[0]?.rps_number || '-', 'Sistema'),
      key: buildLockedValue(activeInvoices[0]?.access_key || '-', 'Prefeitura'),
      qrcode: buildLockedValue(activeInvoices[0]?.qrcode || '-', 'Prefeitura'),
      protocol: buildLockedValue(activeInvoices[0]?.protocol || '-', 'Prefeitura'),
    },
    provider: {
      legalName: buildLockedValue(clinic?.legal_name || clinic?.name, 'Cadastro da empresa'),
      tradeName: buildLockedValue(clinic?.name || clinic?.brand_name, 'Cadastro da empresa'),
      cnpj: buildLockedValue(clinic?.cnpj, 'Cadastro da empresa'),
      municipalRegistration: buildLockedValue(clinic?.inscricao_municipal, 'Cadastro da empresa'),
      stateRegistration: buildLockedValue(clinic?.inscricao_estadual, 'Cadastro da empresa'),
      crt: buildLockedValue(clinic?.crt || nfseSettings.crt, 'Cadastro fiscal'),
      taxRegime: buildLockedValue(clinic?.tax_regime || 'simples', 'Cadastro fiscal'),
      cnae: buildLockedValue(clinic?.cnae || nfseSettings.cnae, 'Cadastro fiscal'),
      serviceCode: buildLockedValue(nfseSettings.service_code || items[0]?.municipalCode, 'Servico/Configuracao fiscal'),
      ibge: buildLockedValue(clinic?.city_ibge || nfseSettings.city_ibge, 'Cadastro da empresa'),
      city: buildLockedValue(clinic?.city || clinic?.municipio, 'Cadastro da empresa'),
      uf: buildLockedValue(clinic?.state || clinic?.uf, 'Cadastro da empresa'),
      certificate: buildLockedValue(nfseSettings.certificate_alias || 'Certificado digital da clinica', 'Configuracao fiscal'),
      technicalResponsible: buildLockedValue(clinic?.technical_responsible || professional?.name, 'Cadastro da empresa'),
      fiscalResponsible: buildLockedValue(nfseSettings.fiscal_responsible || '-', 'Configuracao fiscal'),
      accountant: buildLockedValue(nfseSettings.accountant || '-', 'Configuracao fiscal'),
      crc: buildLockedValue(nfseSettings.crc || '-', 'Configuracao fiscal'),
      bank: buildLockedValue(clinic?.bank_name || '-', 'Financeiro'),
      pix: buildLockedValue(clinic?.pix_key || '-', 'Financeiro'),
    },
    taker: {
      name: patient?.name || appointment?.patient_name || '',
      document: patient?.document_id || patient?.cpf || patient?.cnpj || '',
      phone: patient?.phone || patient?.cell_phone || appointment?.patient_phone || '',
      email: patient?.email || '',
      address: [patient?.street, patient?.number, patient?.neighborhood].filter(Boolean).join(', '),
      city: patient?.city || '',
      state: patient?.state || '',
      zipCode: patient?.zip_code || '',
      country: patient?.country || 'Brasil',
      payer: payer?.name || 'Particular',
      plan: appointment?.plan_name || '',
      category: appointment?.payer_category || '',
      company: appointment?.company_name || '',
    },
    items,
    taxes,
    finance: {
      grossValue,
      discount,
      additions,
      netValue: Math.max(0, grossValue - discount + additions),
      fiscalNetValue: taxes.net,
      createReceivable: true,
      createPayment: true,
      updateCashFlow: true,
      updateDailyCash: true,
      updateOperatorCash: true,
      updateGeneralCash: true,
      updateDre: true,
      updateRepasse: true,
      updateProduction: true,
      updateDashboards: true,
      chartAccount: items[0]?.chartAccount || 'Automático pelo plano de contas',
      costCenter: items[0]?.costCenter || 'Automático pelo atendimento',
      financialAccount: items[0]?.financialAccount || 'Conta financeira padrão',
    },
    accounting: {
      dominio: 'Preparado',
      sieg: 'Preparado',
      sped: 'Preparado',
      xml: activeInvoices[0]?.xml_url || activeInvoices[0]?.xml_path || 'Pendente',
      pdf: activeInvoices[0]?.pdf_url || activeInvoices[0]?.pdf_path || 'Pendente',
      journal: 'Gerado no motor financeiro apos emissao',
      costCenter: items[0]?.costCenter || '-',
      chartAccount: items[0]?.chartAccount || '-',
    },
    observations: {
      commercial: '',
      fiscal: activeInvoices[0]?.notes || '',
      accounting: '',
      insurance: appointment?.guide_notes || '',
      patient: appointment?.notes || '',
      internal: '',
    },
    timeline: [
      { label: 'Agendamento', status: appointment ? 'Concluido' : 'Pendente', source: 'Agenda' },
      { label: 'Atendimento', status: appointment?.status || 'Pendente', source: 'Atendimento' },
      { label: 'Recebimento', status: 'Sincronizado pelo Financeiro', source: 'Contas a Receber' },
      { label: 'Nota', status: activeInvoices.length ? activeInvoices[0].status : 'Rascunho', source: 'Centro Fiscal' },
      { label: 'XML/PDF', status: activeInvoices[0]?.xml_url || activeInvoices[0]?.pdf_url ? 'Disponivel' : 'Pendente', source: 'Fiscal' },
      { label: 'DRE/Repasse', status: 'Apos emissao', source: 'Motor Financeiro' },
    ],
  };
}

export async function emitFiscalInvoiceFromDraft({ clinicId, draft, userId, mode = 'system', externalInvoiceNumber = '' } = {}) {
  if (!clinicId || !draft?.origin?.appointmentId) {
    throw new Error('Atendimento e clinica sao obrigatorios para emitir NF.');
  }
  if (draft.origin.activeInvoiceBlock) {
    throw new Error('Ja existe NF ativa vinculada a este atendimento. Cancele ou substitua a NF existente antes de emitir outra.');
  }

  const firstItem = draft.items?.[0] || {};
  if (mode === 'external') {
    return linkExternalInvoiceToAppointment({
      clinicId,
      appointmentId: draft.origin.appointmentId,
      patientId: draft.origin.patientId,
      invoiceNumber: externalInvoiceNumber,
      amount: draft.finance.netValue,
      description: firstItem.description || `NF externa - Atendimento ${draft.origin.appointmentId}`,
    });
  }

  const invoice = await createInvoice({
    clinicId,
    appointmentId: draft.origin.appointmentId,
    patientId: draft.origin.patientId,
    payerId: draft.origin.payerId,
    payerType: draft.origin.payerType,
    grossAmount: draft.finance.grossValue,
    discountAmount: draft.finance.discount,
    description: firstItem.description || 'Servico do atendimento',
    professionalId: draft.origin.professionalId,
    serviceId: firstItem.id,
    notes: JSON.stringify({
      source: 'centro_fiscal',
      user_id: userId || null,
      fiscal_identification: draft.fiscalIdentification,
      accounting: draft.accounting,
      observations: draft.observations,
    }),
  });

  const result = await emitInvoiceAndCreateAR(invoice.id, {
    metadata: {
      source: 'centro_fiscal',
      appointment_id: draft.origin.appointmentId,
      fiscal_net_value: draft.finance.fiscalNetValue,
    },
  });

  return result;
}
