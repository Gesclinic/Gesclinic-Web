import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import ReceivableNfInput from '@/components/financeiro/ReceivableNfInput';
import {
  createReceivable,
  arStatusOptions,
  uploadReceivableNfFile,
  listReceivables,
} from '@/lib/receivablesApi';
import { listRevenueAccountPlans, listCostCenters } from '@/lib/financeApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listPatients } from '@/lib/patientsApi';
import { ensurePayerFromDocument, listPayers } from '@/lib/payersApi';
import { listCardProcessors } from '@/lib/cardProcessorsApi';
import { calculateProcessingFee } from '@/lib/processingFeeCalculator';
import { buildReceivableDocumentExtractionMetadata, extractReceivableDocument, inferReceivableInvoiceNumberFromFileName } from '@/lib/receivableDocumentExtractor';
import { invalidateDashboardDataCache } from '@/services/dashboardDataService';
import {
  displayDateToIso,
  findProfessionalIdByDocumentName,
  isCardPaymentMethod,
  isoToDisplayDate,
  maskDisplayDate,
  mergeDocumentNotes,
  paymentMethodOptions,
} from '@/lib/receivableUiHelpers';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Copy, PlusCircle, Search } from 'lucide-react';

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

function PreviewTile({ label, value }) {
  return (
    <div className="rounded border bg-slate-50 px-2 py-1.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="truncate text-xs font-semibold text-slate-900">{value || 'Nao encontrado'}</p>
    </div>
  );
}

export default function NovoRecebimento() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    origem: 'Manual',
    payer_name: '',
    descricao: '',
    valor_bruto: '',
    descontos: '0',
    forma_prevista: '',
    data_emissao: new Date().toISOString().slice(0, 10),
    data_vencimento: '',
    data_recebimento: '',
    status: 'open',
    parcelado: false,
    total_parcelas: '',
    profissional_id: '',
    plano_contas_id: '',
    centro_custo_id: '',
    competency_date: new Date().toISOString().slice(0, 10),
    guide_number: '',
    batch_number: '',
    procedure_name: '',
    specialty_name: '',
    unit_name: '',
    notes: '',
    ans_registration: '',
    insurance_invoice_number: '',
    insurance_billing_status: '',
    tiss_xml_status: '',
    insurance_return_status: '',
    insurance_return_protocol: '',
    insurance_return_date: '',
    paciente_id: null,
    convenio_id: null,
    empresa_id: null,
    payer_type: 'manual',
    // Card processor fields
    is_card_payment: false,
    processor_id: '',
    card_brand: 'Visa',
    card_last4: '',
    settlement_type: 'D+1',
  });
  const [plans, setPlans] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [patientResults, setPatientResults] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cardProcessors, setCardProcessors] = useState([]);
  const [cardFeeCalc, setCardFeeCalc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [nfFile, setNfFile] = useState(null);
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchDocuments, setBatchDocuments] = useState([]);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchProcessingMessage, setBatchProcessingMessage] = useState('');
  const [documentExtraction, setDocumentExtraction] = useState(null);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringSearch, setRecurringSearch] = useState('');
  const [recurringResults, setRecurringResults] = useState([]);
  const [recurringLoading, setRecurringLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const [revenuePlans, centers] = await Promise.all([
          listRevenueAccountPlans(clinicId),
          listCostCenters(clinicId),
        ]);
        setPlans(revenuePlans || []);
        setCostCenters(centers || []);
      } catch {}
    })();
  }, [clinicId]);
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const ps = await listProfessionals(clinicId);
        setProfessionals(ps || []);
      } catch {}
    })();
  }, [clinicId]);
  useEffect(() => {
    if (!clinicId) {
      return;
    }

    (async () => {
      try {
        const data = await listPayers(clinicId);
        setConvenios(data || []);
      } catch {
        setConvenios([]);
      }
    })();
  }, [clinicId]);

  useEffect(() => {
    setEmpresas([]);
  }, [clinicId]);

  // Load card processors
  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      try {
        const processors = await listCardProcessors(clinicId);
        setCardProcessors(processors || []);
      } catch (error) {
        console.error('❌ Error loading card processors:', error);
        setCardProcessors([]);
      }
    })();
  }, [clinicId]);

  // Calculate card processing fee when relevant fields change
  useEffect(() => {
    if (!form.is_card_payment || !form.processor_id || !form.valor_bruto) {
      setCardFeeCalc(null);
      return;
    }

    (async () => {
      try {
        const feeData = await calculateProcessingFee({
          clinicId,
          processorId: form.processor_id,
          cardBrand: form.card_brand || 'Visa',
          settlementType: form.settlement_type || 'D+1',
          grossAmount: parseFloat(form.valor_bruto) || 0,
        });
        setCardFeeCalc(feeData);
      } catch (error) {
        console.error('❌ Error calculating fee:', error);
        setCardFeeCalc(null);
      }
    })();
  }, [form.is_card_payment, form.processor_id, form.card_brand, form.settlement_type, form.valor_bruto, clinicId]);

  const handleDateChange = (field, value) => {
    const masked = maskDisplayDate(value);
    const iso = displayDateToIso(masked);
    setForm((current) => ({ ...current, [field]: iso || masked }));
  };

  const buildFormUpdatesFromExtraction = (extraction) => {
    const fields = extraction?.fields || {};
    const updates = {};
    if (fields.payer_name) updates.payer_name = fields.payer_name;
    if (fields.payer_id) {
      updates.convenio_id = fields.payer_id;
      updates.payer_type = 'CONVENIO';
    }
    if (fields.description) updates.descricao = fields.description;
    if (fields.amount) updates.valor_bruto = fields.amount;
    if (fields.invoice_date) updates.data_emissao = fields.invoice_date;
    if (fields.due_date) updates.data_vencimento = fields.due_date;
    if (fields.competency_date) updates.competency_date = fields.competency_date;
    if (fields.payment_method) updates.forma_prevista = fields.payment_method;
    if (fields.card_last4) updates.card_last4 = fields.card_last4;
    if (fields.payment_date) updates.data_recebimento = fields.payment_date;
    if (fields.guide_number) updates.guide_number = fields.guide_number;
    if (fields.invoice_number) updates.insurance_invoice_number = fields.invoice_number;
    if (fields.doctor_name) {
      const professionalId = findProfessionalIdByDocumentName(professionals, fields.doctor_name);
      if (professionalId) updates.profissional_id = professionalId;
    }
    return updates;
  };

  const enrichReceivablePayerFromDocument = async (extraction) => {
    const fields = extraction?.fields || {};
    if (!clinicId || !fields.payer_document) {
      return extraction;
    }

    const payer = await ensurePayerFromDocument(clinicId, {
      name: fields.payer_name,
      cnpj: fields.payer_document,
      payer_document: fields.payer_document,
    });

    if (!payer?.id) {
      return extraction;
    }

    return {
      ...extraction,
      fields: {
        ...fields,
        payer_id: payer.id,
        payer_name: fields.payer_name || payer.name,
        payer_document: fields.payer_document || payer.cnpj,
        payer_registry_source: payer.cnpj ? 'payers' : 'manual',
      },
      public_payer_lookup: {
        matched_at: new Date().toISOString(),
        payer_id: payer.id,
        document: payer.cnpj || fields.payer_document,
        name: payer.name,
      },
    };
  };

  const applyExtractionToForm = (extraction) => {
    const fields = extraction?.fields || {};
    const updates = buildFormUpdatesFromExtraction(extraction);
    if (!Object.keys(updates).length) return false;
    setForm((current) => ({
      ...current,
      ...updates,
      is_card_payment: updates.forma_prevista ? isCardPaymentMethod(updates.forma_prevista) : current.is_card_payment,
      notes: mergeDocumentNotes(current.notes, fields),
    }));
    return true;
  };

  const handleNfFileSelected = async (file) => {
    setNfFile(file);
    setDocumentExtraction(null);
    if (!file) {
      return;
    }
    try {
      const extraction = await enrichReceivablePayerFromDocument(await extractReceivableDocument(file));
      extraction.fields = {
        ...(extraction.fields || {}),
        invoice_number: extraction.fields?.invoice_number || inferReceivableInvoiceNumberFromFileName(file.name),
      };
      setDocumentExtraction(extraction);
      if (applyExtractionToForm(extraction)) {
        toast({ title: 'Documento lido', description: 'Campos financeiros preenchidos para revisão.' });
      } else if (extraction?.warnings?.length) {
        toast({ title: 'Documento anexado', description: extraction.warnings[0] });
      }
    } catch (error) {
      setDocumentExtraction({ confidence: 'erro', fields: {}, warnings: [error?.message || 'Nao foi possivel ler o documento.'] });
      toast({ variant: 'destructive', title: 'Erro ao ler documento', description: error?.message });
    }
  };

  const buildXmlReceivablePayload = async (file, extraction) => {
    const enrichedExtraction = await enrichReceivablePayerFromDocument(extraction);
    const fields = enrichedExtraction?.fields || {};
    const amount = fields.amount || '0';
    const grossAmount = Number(amount || 0);
    if (!fields.payer_name) {
      throw new Error('Pagador nao identificado. Quando houver CNPJ no XML, tente novamente para consultar o cadastro publico; sem documento, revise o pagador manualmente.');
    }
    const isCardXml = isCardPaymentMethod(fields.payment_method);
    const feeData = isCardXml && form.processor_id
      ? await calculateProcessingFee({
        clinicId,
        processorId: form.processor_id,
        cardBrand: form.card_brand || 'Visa',
        settlementType: form.settlement_type || 'D+1',
        grossAmount,
      })
      : null;
    const professionalId = fields.doctor_name
      ? findProfessionalIdByDocumentName(professionals, fields.doctor_name)
      : '';
    const uploadedNf = await uploadReceivableNfFile(clinicId, file);
    const invoiceNumber = fields.invoice_number || inferReceivableInvoiceNumberFromFileName(file.name);
    const guideNumber = fields.guide_number || invoiceNumber;

    return {
      origem: 'XML',
      payer_name: fields.payer_name,
      patient_name: fields.payer_name,
      payer_id: fields.payer_id || null,
      convenio_id: fields.payer_id || null,
      payer_type: fields.payer_id ? 'CONVENIO' : 'manual',
      descricao: fields.description || (invoiceNumber ? `NF ${invoiceNumber}` : file.name),
      valor_bruto: amount,
      descontos: '0',
      gross_amount: grossAmount,
      net_value: feeData ? feeData.netAmount : grossAmount,
      received_value: 0,
      status: 'open',
      forma_prevista: fields.payment_method || '',
      processor_id: isCardXml ? form.processor_id || null : null,
      card_brand: isCardXml ? form.card_brand || 'Visa' : null,
      card_last4: isCardXml ? fields.card_last4 || form.card_last4 || null : null,
      settlement_type: isCardXml ? form.settlement_type || 'D+1' : null,
      fee_percent: feeData?.feePercent ?? null,
      fee_amount: feeData?.feeAmount ?? null,
      data_emissao: fields.invoice_date || new Date().toISOString().slice(0, 10),
      data_vencimento: fields.due_date || fields.invoice_date || new Date().toISOString().slice(0, 10),
      competency_date: fields.competency_date || fields.invoice_date || new Date().toISOString().slice(0, 10),
      data_recebimento: null,
      profissional_id: professionalId || null,
      guide_number: guideNumber || null,
      insurance_invoice_number: invoiceNumber || guideNumber || null,
      notes: mergeDocumentNotes('', fields),
      taxes_value: fields.taxes_value || 0,
      nf_document_url: uploadedNf?.url,
      nf_document_name: uploadedNf?.name || file.name,
      metadata: {
        document_extraction: buildReceivableDocumentExtractionMetadata(enrichedExtraction),
        payer: {
          name: fields.payer_name || null,
          document: fields.payer_document || null,
          id: fields.payer_id || null,
        },
        public_payer_lookup: enrichedExtraction?.public_payer_lookup || null,
        issuer: {
          name: fields.issuer_name || null,
          document: fields.issuer_document || null,
        },
        ...(isCardXml ? {
          card: {
            last4: fields.card_last4 || form.card_last4 || null,
            brand: form.card_brand || 'Visa',
            processor_id: form.processor_id || null,
            settlement_type: form.settlement_type || 'D+1',
          },
        } : {}),
        source_file_name: file.name,
        batch_imported_at: new Date().toISOString(),
      },
    };
  };

  const isBatchDocumentImportable = (item) => {
    const fields = item?.extraction?.fields || {};
    return item?.status !== 'error' && Boolean(fields.payer_name && fields.amount);
  };

  const handleNfFilesSelected = async (files) => {
    const selected = Array.from(files || []).filter(Boolean);
    setBatchFiles(selected);
    setBatchDocuments([]);
    if (!selected.length) {
      setNfFile(null);
      setDocumentExtraction(null);
      return;
    }
    if (selected.length === 1) {
      await handleNfFileSelected(selected[0]);
      return;
    }
    setNfFile(null);
    setDocumentExtraction(null);
    if (!clinicId) {
      toast({ variant: 'destructive', title: 'Sem clínica ativa' });
      return;
    }

    setBatchImporting(true);
    setBatchProcessingMessage(`Lendo ${selected.length} documento(s) fiscal(is)...`);
    try {
      const nextDocuments = [];
      for (const file of selected) {
        try {
          const extraction = await enrichReceivablePayerFromDocument(await extractReceivableDocument(file));
          extraction.fields = {
            ...(extraction.fields || {}),
            invoice_number: extraction.fields?.invoice_number || inferReceivableInvoiceNumberFromFileName(file.name),
          };
          const fields = extraction?.fields || {};
          const missing = [];
          if (!fields.payer_name) missing.push('pagador');
          if (!fields.amount) missing.push('valor bruto');
          nextDocuments.push({
            file,
            extraction,
            status: missing.length ? 'review' : 'ready',
            message: missing.length ? `Revisar: ${missing.join(', ')}` : fields.due_date ? 'Pronto para gerar recebivel.' : 'Pronto para gerar recebivel; vencimento sera a data de emissao.',
          });
        } catch (error) {
          nextDocuments.push({
            file,
            extraction: null,
            status: 'error',
            message: error?.message || 'Nao foi possivel ler o documento.',
          });
        }
      }
      setBatchDocuments(nextDocuments);
      const firstUsableDocument = nextDocuments.find((item) => item.extraction?.fields && item.status !== 'error');
      if (firstUsableDocument) {
        setDocumentExtraction(firstUsableDocument.extraction);
        applyExtractionToForm(firstUsableDocument.extraction);
      }
      const readyCount = nextDocuments.filter((item) => item.status === 'ready').length;
      const reviewCount = nextDocuments.filter((item) => item.status === 'review').length;
      const errorCount = nextDocuments.filter((item) => item.status === 'error').length;
      toast({
        title: `${selected.length} documento(s) lido(s)`,
        description: `${readyCount} pronto(s), ${reviewCount} para revisar${errorCount ? `, ${errorCount} com erro` : ''}.`,
      });
    } finally {
      setBatchImporting(false);
      setBatchProcessingMessage('');
    }
  };

  const createReceivablesFromBatch = async () => {
    if (!clinicId) {
      toast({ variant: 'destructive', title: 'Sem clínica ativa' });
      return;
    }
    const candidates = batchDocuments.filter(isBatchDocumentImportable);
    if (!candidates.length) {
      toast({ variant: 'destructive', title: 'Nenhum documento pronto', description: 'Revise os documentos com pagador e valor antes de gerar.' });
      return;
    }

    const batchId = `xml-lote-${Date.now()}`;
    const progressStorageKey = `contas_receber_xml_lote_${batchId}`;
    const updateBatchProgress = (progress) => {
      const detail = {
        clinicId,
        batchId,
        total: candidates.length,
        ...progress,
      };
      try {
        window.sessionStorage.setItem(progressStorageKey, JSON.stringify({
          clinicId: detail.clinicId,
          batchId: detail.batchId,
          total: detail.total,
          created: detail.created || 0,
          failures: detail.failures || [],
          active: detail.active !== false,
          currentFile: detail.currentFile || null,
        }));
      } catch {}
      window.dispatchEvent(new CustomEvent('receivables:xml-batch-progress', { detail }));
    };

    setBatchImporting(true);
    setBatchProcessingMessage(`Gerando recebíveis do lote: 0 de ${candidates.length} concluído(s)...`);
    const failures = [];
    let createdCount = 0;
    let navigatedToList = false;
    try {
      updateBatchProgress({ active: true, created: 0, failures: [] });
      toast({
        title: 'Gerando recebíveis em lote',
        description: 'Voce sera levado para Contas a Receber e os lancamentos entrarao um a um.',
      });
      navigate(`/clinica/financeiro/receber?from=xml-lote&processing=1&batch=${encodeURIComponent(batchId)}&total=${candidates.length}&t=${Date.now()}`);
      navigatedToList = true;

      for (const [index, item] of candidates.entries()) {
        try {
          setBatchProcessingMessage(`Gerando recebíveis do lote: ${index + 1} de ${candidates.length} em processamento...`);
          updateBatchProgress({ active: true, created: createdCount, failures, currentFile: item.file.name });
          const payload = await buildXmlReceivablePayload(item.file, item.extraction);
          const created = await createReceivable(clinicId, payload);
          const createdRows = Array.isArray(created) ? created : created ? [created] : [];
          createdCount += 1;
          setBatchProcessingMessage(`Gerando recebíveis do lote: ${createdCount} de ${candidates.length} concluído(s)...`);
          updateBatchProgress({ active: true, created: createdCount, failures, currentFile: item.file.name });
          window.dispatchEvent(new CustomEvent('receivables:xml-batch-created', {
            detail: {
              clinicId,
              batchId,
              total: candidates.length,
              created: createdCount,
              fileName: item.file.name,
              rows: createdRows,
            },
          }));
        } catch (error) {
          failures.push(`${item.file.name}: ${error?.message || 'erro desconhecido'}`);
          updateBatchProgress({ active: true, created: createdCount, failures, currentFile: item.file.name });
        }
      }

      invalidateDashboardDataCache(clinicId);
      updateBatchProgress({ active: false, created: createdCount, failures, currentFile: null });
      window.dispatchEvent(new CustomEvent('receivables:xml-batch-finished', {
        detail: {
          clinicId,
          batchId,
          total: candidates.length,
          created: createdCount,
          failures,
        },
      }));
      if (createdCount) {
        if (!navigatedToList) {
          navigate(`/clinica/financeiro/receber?from=xml-lote&imported=${createdCount}&t=${Date.now()}`);
        }
      } else if (failures.length) {
        toast({ variant: 'destructive', title: 'Nenhum documento importado', description: failures[0] });
      }
    } finally {
      if (!navigatedToList) {
        setBatchImporting(false);
        setBatchProcessingMessage('');
      }
    }
  };

  const getDateInputValue = (field) => {
    const value = form[field];
    if (!value) {
      return '';
    }
    return value.includes('-') ? isoToDisplayDate(value) : value;
  };

  const valorLiquido = useMemo(() => {
    const bruto = Number(form.valor_bruto || 0);
    const desc = Number(form.descontos || 0);
    const cardFee = form.is_card_payment && cardFeeCalc ? Number(cardFeeCalc.feeAmount || 0) : 0;
    return Math.max(0, bruto - desc - cardFee);
  }, [form.valor_bruto, form.descontos, form.is_card_payment, cardFeeCalc]);

  const valorBruto = Number(form.valor_bruto || 0);
  const valorDescontos = Number(form.descontos || 0);
  const valorTaxaCartao = form.is_card_payment && cardFeeCalc ? Number(cardFeeCalc.feeAmount || 0) : 0;
  const isReceived = form.status === 'received';

  const searchPatients = async (text) => {
    const term = (text || '').trim();
    if (!term || term.length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const res = await listPatients(clinicId, { q: term });
      setPatientResults(res || []);
    } catch {
      setPatientResults([]);
    }
  };

  const searchRecurringTemplates = async () => {
    const term = recurringSearch.trim();
    if (!term || term.length < 2) {
      toast({ variant: 'destructive', title: 'Digite ao menos 2 caracteres para pesquisar' });
      return;
    }
    setRecurringLoading(true);
    try {
      const data = await listReceivables({
        clinicId,
        search: term,
        limit: 10,
      });
      setRecurringResults(data || []);
      if (!data?.length) {
        toast({ title: 'Nenhum modelo encontrado', description: 'Tente buscar pelo pagador ou pela descrição.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar recorrentes', description: error?.message });
      setRecurringResults([]);
    } finally {
      setRecurringLoading(false);
    }
  };

  const applyRecurringTemplate = (row) => {
    const payerType = row.payer_type || 'manual';
    const paymentMethod = row.payment_method || '';
    setForm((current) => ({
      ...current,
      origem: 'Manual',
      payer_name: row.patient_name || row.payer_name || current.payer_name,
      descricao: row.description || row.service_description || current.descricao,
      valor_bruto: row.amount ? String(row.amount) : current.valor_bruto,
      descontos: row.discount_value ? String(row.discount_value) : '0',
      forma_prevista: paymentMethod,
      status: 'open',
      profissional_id: row.profissional_id || current.profissional_id,
      plano_contas_id: row.chart_account_id || row.plano_contas_id || current.plano_contas_id,
      centro_custo_id: row.centro_custo_id || current.centro_custo_id,
      competency_date: row.competency_date || row.invoice_date || row.data_emissao || current.competency_date,
      guide_number: row.guide_number || current.guide_number,
      batch_number: row.batch_number || current.batch_number,
      procedure_name: row.procedure_name || row.service_description || current.procedure_name,
      specialty_name: row.specialty_name || current.specialty_name,
      unit_name: row.unit_name || current.unit_name,
      paciente_id: row.patient_id || row.paciente_id || null,
      convenio_id: payerType === 'convenio' ? row.payer_id || row.convenio_id || null : null,
      empresa_id: payerType === 'empresa' ? row.payer_id || row.empresa_id || null : null,
      payer_type: payerType,
      is_card_payment: isCardPaymentMethod(paymentMethod),
      processor_id: row.processor_id || current.processor_id,
      card_brand: row.card_brand || current.card_brand,
      card_last4: row.card_last4 || row.metadata?.card?.last4 || current.card_last4,
      settlement_type: row.settlement_type || current.settlement_type,
    }));
    setRecurringResults([]);
    toast({ title: 'Dados principais preenchidos', description: 'Revise datas, valores e anexo antes de salvar.' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!clinicId) {
      toast({ variant: 'destructive', title: 'Sem clínica ativa' });
      return;
    }
    if (batchDocuments.length > 1 && batchDocuments.some(isBatchDocumentImportable)) {
      await createReceivablesFromBatch();
      return;
    }
    if (!form.payer_name) {
      toast({ variant: 'destructive', title: 'Pagador obrigatório' });
      return;
    }
    if (!form.data_vencimento) {
      toast({ variant: 'destructive', title: 'Vencimento obrigatório' });
      return;
    }
    if (!displayDateToIso(getDateInputValue('data_emissao'))) {
      toast({ variant: 'destructive', title: 'Data de emissão inválida', description: 'Use o formato dd/mm/aaaa.' });
      return;
    }
    if (!displayDateToIso(getDateInputValue('data_vencimento'))) {
      toast({ variant: 'destructive', title: 'Data de vencimento inválida', description: 'Use o formato dd/mm/aaaa.' });
      return;
    }
    if (form.status === 'received' && getDateInputValue('data_recebimento') && !displayDateToIso(getDateInputValue('data_recebimento'))) {
      toast({ variant: 'destructive', title: 'Data de pagamento inválida', description: 'Use o formato dd/mm/aaaa.' });
      return;
    }
    if (Number(form.valor_bruto || 0) <= 0) {
      toast({ variant: 'destructive', title: 'Valor bruto obrigatório' });
      return;
    }

    // Validate card processor if is card payment
    if (form.status === 'received' && form.is_card_payment && !form.processor_id) {
      toast({ variant: 'destructive', title: 'Selecione uma operadora de cartão' });
      return;
    }

    const parcels = form.parcelado ? Math.max(2, parseInt(form.total_parcelas || '0', 10)) : 1;
    setSaving(true);
    try {
      // Garante regra: apenas um pagador principal setado
      const payload = { ...form };
      if (payload.payer_type !== 'paciente') {
        payload.paciente_id = null;
      }
      if (payload.payer_type !== 'convenio') {
        payload.convenio_id = null;
      }
      if (payload.payer_type !== 'empresa') {
        payload.empresa_id = null;
      }

      // Add card fee data if applicable
      if (form.is_card_payment && cardFeeCalc) {
        payload.fee_percent = cardFeeCalc.feePercent;
        payload.fee_amount = cardFeeCalc.feeAmount;
      }
      payload.card_last4 = form.is_card_payment ? form.card_last4 || null : null;
      payload.net_value = valorLiquido;
      payload.received_value = form.status === 'received' ? valorLiquido : 0;
      payload.data_emissao = displayDateToIso(getDateInputValue('data_emissao'));
      payload.data_vencimento = displayDateToIso(getDateInputValue('data_vencimento'));
      payload.competency_date = displayDateToIso(getDateInputValue('competency_date')) || payload.data_emissao;
      payload.data_recebimento = form.status === 'received'
        ? displayDateToIso(getDateInputValue('data_recebimento')) || new Date().toISOString().slice(0, 10)
        : null;
      payload.taxes_value = documentExtraction?.fields?.taxes_value || 0;
      payload.metadata = {
        ...(payload.metadata || {}),
        document_extraction: buildReceivableDocumentExtractionMetadata(documentExtraction),
        ...(form.is_card_payment ? {
          card: {
            last4: form.card_last4 || null,
            brand: form.card_brand || null,
            processor_id: form.processor_id || null,
            settlement_type: form.settlement_type || null,
          },
        } : {}),
      };

      if (nfFile) {
        const uploadedNf = await uploadReceivableNfFile(clinicId, nfFile);
        payload.nf_document_url = uploadedNf?.url;
        payload.nf_document_name = uploadedNf?.name;
      }

      delete payload.payer_type;

      await createReceivable(clinicId, { ...payload, total_parcelas: parcels });
      invalidateDashboardDataCache(clinicId);
      toast({ title: 'Recebível criado com sucesso!', description: 'Contas a receber, fluxo de caixa e DRE foram atualizados.' });
      navigate('/clinica/financeiro/receber');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Novo Recebimento"
      subtitle="Cadastre um título a receber com rastreabilidade."
    >
      <div className="w-full mx-auto space-y-4">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Cadastro financeiro</p>
                <p className="text-xs text-slate-500">Preencha os dados principais, valores, rastreabilidade e anexos do recebivel.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4 sm:text-left">
                <div className="rounded border bg-white px-3 py-2">
                  <p className="text-slate-500">Pagador</p>
                  <p className="truncate font-semibold text-slate-900">{form.payer_name || 'Nao informado'}</p>
                </div>
                <div className="rounded border bg-white px-3 py-2">
                  <p className="text-slate-500">Vencimento</p>
                  <p className="font-semibold text-slate-900">{getDateInputValue('data_vencimento') || 'Nao definido'}</p>
                </div>
                <div className="rounded border bg-white px-3 py-2">
                  <p className="text-slate-500">Bruto</p>
                  <p className="font-semibold text-slate-900">{Number(form.valor_bruto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="rounded border bg-white px-3 py-2">
                  <p className="text-slate-500">Liquido</p>
                  <p className="font-semibold text-slate-900">{valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={recurringEnabled}
                  onChange={(event) => {
                    setRecurringEnabled(event.target.checked);
                    setRecurringResults([]);
                  }}
                />
                Lançamento recorrente
              </label>
              <span className="text-xs text-slate-500">Busque um lançamento anterior e altere só o necessário.</span>
            </div>

            {recurringEnabled && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    value={recurringSearch}
                    onChange={(event) => setRecurringSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        searchRecurringTemplates();
                      }
                    }}
                    placeholder="Pesquisar por pagador ou descrição do lançamento anterior"
                  />
                  <Button type="button" variant="outline" className="gap-2" onClick={searchRecurringTemplates} disabled={recurringLoading}>
                    <Search className="w-4 h-4" />
                    {recurringLoading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>

                {recurringResults.length > 0 && (
                  <div className="max-h-56 overflow-auto rounded border bg-white divide-y">
                    {recurringResults.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-blue-50"
                        onClick={() => applyRecurringTemplate(row)}
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.patient_name || row.payer_name || 'Sem pagador'}</p>
                          <p className="text-xs text-slate-500">{row.description || row.service_description || 'Sem descrição'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          {Number(row.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          <Copy className="w-4 h-4 text-blue-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <FormSection title="Dados do lançamento">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Origem</Label>
                <select
                  className="w-full border rounded h-9 px-2 text-sm"
                  value={form.origem}
                  onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                >
                  <option>Manual</option>
                  <option>Agenda</option>
                  <option>Faturamento</option>
                  <option>Contrato</option>
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="w-full border rounded h-9 px-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {arStatusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Forma prevista</Label>
                <select
                  className="w-full border rounded h-9 px-2 text-sm"
                  value={form.forma_prevista}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({ ...f, forma_prevista: value, is_card_payment: isCardPaymentMethod(value) }));
                  }}
                >
                  <option value="">Selecione</option>
                  {paymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Pagador</Label>
              {form.payer_type === 'paciente' ? (
                <div>
                  <Input
                    onChange={(e) => {
                      searchPatients(e.target.value);
                      setForm((f) => ({ ...f, payer_name: e.target.value }));
                    }}
                    placeholder="Buscar paciente por nome/CPF"
                  />
                  {patientResults.length > 0 && (
                    <div className="mt-2 border rounded max-h-40 overflow-auto text-sm">
                      {patientResults.map((p) => (
                        <div
                          key={p.id}
                          className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setForm((f) => ({ ...f, payer_name: p.full_name, paciente_id: p.id }));
                            setPatientResults([]);
                          }}
                        >
                          {p.full_name} — {p.cpf}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : form.payer_type === 'convenio' && convenios.length > 0 ? (
                <select
                  className="w-full border rounded h-9 px-2 text-sm"
                  value={form.convenio_id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const item = convenios.find((c) => String(c.id) === String(id));
                    setForm((f) => ({
                      ...f,
                      convenio_id: id || null,
                      payer_name: item?.name || f.payer_name,
                    }));
                  }}
                >
                  <option value="">Selecione um convênio</option>
                  {convenios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : form.payer_type === 'empresa' && empresas.length > 0 ? (
                <select
                  className="w-full border rounded h-9 px-2 text-sm"
                  value={form.empresa_id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const item = empresas.find((c) => String(c.id) === String(id));
                    setForm((f) => ({
                      ...f,
                      empresa_id: id || null,
                      payer_name: item?.name || f.payer_name,
                    }));
                  }}
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={form.payer_name}
                  onChange={(e) => setForm((f) => ({ ...f, payer_name: e.target.value }))}
                  placeholder="Paciente / Convênio / Empresa"
                />
              )}
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Serviço/Contrato"
              />
            </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Tipo de Pagador</Label>
              <select
                className="w-full border rounded h-9 px-2 text-sm"
                value={form.payer_type}
                onChange={(e) => setForm((f) => ({ ...f, payer_type: e.target.value }))}
              >
                <option value="manual">Manual</option>
                <option value="paciente">Paciente</option>
                <option value="convenio">Convênio</option>
                <option value="empresa" disabled={!empresas.length}>
                  Empresa
                </option>
              </select>
            </div>
            <div>
              <Label>Profissional (repasse)</Label>
              <select
                className="w-full border rounded h-9 px-2 text-sm"
                value={form.profissional_id}
                onChange={(e) => setForm((f) => ({ ...f, profissional_id: e.target.value }))}
              >
                <option value="">—</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Plano de Contas</Label>
              <select
                className="w-full border rounded h-9 px-2 text-sm"
                value={form.plano_contas_id}
                onChange={(e) => setForm((f) => ({ ...f, plano_contas_id: e.target.value }))}
              >
                <option value="">—</option>
                {plans.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} - ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            </div>
          </FormSection>

          <FormSection title="Classificação financeira">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Centro de Custo</Label>
              <select
                className="w-full border rounded h-9 px-2 text-sm"
                value={form.centro_custo_id}
                onChange={(e) => setForm((f) => ({ ...f, centro_custo_id: e.target.value }))}
              >
                <option value="">Selecione</option>
                {costCenters.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Competência</Label>
              <Input
                value={getDateInputValue('competency_date')}
                onChange={(e) => handleDateChange('competency_date', e.target.value)}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
              />
            </div>
            <div>
              <Label>Unidade</Label>
              <Input
                value={form.unit_name}
                onChange={(e) => setForm((f) => ({ ...f, unit_name: e.target.value }))}
                placeholder="Unidade / filial"
              />
            </div>
            </div>
          </FormSection>

          <FormSection title="Valores e datas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Valor bruto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor_bruto}
                onChange={(e) => setForm((f) => ({ ...f, valor_bruto: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descontos (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.descontos}
                onChange={(e) => setForm((f) => ({ ...f, descontos: e.target.value }))}
              />
            </div>
            <div>
              <Label>Valor líquido</Label>
              <div className="h-9 flex items-center px-2 border rounded bg-gray-50">
                {valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded border bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Receita DRE</p>
                <p className="font-semibold text-slate-900">{valorBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Descontos e taxas</p>
                <p className="font-semibold text-slate-900">{(valorDescontos + valorTaxaCartao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Líquido previsto</p>
                <p className="font-semibold text-slate-900">{valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Fluxo de caixa</p>
                <p className="font-semibold text-slate-900">{isReceived ? 'Entrada realizada' : 'A receber'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Emissão</Label>
                <Input
                  value={getDateInputValue('data_emissao')}
                  onChange={(e) => handleDateChange('data_emissao', e.target.value)}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input
                  value={getDateInputValue('data_vencimento')}
                  onChange={(e) => handleDateChange('data_vencimento', e.target.value)}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>Pagamento</Label>
                <Input
                  value={getDateInputValue('data_recebimento')}
                  onChange={(e) => handleDateChange('data_recebimento', e.target.value)}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  id="parcelado"
                  type="checkbox"
                  checked={!!form.parcelado}
                  onChange={(e) => setForm((f) => ({ ...f, parcelado: e.target.checked }))}
                />
                <Label htmlFor="parcelado">Parcelado</Label>
                {form.parcelado && (
                  <Input
                    className="ml-2 w-24"
                    placeholder="Parcelas"
                    value={form.total_parcelas}
                    onChange={(e) => setForm((f) => ({ ...f, total_parcelas: e.target.value }))}
                  />
                )}
              </div>
            </div>

          </FormSection>

          <FormSection title="Rastreabilidade e anexos">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Procedimento</Label>
              <Input
                value={form.procedure_name}
                onChange={(e) => setForm((f) => ({ ...f, procedure_name: e.target.value }))}
                placeholder="Procedimento/serviço"
              />
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input
                value={form.specialty_name}
                onChange={(e) => setForm((f) => ({ ...f, specialty_name: e.target.value }))}
                placeholder="Especialidade"
              />
            </div>
            <div>
              <Label>Guia</Label>
              <Input
                value={form.guide_number}
                onChange={(e) => setForm((f) => ({ ...f, guide_number: e.target.value }))}
                placeholder="Nº guia/autorização"
              />
            </div>
            <div>
              <Label>Lote</Label>
              <Input
                value={form.batch_number}
                onChange={(e) => setForm((f) => ({ ...f, batch_number: e.target.value }))}
                placeholder="Lote de faturamento"
              />
            </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded border bg-slate-50 p-3">
              <div>
                <Label>ANS</Label>
                <Input value={form.ans_registration} onChange={(e) => setForm((f) => ({ ...f, ans_registration: e.target.value }))} placeholder="Registro ANS" />
              </div>
              <div>
                <Label>NF / fatura convênio</Label>
                <Input value={form.insurance_invoice_number} onChange={(e) => setForm((f) => ({ ...f, insurance_invoice_number: e.target.value }))} placeholder="Nº NF/fatura" />
              </div>
              <div>
                <Label>Status convênio</Label>
                <select className="w-full border rounded h-9 px-2 text-sm" value={form.insurance_billing_status} onChange={(e) => setForm((f) => ({ ...f, insurance_billing_status: e.target.value }))}>
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
                <select className="w-full border rounded h-9 px-2 text-sm" value={form.tiss_xml_status} onChange={(e) => setForm((f) => ({ ...f, tiss_xml_status: e.target.value }))}>
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
                <select className="w-full border rounded h-9 px-2 text-sm" value={form.insurance_return_status} onChange={(e) => setForm((f) => ({ ...f, insurance_return_status: e.target.value }))}>
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
                <Input value={form.insurance_return_protocol} onChange={(e) => setForm((f) => ({ ...f, insurance_return_protocol: e.target.value }))} placeholder="Recibo/protocolo" />
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
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Observações financeiras, operacionais ou de auditoria"
              />
            </div>
            <ReceivableNfInput
              selectedFile={nfFile}
              selectedFiles={batchFiles}
              onFileSelected={handleNfFileSelected}
              onFilesSelected={handleNfFilesSelected}
              label="Documento/NF/XML da conta a receber"
              multiple
            />
            <p className="text-xs text-slate-600">
              Anexe um documento para preencher o lançamento atual ou selecione varios documentos fiscais para conferir e gerar um lote de recebiveis.
            </p>
            {documentExtraction && (
              <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Conferencia do documento fiscal</p>
                  <span className="rounded border border-blue-200 bg-white px-2 py-1 font-semibold">{documentExtraction.documentType?.toUpperCase()} {documentExtraction.confidence}</span>
                </div>
                {(() => {
                  const fields = documentExtraction.fields || {};
                  const gross = Number(fields.amount || 0);
                  const estimatedCardFee = form.is_card_payment && cardFeeCalc ? Number(cardFeeCalc.feeAmount || 0) : 0;
                  const estimatedNet = Math.max(0, gross - estimatedCardFee);
                  return (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                      <PreviewTile label="Pagador" value={fields.payer_name} />
                      <PreviewTile label="NF/guia" value={fields.invoice_number || fields.guide_number} />
                      <PreviewTile label="Medico" value={fields.doctor_name} />
                      <PreviewTile label="CRM" value={fields.doctor_crm} />
                      <PreviewTile label="Forma" value={fields.payment_method} />
                      <PreviewTile label="Final cartao" value={fields.card_last4 || form.card_last4} />
                      <PreviewTile label="Emissao" value={fields.invoice_date} />
                      <PreviewTile label="Vencimento" value={fields.due_date} />
                      <PreviewTile label="Pagamento" value={fields.payment_date} />
                      <PreviewTile label="Bruto" value={gross ? gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''} />
                      <PreviewTile label="Impostos" value={Number(fields.taxes_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                      <PreviewTile label="Taxa cartao" value={form.is_card_payment && !cardFeeCalc ? 'Selecione operadora' : estimatedCardFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                      <PreviewTile label="Liquido estimado" value={gross ? estimatedNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''} />
                    </div>
                  );
                })()}
                {documentExtraction.warnings?.[0] ? <p className="mt-2 text-amber-800">{documentExtraction.warnings[0]}</p> : null}
              </div>
            )}
            {batchImporting && batchProcessingMessage && (
              <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
                <span>{batchProcessingMessage}</span>
              </div>
            )}
            {batchDocuments.length > 1 && (
              <div className="rounded border bg-white p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-emerald-950">Documentos fiscais lidos</p>
                    <Button
                      type="button"
                      className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
                      onClick={createReceivablesFromBatch}
                      disabled={batchImporting || !batchDocuments.some(isBatchDocumentImportable)}
                    >
                      <PlusCircle className="w-4 h-4" />
                      {batchImporting ? 'Gerando recebiveis...' : `Gerar recebiveis (${batchDocuments.filter(isBatchDocumentImportable).length})`}
                    </Button>
                  </div>

                  <div className="max-h-80 overflow-auto rounded border bg-white divide-y">
                    {batchDocuments.map((item) => {
                      const fields = item.extraction?.fields || {};
                      const gross = Number(fields.amount || 0);
                      const isCard = isCardPaymentMethod(fields.payment_method);
                      const feePreview = isCard ? (form.processor_id ? 'Calculada ao gerar' : 'Selecione operadora') : 'R$ 0,00';
                      const netPreview = isCard ? (form.processor_id ? 'Calculado ao gerar' : 'Selecione operadora') : gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                      return (
                        <div key={item.file.name} className="p-3 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">{item.file.name}</p>
                              <p className={item.status === 'error' ? 'text-xs text-red-700' : item.status === 'review' ? 'text-xs text-amber-700' : 'text-xs text-emerald-700'}>
                                {item.message}
                              </p>
                            </div>
                            <span className={item.status === 'ready' ? 'rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800' : item.status === 'review' ? 'rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800' : 'rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800'}>
                              {item.status === 'ready' ? 'Pronto' : item.status === 'review' ? 'Revisar' : 'Erro'}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
                            <PreviewTile label="Pagador" value={fields.payer_name} />
                            <PreviewTile label="NF/guia" value={fields.invoice_number || fields.guide_number} />
                            <PreviewTile label="Medico" value={fields.doctor_name} />
                            <PreviewTile label="Forma" value={fields.payment_method} />
                            <PreviewTile label="Final cartao" value={fields.card_last4 || form.card_last4} />
                            <PreviewTile label="Emissao" value={fields.invoice_date} />
                            <PreviewTile label="Vencimento" value={fields.due_date} />
                            <PreviewTile label="Pagamento" value={fields.payment_date} />
                            <PreviewTile label="Bruto" value={gross ? gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''} />
                            <PreviewTile label="Impostos" value={Number(fields.taxes_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                            <PreviewTile label="Taxa cartao" value={feePreview} />
                            <PreviewTile label="Liquido" value={gross ? netPreview : ''} />
                            <PreviewTile label="Confiança" value={item.extraction?.confidence} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
            )}
          </FormSection>

          {/* Card Processing Fee Section */}
          {form.is_card_payment && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">💳 Configurar Taxa de Processamento</p>
                  <p className="text-xs text-blue-700 mt-1">Selecione a operadora e forma de recebimento para calcular automaticamente a taxa</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label>Operadora</Label>
                  <select
                    className="w-full border rounded h-9 px-2 text-sm"
                    value={form.processor_id}
                    onChange={(e) => setForm((f) => ({ ...f, processor_id: e.target.value }))}
                  >
                    <option value="">Selecione uma operadora</option>
                    {cardProcessors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
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
                  <select
                    className="w-full border rounded h-9 px-2 text-sm"
                    value={form.card_brand}
                    onChange={(e) => setForm((f) => ({ ...f, card_brand: e.target.value }))}
                  >
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
                  <select
                    className="w-full border rounded h-9 px-2 text-sm"
                    value={form.settlement_type}
                    onChange={(e) => setForm((f) => ({ ...f, settlement_type: e.target.value }))}
                  >
                    <option value="D+0">D+0 (Hoje)</option>
                    <option value="D+1">D+1 (1 dia)</option>
                    <option value="D+30">D+30 (30 dias)</option>
                    <option value="Payment Day">Payment Day (Agendado)</option>
                  </select>
                </div>

                <div>
                  <Label>Ultimos 4 digitos</Label>
                  <Input
                    value={form.card_last4}
                    onChange={(e) => setForm((f) => ({ ...f, card_last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="0000"
                    inputMode="numeric"
                    maxLength={4}
                  />
                  <p className="mt-1 text-xs text-blue-700">Usado para futura conciliacao de cartoes.</p>
                </div>
              </div>

              {/* Fee Calculation Display */}
              {cardFeeCalc && (
                <div className="bg-white border border-blue-300 rounded p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-600">Taxa</p>
                      <p className="text-lg font-bold text-blue-600">{cardFeeCalc.feePercent}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Desconto</p>
                      <p className="text-lg font-bold text-red-600">
                        -R$ {cardFeeCalc.feeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Recebimento Líquido</p>
                      <p className="text-lg font-bold text-green-600">
                        {valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Button variant="outline" onClick={() => navigate('/clinica/financeiro/receber')}>
              Cancelar
            </Button>
            <Button className="bg-blue-600 text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
