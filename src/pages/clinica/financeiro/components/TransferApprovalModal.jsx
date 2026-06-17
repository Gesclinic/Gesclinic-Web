/**
 * Componente de Modal de Aprovação de Transferências
 * Permite que gestores aprovem ou rejeitem transferências pendentes
 */

import React, { useRef, useState } from 'react';
import { X, CheckCircle, XCircle, Loader } from 'lucide-react';

/**
 * Modal para captura de assinatura digital e aprovação de transferência
 */
const TransferApprovalModal = ({ transfer, isOpen, onClose, onApprove, onReject, isLoading }) => {
  const canvasRef = useRef(null);
  const [signature, setSignature] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalMode, setApprovalMode] = useState('sign'); // 'sign' ou 'reject'

  if (!isOpen || !transfer) return null;

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    setSignature(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const handleApprove = () => {
    if (!signature && approvalMode === 'sign') {
      alert('Por favor, assine o documento antes de aprovar');
      return;
    }
    onApprove({
      transferId: transfer.id,
      signature,
      notes,
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Por favor, indique o motivo da rejeição');
      return;
    }
    onReject({
      transferId: transfer.id,
      reason: rejectionReason,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-2xl font-bold text-slate-800">✓ Aprovação de Transferência</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Informações da Transferência */}
          <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-4 space-y-3">
            <h3 className="font-bold text-slate-800 text-lg">📋 Dados da Transferência</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 font-bold uppercase">Origem</p>
                <p className="text-sm font-semibold text-slate-800">
                  {transfer.from_drawer?.operator?.name || 'N/A'}
                </p>
                <p className="text-xs text-slate-500">
                  {transfer.from_drawer ? new Date(transfer.from_drawer.date_opened).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-bold uppercase">Destino</p>
                <p className="text-sm font-semibold text-slate-800">
                  {transfer.to_account?.account_name || 'N/A'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div>
                <p className="text-xs text-slate-600 font-bold uppercase">Tipo</p>
                <p className="text-sm font-semibold text-slate-800">{transfer.payment_method}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-bold uppercase">Valor</p>
                <p className="text-lg font-bold text-blue-700">
                  R$ {Number(transfer.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-bold uppercase">Data</p>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(transfer.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            {transfer.notes && (
              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-600 font-bold uppercase">Observação Original</p>
                <p className="text-sm text-slate-700 italic">{transfer.notes}</p>
              </div>
            )}
          </div>

          {/* Tabs: Aprovar ou Rejeitar */}
          <div className="flex gap-2 bg-slate-100 rounded-lg p-2">
            <button
              onClick={() => setApprovalMode('sign')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                approvalMode === 'sign'
                  ? 'bg-green-600 text-white'
                  : 'bg-transparent text-slate-600 hover:bg-slate-200'
              }`}
            >
              ✓ Aprovar
            </button>
            <button
              onClick={() => setApprovalMode('reject')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                approvalMode === 'reject'
                  ? 'bg-red-600 text-white'
                  : 'bg-transparent text-slate-600 hover:bg-slate-200'
              }`}
            >
              ✕ Rejeitar
            </button>
          </div>

          {/* Modo de Aprovação */}
          {approvalMode === 'sign' && (
            <div className="space-y-4">
              {/* Canvas de Assinatura */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  🖊️ Assinatura Digital
                </label>
                <div className="border-2 border-dashed border-blue-300 rounded-lg bg-white p-2">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full border border-blue-200 rounded-lg cursor-crosshair bg-white"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={clearSignature}
                    className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all"
                  >
                    🔄 Limpar
                  </button>
                  {signature && (
                    <div className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg font-semibold text-center">
                      ✓ Assinatura Capturada
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  📝 Observações da Aprovação
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Conferência OK, valores conferem, autorizado para transferência imediata"
                  className="w-full border-2 border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Modo de Rejeição */}
          {approvalMode === 'reject' && (
            <div className="space-y-4 bg-red-50 rounded-xl border-2 border-red-200 p-4">
              <h3 className="font-bold text-red-900 text-lg">⚠️ Motivo da Rejeição</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Saldo insuficiente, documentação incompleta, aguardando confirmação do operador"
                className="w-full border-2 border-red-300 rounded-lg p-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all min-h-[100px]"
              />
              <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-sm text-red-800">
                <p className="font-semibold mb-1">⚠️ Atenção!</p>
                <p>A rejeição notificará o operador e a transferência será marcada como "Rejeitada". Ela pode ser recriada após resolver a questão.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Botões */}
        <div className="sticky bottom-0 border-t-2 border-slate-100 bg-slate-50 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            ✕ Cancelar
          </button>

          {approvalMode === 'sign' ? (
            <button
              onClick={handleApprove}
              disabled={isLoading || (!signature && approvalMode === 'sign')}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  ✓ Aprovar Transferência
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleReject}
              disabled={isLoading || !rejectionReason.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-bold hover:from-red-700 hover:to-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Rejeitando...
                </>
              ) : (
                <>
                  <XCircle size={18} />
                  ✕ Rejeitar Transferência
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferApprovalModal;
