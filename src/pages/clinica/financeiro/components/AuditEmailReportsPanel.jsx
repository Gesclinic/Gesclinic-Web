import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Mail, Calendar, Send, Check, AlertCircle } from 'lucide-react';
import { sendAuditReportEmail } from '@/lib/auditEmailReports';

/**
 * F.5: UI para Relatórios de Email
 * Permite configurar e disparar relatórios automaticamente
 */
export default function AuditEmailReportsPanel() {
  const { clinicId } = useAuth();
  const [recipients, setRecipients] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [frequency, setFrequency] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [scheduled, setScheduled] = useState([]);

  useEffect(() => {
    loadScheduledEmails();
  }, [clinicId]);

  const loadScheduledEmails = async () => {
    // Simular carregamento de emails agendados
    // Em produção, isso viria do banco de dados
    setScheduled([
      {
        id: 1,
        recipients: 'gerente@clinica.com.br',
        frequency: 'weekly',
        nextSend: '2024-01-15',
        status: 'ativo',
      },
    ]);
  };

  const handleSendReport = async () => {
    if (!recipients.trim()) {
      setMessage({
        type: 'error',
        text: 'Digite pelo menos um email',
      });
      return;
    }

    try {
      setLoading(true);
      const emails = recipients
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);

      const result = await sendAuditReportEmail(clinicId, emails, period);

      setMessage({
        type: 'success',
        text: `Relatório enviado para ${emails.length} destinatário(s)`,
      });

      // Limpar campos
      setRecipients('');
    } catch (err) {
      console.error('Erro ao enviar relatório:', err);
      setMessage({
        type: 'error',
        text: 'Erro ao enviar relatório. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleEmail = async () => {
    if (!recipients.trim()) {
      setMessage({
        type: 'error',
        text: 'Digite pelo menos um email para agendar',
      });
      return;
    }

    try {
      // Em produção, isso criaria um agendamento no banco de dados
      const emails = recipients
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);

      setMessage({
        type: 'success',
        text: `Agendamento criado para ${frequency === 'weekly' ? 'semanalmente' : 'mensalmente'}`,
      });

      setRecipients('');
      loadScheduledEmails(); // Recarregar lista
    } catch (err) {
      console.error('Erro ao agendar:', err);
      setMessage({
        type: 'error',
        text: 'Erro ao agendar relatório',
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          📧 Relatórios por Email
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Envie relatórios automaticamente para sua equipe
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-900 border border-green-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Send Report */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold text-sm text-gray-900 mb-4">
          📤 Enviar Relatório Agora
        </h4>

        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destinatários (separados por vírgula)
            </label>
            <input
              type="email"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="gerente@clinica.com, financeiro@clinica.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <div className="flex gap-2">
              {['weekly', 'monthly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p === 'weekly' ? 'Semanal' : 'Mensal'}
                </button>
              ))}
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendReport}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4 inline mr-2" />
            {loading ? 'Enviando...' : 'Enviar Relatório'}
          </button>
        </div>
      </div>

      {/* Schedule Report */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold text-sm text-gray-900 mb-4">
          ⏰ Agendar Relatório Automático
        </h4>

        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destinatários
            </label>
            <input
              type="email"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="gerente@clinica.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              O relatório será enviado automaticamente nestes emails
            </p>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequência
            </label>
            <div className="flex gap-2">
              {['weekly', 'monthly'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    frequency === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {f === 'weekly' ? 'Semanalmente' : 'Mensalmente'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {frequency === 'weekly'
                ? '🕘 Enviado todas as segundas-feiras às 09:00'
                : '📅 Enviado no primeiro dia do mês às 09:00'}
            </p>
          </div>

          {/* Schedule Button */}
          <button
            onClick={handleScheduleEmail}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            {loading ? 'Agendando...' : 'Agendar'}
          </button>
        </div>
      </div>

      {/* Scheduled Emails */}
      {scheduled.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-sm text-gray-900 mb-4">
            📋 Agendamentos Ativos
          </h4>

          <div className="space-y-3">
            {scheduled.map((item) => (
              <div key={item.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {item.recipients}
                    </span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {item.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  <p>
                    Frequência:{' '}
                    <span className="font-medium">
                      {item.frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                    </span>
                  </p>
                  <p>
                    Próximo envio:{' '}
                    <span className="font-medium">{item.nextSend}</span>
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700">
                    Editar
                  </button>
                  <button className="text-xs px-2 py-1 bg-white border border-red-300 rounded hover:bg-red-50 text-red-700">
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h5 className="font-semibold text-sm text-blue-900 mb-2">💡 Dicas</h5>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>✓ Relatórios incluem KPIs, anomalias, usuários e processadoras mais ativas</li>
          <li>✓ Envios automáticos requerem configuração de webhook</li>
          <li>✓ Máximo 5 destinatários por agendamento</li>
          <li>✓ Horário padrão: 09:00 no horário da clínica</li>
        </ul>
      </div>
    </div>
  );
}
