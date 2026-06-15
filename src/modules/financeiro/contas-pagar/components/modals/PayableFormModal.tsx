/**
 * 📋 PayableFormModal - Create/Edit Payable
 *
 * Modal com 6 abas para criar ou editar uma conta a pagar:
 * 1. Geral: fornecedor, descrição e datas
 * 2. Financeiro: valores, formas e juros
 * 3. Contábil: plano de contas, centro de custo e categoria
 * 4. Parcelamento: divisão em parcelas
 * 5. Recorrência: configuração recorrente
 * 6. Anexos: envio de documentos
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, Upload, FileIcon } from 'lucide-react';
import { Payable, PayableCreateInput, PayableUpdateInput, PayableType } from '../../types';
import { useFinanceOptions } from '../../hooks/useFinanceOptions';
import { useFileUpload } from '../../hooks/useFileUpload';
import { labelPayableType } from '../../utils/labels';

interface PayableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PayableCreateInput | PayableUpdateInput) => Promise<void>;
  initialData?: Payable;
  isLoading?: boolean;
  error?: string;
}

const PAYABLE_TYPES = Object.values(PayableType).map((value) => ({
  value,
  label: labelPayableType(value),
}));

export function PayableFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
  error,
}: PayableFormModalProps) {
  const { accountPlans, costCenters } = useFinanceOptions();
  const fileUpload = useFileUpload();
  
  const [formData, setFormData] = useState<Partial<PayableCreateInput>>({
    supplier_name: initialData?.supplier_name || '',
    description: initialData?.description || '',
    amount: initialData?.amount || 0,
    due_date: initialData?.due_date || '',
    type: initialData?.type || 'SUPPLIER',
    category: initialData?.category || '',
    competency_date: initialData?.competency_date || '',
    interest_amount: initialData?.interest_amount || 0,
    fine_amount: initialData?.fine_amount || 0,
    discount_amount: initialData?.discount_amount || 0,
    chart_account_id: initialData?.chart_account_id || '',
    cost_center_id: initialData?.cost_center_id || '',
    is_recurring: initialData?.is_recurring || false,
    recurrence_type: initialData?.recurrence_type || '',
    installments: initialData?.installments || 1,
  });

  const [activeTab, setActiveTab] = useState('general');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isEdit = !!initialData;
  const title = isEdit ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar';

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      // Upload arquivo se foi selecionado
      let attachmentData = null;
      if (selectedFile && activeTab === 'attachment') {
        attachmentData = await fileUpload.uploadFile(selectedFile, 'invoice');
        if (!attachmentData) {
          return; // Erro exibido pelo hook
        }
      }

      if (isEdit && initialData) {
        await onSubmit({
          ...formData,
          id: initialData.id,
        } as PayableUpdateInput);
      } else {
        await onSubmit(formData as PayableCreateInput);
      }
      onClose();
      setSelectedFile(null);
    } catch (err) {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general" className="text-xs">
              Geral
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs">
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="accounting" className="text-xs">
              Contábil
            </TabsTrigger>
            <TabsTrigger value="installment" className="text-xs">
              Parcelamento
            </TabsTrigger>
            <TabsTrigger value="recurrence" className="text-xs">
              Recorrência
            </TabsTrigger>
            <TabsTrigger value="attachment" className="text-xs">
              Anexos
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GERAL */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="supplier_name">Fornecedor / Beneficiário *</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name || ''}
                onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                placeholder="Digite o nome do fornecedor"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição da despesa"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo de Despesa *</Label>
                <Select
                  value={formData.type || 'SUPPLIER'}
                  onValueChange={(value) => handleInputChange('type', value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYABLE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="Ex: Suprimentos"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">Data de Vencimento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  lang="pt-BR"
                  value={formData.due_date || ''}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="competency_date">Data de Competência</Label>
                <Input
                  id="competency_date"
                  type="date"
                  lang="pt-BR"
                  value={formData.competency_date || ''}
                  onChange={(e) => handleInputChange('competency_date', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: FINANCEIRO */}
          <TabsContent value="financial" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="interest_amount">Juros</Label>
                <Input
                  id="interest_amount"
                  type="number"
                  step="0.01"
                  value={formData.interest_amount || ''}
                  onChange={(e) => handleInputChange('interest_amount', parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="fine_amount">Multa</Label>
                <Input
                  id="fine_amount"
                  type="number"
                  step="0.01"
                  value={formData.fine_amount || ''}
                  onChange={(e) => handleInputChange('fine_amount', parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="discount_amount">Desconto</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  step="0.01"
                  value={formData.discount_amount || ''}
                  onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Net Amount Display */}
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="text-sm text-blue-600">
                <span>Valor Líquido: </span>
                <span className="font-bold">
                  R$ {((formData.amount || 0) + (formData.interest_amount || 0) + (formData.fine_amount || 0) - (formData.discount_amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: CONTÁBIL */}
          <TabsContent value="accounting" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="chart_account_id">Conta Contábil</Label>
              <Select
                value={formData.chart_account_id || ''}
                onValueChange={(value) => handleInputChange('chart_account_id', value)}
              >
                <SelectTrigger id="chart_account_id">
                  <SelectValue placeholder="Selecione a conta contábil..." />
                </SelectTrigger>
                <SelectContent>
                  {accountPlans.length > 0 ? (
                    accountPlans.map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.code ? `${plan.code} - ${plan.name}` : plan.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-options" disabled>
                      Nenhuma conta disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cost_center_id">Centro de Custo</Label>
              <Select
                value={formData.cost_center_id || ''}
                onValueChange={(value) => handleInputChange('cost_center_id', value)}
              >
                <SelectTrigger id="cost_center_id">
                  <SelectValue placeholder="Selecione o centro de custo..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.length > 0 ? (
                    costCenters.map((center: any) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.code ? `${center.code} - ${center.name}` : center.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-options" disabled>
                      Nenhum centro disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* TAB 4: PARCELAMENTO */}
          <TabsContent value="installment" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="installments">Número de Parcelas</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                value={formData.installments || 1}
                onChange={(e) => handleInputChange('installments', parseInt(e.target.value))}
              />
            </div>

            {(formData.installments || 1) > 1 && (
              <div className="p-3 bg-amber-50 rounded-md border border-amber-200">
                <div className="text-sm text-amber-700">
                  <span>Valor por Parcela: </span>
                  <span className="font-bold">
                    R$ {((formData.amount || 0) / (formData.installments || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-600">
              <p>Ao salvar com múltiplas parcelas, serão criadas automaticamente.</p>
            </div>
          </TabsContent>

          {/* TAB 5: RECORRÊNCIA */}
          <TabsContent value="recurrence" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_recurring"
                title="Despesa recorrente"
                checked={formData.is_recurring || false}
                onChange={(e) => handleInputChange('is_recurring', e.target.checked)}
              />
              <Label htmlFor="is_recurring" className="cursor-pointer">
                Despesa Recorrente
              </Label>
            </div>

            {formData.is_recurring && (
              <>
                <div>
                  <Label htmlFor="recurrence_type">Tipo de Recorrência</Label>
                  <Select
                    value={formData.recurrence_type || ''}
                    onValueChange={(value) => handleInputChange('recurrence_type', value)}
                  >
                    <SelectTrigger id="recurrence_type">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Diária</SelectItem>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                      <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
                      <SelectItem value="ANNUAL">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recurrence_end_date">Fim da Recorrência (Opcional)</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    lang="pt-BR"
                    onChange={(e) => handleInputChange('recurrence_end_date', e.target.value)}
                  />
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB 6: ANEXOS */}
          <TabsContent value="attachment" className="space-y-4 mt-4">
            {fileUpload.error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{fileUpload.error}</span>
              </div>
            )}

            <div>
              <Label htmlFor="fileInput">Selecionar Arquivo</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                <input
                  id="fileInput"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.xml,.txt,.jpg,.jpeg,.png,.docx,.xlsx"
                  disabled={fileUpload.isUploading}
                />
                <label
                  htmlFor="fileInput"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {selectedFile ? (
                      <>
                        <strong>{selectedFile.name}</strong>
                        <br />
                        ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </>
                    ) : (
                      <>
                        Clique para selecionar ou arraste um arquivo
                        <br />
                        <span className="text-xs text-gray-500">
                          (máximo 10MB)
                        </span>
                      </>
                    )}
                  </span>
                </label>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Formatos aceitos: PDF, XML, TXT, JPG, PNG, DOCX, XLSX
              </p>
            </div>

            {isEdit && initialData?.has_invoice && (
              <div className="p-3 bg-green-50 rounded-md border border-green-200">
                <p className="text-sm text-green-700">
                  ✓ Nota Fiscal anexada
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              isEdit ? 'Atualizar' : 'Criar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PayableFormModal;
