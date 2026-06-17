import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Wallet,
  Plus,
  ArrowLeftRight,
  MoreVertical,
  X,
  AlertTriangle,
  Landmark,
  CreditCard,
  Zap,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
  Loader,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import cashDrawerApi from '@/lib/cashDrawerApi';
import financeAccountsApi from '@/lib/financeAccountsApi';
import cashTransfersApi from '@/lib/cashTransfersApi';
import cashConsolidationApi from '@/lib/cashConsolidationApi';
import externalBalanceApi from '@/lib/externalBalanceApi';
import reconciliationApi from '@/lib/reconciliationApi';
import TransferApprovalModal from './TransferApprovalModal';

const CaixaGerencialView = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [drawers, setDrawers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [consolidation, setConsolidation] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [bankBalances, setBankBalances] = useState([]);
  const [cardBalances, setCardBalances] = useState([]);
  const [awaitingApprovals, setAwaitingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consolidacao');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedApprovalTransfer, setSelectedApprovalTransfer] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [transferData, setTransferData] = useState({
    fromDrawerId: '',
    toAccountId: '',
    paymentMethod: 'DINHEIRO',
    amount: '',
    notes: '',
  });

  const loadData = async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    try {
      const [drawersRes, accountsRes, transfersRes, consolidationRes, discrepanciesRes, bankRes, cardRes, approvalsRes] = await Promise.all([
        cashDrawerApi.listDrawers(clinicId),
        financeAccountsApi.listAccounts(clinicId),
        cashTransfersApi.listTransfers(clinicId),
        cashConsolidationApi.getCashConsolidation(clinicId),
        cashConsolidationApi.getCashDiscrepancies(clinicId),
        externalBalanceApi.getLatestBankBalances(clinicId),
        externalBalanceApi.getLatestCardBalances(clinicId),
        reconciliationApi.getTransfersAwaitingApproval(clinicId),
      ]);
      setDrawers(drawersRes || []);
      setAccounts(accountsRes || []);
      setTransfers(transfersRes || []);
      setConsolidation(consolidationRes);
      setDiscrepancies(discrepanciesRes || []);
      setBankBalances(bankRes || []);
      setCardBalances(cardRes || []);
      setAwaitingApprovals(approvalsRes || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setDrawers([]);
      setAccounts([]);
      setTransfers([]);
      setBankBalances([]);
      setCardBalances([]);
      setAwaitingApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const handleCreateTransfer = () => setShowTransferForm(true);

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!clinicId) {
      return;
    }
    try {
      await cashTransfersApi.create({
        clinic_id: clinicId,
        from_drawer_id: transferData.fromDrawerId,
        to_account_id: transferData.toAccountId,
        payment_method: transferData.paymentMethod,
        amount: parseFloat(transferData.amount),
        transfer_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: transferData.notes,
        created_by: user.id,
      });
      setShowTransferForm(false);
      setTransferData({ fromDrawerId: '', toAccountId: '', paymentMethod: 'DINHEIRO', amount: '', notes: '' });
      await loadData();
    } catch (error) {
      console.error('Erro ao transferir:', error);
      alert('Erro ao criar transferência. Tente novamente.');
    }
  };

  const selectedDrawer = drawers.find((drawer) => drawer.id === transferData.fromDrawerId);
  const selectedDrawerAvailable = Number(
    selectedDrawer?.expected_balance ?? selectedDrawer?.closing_balance ?? selectedDrawer?.opening_balance ?? 0,
  );
  const destinationAccounts = accounts.filter(
    (account) => !transferData.paymentMethod || account.account_type === transferData.paymentMethod,
  );

  const summaryCards = consolidation
    ? [
        {
          title: 'Dinheiro em Espécie',
          value: `R$ ${(consolidation?.summary?.cashInDrawers || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: Wallet,
          color: 'from-green-500 to-green-600',
          detail: `${drawers.filter((d) => d.status !== 'open').length} caixas fechados`,
        },
        {
          title: 'Caixa Geral',
          value: `R$ ${(consolidation?.summary?.generalCash || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: Landmark,
          color: 'from-blue-500 to-blue-600',
          detail: 'Transferências confirmadas',
        },
        {
          title: 'Saldos Bancários',
          value: `R$ ${(consolidation?.summary?.bank || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: Landmark,
          color: 'from-purple-500 to-purple-600',
          detail: `${consolidation?.details?.bankAccounts?.length || 0} contas`,
        },
        {
          title: 'Cartões',
          value: `R$ ${(consolidation?.summary?.card || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: CreditCard,
          color: 'from-orange-500 to-orange-600',
          detail: `${consolidation?.details?.cardAccounts?.length || 0} processadores`,
        },
        {
          title: 'PIX/TED',
          value: `R$ ${(consolidation?.summary?.pix || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: Zap,
          color: 'from-cyan-500 to-cyan-600',
          detail: 'Transferências confirmadas',
        },
        {
          title: 'Saldo Total Consolidado',
          value: `R$ ${(consolidation?.summary?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: TrendingUp,
          color: 'from-amber-500 to-amber-600',
          detail: 'Todas as fontes',
        },
      ]
    : [];

  const tabs = [
    { id: 'consolidacao', label: 'Consolidação', icon: BarChart3 },
    { id: 'drawers', label: 'Caixas Individuais', icon: Wallet },
    { id: 'transfers', label: 'Transferências', icon: ArrowLeftRight },
    { id: 'approvals', label: `Aprovações Pendentes (${awaitingApprovals.length})`, icon: Clock },
    { id: 'accounts', label: 'Contas Financeiras', icon: Landmark },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Caixa Geral / Controle de Caixa</h1>
          <p className="text-slate-500 mt-2">
            Conferência diária dos caixas individuais e transferência para caixa geral, bancos e contas de
            pagamento
          </p>
        </div>
        <button
          onClick={handleCreateTransfer}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-sm"
        >
          <Plus size={18} />
          Nova Transferência
        </button>
      </div>

      {/* Alertas de Divergências */}
      {discrepancies.length > 0 && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
          <div className="flex gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-amber-800">⚠️ Divergências Encontradas</h3>
              <p className="text-sm text-amber-700 mt-1">
                {discrepancies.length} caixa(s) com diferença entre esperado e realizado.
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 flex p-2 gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div>
              {/* Consolidação Tab */}
              {activeTab === 'consolidacao' && consolidation && (
                <div className="space-y-6">
                  {/* 💰 Resumo de Entradas por Forma de Pagamento do Dia */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
                    <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                      💰 Movimentações do Dia por Forma de Pagamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Dinheiro em Espécie', value: consolidation?.summary?.cashInDrawers || 0, color: 'from-green-500 to-emerald-600', icon: '💵' },
                        { label: 'Cartão Crédito', value: 0, color: 'from-blue-500 to-indigo-600', icon: '💳' },
                        { label: 'Cartão Débito', value: 0, color: 'from-cyan-500 to-sky-600', icon: '🔵' },
                        { label: 'PIX', value: consolidation?.summary?.pix || 0, color: 'from-purple-500 to-violet-600', icon: '⚡' },
                        { label: 'TED/DOC', value: 0, color: 'from-orange-500 to-red-600', icon: '📤' },
                        { label: 'Boleto', value: 0, color: 'from-yellow-500 to-amber-600', icon: '📋' },
                        { label: 'Cheque', value: consolidation?.summary?.check || 0, color: 'from-slate-500 to-slate-600', icon: '✓' },
                      ].map((item, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-lg border-2 border-green-100 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{item.icon}</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold text-white bg-gradient-to-r ${item.color}`}>
                              {item.label}
                            </span>
                          </div>
                          <p className="text-xl font-bold text-slate-800">
                            R$ {Number(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dinheiro em Espécie */}
                    <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Wallet className="text-green-600" size={24} />
                        <h3 className="font-bold text-green-800">Dinheiro em Espécie</h3>
                      </div>
                      <p className="text-3xl font-bold text-green-900">
                        R$ {(consolidation?.summary?.cashInDrawers || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-green-700 mt-2">
                        Caixas fechados: {drawers.filter((d) => d.status !== 'open').length}
                      </p>
                    </div>

                    {/* Caixa Geral */}
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Landmark className="text-blue-600" size={24} />
                        <h3 className="font-bold text-blue-800">Caixa Geral</h3>
                      </div>
                      <p className="text-3xl font-bold text-blue-900">
                        R$ {(consolidation?.summary?.generalCash || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-blue-700 mt-2">Transferências confirmadas</p>
                    </div>

                    {/* Saldos Bancários */}
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Landmark className="text-purple-600" size={24} />
                        <h3 className="font-bold text-purple-800">Saldos Bancários</h3>
                      </div>
                      <p className="text-3xl font-bold text-purple-900">
                        R$ {(consolidation?.summary?.bank || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-purple-700 mt-2">
                        {consolidation?.details?.bankAccounts?.length || 0} conta(s) bancária(s)
                      </p>
                    </div>

                    {/* Cartões */}
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200">
                      <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="text-orange-600" size={24} />
                        <h3 className="font-bold text-orange-800">Cartões</h3>
                      </div>
                      <p className="text-3xl font-bold text-orange-900">
                        R$ {(consolidation?.summary?.card || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-orange-700 mt-2">
                        {consolidation?.details?.cardAccounts?.length || 0} processador(es)
                      </p>
                    </div>

                    {/* PIX/TED */}
                    <div className="p-6 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border-2 border-cyan-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Zap className="text-cyan-600" size={24} />
                        <h3 className="font-bold text-cyan-800">PIX / TED</h3>
                      </div>
                      <p className="text-3xl font-bold text-cyan-900">
                        R$ {(consolidation?.summary?.pix || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-cyan-700 mt-2">Transferências eletrônicas</p>
                    </div>

                    {/* Cheques */}
                    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-slate-200">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="text-slate-600" size={24} />
                        <h3 className="font-bold text-slate-800">Cheques</h3>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">
                        R$ {(consolidation?.summary?.check || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-slate-700 mt-2">Em processamento</p>
                    </div>
                  </div>

                  {/* Resumo Total */}
                  <div className="p-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-amber-700">SALDO TOTAL CONSOLIDADO</p>
                        <p className="text-4xl font-bold text-amber-900 mt-2">
                          R$ {(consolidation?.summary?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <TrendingUp className="text-amber-600" size={40} />
                    </div>
                  </div>

                  {/* Divergências */}
                  {discrepancies.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="text-red-600" size={20} />
                        <h3 className="font-bold text-red-800">Divergências de Caixas</h3>
                      </div>
                      <div className="space-y-2">
                        {discrepancies.map((disc) => (
                          <div key={disc.drawerId} className="text-sm text-red-700">
                            <span className="font-semibold">
                              {new Date(disc.date).toLocaleDateString('pt-BR')}
                            </span>
                            : Diferença de{' '}
                            <span className="font-bold">
                              R$ {Math.abs(disc.difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            ({disc.percentDifference > 0 ? '+' : ''}{disc.percentDifference}%)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Caixas Individuais Tab */}
              {activeTab === 'drawers' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Operador</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Saldo Abertura</th>
                          <th className="px-4 py-3 text-right">Saldo Esperado</th>
                          <th className="px-4 py-3 text-right">Saldo Real</th>
                          <th className="px-4 py-3">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {drawers && drawers.length > 0 ? (
                          drawers.map((d) => {
                            const expected = Number(d.expected_balance || 0);
                            const actual = Number(d.closing_balance || 0);
                            const diff = actual - expected;
                            return (
                              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-semibold text-sm">
                                  {new Date(d.date_opened).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-sm">
                                  {d.operator?.name || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                      d.status === 'open'
                                        ? 'bg-blue-100 text-blue-700'
                                        : d.status === 'closed_full'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {d.status === 'open' ? 'Aberto' : d.status === 'closed_full' ? 'Fechado OK' : 'Divergência'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500 text-sm">
                                  R$ {Number(d.opening_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600 text-sm">
                                  R$ {expected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900 font-bold text-sm">
                                  R$ {actual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3">
                                  {Math.abs(diff) < 0.01 ? (
                                    <span className="text-green-700 text-xs font-bold">✓ OK</span>
                                  ) : (
                                    <span className="text-red-700 text-xs font-bold">
                                      {diff > 0 ? '+' : ''}
                                      {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                              Nenhum caixa encontrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'transfers' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50">
                      <th className="px-4 py-4">Data</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Valor</th>
                      <th className="px-4 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transfers && transfers.length > 0 ? (
                      transfers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 text-slate-500 text-sm">
                            {new Date(t.transfer_date || t.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                t.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : t.status === 'pending'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {t.status === 'confirmed'
                                ? 'Concluído'
                                : t.status === 'pending'
                                  ? 'Pendente'
                                  : 'Cancelado'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-slate-900 font-bold">
                            R${' '}
                            {(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button className="text-slate-400 hover:text-slate-600">
                              <MoreVertical size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                          Nenhuma transferência encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {activeTab === 'accounts' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50">
                      <th className="px-4 py-4">Conta</th>
                      <th className="px-4 py-4">Tipo</th>
                      <th className="px-4 py-4 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accounts && accounts.length > 0 ? (
                      accounts.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 text-slate-700 font-semibold">{a.account_name}</td>
                          <td className="px-4 py-4 text-slate-500 text-sm">
                            {a.account_type || 'Conta'}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-900 font-bold">
                            R${' '}
                            {transfers
                              .filter((transfer) => transfer.status === 'confirmed' && transfer.to_account_id === a.id)
                              .reduce((acc, transfer) => acc + Number(transfer.amount || 0), 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-slate-500">
                          Nenhuma conta encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {activeTab === 'approvals' && (
                <div className="space-y-4">
                  {awaitingApprovals && awaitingApprovals.length > 0 ? (
                    awaitingApprovals.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock size={18} className="text-amber-600" />
                              <h3 className="font-bold text-slate-800">
                                Transferência de {transfer.from_drawer?.operator?.name || 'Operador'}
                              </h3>
                              <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-bold">
                                Aguardando Aprovação
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                              <div>
                                <p className="text-xs text-amber-700 font-semibold">De</p>
                                <p className="text-slate-700">
                                  {transfer.from_drawer?.operator?.name || 'N/A'} (
                                  {transfer.from_drawer && transfer.from_drawer.date_opened
                                    ? new Date(transfer.from_drawer.date_opened).toLocaleDateString('pt-BR')
                                    : 'N/A'}
                                  )
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-amber-700 font-semibold">Para</p>
                                <p className="text-slate-700">{transfer.to_account?.account_name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-amber-700 font-semibold">Tipo</p>
                                <p className="text-slate-700">{transfer.payment_method || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-amber-700 font-semibold">Valor</p>
                                <p className="font-bold text-amber-900">
                                  R$ {(Number(transfer.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                            {transfer.notes && (
                              <div className="mt-3 p-2 bg-white rounded border border-amber-200 text-xs">
                                <span className="font-semibold text-amber-900">Observação:</span> {transfer.notes}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedApprovalTransfer(transfer)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all whitespace-nowrap flex items-center gap-2"
                          >
                            <CheckCircle size={16} />
                            Aprovar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-green-50 rounded-lg border-2 border-green-200">
                      <CheckCircle2 size={40} className="mx-auto mb-2 text-green-600" />
                      <p className="text-slate-600 font-semibold">Nenhuma transferência aguardando aprovação</p>
                      <p className="text-sm text-slate-500">Todas as transferências foram processadas!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showTransferForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">💳 Nova Transferência</h2>
                <p className="text-sm text-slate-500 mt-1">Transferir de caixa individual para caixa geral ou conta financeira</p>
              </div>
              <button
                onClick={() => setShowTransferForm(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="p-6 space-y-6">
              {/* Origem Card */}
              <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-4">
                <label className="block text-sm font-bold text-blue-900 mb-2">📍 ORIGEM (Caixa Individual)</label>
                <select
                  className="w-full border-2 border-blue-300 rounded-lg p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-semibold"
                  value={transferData.fromDrawerId}
                  onChange={(e) => setTransferData({ ...transferData, fromDrawerId: e.target.value })}
                  required
                >
                  <option value="">➜ Selecione um caixa...</option>
                  {drawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {new Date(d.date_opened).toLocaleDateString('pt-BR')} - {d.status === 'open' ? '🔵 Aberto' : '🔴 Fechado'} | R$ {Number(d.expected_balance ?? d.closing_balance ?? d.opening_balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
                {selectedDrawer && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-blue-700">Saldo Disponível:</span>
                      <span className="text-lg font-bold text-blue-900">
                        R$ {selectedDrawerAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid 2 Colunas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de Destino */}
                <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-4">
                  <label className="block text-sm font-bold text-orange-900 mb-2">🎯 TIPO DE DESTINO</label>
                  <select
                    className="w-full border-2 border-orange-300 rounded-lg p-3 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all font-semibold"
                    value={transferData.paymentMethod}
                    onChange={(e) => setTransferData({ ...transferData, paymentMethod: e.target.value, toAccountId: '' })}
                    required
                  >
                    <option value="DINHEIRO">💵 Dinheiro / Caixa Geral</option>
                    <option value="BANCO">🏦 Banco / Transferência</option>
                    <option value="CARTAO">💳 Processador Cartão</option>
                    <option value="PIX">⚡ PIX / TED</option>
                    <option value="CHEQUE">📄 Cheque</option>
                  </select>
                </div>

                {/* Conta Destino */}
                <div className="bg-purple-50 rounded-xl border-2 border-purple-200 p-4">
                  <label className="block text-sm font-bold text-purple-900 mb-2">🏦 CONTA DESTINO</label>
                  <select
                    className="w-full border-2 border-purple-300 rounded-lg p-3 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all font-semibold"
                    value={transferData.toAccountId}
                    onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                    required
                  >
                    <option value="">➜ Selecione...</option>
                    {destinationAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor */}
              <div className="bg-green-50 rounded-xl border-2 border-green-200 p-4">
                <label className="block text-sm font-bold text-green-900 mb-2">
                  💰 VALOR (R$)
                  {selectedDrawerAvailable > 0 && (
                    <span className="ml-2 text-xs font-normal text-green-700">
                      (Limite: R$ {selectedDrawerAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    className="flex-1 border-2 border-green-300 rounded-lg p-3 text-lg font-bold outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all"
                    placeholder="0.00"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    max={selectedDrawerAvailable || undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setTransferData({ ...transferData, amount: String(selectedDrawerAvailable) })}
                    className="px-3 py-3 bg-green-200 text-green-900 rounded-lg font-bold hover:bg-green-300 transition-all text-sm"
                    title="Usar saldo total disponível"
                  >
                    Max
                  </button>
                </div>
                {transferData.amount && (
                  <div className="mt-2 p-2 bg-white rounded border border-green-200">
                    {Number(transferData.amount) > selectedDrawerAvailable ? (
                      <p className="text-xs text-red-700 font-bold">
                        ⚠️ Valor excede o saldo disponível!
                      </p>
                    ) : (
                      <p className="text-xs text-green-700 font-bold">
                        ✓ Valor OK - Sobra: R$ {(selectedDrawerAvailable - Number(transferData.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Observação */}
              <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">📝 OBSERVAÇÃO</label>
                <textarea
                  className="w-full border-2 border-slate-300 rounded-lg p-3 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 transition-all min-h-[80px] font-mono text-xs"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder="Ex: Conferência OK, Lote 2025-01-17, NSU: 123456, Gestor: João Silva"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferForm(false)}
                  className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  ✕ Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!transferData.fromDrawerId || !transferData.toAccountId || !transferData.amount || Number(transferData.amount) > selectedDrawerAvailable}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓ Confirmar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aprovação */}
      <TransferApprovalModal
        transfer={selectedApprovalTransfer}
        isOpen={!!selectedApprovalTransfer}
        onClose={() => setSelectedApprovalTransfer(null)}
        onApprove={async (approvalData) => {
          setApprovalLoading(true);
          try {
            await reconciliationApi.approveTransfer(approvalData.transferId, {
              approvedBy: user.id,
              signature: approvalData.signature,
              notes: approvalData.notes,
            });
            alert('✓ Transferência aprovada com sucesso!');
            setSelectedApprovalTransfer(null);
            await loadData();
          } catch (error) {
            console.error('Erro ao aprovar:', error);
            alert('❌ Erro ao aprovar transferência');
          } finally {
            setApprovalLoading(false);
          }
        }}
        onReject={async (rejectionData) => {
          setApprovalLoading(true);
          try {
            await reconciliationApi.rejectTransfer(rejectionData.transferId, {
              rejectedBy: user.id,
              reason: rejectionData.reason,
            });
            alert('✓ Transferência rejeitada!');
            setSelectedApprovalTransfer(null);
            await loadData();
          } catch (error) {
            console.error('Erro ao rejeitar:', error);
            alert('❌ Erro ao rejeitar transferência');
          } finally {
            setApprovalLoading(false);
          }
        }}
        isLoading={approvalLoading}
      />
    </div>
  );
};

export default CaixaGerencialView;
