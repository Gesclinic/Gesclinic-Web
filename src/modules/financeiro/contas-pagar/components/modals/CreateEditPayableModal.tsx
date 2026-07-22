import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ReceivableNfInput from '@/components/financeiro/ReceivableNfInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, FileSearch, Loader2, ReceiptText, Sparkles } from 'lucide-react';
import { AttachmentType, DreClassification, Payable, PayableCreateInput, PayableType, PayableUpdateInput, PaymentMethodType, RecurrenceType } from '../../types';
import { useAddPayableAttachment, useCreatePayable, useUpdatePayable } from '../../hooks/usePayables';
import { useFileUpload } from '../../hooks/useFileUpload';
import { ParsedPayableDocument, parsePayableDocumentFile } from '../../utils/payableDocumentParser';
import { useFinanceOptions } from '../../hooks/useFinanceOptions';
import { stockSuppliersApi } from '@/lib/stockApi';
import { displayDateToIso, isoToDisplayDate, maskDisplayDate } from '@/lib/receivableUiHelpers';
import {
  labelDreClassification,
  labelPayableType,
  labelPaymentMethod,
  labelRecurrenceType,
} from '../../utils/labels';

interface CreateEditPayableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable?: Payable | null;
  clinicId: string;
  onSuccess?: () => void;
  presentation?: 'modal' | 'page';
}

type ParsedPayableDocumentBatchItem = {
  file: File;
  parsed: ParsedPayableDocument | null;
  status: 'parsed' | 'manual' | 'error';
  message: string;
};

type BatchProgressState = {
  active: boolean;
  current: number;
  total: number;
  created: number;
  failed: number;
  fileName: string;
  stage: string;
};

function getDateInputValue(value?: string | null) {
  if (!value) return '';
  return String(value).includes('-') ? isoToDisplayDate(value) : String(value);
}

function normalizePayableDateInput(value?: string | null) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.split('T')[0];
  return displayDateToIso(text);
}

function formatDate(value?: string | null) {
  return getDateInputValue(value) || 'Sem data';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) return message;
  }
  return fallback;
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = 45000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export const CreateEditPayableModal: React.FC<CreateEditPayableModalProps> = ({
  open,
  onOpenChange,
  payable,
  clinicId,
  onSuccess,
  presentation = 'modal',
}) => {
  const isEditMode = !!payable;
  const [activeTab, setActiveTab] = useState('geral');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [parsedDocument, setParsedDocument] = useState<ParsedPayableDocument | null>(null);
  const [batchDocuments, setBatchDocuments] = useState<ParsedPayableDocumentBatchItem[]>([]);
  const [documentStatus, setDocumentStatus] = useState('');
  const [batchProgress, setBatchProgress] = useState<BatchProgressState>({
    active: false,
    current: 0,
    total: 0,
    created: 0,
    failed: 0,
    fileName: '',
    stage: '',
  });

  // Form state
  const [formData, setFormData] = useState<Partial<Payable>>({
    supplier_name: '',
    document_number: '',
    invoice_number: '',
    invoice_series: '',
    description: '',
    observations: '',
    type: PayableType.SUPPLIER,
    category: '',
    subcategory: '',
    issue_date: new Date().toISOString().split('T')[0],
    competency_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    amount: 0,
    interest_amount: 0,
    fine_amount: 0,
    discount_amount: 0,
    payment_method: PaymentMethodType.PIX,
    payment_bank: '',
    chart_account_id: '',
    cost_center_id: '',
    financial_plan_account_id: '',
    dre_classification: DreClassification.OPERATIONAL,
    is_recurring: false,
    recurrence_type: RecurrenceType.MONTHLY,
    recurrence_interval: 1,
    installments: 1,
    ...payable,
  });

  const createMutation = useCreatePayable();
  const updateMutation = useUpdatePayable();
  const addAttachmentMutation = useAddPayableAttachment();
  const { uploadFile, isUploading, error: uploadError } = useFileUpload();
  const { accountPlans, costCenters, financialPlanAccounts, isLoading: isLoadingFinanceOptions } = useFinanceOptions();

  const enrichParsedSupplier = async (parsed: ParsedPayableDocument | null): Promise<ParsedPayableDocument | null> => {
    if (!parsed?.document_number) {
      return parsed;
    }

    const existingSupplier = await stockSuppliersApi.findByDocument(clinicId, parsed.document_number).catch(() => null);
    const publicSupplier = existingSupplier || await stockSuppliersApi.lookupPublicRegistration(parsed.document_number).catch(() => null);
    if (!publicSupplier?.name) {
      return parsed;
    }

    const supplierAddress = parsed.supplier_address || {};
    return {
      ...parsed,
      supplier_name: parsed.supplier_name || publicSupplier.name,
      supplier_address: {
        ...supplierAddress,
        street: supplierAddress.street || publicSupplier.address || undefined,
        district: supplierAddress.district || publicSupplier.neighborhood || undefined,
        city: supplierAddress.city || publicSupplier.city || undefined,
        state: supplierAddress.state || publicSupplier.state || undefined,
        zip_code: supplierAddress.zip_code || publicSupplier.zip_code || undefined,
        phone: supplierAddress.phone || publicSupplier.contact_phone || undefined,
      },
      metadata: {
        ...(parsed.metadata || {}),
        public_supplier_lookup: {
          source: existingSupplier ? 'stock_suppliers' : 'brasilapi_cnpj',
          matched_at: new Date().toISOString(),
          document: publicSupplier.cnpj || parsed.document_number,
          name: publicSupplier.name,
        },
        nfe: {
          ...(parsed.metadata?.nfe || {}),
          supplier_name: parsed.metadata?.nfe?.supplier_name || publicSupplier.name,
          supplier_document: parsed.metadata?.nfe?.supplier_document || parsed.document_number,
          supplier: {
            ...(parsed.metadata?.nfe?.supplier || {}),
            name: parsed.metadata?.nfe?.supplier?.name || publicSupplier.name,
            document: parsed.metadata?.nfe?.supplier?.document || parsed.document_number,
            phone: parsed.metadata?.nfe?.supplier?.phone || publicSupplier.contact_phone || null,
          },
        },
      },
    };
  };

  const ensureStockSupplierFromDocument = async (source: Partial<ParsedPayableDocument & Payable>) => {
    const supplierAddress = source.supplier_address || source.metadata?.nfe?.supplier?.address || {};
    const supplierMetadata = source.metadata?.nfe?.supplier || {};
    const supplier = await stockSuppliersApi.ensureFromDocument(clinicId, {
      name: source.supplier_name || supplierMetadata.name,
      cnpj: source.supplier_document || source.document_number || supplierMetadata.document,
      contact_name: supplierMetadata.fantasy_name || source.supplier_name,
      phone: supplierAddress.phone || supplierMetadata.phone,
      street: supplierAddress.street,
      number: supplierAddress.number,
      address: [supplierAddress.street, supplierAddress.number].filter(Boolean).join(', ') || undefined,
      neighborhood: supplierAddress.district,
      city: supplierAddress.city,
      state: supplierAddress.state,
      zip_code: supplierAddress.zip_code,
    });
    if (!supplier?.id && (source.supplier_document || source.document_number || supplierMetadata.document)) {
      throw new Error('Nao foi possivel identificar ou cadastrar o fornecedor pelo CNPJ/CPF informado no documento. Verifique o cadastro publico ou preencha o fornecedor manualmente.');
    }
    return supplier?.id || undefined;
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setActiveTab('geral');
      setErrors({});
      setDocumentFile(null);
      setDocumentFiles([]);
      setParsedDocument(null);
      setBatchDocuments([]);
      setDocumentStatus('');
      setBatchProgress({ active: false, current: 0, total: 0, created: 0, failed: 0, fileName: '', stage: '' });
    } else if (isEditMode && payable) {
      setFormData(payable);
    }
  }, [open, isEditMode, payable]);

  const applyParsedDocument = (parsed: ParsedPayableDocument) => {
    const medicationTraceability = parsed.metadata?.nfe?.medication_traceability || [];
    const documentInstallments = parsed.installments?.length ? parsed.installments : parsed.metadata?.document_installments || [];
    setFormData((prev) => ({
      ...prev,
      supplier_name: parsed.supplier_name || prev.supplier_name,
      supplier_document: parsed.document_number || prev.supplier_document,
      document_number: parsed.document_number || prev.document_number,
      invoice_number: parsed.invoice_number || prev.invoice_number,
      invoice_series: parsed.invoice_series || prev.invoice_series,
      issue_date: parsed.issue_date || prev.issue_date,
      competency_date: parsed.issue_date || prev.competency_date,
      due_date: parsed.due_date || prev.due_date,
      amount: parsed.amount ?? prev.amount,
      discount_amount: parsed.discount_amount ?? prev.discount_amount,
      description: parsed.description || prev.description,
      payment_method: parsed.payment_method || prev.payment_method,
      installments: documentInstallments.length > 1 ? documentInstallments.length : prev.installments || 1,
      has_invoice: true,
      document_taxes: parsed.taxes || prev.document_taxes || {},
      document_items: parsed.items || prev.document_items || [],
      medication_traceability: medicationTraceability.length ? medicationTraceability : prev.medication_traceability || [],
      metadata: {
        ...(prev.metadata || {}),
        ...(parsed.metadata || {}),
        document_installments: documentInstallments,
      },
    }));
  };

  const handleDocumentSelected = async (file: File | null) => {
    setDocumentFile(file);
    setDocumentFiles(file ? [file] : []);
    setBatchDocuments([]);
    setParsedDocument(null);
    setDocumentStatus('');
    if (!file) {
      return;
    }

    try {
      const parsed = await enrichParsedSupplier(await parsePayableDocumentFile(file));
      if (parsed) {
        setParsedDocument(parsed);
        applyParsedDocument(parsed);
        setDocumentStatus(
          parsed.document_type === 'document'
            ? 'Arquivo anexado para conferencia manual. XML e TXT permitem leitura automatica dos campos.'
            : 'Documento fiscal lido e campos principais preenchidos automaticamente.',
        );
        setActiveTab('geral');
      } else {
        setDocumentStatus('Arquivo anexado. Para PDF/imagem, revise e preencha os campos manualmente.');
      }
    } catch (error) {
      setDocumentStatus(error instanceof Error ? error.message : 'Nao foi possivel ler o documento.');
    }
  };

  const handleDocumentFilesSelected = async (files: File[]) => {
    const selected = Array.from(files || []).filter(Boolean);
    setDocumentFiles(selected);
    setDocumentFile(selected[0] || null);
    setParsedDocument(null);
    setBatchDocuments([]);
    setDocumentStatus('');
    setBatchProgress({ active: false, current: 0, total: 0, created: 0, failed: 0, fileName: '', stage: '' });

    if (!selected.length) {
      return;
    }

    setDocumentStatus(`Lendo ${selected.length} documento(s) fiscal(is)...`);
    const parsedItems: ParsedPayableDocumentBatchItem[] = [];
    for (const [index, file] of selected.entries()) {
      setDocumentStatus(`Lendo documento ${index + 1} de ${selected.length}: ${file.name}`);
      try {
        const parsed = await enrichParsedSupplier(await parsePayableDocumentFile(file));
        parsedItems.push({
          file,
          parsed,
          status: parsed?.document_type === 'document' ? 'manual' : parsed ? 'parsed' : 'manual',
          message: parsed
            ? parsed.document_type === 'document'
              ? 'Anexo manual; revise valor/fornecedor antes de criar.'
              : parsed.supplier_name
                ? 'Leitura concluida. Fornecedor identificado.'
                : 'Leitura concluida. Fornecedor sera consultado pelo CNPJ/CPF ao salvar.'
            : 'Arquivo anexado sem leitura automatica.',
        });
      } catch (error) {
        parsedItems.push({
          file,
          parsed: null,
          status: 'error',
          message: error instanceof Error ? error.message : 'Nao foi possivel ler o documento.',
        });
      }
    }

    setBatchDocuments(parsedItems);
    const firstParsed = parsedItems.find((item) => item.parsed)?.parsed || null;
    if (firstParsed && selected.length === 1) {
      setParsedDocument(firstParsed);
      applyParsedDocument(firstParsed);
      setActiveTab('geral');
    }

    const parsedCount = parsedItems.filter((item) => item.status === 'parsed').length;
    const errorCount = parsedItems.filter((item) => item.status === 'error').length;
    setDocumentStatus(`${selected.length} documento(s) selecionado(s). ${parsedCount} com leitura automatica.${errorCount ? ` ${errorCount} com erro.` : ''}`);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplier_name?.trim()) {
      newErrors.supplier_name = 'Fornecedor é obrigatório';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Data de vencimento é obrigatória';
    }
    if (formData.issue_date && !normalizePayableDateInput(formData.issue_date)) {
      newErrors.issue_date = 'Data de emissão inválida';
    }
    if (formData.competency_date && !normalizePayableDateInput(formData.competency_date)) {
      newErrors.competency_date = 'Data de competência inválida';
    }
    if (formData.due_date && !normalizePayableDateInput(formData.due_date)) {
      newErrors.due_date = 'Data de vencimento inválida';
    }
    if (formData.recurrence_end_date && !normalizePayableDateInput(formData.recurrence_end_date)) {
      newErrors.recurrence_end_date = 'Data final inválida';
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Valor deve ser maior que 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const shouldCreateBatch = !isEditMode && batchDocuments.length > 1;
    if (shouldCreateBatch) {
      setIsSubmitting(true);
      try {
        const failures: string[] = [];
        let createdCount = 0;
        const parsedTotal = batchDocuments.filter((item) => item.parsed && item.status !== 'error').length;
        setDocumentStatus(`Gerando lote de contas a pagar: 0 de ${parsedTotal} processado(s).`);
        setBatchProgress({
          active: true,
          current: 0,
          total: parsedTotal,
          created: 0,
          failed: 0,
          fileName: '',
          stage: 'Preparando lote de documentos fiscais',
        });

        for (const [index, item] of batchDocuments.entries()) {
          try {
            if (!item.parsed || item.status === 'error') {
              throw new Error(item.message || 'Documento sem leitura automatica.');
            }

            const currentNumber = createdCount + failures.length + 1;
            setDocumentStatus(`Processando ${currentNumber} de ${parsedTotal}: ${item.file.name}`);
            setBatchProgress({
              active: true,
              current: currentNumber,
              total: parsedTotal,
              created: createdCount,
              failed: failures.length,
              fileName: item.file.name,
              stage: 'Conferindo/cadastrando fornecedor',
            });
            const enrichedParsed = await withTimeout(
              enrichParsedSupplier(item.parsed),
              `Tempo excedido ao consultar cadastro publico do fornecedor do arquivo ${item.file.name}.`,
            );
            if (!enrichedParsed) {
              throw new Error('Documento sem leitura automatica.');
            }
            const supplierId = await withTimeout(
              ensureStockSupplierFromDocument(enrichedParsed),
              `Tempo excedido ao cadastrar fornecedor do arquivo ${item.file.name}. Tente novamente ou cadastre o fornecedor manualmente.`,
            );
            const payableInput = {
              ...buildPayableInputFromDocument(formData, enrichedParsed, item.file),
              supplier_id: supplierId,
            };
            setBatchProgress((prev) => ({ ...prev, stage: 'Anexando documento fiscal' }));
            const uploadedDocument = await withTimeout(
              uploadFile(item.file, getAttachmentType(item.file)),
              `Tempo excedido ao anexar o arquivo ${item.file.name}. Verifique a conexao e tente novamente.`,
            );
            if (!uploadedDocument) {
              throw new Error(uploadError || 'Nao foi possivel anexar o documento.');
            }

            setBatchProgress((prev) => ({ ...prev, stage: 'Criando conta a pagar' }));
            const savedPayable = await withTimeout(
              createMutation.mutateAsync({
                clinicId,
                input: {
                  ...payableInput,
                  ...buildUploadedDocumentPatch(item.file, uploadedDocument, enrichedParsed, payableInput.metadata),
                } as PayableCreateInput,
              }),
              `Tempo excedido ao criar a conta a pagar do arquivo ${item.file.name}.`,
            );

            if (savedPayable?.id) {
              setBatchProgress((prev) => ({ ...prev, stage: 'Vinculando anexo a conta criada' }));
              await withTimeout(
                addAttachmentMutation.mutateAsync({
                  clinicId,
                  apBillId: savedPayable.id,
                  attachment: {
                    file_name: uploadedDocument.filename,
                    file_path: uploadedDocument.path,
                    file_type: item.file.type || 'application/octet-stream',
                    file_size: item.file.size || 0,
                    attachment_type: getAttachmentType(item.file),
                  },
                }),
                `Conta criada, mas houve demora ao vincular o anexo ${item.file.name}.`,
              );
            }
            createdCount += 1;
            setDocumentStatus(`${createdCount} de ${parsedTotal} conta(s) a pagar criada(s) do lote.`);
            setBatchProgress((prev) => ({ ...prev, created: createdCount, stage: 'Conta criada com sucesso' }));
          } catch (error) {
            failures.push(`${item.file.name}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
            setDocumentStatus(`Falha no documento ${index + 1} de ${batchDocuments.length}. Continuando o lote...`);
            setBatchProgress((prev) => ({ ...prev, failed: failures.length, stage: 'Falha neste documento; seguindo para o proximo' }));
          }
        }

        if (failures.length) {
          setErrors({ submit: `${createdCount} lancamento(s) criado(s). Falhas: ${failures.join(' | ')}` });
          setBatchProgress((prev) => ({ ...prev, active: false, stage: 'Lote concluido com falhas' }));
          if (createdCount > 0) onSuccess?.();
          return;
        }

        setDocumentStatus(`${createdCount} conta(s) a pagar criada(s). Fornecedores do XML conferidos no Estoque.`);
        setBatchProgress((prev) => ({ ...prev, active: false, created: createdCount, stage: 'Lote criado com sucesso' }));
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        console.error('Error saving payable batch:', error);
        setErrors({ submit: getErrorMessage(error, 'Erro ao criar lote. Tente novamente.') });
        setBatchProgress((prev) => ({ ...prev, active: false, stage: 'Erro ao criar lote' }));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedDocument: Awaited<ReturnType<typeof uploadFile>> = null;
      if (documentFile) {
        uploadedDocument = await uploadFile(documentFile, getAttachmentType(documentFile));
        if (!uploadedDocument) {
          throw new Error(uploadError || 'Nao foi possivel anexar o documento/NF.');
        }
      }

      const documentPatch = uploadedDocument
        ? buildUploadedDocumentPatch(documentFile, uploadedDocument, parsedDocument, formData.metadata)
        : {};
      const supplierId = parsedDocument
        ? await ensureStockSupplierFromDocument(parsedDocument)
        : await ensureStockSupplierFromDocument(formData as Partial<ParsedPayableDocument & Payable>);
      const supplierPatch = supplierId ? { supplier_id: supplierId } : {};

      let savedPayable: Payable;
      if (isEditMode && payable?.id) {
        savedPayable = await updateMutation.mutateAsync({
          id: payable.id,
          ...formData,
          ...documentPatch,
          ...supplierPatch,
        } as PayableUpdateInput);
      } else {
        savedPayable = await createMutation.mutateAsync({
          clinicId,
          input: {
            ...formData,
            ...documentPatch,
            ...supplierPatch,
          } as PayableCreateInput,
        });
      }

      if (uploadedDocument && savedPayable?.id) {
        await addAttachmentMutation.mutateAsync({
          clinicId,
          apBillId: savedPayable.id,
          attachment: {
            file_name: uploadedDocument.filename,
            file_path: uploadedDocument.path,
            file_type: documentFile?.type || 'application/octet-stream',
            file_size: documentFile?.size || 0,
            attachment_type: documentFile ? getAttachmentType(documentFile) : AttachmentType.INVOICE,
          },
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving payable:', error);
      setErrors({ submit: getErrorMessage(error, 'Erro ao salvar. Tente novamente.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Payable, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDateInputChange = (field: keyof Payable, value: string) => {
    const masked = maskDisplayDate(value);
    handleInputChange(field, displayDateToIso(masked) || masked);
  };

  const netAmount =
    (formData.amount || 0) +
    (formData.interest_amount || 0) +
    (formData.fine_amount || 0) -
    (formData.discount_amount || 0);
  const batchProgressPercent = batchProgress.total > 0
    ? Math.min(100, Math.round(((batchProgress.created + batchProgress.failed) / batchProgress.total) * 100))
    : 0;

  const nfeReview = React.useMemo(() => {
    const metadataNfe = formData.metadata?.nfe || {};
    const metadataDocument = formData.metadata?.document_extraction || {};
    const metadataFields = metadataDocument.fields || {};
    return {
      document_type: parsedDocument?.document_type || metadataDocument.documentType || (metadataNfe.invoice_number ? 'nfe' : null),
      confidence: parsedDocument?.confidence || metadataDocument.confidence || null,
      warnings: parsedDocument?.warnings || metadataDocument.warnings || [],
      supplier_name: parsedDocument?.supplier_name || metadataFields.supplier_name || metadataNfe.supplier_name || formData.supplier_name,
      document_number: parsedDocument?.document_number || metadataFields.supplier_document || metadataNfe.supplier_document || formData.document_number,
      invoice_number:
        parsedDocument?.invoice_number
        || metadataFields.guide_number
        || metadataFields.invoice_number
        || metadataFields.nf_number
        || metadataFields.numero_nota
        || metadataNfe.invoice_number
        || formData.invoice_number,
      invoice_series: parsedDocument?.invoice_series || metadataFields.invoice_series || metadataNfe.invoice_series || formData.invoice_series,
      issue_date: parsedDocument?.issue_date || metadataFields.issue_date || metadataNfe.issue_date || formData.issue_date,
      due_date: parsedDocument?.due_date || metadataFields.due_date || metadataNfe.due_date || formData.due_date,
      amount: parsedDocument?.amount ?? metadataFields.amount ?? formData.amount,
      payment_method: parsedDocument?.payment_method || metadataFields.payment_method || formData.payment_method,
      items: parsedDocument?.items || formData.document_items || metadataNfe.items || [],
      taxes: parsedDocument?.taxes || formData.document_taxes || metadataDocument.taxes || metadataNfe.taxes || {},
      medication_traceability: parsedDocument?.metadata?.nfe?.medication_traceability || formData.medication_traceability || metadataNfe.medication_traceability || [],
      hasXmlData: Boolean(
        parsedDocument
        || metadataDocument.documentType
        || formData.document_items?.length
        || Object.keys(formData.document_taxes || {}).length
        || formData.medication_traceability?.length
        || metadataNfe.items?.length
        || metadataNfe.medication_traceability?.length
      ),
    };
  }, [formData, parsedDocument]);

  const formContent = (
    <div className={presentation === 'page' ? 'space-y-4 p-4' : 'space-y-4'}>
        {presentation === 'modal' && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
          <DialogDescription>
            Informe os dados financeiros, contabeis, recorrencia e anexos da conta a pagar.
          </DialogDescription>
        </DialogHeader>
        )}

        {errors.submit && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">{errors.submit}</span>
          </div>
        )}

        {presentation === 'page' && (
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 -mx-4 -mt-4">
            <p className="text-sm font-semibold text-slate-900">Cadastro financeiro</p>
            <p className="text-xs text-slate-500">Organize fornecedor, vencimento, classificacao, anexos e impacto no fluxo de caixa.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm shadow-sm md:grid-cols-4">
          <div className="rounded border bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Fornecedor</p>
            <p className="font-semibold text-slate-900 truncate">{formData.supplier_name || 'Nao informado'}</p>
          </div>
          <div className="rounded border bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Valor no fluxo</p>
            <p className="font-semibold text-slate-900">{netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div className="rounded border bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Vencimento</p>
            <p className="font-semibold text-slate-900">{formatDate(formData.due_date)}</p>
          </div>
          <div className="rounded border bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Pagamento previsto</p>
            <p className="font-semibold text-slate-900">{labelPaymentMethod(formData.payment_method) || 'Nao definido'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-slate-100 p-1 md:grid-cols-6">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="contabil">Contábil</TabsTrigger>
              <TabsTrigger value="parcelamento">Parcelamento</TabsTrigger>
              <TabsTrigger value="recorrencia">Recorrência</TabsTrigger>
              <TabsTrigger value="anexos">Anexos</TabsTrigger>
            </TabsList>

            {/* ABA 1: GERAL */}
            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <Input
                    value={formData.supplier_name || ''}
                    onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                    placeholder="Nome do fornecedor"
                    className={errors.supplier_name ? 'border-red-500' : ''}
                  />
                  {errors.supplier_name && (
                    <p className="text-xs text-red-600">{errors.supplier_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Documento</Label>
                  <Input
                    value={formData.document_number || ''}
                    onChange={(e) => handleInputChange('document_number', e.target.value)}
                    placeholder="CNPJ/CPF"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Número NF</Label>
                  <Input
                    value={formData.invoice_number || ''}
                    onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                    placeholder="Número da nota"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Série NF</Label>
                  <Input
                    value={formData.invoice_series || ''}
                    onChange={(e) => handleInputChange('invoice_series', e.target.value)}
                    placeholder="Série"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.type || PayableType.SUPPLIER}
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PayableType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {labelPayableType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={formData.category || ''}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="Categoria"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subcategoria</Label>
                  <Input
                    value={formData.subcategory || ''}
                    onChange={(e) => handleInputChange('subcategory', e.target.value)}
                    placeholder="Subcategoria"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Emissão</Label>
                  <Input
                    value={getDateInputValue(formData.issue_date)}
                    onChange={(e) => handleDateInputChange('issue_date', e.target.value)}
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    className={errors.issue_date ? 'border-red-500' : ''}
                  />
                  {errors.issue_date && (
                    <p className="text-xs text-red-600">{errors.issue_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Data Competência</Label>
                  <Input
                    value={getDateInputValue(formData.competency_date)}
                    onChange={(e) => handleDateInputChange('competency_date', e.target.value)}
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    className={errors.competency_date ? 'border-red-500' : ''}
                  />
                  {errors.competency_date && (
                    <p className="text-xs text-red-600">{errors.competency_date}</p>
                  )}
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Vencimento *</Label>
                  <Input
                    value={getDateInputValue(formData.due_date)}
                    onChange={(e) => handleDateInputChange('due_date', e.target.value)}
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    className={errors.due_date ? 'border-red-500' : ''}
                  />
                  {errors.due_date && (
                    <p className="text-xs text-red-600">{errors.due_date}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição do pagamento"
                  rows={3}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-xs text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observations || ''}
                  onChange={(e) => handleInputChange('observations', e.target.value)}
                  placeholder="Observações adicionais"
                  rows={2}
                />
              </div>

              <NfeReviewPanel
                review={nfeReview}
                onOpenAttachments={() => setActiveTab('anexos')}
                onFilesSelected={handleDocumentFilesSelected}
              />
            </TabsContent>

            {/* ABA 2: FINANCEIRO */}
            <TabsContent value="financeiro" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Original *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount || 0}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
                    className={errors.amount ? 'border-red-500' : ''}
                  />
                  {errors.amount && (
                    <p className="text-xs text-red-600">{errors.amount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Juros</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interest_amount || 0}
                    onChange={(e) => handleInputChange('interest_amount', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Multa</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.fine_amount || 0}
                    onChange={(e) => handleInputChange('fine_amount', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.discount_amount || 0}
                    onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  Valor Líquido: R$ {netAmount.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select
                    value={formData.payment_method || PaymentMethodType.PIX}
                    onValueChange={(value) => handleInputChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PaymentMethodType).map((method) => (
                        <SelectItem key={method} value={method}>
                          {labelPaymentMethod(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input
                    value={formData.payment_bank || ''}
                    onChange={(e) => handleInputChange('payment_bank', e.target.value)}
                    placeholder="Banco de pagamento"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Conta Financeira</Label>
                <Input
                  value={formData.financial_account_id || ''}
                  onChange={(e) => handleInputChange('financial_account_id', e.target.value)}
                  placeholder="ID da conta financeira"
                />
              </div>

              <NfeFinancialReviewPanel
                review={nfeReview}
                netAmount={netAmount}
                onOpenAttachments={() => setActiveTab('anexos')}
              />
            </TabsContent>

            {/* ABA 3: CONTÁBIL */}
            <TabsContent value="contabil" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plano de Contas</Label>
                  <Select
                    value={formData.chart_account_id || '__none'}
                    onValueChange={(value) => handleInputChange('chart_account_id', value === '__none' ? '' : value)}
                    disabled={isLoadingFinanceOptions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Nao informado</SelectItem>
                      {accountPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.code ? `${plan.code} - ${plan.name}` : plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <Select
                    value={formData.cost_center_id || '__none'}
                    onValueChange={(value) => handleInputChange('cost_center_id', value === '__none' ? '' : value)}
                    disabled={isLoadingFinanceOptions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Nao informado</SelectItem>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.code ? `${center.code} - ${center.name}` : center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Plano Financeiro</Label>
                  <Select
                    value={formData.financial_plan_account_id || '__none'}
                    onValueChange={(value) => handleInputChange('financial_plan_account_id', value === '__none' ? '' : value)}
                    disabled={isLoadingFinanceOptions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Nao informado</SelectItem>
                      {financialPlanAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code ? `${account.code} - ${account.name}` : account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Classificação DRE</Label>
                  <Select
                    value={formData.dre_classification || DreClassification.OPERATIONAL}
                    onValueChange={(value) => handleInputChange('dre_classification', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(DreClassification).map((classification) => (
                        <SelectItem key={classification} value={classification}>
                          {labelDreClassification(classification)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Conta Financeira</Label>
                  <Input
                    value={formData.financial_account_id || ''}
                    onChange={(e) => handleInputChange('financial_account_id', e.target.value)}
                    placeholder="Conta financeira ou ID bancario"
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                Plano de contas, centro de custo, competencia e classificacao DRE alimentam os paineis de resultado, fluxo de caixa e rateios.
              </div>
            </TabsContent>

            {/* ABA 4: PARCELAMENTO */}
            <TabsContent value="parcelamento" className="space-y-4">
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.installments || 1}
                  onChange={(e) => handleInputChange('installments', parseInt(e.target.value))}
                />
              </div>

              {formData.installments && formData.installments > 1 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-900">
                    Cada parcela: R$ {(netAmount / formData.installments).toFixed(2)}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ABA 5: RECORRÊNCIA */}
            <TabsContent value="recorrencia" className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  title="Despesa recorrente"
                  checked={formData.is_recurring || false}
                  onChange={(e) => handleInputChange('is_recurring', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_recurring" className="cursor-pointer">
                  Esta é uma despesa recorrente
                </Label>
              </div>

              {formData.is_recurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select
                      value={formData.recurrence_type || RecurrenceType.MONTHLY}
                      onValueChange={(value) => handleInputChange('recurrence_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(RecurrenceType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {labelRecurrenceType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Intervalo (dias)</Label>
                    <Input
                      type="number"
                      value={formData.recurrence_interval || 1}
                      onChange={(e) => handleInputChange('recurrence_interval', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Data Final</Label>
                    <Input
                      value={getDateInputValue(formData.recurrence_end_date)}
                      onChange={(e) => handleDateInputChange('recurrence_end_date', e.target.value)}
                      placeholder="dd/mm/aaaa"
                      inputMode="numeric"
                      className={errors.recurrence_end_date ? 'border-red-500' : ''}
                    />
                    {errors.recurrence_end_date && (
                      <p className="text-xs text-red-600">{errors.recurrence_end_date}</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ABA 6: ANEXOS */}
            <TabsContent value="anexos" className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-blue-700" />
                  <div>
                    <h3 className="font-semibold text-blue-950">Leitura assistida de cupom, NF e XML</h3>
                    <p className="mt-1 text-sm text-blue-800">
                      Anexe XML de NF-e, NFC-e, NFS-e, SAT/CFe ou cupom em TXT para preencher automaticamente fornecedor, documento, numero, serie, datas, valor, impostos, itens, forma prevista de pagamento e rastreabilidade de medicamentos. PDF e foto ficam anexados para conferencia manual.
                    </p>
                  </div>
                </div>
              </div>

              <ReceivableNfInput
                selectedFile={documentFile}
                selectedFiles={documentFiles}
                onFileSelected={handleDocumentSelected}
                onFilesSelected={handleDocumentFilesSelected}
                currentUrl={formData.attachment_url || formData.invoice_pdf_url || formData.invoice_xml_url}
                currentName={formData.invoice_number ? `NF ${formData.invoice_number}` : 'Documento atual'}
                label="Cupom/NF/XML da conta a pagar"
                multiple={!isEditMode}
              />

              {(documentStatus || uploadError) && (
                <div className="rounded border bg-white p-3 text-sm text-slate-700">
                  {uploadError ? uploadError : documentStatus}
                </div>
              )}

              {parsedDocument && (
                <div className="rounded-lg border bg-white p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-slate-900">Dados encontrados no documento</h3>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyParsedDocument(parsedDocument)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aplicar novamente
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <InfoTile label="Fornecedor" value={parsedDocument.supplier_name} />
                    <InfoTile label="CNPJ/CPF" value={parsedDocument.document_number} />
                    <InfoTile label="Tipo" value={formatDocumentType(parsedDocument.document_type)} />
                    <InfoTile label="Numero" value={parsedDocument.invoice_number ? `${parsedDocument.invoice_number}${parsedDocument.invoice_series ? ` / Serie ${parsedDocument.invoice_series}` : ''}` : undefined} />
                    <InfoTile label="Emissao" value={getDateInputValue(parsedDocument.issue_date)} />
                    <InfoTile label="Vencimento" value={getDateInputValue(parsedDocument.due_date)} />
                    <InfoTile label="Valor" value={parsedDocument.amount !== undefined ? `R$ ${parsedDocument.amount.toFixed(2)}` : undefined} />
                    <InfoTile label="Confianca" value={parsedDocument.confidence} />
                  </div>

                  {parsedDocument.warnings?.length ? (
                    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {parsedDocument.warnings.join(' ')}
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">Itens</p>
                    <div className="max-h-44 overflow-auto rounded border divide-y">
                      {parsedDocument.items.length ? parsedDocument.items.map((item, index) => (
                        <div key={`${item.code || index}-${item.description}`} className="grid grid-cols-1 gap-1 px-3 py-2 text-sm md:grid-cols-[1fr_auto]">
                          <span className="font-medium text-slate-800">{item.description}</span>
                          <span className="text-slate-600">
                            {item.quantity || 0} x R$ {(item.unit_value || 0).toFixed(2)} = R$ {(item.total_value || 0).toFixed(2)}
                          </span>
                          {(item.anvisa_code || item.traceability.length > 0) && (
                            <div className="md:col-span-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                              <p className="font-semibold">Rastreabilidade de medicamento</p>
                              {item.anvisa_code && <p>ANVISA: {item.anvisa_code}</p>}
                              {item.pmc_value !== undefined && <p>PMC: R$ {item.pmc_value.toFixed(2)}</p>}
                              {item.traceability.length > 0 ? item.traceability.map((trace, traceIndex) => (
                                <p key={`${trace.batch_number || traceIndex}-${trace.expiration_date || ''}`}>
                                  Lote: {trace.batch_number || 'Nao informado'} | Qtd.: {trace.batch_quantity ?? 'Nao informada'} | Fabricacao: {trace.manufacture_date || 'Nao informada'} | Validade: {trace.expiration_date || 'Nao informada'}{trace.aggregation_code ? ` | Agregacao: ${trace.aggregation_code}` : ''}
                                </p>
                              )) : (
                                <p>Lote e validade nao informados no XML.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhum item encontrado.</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parsedDocument.taxes).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="bg-slate-50">
                        {key.toUpperCase()}: R$ {Number(value || 0).toFixed(2)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {batchDocuments.length > 1 && (
                <div className="rounded-lg border bg-white p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-slate-900">Lote de documentos fiscais</h3>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                      {batchDocuments.length} arquivo(s)
                    </Badge>
                  </div>

                  <div className="max-h-72 overflow-auto rounded border divide-y">
                    {batchDocuments.map((item) => (
                      <div key={item.file.name} className="grid grid-cols-1 gap-2 px-3 py-3 text-sm md:grid-cols-[1fr_auto]">
                        <div>
                          <p className="font-semibold text-slate-900">{item.file.name}</p>
                          <p className="text-xs text-slate-500">{item.message}</p>
                          {item.parsed && (
                            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                              <InfoTile label="Fornecedor" value={item.parsed.supplier_name} />
                              <InfoTile label="Tipo" value={formatDocumentType(item.parsed.document_type)} />
                              <InfoTile label="Numero" value={item.parsed.invoice_number} />
                              <InfoTile label="Valor" value={item.parsed.amount !== undefined ? money(item.parsed.amount) : undefined} />
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            item.status === 'parsed'
                              ? 'h-fit bg-emerald-50 text-emerald-800 border-emerald-200'
                              : item.status === 'error'
                                ? 'h-fit bg-red-50 text-red-800 border-red-200'
                                : 'h-fit bg-amber-50 text-amber-800 border-amber-200'
                          }
                        >
                          {item.status === 'parsed' ? 'Lido' : item.status === 'error' ? 'Erro' : 'Manual'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <ReceiptText className="mt-0.5 h-5 w-5 text-slate-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Impacto no fluxo de caixa</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Ao salvar, o titulo usa o vencimento, valor liquido e forma de pagamento informados para compor as previsoes e pagamentos do fluxo de caixa.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {batchProgress.active && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              <div className="flex items-start gap-3">
                <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-blue-700" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Criando lote de contas a pagar</p>
                    <Badge variant="outline" className="border-blue-200 bg-white text-blue-800">
                      {batchProgress.created + batchProgress.failed} de {batchProgress.total}
                    </Badge>
                  </div>
                  <Progress value={batchProgressPercent} className="h-2 bg-blue-100" />
                  <p>{batchProgress.stage}</p>
                  {batchProgress.fileName && (
                    <p className="truncate text-xs text-blue-800">Arquivo atual: {batchProgress.fileName}</p>
                  )}
                  <p className="text-xs text-blue-800">
                    Mantenha esta tela aberta. Se algum documento demorar demais, ele sera marcado com erro e o lote continuara.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className={presentation === 'page' ? 'sticky bottom-0 -mx-4 -mb-4 mt-6 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur' : 'mt-6'}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading || createMutation.isPending || updateMutation.isPending || addAttachmentMutation.isPending}
            >
              {(isSubmitting || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {batchProgress.active
                ? `Processando ${batchProgress.created + batchProgress.failed} de ${batchProgress.total}`
                : !isEditMode && batchDocuments.length > 1 ? `Criar lote (${batchDocuments.length})` : isEditMode ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
    </div>
  );

  if (presentation === 'page') {
    return formContent;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default CreateEditPayableModal;

function InfoTile({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded border bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || 'Nao encontrado'}</p>
    </div>
  );
}

function money(value?: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDocumentType(type?: string | null) {
  const labels: Record<string, string> = {
    nfe: 'NF-e',
    nfce: 'NFC-e',
    nfse: 'NFS-e',
    sat_cfe: 'SAT/CFe',
    receipt: 'Cupom',
    xml: 'XML fiscal',
    document: 'Documento anexado',
  };
  return type ? labels[type] || String(type).toUpperCase() : 'Nao identificado';
}

function getAttachmentType(file: File): AttachmentType {
  return file.name.toLowerCase().endsWith('.xml') ? AttachmentType.NFE : AttachmentType.INVOICE;
}

function buildUploadedDocumentPatch(
  file: File,
  uploadedDocument: { filename: string; path: string; publicUrl: string },
  parsedDocument: ParsedPayableDocument | null,
  currentMetadata: Record<string, any> | undefined,
) {
  const isXml = file.name.toLowerCase().endsWith('.xml');
  return {
    has_invoice: true,
    invoice_xml_url: isXml ? uploadedDocument.publicUrl : undefined,
    invoice_pdf_url: !isXml ? uploadedDocument.publicUrl : undefined,
    attachment_url: uploadedDocument.publicUrl,
    document_taxes: parsedDocument?.taxes || {},
    document_items: parsedDocument?.items || [],
    medication_traceability: parsedDocument?.metadata?.nfe?.medication_traceability || [],
    metadata: {
      ...(currentMetadata || {}),
      ...(parsedDocument?.metadata || {}),
      document_upload: {
        filename: uploadedDocument.filename,
        path: uploadedDocument.path,
        public_url: uploadedDocument.publicUrl,
        uploaded_at: new Date().toISOString(),
      },
    },
  };
}

function buildPayableInputFromDocument(
  baseFormData: Partial<Payable>,
  parsed: ParsedPayableDocument,
  file: File,
): PayableCreateInput {
  const today = new Date().toISOString().split('T')[0];
  const amount = Number(parsed.amount ?? baseFormData.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('valor nao reconhecido no documento');
  }
  const supplierName = parsed.supplier_name || baseFormData.supplier_name;
  if (!supplierName?.trim()) {
    throw new Error('fornecedor nao reconhecido no documento. Quando houver CNPJ, tente novamente para consultar o cadastro publico; para CPF, preencha o fornecedor manualmente.');
  }

  const medicationTraceability = parsed.metadata?.nfe?.medication_traceability || [];
  return {
    supplier_name: supplierName,
    supplier_document: parsed.document_number || baseFormData.supplier_document || undefined,
    document_number: parsed.document_number || baseFormData.document_number || undefined,
    invoice_number: parsed.invoice_number || baseFormData.invoice_number || undefined,
    guide_number: parsed.guide_number || parsed.invoice_number || baseFormData.guide_number || undefined,
    invoice_series: parsed.invoice_series || baseFormData.invoice_series || undefined,
    description: parsed.description || baseFormData.description || `Documento fiscal - ${file.name}`,
    observations: baseFormData.observations || undefined,
    type: baseFormData.type || PayableType.SUPPLIER,
    category: baseFormData.category || undefined,
    subcategory: baseFormData.subcategory || undefined,
    unit_id: baseFormData.unit_id || undefined,
    unit_name: baseFormData.unit_name || undefined,
    issue_date: parsed.issue_date || baseFormData.issue_date || today,
    competency_date: parsed.issue_date || baseFormData.competency_date || today,
    due_date: parsed.due_date || baseFormData.due_date || parsed.issue_date || today,
    amount,
    interest_amount: Number(baseFormData.interest_amount || 0),
    fine_amount: Number(baseFormData.fine_amount || 0),
    discount_amount: Number(parsed.discount_amount ?? baseFormData.discount_amount ?? 0),
    payment_method: parsed.payment_method || baseFormData.payment_method || PaymentMethodType.PIX,
    payment_bank: baseFormData.payment_bank || undefined,
    payment_reference: baseFormData.payment_reference || undefined,
    chart_account_id: baseFormData.chart_account_id || undefined,
    cost_center_id: baseFormData.cost_center_id || undefined,
    financial_plan_account_id: baseFormData.financial_plan_account_id || undefined,
    financial_account_id: baseFormData.financial_account_id || undefined,
    dre_classification: baseFormData.dre_classification || DreClassification.OPERATIONAL,
    cost_allocations: baseFormData.cost_allocations || undefined,
    is_recurring: false,
    has_invoice: true,
    installments: parsed.installments?.length && parsed.installments.length > 1 ? parsed.installments.length : 1,
    document_taxes: parsed.taxes || {},
    document_items: parsed.items || [],
    medication_traceability: medicationTraceability,
    is_forecast: baseFormData.is_forecast !== false,
    is_manual: baseFormData.is_manual !== false,
    metadata: {
      ...(baseFormData.metadata || {}),
      ...(parsed.metadata || {}),
      document_installments: parsed.installments || parsed.metadata?.document_installments || [],
      batch_imported_at: new Date().toISOString(),
      source_file_name: file.name,
    },
  };
}

function NfeReviewPanel({
  review,
  onOpenAttachments,
  onFilesSelected,
}: {
  review: any;
  onOpenAttachments: () => void;
  onFilesSelected: (files: File[]) => void;
}) {
  const [dragging, setDragging] = React.useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) {
      onFilesSelected(files);
    }
  };

  if (!review.hasXmlData) {
    return (
      <div
        className={`rounded-lg border border-dashed p-4 transition ${dragging ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-100' : 'bg-slate-50'}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Dados do documento fiscal no lançamento</h3>
            <p className="mt-1 text-sm text-slate-600">
              Arraste cupom, NF ou XML aqui para trazer dados fiscais, itens, impostos e rastreabilidade para esta aba.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onOpenAttachments}>
            <ReceiptText className="mr-2 h-4 w-4" />
            Anexar documento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">Dados do documento fiscal no lançamento</h3>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
          {formatDocumentType(review.document_type)} {review.confidence || ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <InfoTile label="Tipo" value={formatDocumentType(review.document_type)} />
        <InfoTile label="Fornecedor" value={review.supplier_name} />
        <InfoTile label="CNPJ/CPF" value={review.document_number} />
        <InfoTile label="Numero/Série" value={review.invoice_number ? `${review.invoice_number}${review.invoice_series ? ` / ${review.invoice_series}` : ''}` : undefined} />
        <InfoTile label="Emissão" value={getDateInputValue(review.issue_date)} />
        <InfoTile label="Vencimento" value={getDateInputValue(review.due_date)} />
        <InfoTile label="Forma prevista" value={labelPaymentMethod(review.payment_method)} />
      </div>

      {review.warnings?.length ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {review.warnings.join(' ')}
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">Itens da NF</p>
        <div className="max-h-48 overflow-auto rounded border divide-y">
          {review.items.length ? review.items.map((item: any, index: number) => (
            <div key={`${item.code || index}-${item.description}`} className="grid grid-cols-1 gap-1 px-3 py-2 text-sm md:grid-cols-[1fr_auto]">
              <span className="font-medium text-slate-800">{item.description}</span>
              <span className="text-slate-600">
                {item.quantity || 0} x {money(item.unit_value)} = {money(item.total_value)}
              </span>
            </div>
          )) : (
            <div className="px-3 py-2 text-sm text-slate-500">Nenhum item encontrado no XML.</div>
          )}
        </div>
      </div>

      <MedicationTraceabilityBlock review={review} />
    </div>
  );
}

function NfeFinancialReviewPanel({
  review,
  netAmount,
  onOpenAttachments,
}: {
  review: any;
  netAmount: number;
  onOpenAttachments: () => void;
}) {
  if (!review.hasXmlData) {
    return (
      <div className="rounded-lg border border-dashed bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Impostos e valores do documento fiscal</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ao anexar cupom, NF ou XML, esta aba mostra valor, impostos e forma de pagamento lidos do documento.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onOpenAttachments}>
            <ReceiptText className="mr-2 h-4 w-4" />
            Anexar documento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ReceiptText className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-slate-900">Impostos e valores do documento fiscal</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <InfoTile label="Valor NF" value={money(review.amount)} />
        <InfoTile label="Valor no fluxo" value={money(netAmount)} />
        <InfoTile label="Forma prevista" value={labelPaymentMethod(review.payment_method)} />
        <InfoTile label="Vencimento" value={getDateInputValue(review.due_date)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.keys(review.taxes || {}).length ? Object.entries(review.taxes).map(([key, value]) => (
          <Badge key={key} variant="outline" className="bg-slate-50">
            {key.toUpperCase()}: {money(Number(value || 0))}
          </Badge>
        )) : (
          <span className="text-sm text-slate-500">Nenhum imposto encontrado no XML.</span>
        )}
      </div>
    </div>
  );
}

function MedicationTraceabilityBlock({ review }: { review: any }) {
  const itemsWithMedicationData = (review.items || []).filter((item: any) => item.anvisa_code || item.pmc_value !== undefined || item.traceability?.length > 0);
  const traceabilityFromMetadata = review.medication_traceability || [];
  const hasMedicationData = itemsWithMedicationData.length > 0 || traceabilityFromMetadata.length > 0;

  if (!hasMedicationData) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Nenhuma rastreabilidade de medicamento encontrada no XML. Quando houver medicamento, conferir lote, validade, fabricação, ANVISA e PMC antes de salvar.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-800">Rastreabilidade de medicamentos</p>
      <div className="space-y-2">
        {itemsWithMedicationData.map((item: any, index: number) => (
          <div key={`${item.code || index}-${item.description}-med`} className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <p className="font-semibold">{item.description}</p>
            {item.anvisa_code && <p>ANVISA: {item.anvisa_code}</p>}
            {item.pmc_value !== undefined && <p>PMC: {money(item.pmc_value)}</p>}
            {item.traceability?.length ? item.traceability.map((trace: any, traceIndex: number) => (
              <p key={`${trace.batch_number || traceIndex}-${trace.expiration_date || ''}`}>
                Lote: {trace.batch_number || 'Nao informado'} | Qtd.: {trace.batch_quantity ?? 'Nao informada'} | Fabricacao: {trace.manufacture_date || 'Nao informada'} | Validade: {trace.expiration_date || 'Nao informada'}{trace.aggregation_code ? ` | Agregacao: ${trace.aggregation_code}` : ''}
              </p>
            )) : <p>Lote e validade nao informados no XML.</p>}
          </div>
        ))}
        {!itemsWithMedicationData.length && traceabilityFromMetadata.map((item: any, index: number) => (
          <div key={`${item.code || index}-${item.description}-trace`} className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <p className="font-semibold">{item.description}</p>
            {item.anvisa_code && <p>ANVISA: {item.anvisa_code}</p>}
            {item.pmc_value !== undefined && <p>PMC: {money(item.pmc_value)}</p>}
            {(item.traceability || []).map((trace: any, traceIndex: number) => (
              <p key={`${trace.batch_number || traceIndex}-${trace.expiration_date || ''}`}>
                Lote: {trace.batch_number || 'Nao informado'} | Qtd.: {trace.batch_quantity ?? 'Nao informada'} | Fabricacao: {trace.manufacture_date || 'Nao informada'} | Validade: {trace.expiration_date || 'Nao informada'}{trace.aggregation_code ? ` | Agregacao: ${trace.aggregation_code}` : ''}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
