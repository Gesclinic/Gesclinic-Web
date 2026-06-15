import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export const PaymentSplitFields = ({ method, formData, onFieldChange }) => {
  if (!method) {
    return null;
  }

  const handleChange = (field, value) => {
    onFieldChange(field, value);
  };

  // ✨ AUTO-FILL: Quando 1ª parcela ou número de parcelas muda, preencher automaticamente
  useEffect(() => {
    if (method === 'CARTAO' && formData.payment_due_date && formData.installments) {
      const numInstallments = parseInt(formData.installments || 1);

      // Sempre regenerar as datas ao mudar a data da 1ª parcela ou quantidade de parcelas
      const baseDate = new Date(formData.payment_due_date);
      const newDates = [];

      for (let i = 0; i < numInstallments; i++) {
        const nextDate = new Date(baseDate);
        // Adicionar 30 dias por parcela, mas começando pela 1ª (i=0)
        nextDate.setDate(baseDate.getDate() + (i * 30));
        const dateString = nextDate.toISOString().split('T')[0];
        newDates.push(dateString);
      }

      // Verificar se precisa atualizar (evitar loops infinitos)
      const currentDates = (formData.card_installment_dates || '').split('|').filter(d => d);
      const hasChanged =
        currentDates.length !== numInstallments ||
        currentDates.some((d, idx) => d !== newDates[idx]);

      if (hasChanged) {
        onFieldChange('card_installment_dates', newDates.join('|'));
        console.log('✨ [AUTO-FILL] Parcelas preenchidas automaticamente:', {
          baseDate: formData.payment_due_date,
          installments: numInstallments,
          generatedDates: newDates,
        });
      }
    }
  }, [method, formData.payment_due_date, formData.installments]);

  // ✨ AUTO-FILL VENCIMENTO: Quando validade do cartão é preenchida, usar para o vencimento
  useEffect(() => {
    if (method === 'CARTAO' && formData.card_expiry && !formData.payment_due_date) {
      // card_expiry tem formato MM/YY
      const [month, year] = formData.card_expiry.split('/');
      if (month && year) {
        // Converter YY para YYYY (assumindo 20XX)
        const fullYear = `20${year}`;
        // Usar o primeiro dia do mês de expiração como vencimento
        const dueDateString = `${fullYear}-${month}-01`;
        handleChange('payment_due_date', dueDateString);
        console.log('✨ [AUTO-FILL VENCIMENTO] Vencimento preenchido da validade do cartão:', {
          card_expiry: formData.card_expiry,
          payment_due_date: dueDateString,
        });
      }
    }
  }, [method, formData.card_expiry]);

  return (
    <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
      {/* CARTÃO DE CRÉDITO/DÉBITO */}
      {method === 'CARTAO' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Bandeira *</Label>
              <Select
                value={formData.card_brand || ''}
                onValueChange={(value) => handleChange('card_brand', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISA">Visa</SelectItem>
                  <SelectItem value="MASTERCARD">MasterCard</SelectItem>
                  <SelectItem value="ELO">Elo</SelectItem>
                  <SelectItem value="AMEX">American Express</SelectItem>
                  <SelectItem value="DINERS">Diners</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Nº Cartão *</Label>
              <Input
                type="password"
                maxLength="19"
                placeholder="0000 0000 0000 0000"
                value={formData.card_number || ''}
                onChange={(e) => handleChange('card_number', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Validade (MM/YY)</Label>
              <Input
                type="text"
                maxLength="5"
                placeholder="12/25"
                value={formData.card_expiry || ''}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length >= 2) {
                    val = val.substring(0, 2) + '/' + val.substring(2, 4);
                  }
                  handleChange('card_expiry', val);
                }}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Últimos 4 dígitos</Label>
              <Input
                type="text"
                maxLength="4"
                placeholder="0000"
                value={formData.card_last4 || ''}
                onChange={(e) => handleChange('card_last4', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Nome do Titular *</Label>
            <Input
              type="text"
              placeholder="Nome completo"
              value={formData.card_holder || ''}
              onChange={(e) => handleChange('card_holder', e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Parcelas</Label>
              <Input
                type="number"
                min="1"
                max="12"
                placeholder="1"
                value={formData.installments || '1'}
                onChange={(e) => handleChange('installments', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">1ª Parcela (Vencimento)</Label>
              <Input
                type="date"
                value={formData.payment_due_date || ''}
                onChange={(e) => handleChange('payment_due_date', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Vencimentos das parcelas subsequentes */}
          {parseInt(formData.installments || 1) > 1 && (
            <div className="bg-white p-2 rounded border border-gray-300">
              <Label className="text-xs font-semibold mb-2 block">📅 Vencimento das Parcelas</Label>
              <div className="space-y-2">
                {Array.from({ length: parseInt(formData.installments || 1) }, (_, i) => {
                  const installmentNum = i + 1;
                  const datesArray = (formData.card_installment_dates || '')
                    .split('|')
                    .filter((d) => d);
                  const currentDate = datesArray[i] || '';

                  return (
                    <div key={i} className="grid grid-cols-3 gap-2 items-end">
                      <Label className="text-xs font-semibold col-span-1">
                        Parcela {installmentNum}
                      </Label>
                      <Input
                        type="date"
                        value={currentDate}
                        onChange={(e) => {
                          const newDates = [...datesArray];
                          newDates[i] = e.target.value;
                          handleChange('card_installment_dates', newDates.join('|'));
                        }}
                        placeholder={`Parcela ${installmentNum}`}
                        className="h-8 text-xs col-span-2"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* PIX */}
      {method === 'PIX' && (
        <>
          <div>
            <Label className="text-xs font-semibold">Tipo de Chave PIX *</Label>
            <Select
              value={formData.pix_key_type || 'cpf'}
              onValueChange={(value) => handleChange('pix_key_type', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="aleatorio">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Chave PIX *</Label>
            <Input
              type="text"
              placeholder="Insira a chave PIX"
              value={formData.pix_key || ''}
              onChange={(e) => handleChange('pix_key', e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">ID da Transação</Label>
              <Input
                type="text"
                placeholder="Opcional"
                value={formData.pix_transaction_id || ''}
                onChange={(e) => handleChange('pix_transaction_id', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Vencimento</Label>
              <Input
                type="date"
                value={formData.payment_due_date || ''}
                onChange={(e) => handleChange('payment_due_date', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </>
      )}

      {/* CHEQUE */}
      {method === 'CHEQUE' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Banco *</Label>
              <Input
                type="text"
                placeholder="Ex: Banco do Brasil"
                value={formData.cheque_bank || ''}
                onChange={(e) => handleChange('cheque_bank', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Agência</Label>
              <Input
                type="text"
                placeholder="0000"
                value={formData.cheque_agency || ''}
                onChange={(e) => handleChange('cheque_agency', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Conta</Label>
              <Input
                type="text"
                placeholder="00000000"
                value={formData.cheque_account || ''}
                onChange={(e) => handleChange('cheque_account', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Número do Cheque *</Label>
              <Input
                type="text"
                placeholder="0000000"
                value={formData.cheque_number || ''}
                onChange={(e) => handleChange('cheque_number', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Vencimento do Cheque</Label>
              <Input
                type="date"
                value={formData.cheque_due_date || ''}
                onChange={(e) => handleChange('cheque_due_date', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Vencimento do Pagamento</Label>
              <Input
                type="date"
                value={formData.payment_due_date || ''}
                onChange={(e) => handleChange('payment_due_date', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </>
      )}

      {/* BOLETO */}
      {method === 'BOLETO' && (
        <>
          <div>
            <Label className="text-xs font-semibold">Número do Boleto</Label>
            <Input
              type="text"
              placeholder="Insira o número do boleto"
              value={formData.boleto_number || ''}
              onChange={(e) => handleChange('boleto_number', e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Vencimento</Label>
            <Input
              type="date"
              value={formData.payment_due_date || ''}
              onChange={(e) => handleChange('payment_due_date', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </>
      )}

      {/* DOC / TED / DEPÓSITO */}
      {(method === 'DOC' || method === 'TED' || method === 'DEPOSITO') && (
        <>
          <div>
            <Label className="text-xs font-semibold">Nome do Banco *</Label>
            <Input
              type="text"
              placeholder="Ex: Banco do Brasil"
              value={formData.bank_name || ''}
              onChange={(e) => handleChange('bank_name', e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Agência</Label>
              <Input
                type="text"
                placeholder="0000"
                value={formData.bank_agency || ''}
                onChange={(e) => handleChange('bank_agency', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Conta</Label>
              <Input
                type="text"
                placeholder="00000000-0"
                value={formData.bank_account || ''}
                onChange={(e) => handleChange('bank_account', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Vencimento</Label>
            <Input
              type="date"
              value={formData.payment_due_date || ''}
              onChange={(e) => handleChange('payment_due_date', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </>
      )}

      {/* OBSERVAÇÕES (para todos) */}
      <div>
        <Label className="text-xs font-semibold">Observações</Label>
        <Input
          type="text"
          placeholder="Observações opcionais"
          value={formData.observation || ''}
          onChange={(e) => handleChange('observation', e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
};

export default PaymentSplitFields;
