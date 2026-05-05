/**
 * CheckinItemModal.jsx
 *
 * Modal inteligente para editar itens individuais do checklist
 * Detecta qual item precisa ser editado e exibe o formulário apropriado
 *
 * NOTA: Para "dados_cadastrais", redireciona para página de edição de paciente
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CheckinItemModal({ isOpen, itemId, appointment, onClose, onSave }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Se é dados cadastrais, preparar modal
  useEffect(() => {
    if (isOpen && itemId === 'dados_cadastrais') {
      // Limpar erros anteriores
      setError(null);
    }
  }, [isOpen, itemId]);

  const handleEditarDadosCadastrais = () => {
    // Validar se patient_id existe
    if (!appointment?.patient_id) {
      setError('Erro: Paciente não carregado corretamente. Feche o modal e tente novamente.');
      return;
    }

    // Redirecionar para página de edição de paciente completa
    // Passar appointmentId para voltar depois via localStorage
    localStorage.setItem(
      'checkinReturnData',
      JSON.stringify({
        appointmentId: appointment.id,
        returnToCheckin: true,
      }),
    );
    navigate(`/clinica/pacientes/${appointment.patient_id}`, {
      state: { returnToCheckin: true, appointmentId: appointment.id },
    });
    onClose?.();
  };

  useEffect(() => {
    if (isOpen && appointment) {
      // Inicializar dados do formulário baseado no itemId
      initializeFormData(itemId);
    }
  }, [isOpen, itemId, appointment]);

  const initializeFormData = (id) => {
    switch (id) {
    case 'dados_cadastrais':
      setFormData({
        patient_name: appointment?.patient_name || '',
        patient_cpf: appointment?.patient_cpf || '',
        patient_phone: appointment?.patient_phone || '',
      });
      break;
    case 'convenio':
      setFormData({
        payer_name: appointment?.payer_name || '',
        payer_type: appointment?.payer_type || 'CONVENIO',
        authorization_number: appointment?.authorization_number || '',
      });
      break;
    case 'carteirinha':
      setFormData({
        insurance_card_verified: appointment?.insurance_card_verified || false,
        card_number: appointment?.card_number || '',
      });
      break;
    case 'autorizacao':
      setFormData({
        authorization_verified: appointment?.authorization_verified || false,
        authorization_date: appointment?.authorization_date || '',
      });
      break;
    case 'guia':
      setFormData({
        guide_number: appointment?.guide_number || '',
        guide_generated: appointment?.guide_generated || false,
      });
      break;
    case 'pagamento':
      setFormData({
        payment_method: appointment?.payment_method || '',
        payment_status: appointment?.payment_status || '',
      });
      break;
    default:
      setFormData({});
    }
    setError(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validação básica
      if (!formData || Object.keys(formData).length === 0) {
        setError('Nenhum dado para salvar');
        return;
      }

      // Chamar callback com dados do formulário
      await onSave?.(itemId, formData);
    } catch (err) {
      setError(err.message || 'Erro ao salvar');
      console.error('Erro ao salvar item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClose = () => {
    setFormData({});
    setError(null);
    onClose?.();
  };

  if (!isOpen) {
    return null;
  }

  // Se for dados cadastrais, mostrar mensagem especial (com validação de pré-paciente)
  if (itemId === 'dados_cadastrais') {
    const isPrePatient = !appointment?.patient_id;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
        <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:w-full max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">✏️ Atualizar Dados Cadastrais</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-4">
            {isPrePatient ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold text-red-900 mb-2">🚫 Paciente Não Cadastrado</p>
                    <p className="text-sm text-red-800">
                      Este agendamento foi feito para um pré-paciente (agendamento rápido por
                      telefone). É necessário criar um cadastro completo no sistema antes de
                      prosseguir com o check-in.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    📝 Você será redirecionado para a página de novo paciente. Após criar o
                    cadastro, poderá realizar o check-in normalmente.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold text-blue-900 mb-2">
                      Cadastro Completo Obrigatório
                    </p>
                    <p className="text-sm text-blue-800">
                      Para prosseguir com o check-in, é necessário preencher todas as informações
                      cadastrais do paciente: dados básicos, contato, endereço e documentos.
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-900">
                    📝 Você será redirecionado para a página de edição de paciente onde poderá
                    atualizar todas as informações. Após salvar, voltará automaticamente para o
                    check-in.
                  </p>
                </div>
              </>
            )}

            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              onClick={
                isPrePatient
                  ? () => navigate('/clinica/pacientes/novo')
                  : handleEditarDadosCadastrais
              }
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              <ExternalLink size={18} />
              {isPrePatient ? 'Criar Cadastro' : 'Abrir Cadastro'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">{getModalTitle(itemId)}</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {renderFormContent(itemId, formData, handleChange)}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg transition"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getModalTitle(itemId) {
  const titles = {
    dados_cadastrais: '✏️ Atualizar Dados Cadastrais',
    convenio: '💳 Validar Convênio',
    carteirinha: '🎫 Conferir Carteirinha',
    autorizacao: '✅ Verificar Autorização',
    guia: '📄 Gerar Guia',
    pagamento: '💰 Definir Pagamento',
  };
  return titles[itemId] || 'Editar Item';
}

function renderFormContent(itemId, formData, handleChange) {
  switch (itemId) {
  case 'dados_cadastrais':
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nome do Paciente
          </label>
          <input
            type="text"
            value={formData.patient_name || ''}
            onChange={(e) => handleChange('patient_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Nome completo"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">CPF</label>
          <input
            type="text"
            value={formData.patient_cpf || ''}
            onChange={(e) => handleChange('patient_cpf', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label>
          <input
            type="tel"
            value={formData.patient_phone || ''}
            onChange={(e) => handleChange('patient_phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>
    );

  case 'convenio':
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nome do Convênio
          </label>
          <input
            type="text"
            value={formData.payer_name || ''}
            onChange={(e) => handleChange('payer_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Unimed, Bradesco Saúde..."
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tipo de Pagador
          </label>
          <select
            value={formData.payer_type || 'CONVENIO'}
            onChange={(e) => handleChange('payer_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="CONVENIO">Convênio</option>
            <option value="PARTICULAR">Particular</option>
            <option value="GRATUITO">Gratuito</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
              Número de Autorização
          </label>
          <input
            type="text"
            value={formData.authorization_number || ''}
            onChange={(e) => handleChange('authorization_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Número da autorização (se aplicável)"
          />
        </div>
      </div>
    );

  case 'carteirinha':
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
              Número da Carteirinha
          </label>
          <input
            type="text"
            value={formData.card_number || ''}
            onChange={(e) => handleChange('card_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Número impresso na carteirinha"
          />
        </div>
        <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={formData.insurance_card_verified || false}
            onChange={(e) => handleChange('insurance_card_verified', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-orange-500"
          />
          <span className="font-semibold text-gray-700">Carteirinha conferida e válida</span>
        </label>
      </div>
    );

  case 'autorizacao':
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
              Data da Autorização
          </label>
          <input
            type="date"
            value={formData.authorization_date || ''}
            onChange={(e) => handleChange('authorization_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={formData.authorization_verified || false}
            onChange={(e) => handleChange('authorization_verified', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-orange-500"
          />
          <span className="font-semibold text-gray-700">Autorização verificada e válida</span>
        </label>
      </div>
    );

  case 'guia':
    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
              Se a guia não foi gerada, o sistema gerará automaticamente após salvar.
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Número da Guia</label>
          <input
            type="text"
            value={formData.guide_number || ''}
            onChange={(e) => handleChange('guide_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Será preenchido automaticamente"
            disabled={!formData.guide_generated}
          />
        </div>
        <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={formData.guide_generated || false}
            onChange={(e) => handleChange('guide_generated', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-orange-500"
          />
          <span className="font-semibold text-gray-700">Guia gerada com sucesso</span>
        </label>
      </div>
    );

  case 'pagamento':
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
              Método de Pagamento
          </label>
          <select
            value={formData.payment_method || ''}
            onChange={(e) => handleChange('payment_method', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Selecione...</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="CARTAO_CREDITO">Cartão de Crédito</option>
            <option value="CARTAO_DEBITO">Cartão de Débito</option>
            <option value="PIX">PIX</option>
            <option value="BOLETO">Boleto</option>
            <option value="CONVENIO">Convênio</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
              Status do Pagamento
          </label>
          <select
            value={formData.payment_status || ''}
            onChange={(e) => handleChange('payment_status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Selecione...</option>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="pago">Pago</option>
          </select>
        </div>
      </div>
    );

  default:
    return <p className="text-gray-600">Nenhum formulário disponível</p>;
  }
}
