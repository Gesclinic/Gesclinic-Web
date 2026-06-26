/**
 * ETAPA 6: Conciliador de Extratos Bancários
 * Componente principal para conciliação inteligente
 * 
 * Funcionalidades:
 * - Upload de extratos (5 abas: Upload, Matching, Validação, Resumo, Histórico)
 * - Matching automático com 3 níveis de confiança
 * - Validação manual de transações
 * - Geração de relatórios
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  BarChart3, 
  FileText,
  Loader,
  TrendingUp,
  X,
  Plus,
  Filter
} from 'lucide-react';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import reconciliationApi from '@/lib/reconciliationApi';
import { supabase } from '@/lib/customSupabaseClient';

const Conciliador = () => {
  const { clinicId } = useClinicContext();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // ========== CARREGAMENTO INICIAL ==========
  useEffect(() => {
    if (clinicId) {
      loadStatements();
      loadSummary();
      loadHistory();
    }
  }, [clinicId, activeTab]);

  const loadStatements = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('statement_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setStatements(data || []);
    } catch (error) {
      console.error('Erro ao carregar statements:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await reconciliationApi.getReconciliationSummary(clinicId);
      if (data && data.length > 0) {
        setSummary(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await reconciliationApi.getReconciliationHistory(clinicId);
      setHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  // ========== UPLOAD DE EXTRATO ==========
  const handleStatementUpload = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      const statementDate = new Date().toISOString().split('T')[0];
      const result = await reconciliationApi.uploadStatement(clinicId, {
        file,
        accountId: 'default-account',
        statementDate,
        fileName: file.name,
      });

      setSuccessMessage(`✅ Extrato '${file.name}' enviado com sucesso!`);
      setSelectedStatement(result.id);
      
      // Carregar transações do novo statement
      setTimeout(() => {
        loadStatements();
        setActiveTab('matching');
      }, 500);
    } catch (error) {
      alert(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ========== EXECUTAR MATCHING ==========
  const handleExecuteMatching = async () => {
    if (!selectedStatement) {
      alert('Selecione um extrato para fazer o matching');
      return;
    }

    setLoading(true);
    try {
      const result = await reconciliationApi.matchTransactions(selectedStatement);
      setSuccessMessage(`✅ Matching concluído: ${result.totalMatched} transações combinadas`);
      
      // Recarregar transações
      const txns = await reconciliationApi.getTransactions(selectedStatement);
      setTransactions(txns || []);
    } catch (error) {
      alert(`Erro ao executar matching: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ========== ATUALIZAR MATCH MANUAL ==========
  const handleUpdateMatch = async (transactionId, invoiceId) => {
    try {
      await reconciliationApi.updateTransactionMatch(transactionId, invoiceId, 'Ajuste manual');
      setSuccessMessage('✅ Match atualizado com sucesso');
      const txns = await reconciliationApi.getTransactions(selectedStatement);
      setTransactions(txns || []);
    } catch (error) {
      alert(`Erro ao atualizar match: ${error.message}`);
    }
  };

  // ========== REJEITAR MATCH ==========
  const handleRejectMatch = async (transactionId) => {
    try {
      await reconciliationApi.rejectMatch(transactionId);
      setSuccessMessage('✅ Match rejeitado');
      const txns = await reconciliationApi.getTransactions(selectedStatement);
      setTransactions(txns || []);
    } catch (error) {
      alert(`Erro ao rejeitar match: ${error.message}`);
    }
  };

  // ========== GERAR RELATÓRIO ==========
  const handleGenerateReport = async () => {
    if (!selectedStatement) {
      alert('Selecione um extrato');
      return;
    }

    setLoading(true);
    try {
      const result = await reconciliationApi.generateReport(
        clinicId,
        selectedStatement,
        user?.id
      );
      setSuccessMessage('📊 Relatório gerado com sucesso!');
    } catch (error) {
      alert(`Erro ao gerar relatório: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ========== RENDERIZAÇÃO: ABA UPLOAD ==========
  const renderUploadTab = () => (
    <div className="space-y-6">
      {/* Card de Upload */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-12 w-12 text-blue-600" />
            <h3 className="text-lg font-semibold">Enviar Extrato Bancário</h3>
            <p className="text-sm text-gray-600">
              Suporta: CSV, OFX, Excel
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".csv,.ofx,.xlsx,.xls"
                onChange={(e) => handleStatementUpload(e.target.files?.[0])}
                disabled={loading}
              />
              <div className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition">
                {loading ? 'Processando...' : 'Selecionar Arquivo'}
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Extratos Recentes */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Extratos Recentes</h3>
        <div className="space-y-3">
          {statements.length > 0 ? (
            statements.map((stmt) => (
              <Card
                key={stmt.id}
                className={`cursor-pointer transition ${
                  selectedStatement === stmt.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setSelectedStatement(stmt.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{stmt.file_name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(stmt.statement_date).toLocaleDateString('pt-BR')} • 
                      {stmt.transaction_count} transações
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    stmt.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : stmt.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {stmt.status === 'completed' ? 'Estável' : 
                     stmt.status === 'processing' ? 'Atenção' : 
                     'Atenção'}
                  </span>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum extrato enviado ainda</p>
          )}
        </div>
      </div>
    </div>
  );

  // ========== RENDERIZAÇÃO: ABA MATCHING ==========
  const renderMatchingTab = () => (
    <div className="space-y-6">
      {selectedStatement ? (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Matching Automático</h3>
            <button
              onClick={handleExecuteMatching}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="inline mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                '▶️ Executar Matching'
              )}
            </button>
          </div>

          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <Card key={tx.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tx.description}</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tx.status === 'matched'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tx.status === 'matched' ? 'Estável' : 'Atenção'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          R$ {parseFloat(tx.amount).toFixed(2)} • 
                          {new Date(tx.transaction_date).toLocaleDateString('pt-BR')}
                        </p>
                        {tx.match_type && (
                          <p className="text-xs text-blue-600 mt-1">
                            Tipo: {tx.match_type === 'auto_exact' ? '🎯 Exato' : 
                                   tx.match_type === 'auto_fuzzy' ? '🔍 Fuzzy' : 
                                   '📊 Parcial'} 
                            ({Math.round(tx.match_confidence * 100)}%)
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {tx.status === 'matched' && (
                          <button
                            onClick={() => handleRejectMatch(tx.id)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded transition"
                            title="Rejeitar match"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Carregue um extrato primeiro</p>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-center py-8">Selecione um extrato na aba anterior</p>
      )}
    </div>
  );

  // ========== RENDERIZAÇÃO: ABA VALIDAÇÃO ==========
  const renderValidationTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Validação de Matches</h3>
      
      {transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Descrição</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Valor</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Confiança</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {new Date(tx.transaction_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{tx.description}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    R$ {parseFloat(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.status === 'matched' ? (
                      <span className="text-green-600 font-medium">Estável</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">Atenção</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {tx.match_confidence > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${tx.match_confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs">{Math.round(tx.match_confidence * 100)}%</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.status === 'matched' && (
                      <button
                        onClick={() => handleRejectMatch(tx.id)}
                        className="text-red-600 hover:bg-red-50 px-2 py-1 rounded transition"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Nenhuma transação para validar</p>
      )}
    </div>
  );

  // ========== RENDERIZAÇÃO: ABA RESUMO ==========
  const renderSummaryTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Resumo da Conciliação</h3>

      {summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total de Transações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{summary.total_transactions}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Taxa de Matching</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{summary.match_rate?.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Combinadas (Exatas)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{summary.auto_exact_count}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Combinadas (Fuzzy)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{summary.auto_fuzzy_count}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Combinadas (Parciais)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{summary.auto_partial_count}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Em atenção</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{summary.unmatched_count}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Nenhum resumo disponível</p>
      )}

      {selectedStatement && (
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
        >
          {loading ? '⏳ Gerando...' : '📊 Gerar Relatório Completo'}
        </button>
      )}
    </div>
  );

  // ========== RENDERIZAÇÃO: ABA HISTÓRICO ==========
  const renderHistoryTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Histórico de Reconciliações</h3>

      {history.length > 0 ? (
        <div className="space-y-3">
          {history.map((rec) => (
            <Card key={rec.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {new Date(rec.reconciliation_date).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {rec.total_matched} de {rec.total_transactions} transações combinadas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{rec.match_rate?.toFixed(1)}%</p>
                    <p className="text-xs text-gray-600">{rec.processing_time_ms}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Nenhum histórico disponível</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          Conciliação Bancária Inteligente
        </h1>
        <p className="text-gray-600 mt-2">
          Reconcilie extratos bancários com transações financeiras automaticamente
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-900">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1">
          {[
            { id: 'upload', label: '📤 Upload', icon: Upload },
            { id: 'matching', label: '🔄 Matching', icon: CheckCircle },
            { id: 'validation', label: '✔️ Validação', icon: Eye },
            { id: 'summary', label: '📊 Resumo', icon: BarChart3 },
            { id: 'history', label: '📜 Histórico', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'upload' && renderUploadTab()}
        {activeTab === 'matching' && renderMatchingTab()}
        {activeTab === 'validation' && renderValidationTab()}
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </div>
    </div>
  );
};

export default Conciliador;
