/**
 * InvoiceEmissionModal.jsx - Modal para Emissão de Nota Fiscal
 *
 * PADRÃO NFSe BRASILEIRO (ABRASF)
 * ✅ Todos os dados fiscais vêm automáticos do banco de dados
 * ❌ SEM inputs manuais de dados críticos
 * 🔒 Somente leitura + validação rigorosa
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createInvoice, emitInvoiceAndCreateAR, linkExternalInvoiceToAppointment } from '@/lib/invoiceApi';
import { calcularRetencoes, getRetencoesPorExibir } from '@/lib/retentionCalculatorApi';
import RetencaoDisplay from '@/components/ui/RetencaoDisplay';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';

function InvoiceEmissionModal({
  isOpen = false,
  onClose = () => {},
  onSuccess = () => {},
  appointmentData = {},
  patientData = {},
}) {
  const { clinic, clinicId } = useClinicContext();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [retencoes, setRetencoes] = useState(null);
  const [emissionStep, setEmissionStep] = useState(0); // 0=idle, 1=creating, 2=emitting, 3=repasse, 4=success
  const [invoiceMode, setInvoiceMode] = useState('system');
  const [externalInvoiceNumber, setExternalInvoiceNumber] = useState('');

  // ⚠️ ESTADO INICIAL VAZIO - Será preenchido via useEffect quando a modal abre
  const [formData, setFormData] = useState({
    // DADOS FISCAIS (AUTO-PREENCHIDOS, SOMENTE LEITURA)
    clinic_cnpj: '',
    clinic_im: '',
    clinic_name: '',
    clinic_address: '',
    clinic_city_ibge: '',
    clinic_tax_regime: 'simples',

    patient_name: '',
    patient_cpf: '',
    patient_cnpj: '',
    patient_address: '',

    service_code: '',
    service_name: '',
    iss_rate: 0.05,

    // DADOS FINANCEIROS (AUTO-PREENCHIDOS, SOMENTE LEITURA)
    gross_value: 0,
    discount: 0,
    net_value: 0,
    iss_value: 0,

    // DATAS
    appointment_date: '',
    emission_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

    // CAMPOS EDITÁVEIS (APENAS ESTES)
    payer_type: 'insurance',
    description: '',
    notes: '',

    // FLAGS
    shouldCreateAR: true,
    shouldTriggerRepasse: true,
  });

  // ==========================================
  // RESETAR FORMULÁRIO
  // ==========================================
  const resetForm = () => {
    setFormData((prev) => ({
      ...prev,
      payer_type: 'insurance',
      description: '',
      notes: '',
      shouldCreateAR: true,
      shouldTriggerRepasse: true,
    }));
    setRetencoes(null);
    setError('');
    setSuccess('');
    setInvoiceId('');
    setEmissionStep(0);
    setInvoiceMode('system');
    setExternalInvoiceNumber('');
  };

  // ==========================================
  // FECHA MODAL E RESETA QUANDO FECHA
  // ==========================================
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // ==========================================
  // DEBUG DETALHADO - Ver dados que chegam
  // ==========================================
  useEffect(() => {
    console.group('🔍 [InvoiceEmissionModal] DEBUG - Dados Chegando');
    console.log('✅ Modal aberta?', isOpen);
    console.log('📦 AppointmentData recebido:', appointmentData);
    console.log('👤 PatientData recebido:', patientData);
    console.log('🏥 Clinic (do contexto):', clinic);
    console.log('🏥 ClinicId:', clinicId);
    console.groupEnd();
  }, [isOpen, appointmentData, patientData, clinic, clinicId]);

  // ==========================================
  // PREENCHIMENTO AUTOMÁTICO ROBUSTO
  // ==========================================
  useEffect(() => {
    if (!isOpen || !appointmentData?.id) {
      console.log(
        '❌ [AutoFill] Abortando: isOpen=',
        isOpen,
        '| appointmentId=',
        appointmentData?.id,
      );
      return;
    }

    console.group('📍 [InvoiceEmissionModal] Preenchendo Dados Fiscais');

    // 1. Extrair valores com segurança
    const clinicCnpj = clinic?.cnpj ? String(clinic.cnpj).trim() : '';
    const clinicIm = clinic?.inscricao_municipal ? String(clinic.inscricao_municipal).trim() : '';
    const clinicName = clinic?.name ? String(clinic.name).trim() : '';
    const clinicAddress = clinic?.address ? String(clinic.address).trim() : '';
    const clinicCityIbge = clinic?.city_ibge ? String(clinic.city_ibge).trim() : '';
    const clinicTaxRegime = clinic?.tax_regime ? String(clinic.tax_regime).trim() : 'simples';

    const patientName = patientData?.name ? String(patientData.name).trim() : '';
    const patientCpf = patientData?.cpf ? String(patientData.cpf).trim() : '';
    const patientCnpj = patientData?.cnpj ? String(patientData.cnpj).trim() : '';
    const patientAddress = patientData?.address ? String(patientData.address).trim() : '';

    const serviceCode = appointmentData?.service?.iss_code
      ? String(appointmentData.service.iss_code).trim()
      : '';
    const serviceName = appointmentData?.service_name
      ? String(appointmentData.service_name).trim()
      : '';
    const issRate = parseFloat(appointmentData?.service?.iss_rate) || 0.05;

    // 2. Calcular valores financeiros
    const gross = parseFloat(appointmentData?.value) || 0;
    const discount = parseFloat(appointmentData?.discount) || 0;
    const net = Math.max(0, gross - discount);
    const issValue = parseFloat((net * issRate).toFixed(2));

    // 3. Log detalhado do que vai ser preenchido
    console.log('1️⃣ DADOS CLÍNICA:');
    console.log('   • CNPJ:', clinicCnpj || '❌ VAZIO');
    console.log('   • IM:', clinicIm || '❌ VAZIO');
    console.log('   • Nome:', clinicName || '❌ VAZIO');
    console.log('   • Endereço:', clinicAddress || '❌ VAZIO');
    console.log('   • IBGE:', clinicCityIbge || '❌ VAZIO');
    console.log('   • Regime:', clinicTaxRegime);

    console.log('2️⃣ DADOS PACIENTE:');
    console.log('   • Nome:', patientName || '❌ VAZIO');
    console.log('   • CPF:', patientCpf || '❌ VAZIO');
    console.log('   • CNPJ:', patientCnpj || '(opcional)');

    console.log('3️⃣ DADOS SERVIÇO:');
    console.log('   • Código:', serviceCode || '❌ VAZIO');
    console.log('   • Nome:', serviceName);
    console.log('   • ISS Rate:', issRate);

    console.log('4️⃣ DADOS FINANCEIROS:');
    console.log('   • Bruto: R$', gross);
    console.log('   • Desconto: R$', discount);
    console.log('   • Líquido: R$', net);
    console.log('   • ISS (', (issRate * 100).toFixed(2), '%): R$', issValue);

    console.groupEnd();

    // 4. Atualizar formData
    setFormData((prev) => ({
      ...prev,
      clinic_cnpj: clinicCnpj,
      clinic_im: clinicIm,
      clinic_name: clinicName,
      clinic_address: clinicAddress,
      clinic_city_ibge: clinicCityIbge,
      clinic_tax_regime: clinicTaxRegime,

      patient_name: patientName,
      patient_cpf: patientCpf,
      patient_cnpj: patientCnpj,
      patient_address: patientAddress,

      service_code: serviceCode,
      service_name: serviceName,
      iss_rate: issRate,

      gross_value: gross,
      discount: discount,
      net_value: net,
      iss_value: issValue,

      appointment_date: appointmentData?.scheduled_date || '',
    }));
  }, [isOpen, appointmentData, patientData, clinic]);

  // ==========================================
  // CALCULAR RETENÇÕES
  // ==========================================
  useEffect(() => {
    if (!isOpen || !formData.gross_value || formData.gross_value <= 0) {
      setRetencoes(null);
      return;
    }

    const calcs = calcularRetencoes(formData.gross_value, formData.payer_type);

    setRetencoes(calcs);
    console.log('📊 Retenções Calculadas:', calcs);
  }, [isOpen, formData.gross_value, formData.payer_type]);

  // ==========================================
  // HANDLER: EMIT INVOICE
  // ==========================================
  const handleEmitInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      setEmissionStep(1);

      // Validações
      if (!formData.clinic_cnpj) {
        throw new Error('CNPJ da clínica não preenchido');
      }
      if (!formData.clinic_im) {
        throw new Error('IM da clínica não preenchido');
      }
      if (!formData.patient_cpf && !formData.patient_cnpj) {
        throw new Error('CPF ou CNPJ do paciente não preenchido');
      }
      if (!formData.description || formData.description.trim().length === 0) {
        throw new Error('Descrição do serviço é obrigatória');
      }
      if (!formData.service_code) {
        throw new Error('Código ISS do serviço não preenchido');
      }
      if (formData.gross_value <= 0) {
        throw new Error('Valor bruto deve ser maior que zero');
      }

      // Step 1: Criar Nota Fiscal
      setEmissionStep(1);
      console.log('📝 [Step 1] Criando NF...');

      const invoicePayload = {
        clinic_id: clinicId,
        appointment_id: appointmentData.id,
        patient_id: patientData?.id,
        professional_id: appointmentData.professional_id,

        fiscal: {
          serviceCode: formData.service_code,
          description: formData.description,
          municipalityCode: formData.clinic_city_ibge,
          prestadorCNPJ: formData.clinic_cnpj,
          prestadorIM: formData.clinic_im,
          prestadorName: formData.clinic_name,
          prestadorAddress: formData.clinic_address,
          tomadorCPF: formData.patient_cpf,
          tomadorCNPJ: formData.patient_cnpj,
          tomadorName: formData.patient_name,
          taxRegime: formData.clinic_tax_regime,

          taxes: {
            iss: retencoes?.retencoes?.iss?.value || 0,
            issRate: retencoes?.retencoes?.iss?.rate || 0.05,
            pis: retencoes?.retencoes?.pis?.value || 0,
            pisRate: retencoes?.retencoes?.pis?.rate || 0,
            cofins: retencoes?.retencoes?.cofins?.value || 0,
            cofinsRate: retencoes?.retencoes?.cofins?.rate || 0,
            csll: retencoes?.retencoes?.csll?.value || 0,
            csllRate: retencoes?.retencoes?.csll?.rate || 0,
            irrf: retencoes?.retencoes?.irrf?.value || 0,
            irrfRate: retencoes?.retencoes?.irrf?.rate || 0,
            cbs: retencoes?.retencoes?.cbs?.value || 0,
            cbsRate: retencoes?.retencoes?.cbs?.rate || 0,
            ibs: retencoes?.retencoes?.ibs?.value || 0,
            ibsRate: retencoes?.retencoes?.ibs?.rate || 0,
            totalRetencoes: retencoes?.totalValue || 0,
          },
        },

        financial: {
          gross_value: formData.gross_value,
          discount: formData.discount,
          net_value: formData.net_value,
          iss_value: formData.iss_value,
          total_retencoes: retencoes?.totalValue || 0,
          final_value: formData.net_value - (retencoes?.totalValue || 0),
        },

        emission: {
          emission_date: formData.emission_date,
          due_date: formData.due_date,
          notes: formData.notes,
          payer_type: formData.payer_type,
        },

        audit: {
          created_by: user?.id,
          created_at: new Date().toISOString(),
        },
      };

      const { invoiceId: newInvoiceId } = await createInvoice(invoicePayload);
      setInvoiceId(newInvoiceId);

      // Step 2: Emit + Create AR
      setEmissionStep(2);
      console.log('📤 [Step 2] Emitindo NF + Criando AR...');

      await emitInvoiceAndCreateAR(newInvoiceId, appointmentData.id, formData.payer_type);

      // Step 3: Trigger Repasse
      if (formData.shouldTriggerRepasse) {
        setEmissionStep(3);
        console.log('💰 [Step 3] Acionando Repasse...');
        // TODO: Chamar repasseApi se necessário
      }

      // Success!
      setEmissionStep(4);
      setSuccess('✅ Nota Fiscal emitida com sucesso!');

      setTimeout(() => {
        onSuccess({ invoiceId: newInvoiceId });
        onClose();
      }, 2000);
    } catch (err) {
      console.error('❌ Erro na emissão:', err);
      setError(err.message || 'Erro ao emitir NF');
      setEmissionStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExternalInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const invoice = await linkExternalInvoiceToAppointment({
        clinicId,
        appointmentId: appointmentData.id,
        patientId: patientData?.id || appointmentData?.patient_id || null,
        invoiceNumber: externalInvoiceNumber,
        amount: formData.net_value || formData.gross_value || appointmentData?.value || 0,
        description: formData.description || `NF externa - Atendimento ${appointmentData.id}`,
        issuedDate: formData.emission_date,
        dueDate: formData.due_date,
      });

      setInvoiceId(invoice.id);
      setSuccess(`NF ${invoice.invoice_number} vinculada ao atendimento.`);

      setTimeout(() => {
        onSuccess({ invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, external: true });
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Erro ao vincular NF externa:', err);
      setError(err.message || 'Erro ao vincular NF externa');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RENDERING
  // ==========================================
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 Emissão de Nota Fiscal</DialogTitle>
          <DialogDescription>
            Emita a NF pelo sistema ou vincule uma NF emitida fora informando apenas o número.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setInvoiceMode('system')}
            className={`rounded-md border p-3 text-left text-sm ${
              invoiceMode === 'system'
                ? 'border-blue-500 bg-white text-blue-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <span className="block font-bold">Gerar via sistema</span>
            <span className="mt-1 block text-xs">Emite a NF e vincula automaticamente ao atendimento.</span>
          </button>
          <button
            type="button"
            onClick={() => setInvoiceMode('external')}
            className={`rounded-md border p-3 text-left text-sm ${
              invoiceMode === 'external'
                ? 'border-orange-500 bg-white text-orange-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <span className="block font-bold">NF emitida fora</span>
            <span className="mt-1 block text-xs">Informe somente o número para rastrear o vínculo.</span>
          </button>
        </div>

        {invoiceMode === 'external' && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <Label className="text-sm font-semibold text-orange-900">Número da NF externa *</Label>
            <Input
              value={externalInvoiceNumber}
              onChange={(event) => setExternalInvoiceNumber(event.target.value)}
              placeholder="Ex: 12345"
              className="mt-2 bg-white"
            />
            <p className="mt-2 text-xs text-orange-800">
              Este vínculo não gera novo financeiro. Ele registra a rastreabilidade entre atendimento e NF emitida fora do Gesclinic.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 py-4">
          {/* COLUNA 1: DADOS FISCAIS (READONLY) */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-bold text-sm mb-3 text-yellow-900">
              📝 Dados Fiscais (Automáticos)
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <Label className="text-xs font-semibold">CNPJ Clínica</Label>
                <Input disabled value={formData.clinic_cnpj || '-'} className="text-xs bg-white" />
              </div>

              <div>
                <Label className="text-xs font-semibold">IM Clínica</Label>
                <Input disabled value={formData.clinic_im || '-'} className="text-xs bg-white" />
              </div>

              <div>
                <Label className="text-xs font-semibold">Nome Clínica</Label>
                <Input disabled value={formData.clinic_name || '-'} className="text-xs bg-white" />
              </div>

              <div>
                <Label className="text-xs font-semibold">Endereço</Label>
                <Input
                  disabled
                  value={formData.clinic_address || '-'}
                  className="text-xs bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">IBGE</Label>
                <Input
                  disabled
                  value={formData.clinic_city_ibge || '-'}
                  className="text-xs bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Regime Tributário</Label>
                <Input
                  disabled
                  value={formData.clinic_tax_regime || '-'}
                  className="text-xs bg-white"
                />
              </div>

              <hr className="my-2" />

              <div>
                <Label className="text-xs font-semibold">CPF Paciente</Label>
                <Input disabled value={formData.patient_cpf || '-'} className="text-xs bg-white" />
              </div>

              <div>
                <Label className="text-xs font-semibold">Nome Paciente</Label>
                <Input disabled value={formData.patient_name || '-'} className="text-xs bg-white" />
              </div>

              <div>
                <Label className="text-xs font-semibold">Código ISS</Label>
                <Input disabled value={formData.service_code || '-'} className="text-xs bg-white" />
              </div>
            </div>
          </div>

          {/* COLUNA 2: DADOS EDITÁVEIS */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-bold text-sm mb-3">✏️ Dados Editáveis</h3>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">Tipo de Tomador *</Label>
                <Select
                  value={formData.payer_type}
                  onValueChange={(val) => setFormData((p) => ({ ...p, payer_type: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">👤 Paciente Particular</SelectItem>
                    <SelectItem value="insurance">🏥 Convênio</SelectItem>
                    <SelectItem value="company">🏢 Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Descrição do Serviço *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Consulta com Cardiologista"
                  className="text-xs h-20"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="(Opcional)"
                  className="text-xs h-16"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.shouldCreateAR}
                  onChange={(e) => setFormData((p) => ({ ...p, shouldCreateAR: e.target.checked }))}
                  className="w-4 h-4"
                />
                <Label className="text-xs">Criar Recebimento (AR)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.shouldTriggerRepasse}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, shouldTriggerRepasse: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <Label className="text-xs">Acionar Repasse Automático</Label>
              </div>
            </div>
          </div>

          {/* COLUNA 3: FINANCEIRO + IMPOSTOS */}
          <div className="space-y-3">
            {/* VALORES */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h4 className="font-bold text-xs mb-2 text-green-900">💰 Valores</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Bruto:</span>
                  <span>R$ {formData.gross_value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desconto:</span>
                  <span>-R$ {formData.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Líquido:</span>
                  <span>R$ {formData.net_value.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* IMPOSTOS */}
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <h4 className="font-bold text-xs mb-2 text-red-900">🔴 Retenções</h4>
              {retencoes ? (
                <RetencaoDisplay retencoes={retencoes} minimal={true} />
              ) : (
                <p className="text-xs text-gray-500">Selecione tipo de tomador e valor...</p>
              )}
            </div>

            {/* INFORMAÇÕES */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-bold text-xs mb-2 text-blue-900">ℹ️ Info</h4>
              <div className="space-y-1 text-xs">
                <div>Data Emissão: {formData.emission_date}</div>
                <div>Data Vencimento: {formData.due_date}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ALERTAS */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* PROGRESS */}
        {emissionStep > 0 && emissionStep < 4 && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs text-gray-600">
              {emissionStep === 1 && '📝 Criando NF...'}
              {emissionStep === 2 && '📤 Emitindo + AR...'}
              {emissionStep === 3 && '💰 Acionando Repasse...'}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={invoiceMode === 'external' ? handleLinkExternalInvoice : handleEmitInvoice}
            disabled={
              loading ||
              (invoiceMode === 'system' && (!formData.clinic_cnpj || !formData.description)) ||
              (invoiceMode === 'external' && !externalInvoiceNumber.trim())
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Emitindo...
              </>
            ) : invoiceMode === 'external' ? (
              'Vincular NF Externa'
            ) : (
              '✅ Emitir Nota Fiscal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InvoiceEmissionModal;
