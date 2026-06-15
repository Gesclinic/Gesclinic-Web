import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Undo2, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFeeAuditHistory, revertFeeToVersion } from '@/lib/processorFeeValidations';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function FeeAuditTrail({ feeId, clinicId, isOpen, onClose, onRevert }) {
  const { user } = useAuth();
  const [auditHistory, setAuditHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Carregar histórico de auditoria
   */
  useEffect(() => {
    if (isOpen && feeId) {
      loadAuditHistory();
    }
  }, [isOpen, feeId]);

  async function loadAuditHistory() {
    try {
      setLoading(true);
      setError('');
      const history = await getFeeAuditHistory(feeId, 50);
      setAuditHistory(history || []);
    } catch (err) {
      console.error('❌ Erro ao carregar auditoria:', err);
      setError('Erro ao carregar histórico de auditoria');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Reverter para uma versão anterior
   */
  async function handleRevert(auditLogId) {
    if (!window.confirm('Tem certeza que deseja reverter para esta versão?')) {
      return;
    }

    try {
      setReverting(true);
      setError('');
      setSuccess('');

      await revertFeeToVersion(feeId, auditLogId, clinicId, user?.id);
      setSuccess('✅ Taxa revertida com sucesso!');

      // Recarregar histórico
      setTimeout(() => {
        loadAuditHistory();
        if (onRevert) onRevert();
      }, 500);
    } catch (err) {
      console.error('❌ Erro ao reverter:', err);
      setError('Erro ao reverter: ' + err.message);
    } finally {
      setReverting(false);
    }
  }

  /**
   * Formatar datas em português
   */
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  /**
   * Obter texto descritivo da ação
   */
  const getActionBadge = (action) => {
    const badges = {
      create: { label: '✨ Criado', color: 'bg-green-100 text-green-800' },
      update: { label: '✏️ Alterado', color: 'bg-blue-100 text-blue-800' },
      delete: { label: '🗑️ Deletado', color: 'bg-red-100 text-red-800' },
    };
    return badges[action] || { label: action, color: 'bg-gray-100 text-gray-800' };
  };

  /**
   * Comparar valores antigos e novos
   */
  const getChangeSummary = (oldValues, newValues) => {
    const changes = [];
    if (!oldValues) return 'Criação inicial';

    const oldObj = typeof oldValues === 'string' ? JSON.parse(oldValues) : oldValues;
    const newObj = typeof newValues === 'string' ? JSON.parse(newValues) : newValues;

    Object.keys(newObj).forEach((key) => {
      if (oldObj[key] !== newObj[key]) {
        changes.push(`${key}: ${oldObj[key]} → ${newObj[key]}`);
      }
    });

    return changes.length > 0 ? changes.join('; ') : 'Sem mudanças detectadas';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Histórico de Auditoria da Taxa
          </DialogTitle>
        </DialogHeader>

        {/* Mensagens de Sucesso/Erro */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded p-3 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
            <span className="ml-3 text-gray-600">Carregando histórico...</span>
          </div>
        )}

        {/* Histórico de Auditoria */}
        {!loading && auditHistory.length === 0 && (
          <p className="text-center text-gray-500 py-6">Sem histórico de alterações para esta taxa</p>
        )}

        {!loading && auditHistory.length > 0 && (
          <div className="space-y-2">
            {auditHistory.map((entry, idx) => {
              const isExpanded = expandedId === entry.id;
              const badge = getActionBadge(entry.action);
              const summary = getChangeSummary(entry.old_values, entry.new_values);

              return (
                <div
                  key={entry.id}
                  className="border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  {/* Header - resumo colapsável */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-200 rounded-t-lg"
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      )}
                    </div>

                    <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{summary}</p>
                    </div>

                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatDistanceToNow(new Date(entry.changed_at), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </span>
                  </button>

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-white space-y-3 rounded-b-lg">
                      {/* Data e usuário */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Data da Alteração</p>
                          <p className="font-medium">{formatDate(entry.changed_at)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Usuário</p>
                          <p className="font-medium">{entry.changed_by || 'Sistema'}</p>
                        </div>
                      </div>

                      {/* Motivo (se disponível) */}
                      {entry.change_reason && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2">
                          <p className="text-xs text-gray-600">Motivo</p>
                          <p className="text-sm text-blue-900">{entry.change_reason}</p>
                        </div>
                      )}

                      {/* Valores antigos e novos */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2">Valores Anteriores</p>
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto border border-gray-300">
                            {entry.old_values
                              ? JSON.stringify(JSON.parse(entry.old_values), null, 2)
                              : '(novo)'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2">Valores Novos</p>
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto border border-gray-300">
                            {JSON.stringify(JSON.parse(entry.new_values), null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Botão de reverter - apenas para updates/creates */}
                      {(entry.action === 'update' || entry.action === 'create') && (
                        <button
                          onClick={() => handleRevert(entry.id)}
                          disabled={reverting}
                          className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-sm font-medium text-yellow-800 hover:bg-yellow-100 disabled:opacity-50"
                        >
                          <Undo2 className="w-4 h-4" />
                          {reverting ? 'Revertendo...' : 'Reverter para esta versão'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Total de registros */}
        <div className="text-xs text-gray-500 text-center pt-2">
          {auditHistory.length > 0 && `${auditHistory.length} alteração(ões) encontrada(s)`}
        </div>
      </DialogContent>
    </Dialog>
  );
}
