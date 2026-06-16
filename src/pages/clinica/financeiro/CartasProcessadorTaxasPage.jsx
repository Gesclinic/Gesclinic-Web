import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { listCardProcessors } from '@/lib/cardProcessorsApi';
import {
  listProcessorFees,
  createProcessorFee,
  updateProcessorFee,
  deleteProcessorFee,
} from '@/lib/processorFeesApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CreditCard, Percent, AlertCircle, Edit2, Trash2, History, Trash } from 'lucide-react';
import {
  validateProcessorFee,
  checkDuplicateFee,
  validateFeeRateReasonableness,
} from '@/lib/processorFeeValidations';
import FeeAuditTrail from './components/FeeAuditTrail'; // ✅ ETAPA D.4

const CARD_BRANDS = [
  'Visa',
  'Mastercard',
  'Elo',
  'Amex',
  'Hipercard',
  'Discover',
];

const SETTLEMENT_TYPES = [
  { value: 'D+0', label: 'D+0 (Imediato)' },
  { value: 'D+1', label: 'D+1 (Próximo dia)' },
  { value: 'D+30', label: 'D+30 (30 dias)' },
  { value: 'Payment Day', label: 'Payment Day (Dia configurado)' },
];

export default function CartasProcessadorTaxasPage() {
  const { isAuthenticated, user } = useAuth(); // ✅ ETAPA D.2: Adicionar user
  const { clinicId } = useClinicContext();

  const [processors, setProcessors] = useState([]);
  const [fees, setFees] = useState([]);
  const [loadingProcessors, setLoadingProcessors] = useState(true);
  const [loadingFees, setLoadingFees] = useState(true);
  const [bulkDeletingFees, setBulkDeletingFees] = useState(false);
  const [selectedFeeIds, setSelectedFeeIds] = useState(new Set());

  // Form state
  const [processorId, setProcessorId] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [settlementType, setSettlementType] = useState('');
  const [feePercent, setFeePercent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ✅ ETAPA D.4: Audit Trail modal state
  const [auditFeeId, setAuditFeeId] = useState(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  useEffect(() => {
    if (!isAuthenticated || !clinicId) {
      return;
    }
    loadProcessors();
  }, [isAuthenticated, clinicId]);

  // Load all fees independently from the form selection.
  useEffect(() => {
    if (!isAuthenticated || !clinicId) {
      return;
    }
    loadFees();
  }, [isAuthenticated, clinicId]);

  useEffect(() => {
    setSelectedFeeIds((current) => new Set([...current].filter((id) => fees.some((fee) => fee.id === id))));
  }, [fees]);

  const loadProcessors = async () => {
    try {
      setLoadingProcessors(true);
      const data = await listCardProcessors(clinicId);
      setProcessors(data || []);
    } catch (err) {
      console.error('Erro ao carregar operadoras:', err);
      setError('Erro ao carregar operadoras');
    } finally {
      setLoadingProcessors(false);
    }
  };

  const loadFees = async () => {
    try {
      setLoadingFees(true);
      const data = await listProcessorFees(clinicId);
      setFees(data || []);
    } catch (err) {
      console.error('Erro ao carregar taxas:', err);
      setError('Erro ao carregar taxas');
    } finally {
      setLoadingFees(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!processorId || !cardBrand || !settlementType || feePercent === '') {
      setError('Todos os campos são obrigatórios');
      return;
    }

    // 🔍 VALIDAÇÃO 1: Validar formato e valores básicos
    const basicValidation = validateProcessorFee({
      processorId,
      cardBrand,
      settlementType,
      feePercent,
    });

    if (!basicValidation.isValid) {
      setError('❌ Validação falhou:\n\n' + basicValidation.errors.join('\n'));
      return;
    }

    // ⚠️ VALIDAÇÃO 2: Verificar taxa suspeita (aviso)
    const warnings = validateFeeRateReasonableness(parseFloat(feePercent));
    if (warnings.length > 0) {
      const proceed = confirm(
        'Avisos detectados:\n\n' +
          warnings.join('\n') +
          '\n\nDeseja continuar mesmo assim?'
      );
      if (!proceed) {
        return;
      }
    }

    // 🔄 VALIDAÇÃO 3: Verificar duplicatas (mesmo em modo edit)
    const duplicate = await checkDuplicateFee(
      clinicId,
      processorId,
      cardBrand,
      settlementType,
      editingId // Excluir o registro atual se estamos editando
    );

    if (duplicate) {
      setError(
        `⚠️ Já existe uma taxa para ${cardBrand} - ${settlementType}.\n\nTaxa atual: ${duplicate.fee_percent}%\n\nOperações duplicadas não são permitidas.`
      );
      return;
    }

    try {
      if (editingId) {
        // ✅ ETAPA D.2: Adicionar clinicId e userId para auditoria
        await updateProcessorFee(editingId, {
          cardBrand,
          settlementType,
          feePercent: parseFloat(feePercent),
          clinicId,
          userId: user?.id,
        });
        setSuccess('✅ Taxa atualizada com sucesso!');
      } else {
        // ✅ ETAPA D.2: Adicionar userId para auditoria
        await createProcessorFee(clinicId, {
          processorId,
          cardBrand,
          settlementType,
          feePercent: parseFloat(feePercent),
          userId: user?.id,
        });
        setSuccess('✅ Taxa adicionada com sucesso!');
      }

      resetForm();
      await loadFees();
    } catch (err) {
      console.error('Erro ao salvar taxa:', err);
      setError('❌ Erro ao salvar taxa: ' + (err.message || 'Tente novamente'));
    }
  };

  const handleEdit = (fee) => {
    setEditingId(fee.id);
    setProcessorId(fee.card_processor_id);
    setCardBrand(fee.card_brand);
    setSettlementType(fee.settlement_type);
    setFeePercent(fee.fee_percent.toString());
  };

  const handleDelete = async (feeId) => {
    if (!confirm('Tem certeza que deseja deletar esta taxa?')) return;

    try {
      setError('');
      // ✅ ETAPA D.2: Passar clinicId e userId para auditoria
      await deleteProcessorFee(feeId, {
        clinicId,
        userId: user?.id,
      });
      setSuccess('Taxa deletada com sucesso!');
      await loadFees();
    } catch (err) {
      console.error('Erro ao deletar taxa:', err);
      setError('Erro ao deletar taxa');
    }
  };

  const selectedFees = fees.filter((fee) => selectedFeeIds.has(fee.id));
  const allFeesSelected = fees.length > 0 && fees.every((fee) => selectedFeeIds.has(fee.id));

  const toggleFeeSelection = (feeId) => {
    setSelectedFeeIds((current) => {
      const next = new Set(current);
      if (next.has(feeId)) {
        next.delete(feeId);
      } else {
        next.add(feeId);
      }
      return next;
    });
  };

  const toggleAllFeeSelection = () => {
    setSelectedFeeIds((current) => {
      if (allFeesSelected) return new Set();
      const next = new Set(current);
      fees.forEach((fee) => next.add(fee.id));
      return next;
    });
  };

  const handleDeleteSelectedFees = async () => {
    if (!selectedFees.length || bulkDeletingFees) return;

    if (!confirm(`Excluir ${selectedFees.length} taxa(s) selecionada(s)?\n\nEsta ação remove somente as taxas marcadas, mas mantém as operadoras e as funcionalidades da tela ativas.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setBulkDeletingFees(true);

      for (const fee of selectedFees) {
        await deleteProcessorFee(fee.id, {
          clinicId,
          userId: user?.id,
        });
      }

      resetForm();
      setSelectedFeeIds(new Set());
      setSuccess(`✅ ${selectedFees.length} taxa(s) selecionada(s) excluída(s) com sucesso. Funcionalidades permanecem ativas para novas configurações.`);
      await loadFees();
    } catch (err) {
      console.error('Erro ao excluir taxas em massa:', err);
      setError('Erro ao excluir taxas selecionadas: ' + (err.message || 'Tente novamente'));
    } finally {
      setBulkDeletingFees(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setProcessorId('');
    setCardBrand('');
    setSettlementType('');
    setFeePercent('');
  };

  const selectedProcessor = processors.find((p) => p.id === processorId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <CreditCard className="w-8 h-8 text-blue-600" />
            💰 Taxas de Processamento por Operadora
          </h1>
          <p className="text-slate-600">
            Configure as taxas de cada operadora por bandeira e forma de recebimento
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Percent className="w-5 h-5 text-green-600" />
                {editingId ? '✏️ Editar Taxa' : '➕ Nova Taxa'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Operadora */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Operadora *
                  </Label>
                  {loadingProcessors ? (
                    <div className="text-sm text-slate-500 p-2">Carregando operadoras...</div>
                  ) : (
                    <Select value={processorId || undefined} onValueChange={setProcessorId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione operadora" />
                      </SelectTrigger>
                      <SelectContent>
                        {processors && processors.length > 0 ? (
                          processors.map((proc) => (
                            <SelectItem key={proc.id} value={proc.id}>
                              {proc.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-slate-500">Nenhuma operadora encontrada</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Bandeira */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Bandeira *
                  </Label>
                  <Select value={cardBrand || undefined} onValueChange={setCardBrand}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione bandeira" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_BRANDS.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Forma de Recebimento */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Forma de Recebimento *
                  </Label>
                  <Select value={settlementType || undefined} onValueChange={setSettlementType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione forma" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETTLEMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Taxa */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Taxa (%) *
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Ex: 2.5"
                      value={feePercent}
                      onChange={(e) => setFeePercent(e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      %
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingId ? '✏️ Atualizar' : '➕ Adicionar'}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1"
                    >
                      ✕ Cancelar
                    </Button>
                  )}
                </div>
              </form>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">💡 Dica:</p>
                <ul className="text-xs text-blue-600 mt-2 space-y-1">
                  <li>• Crie uma taxa para cada combinação de operadora + bandeira + recebimento</li>
                  <li>• Deixe as bandeiras que não utiliza vazias</li>
                  <li>• Atualize conforme negociações evoluem</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Lista de Taxas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">
                    📋 Taxas Configuradas{' '}
                    <span className="text-sm font-normal text-slate-500">
                      ({fees.length})
                    </span>
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteSelectedFees}
                    disabled={!selectedFees.length || bulkDeletingFees}
                    className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    <Trash className="h-4 w-4" />
                    {bulkDeletingFees ? 'Excluindo...' : `Excluir selecionadas (${selectedFees.length})`}
                  </Button>
                </div>

                {fees.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={allFeesSelected}
                        onChange={toggleAllFeeSelection}
                        disabled={bulkDeletingFees}
                      />
                      Selecionar todas visíveis
                    </label>
                    <span className="text-slate-500">
                      {selectedFees.length} selecionada{selectedFees.length === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
              </div>

              {loadingFees ? (
                <p className="text-slate-500 text-center py-8">Carregando...</p>
              ) : fees.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 mb-4">Nenhuma taxa configurada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fees.map((fee) => (
                    <div
                      key={fee.id}
                      className={`border rounded-lg p-4 transition ${selectedFeeIds.has(fee.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="mt-1 inline-flex items-center" title="Selecionar taxa">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={selectedFeeIds.has(fee.id)}
                            onChange={() => toggleFeeSelection(fee.id)}
                            disabled={bulkDeletingFees}
                            aria-label={`Selecionar taxa ${fee.card_brand} ${fee.settlement_type}`}
                          />
                        </label>

                        <div className="flex-1">
                          <div className="flex gap-2 items-center mb-2">
                            <span className="font-semibold text-slate-900">
                              {fee.card_brand}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                              {fee.settlement_type}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            📊 Operadora:{' '}
                            <span className="font-medium">
                              {fee.card_processor?.name || 'N/A'}
                            </span>
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              {fee.fee_percent}%
                            </p>
                            <p className="text-xs text-slate-500">taxa</p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(fee)}
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(fee.id)}
                              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {/* ✅ ETAPA D.4: Botão de Histórico */}
                            <button
                              onClick={() => {
                                setAuditFeeId(fee.id);
                                setShowAuditTrail(true);
                              }}
                              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Ver histórico"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {fees.length > 0 && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    📊 Resumo geral
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="font-medium">Total de Taxas:</span> {fees.length}
                    </div>
                    <div>
                      <span className="font-medium">Bandeiras:</span>{' '}
                      {new Set(fees.map((f) => f.card_brand)).size}
                    </div>
                    <div>
                      <span className="font-medium">Taxa Mínima:</span>{' '}
                      {Math.min(...fees.map((f) => f.fee_percent)).toFixed(2)}%
                    </div>
                    <div>
                      <span className="font-medium">Taxa Máxima:</span>{' '}
                      {Math.max(...fees.map((f) => f.fee_percent)).toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            ℹ️ Como funciona:
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              • Cada <strong>Operadora</strong> (Stone, PagBank, etc) pode ter múltiplas
              negociações
            </li>
            <li>
              • Para cada <strong>Bandeira</strong> (Visa, Mastercard, etc), as taxas
              podem variar
            </li>
            <li>
              • A <strong>Forma de Recebimento</strong> (D+0, D+1, etc) também impacta
              a taxa
            </li>
            <li>
              • Exemplo: Stone + Visa + D+0 pode ser 2.99%, enquanto Stone + Visa +
              D+1 é 2.49%
            </li>
          </ul>
        </div>

        {/* ✅ ETAPA D.4: Audit Trail Modal */}
        {auditFeeId && (
          <FeeAuditTrail
            feeId={auditFeeId}
            clinicId={clinicId}
            isOpen={showAuditTrail}
            onClose={() => {
              setShowAuditTrail(false);
              setAuditFeeId(null);
            }}
            onRevert={() => {
              loadFees();
            }}
          />
        )}
      </div>
    </div>
  );
}
