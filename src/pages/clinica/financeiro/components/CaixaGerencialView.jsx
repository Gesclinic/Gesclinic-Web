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
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import cashDrawerApi from '@/lib/cashDrawerApi';
import financeAccountsApi from '@/lib/financeAccountsApi';
import cashTransfersApi from '@/lib/cashTransfersApi';

const CaixaGerencialView = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [drawers, setDrawers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('drawers');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: '' });

  const loadData = async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    try {
      const [drawersRes, accountsRes, transfersRes] = await Promise.all([
        cashDrawerApi.listByClinic(clinicId),
        financeAccountsApi.listByClinic(clinicId),
        cashTransfersApi.listByClinic(clinicId),
      ]);
      setDrawers(drawersRes || []);
      setAccounts(accountsRes || []);
      setTransfers(transfersRes || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setDrawers([]);
      setAccounts([]);
      setTransfers([]);
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
        from_drawer_id: transferData.fromId,
        to_account_id: transferData.toId,
        amount: parseFloat(transferData.amount),
        transfer_date: new Date().toISOString(),
        status: 'pending',
      });
      setShowTransferForm(false);
      setTransferData({ fromId: '', toId: '', amount: '' });
      await loadData();
    } catch (error) {
      console.error('Erro ao transferir:', error);
      alert('Erro ao criar transferência. Tente novamente.');
    }
  };

  const totalDrawersBalance = drawers.reduce(
    (acc, d) => acc + (d.closing_balance || d.opening_balance || 0),
    0,
  );
  const totalAccountsBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  const totalBalance = totalDrawersBalance + totalAccountsBalance;

  const summaryCards = [
    {
      title: 'Caixas Abertos',
      value: drawers.filter((d) => d.status === 'open').length,
      icon: CheckCircle2,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Transferências',
      value: transfers.length,
      icon: ArrowRight,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Contas Ativas',
      value: accounts.length,
      icon: Wallet,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Saldo Total',
      value: `R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const tabs = [
    { id: 'drawers', label: 'Caixas', icon: Wallet },
    { id: 'transfers', label: 'Transferências', icon: ArrowLeftRight },
    { id: 'accounts', label: 'Contas', icon: BarChart3 },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Caixa Gerencial</h1>
          <p className="text-slate-500">Gestão financeira consolidada e controle de fluxo</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateTransfer}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm shadow-blue-200"
          >
            <Plus size={18} />
            Nova Transferência
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`h-1 bg-gradient-to-r ${card.color}`} />
            <div className="p-5">
              <div className="p-2 w-fit rounded-lg bg-slate-50 text-slate-600 mb-4">
                <card.icon size={24} />
              </div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 flex p-2 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
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
            <div className="overflow-x-auto">
              {activeTab === 'drawers' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50">
                      <th className="px-4 py-4">Data Abertura</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Saldo Abertura</th>
                      <th className="px-4 py-4 text-right">Saldo Fechamento</th>
                      <th className="px-4 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {drawers && drawers.length > 0 ? (
                      drawers.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 text-slate-700 font-semibold">
                            {new Date(d.date_opened).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                d.status === 'open'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {d.status === 'open'
                                ? 'Aberto'
                                : d.status === 'closed_full'
                                  ? 'Fechado OK'
                                  : 'Fechado Divergência'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-500 text-sm">
                            R${' '}
                            {(d.opening_balance || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-900 font-bold">
                            {d.closing_balance
                              ? `R$ ${d.closing_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '—'}
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
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                          Nenhum caixa encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                                t.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : t.status === 'pending'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {t.status === 'completed'
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
                          <td className="px-4 py-4 text-slate-700 font-semibold">{a.name}</td>
                          <td className="px-4 py-4 text-slate-500 text-sm">
                            {a.account_type || 'Conta'}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-900 font-bold">
                            R${' '}
                            {(a.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
            </div>
          )}
        </div>
      </div>
      {showTransferForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Nova Transferência</h2>
              <button
                onClick={() => setShowTransferForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleConfirmTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Origem</label>
                <select
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-all"
                  value={transferData.fromId}
                  onChange={(e) => setTransferData({ ...transferData, fromId: e.target.value })}
                  required
                >
                  <option value="">Selecione</option>
                  {drawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (R$ {d.balance})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Destino</label>
                <select
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-all"
                  value={transferData.toId}
                  onChange={(e) => setTransferData({ ...transferData, toId: e.target.value })}
                  required
                >
                  <option value="">Selecione</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border-2 border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-all"
                  placeholder="0,00"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferForm(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaixaGerencialView;
