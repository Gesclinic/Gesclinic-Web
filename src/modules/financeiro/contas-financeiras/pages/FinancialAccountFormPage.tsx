/**
 * Financial Account Form Page
 * Page flow for creating and editing financial accounts.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useClinicContext } from '@/contexts/ClinicContext';
import { FinancialAccountForm } from '../components';
import { useFinancialAccounts } from '../hooks';
import { getFinancialAccount } from '../services';
import {
  FinancialAccount,
  FinancialAccountCreateInput,
  FinancialAccountUpdateInput,
} from '../types';

export const FinancialAccountFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId?: string }>();
  const { clinicId } = useClinicContext();
  const isEdit = Boolean(accountId);

  const { create, update } = useFinancialAccounts();
  const [account, setAccount] = useState<FinancialAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => {
    navigate('/clinica/financeiro/contas-financeiras');
  }, [navigate]);

  useEffect(() => {
    if (!isEdit || !accountId || !clinicId) return;

    const loadAccount = async () => {
      try {
        setLoadingAccount(true);
        setError(null);
        const data = await getFinancialAccount(clinicId, accountId);
        setAccount(data);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar conta financeira');
      } finally {
        setLoadingAccount(false);
      }
    };

    loadAccount();
  }, [accountId, clinicId, isEdit]);

  const handleSubmit = async (data: FinancialAccountCreateInput | FinancialAccountUpdateInput) => {
    try {
      setSubmitting(true);
      setError(null);

      if (isEdit && accountId) {
        await update(accountId, data as FinancialAccountUpdateInput);
      } else {
        await create(data as FinancialAccountCreateInput);
      }

      goBack();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar conta financeira');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={goBack} className="mb-3 gap-2 px-0 text-slate-600 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            Voltar para contas financeiras
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Editar Conta Financeira' : 'Nova Conta Financeira'}
          </h1>
          <p className="mt-1 text-gray-600">
            {isEdit
              ? 'Atualize os dados bancários, saldos e configurações operacionais da conta.'
              : 'Cadastre uma conta bancária, caixa, aplicação ou carteira para movimentações financeiras.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Não foi possível concluir a operação</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {loadingAccount ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
          </div>
        ) : (
          <FinancialAccountForm
            variant="page"
            account={account || undefined}
            onSubmit={handleSubmit}
            onCancel={goBack}
            loading={submitting}
            error={error}
          />
        )}
      </div>
    </div>
  );
};
