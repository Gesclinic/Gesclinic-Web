import React, { useState } from 'react';
import { FileDown, Mail, Calendar, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportDashboardToPDF } from '@/lib/exportService';
import { exportDashboardToExcel } from '@/lib/excelService';
import { sendReportEmail, scheduleEmailReport, EMAIL_FREQUENCIES } from '@/lib/emailService';

export default function ExportReportingPanel({ dashboardData, clinicId, clinicName, onClose }) {
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'schedule'
  const [exporting, setExporting] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: '',
    recipient_name: '',
    frequency: 'weekly',
    attach_pdf: true,
    attach_excel: true,
  });
  const [message, setMessage] = useState('');

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const result = await exportDashboardToPDF(dashboardData, clinicName);
      if (result.success) {
        setMessage('✅ PDF exportado com sucesso!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Erro ao exportar PDF');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const result = await exportDashboardToExcel(dashboardData, clinicName);
      if (result.success) {
        setMessage('✅ Excel exportado com sucesso!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Erro ao exportar Excel');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.to) {
      setMessage('❌ Insira um email válido');
      return;
    }

    setExporting(true);
    try {
      const result = await sendReportEmail({
        ...emailForm,
        clinic_id: clinicId,
        clinic_name: clinicName,
        dashboardData,
      });
      if (result.success) {
        setMessage('✅ Email enviado com sucesso!');
        setEmailForm({ to: '', recipient_name: '', frequency: 'weekly', attach_pdf: true, attach_excel: true });
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ ${result.error || 'Erro ao enviar email'}`);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleScheduleEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.to) {
      setMessage('❌ Insira um email válido');
      return;
    }

    setExporting(true);
    try {
      const result = await scheduleEmailReport({
        ...emailForm,
        clinic_id: clinicId,
        clinic_name: clinicName,
      });
      if (result.success) {
        setMessage(`✅ Relatório agendado para ${EMAIL_FREQUENCIES[emailForm.frequency].label}!`);
        setEmailForm({ to: '', recipient_name: '', frequency: 'weekly', attach_pdf: true, attach_excel: true });
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Erro ao agendar relatório');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Exportar & Relatórios
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'export'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            📥 Exportar Agora
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            📧 Agendar Email
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.includes('✅')
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {message}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Exporte o dashboard financeiro em diferentes formatos para análise e compartilhamento.
              </p>

              {/* PDF Export */}
              <div className="border dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">📄 Exportar para PDF</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Relatório completo com KPIs, gráficos e alertas financeiros formatado para impressão.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="ml-4 whitespace-nowrap"
                  >
                    {exporting ? 'Exportando...' : 'Exportar PDF'}
                  </Button>
                </div>
              </div>

              {/* Excel Export */}
              <div className="border dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">📊 Exportar para Excel</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Múltiplas abas com dados estruturados: resumo, fluxo de caixa, contas a receber/pagar e alertas.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="ml-4 whitespace-nowrap"
                  >
                    {exporting ? 'Exportando...' : 'Exportar Excel'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Envie ou agende relatórios financeiros por email automaticamente.
              </p>

              <form onSubmit={handleSendEmail} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email de Destino
                  </label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                    placeholder="seu.email@clinic.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Recipient Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome do Destinatário (Opcional)
                  </label>
                  <input
                    type="text"
                    value={emailForm.recipient_name}
                    onChange={(e) => setEmailForm({ ...emailForm, recipient_name: e.target.value })}
                    placeholder="Seu Nome"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequência
                  </label>
                  <select
                    value={emailForm.frequency}
                    onChange={(e) => setEmailForm({ ...emailForm, frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(EMAIL_FREQUENCIES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attachments */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailForm.attach_pdf}
                      onChange={(e) => setEmailForm({ ...emailForm, attach_pdf: e.target.checked })}
                      className="rounded dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Incluir PDF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailForm.attach_excel}
                      onChange={(e) => setEmailForm({ ...emailForm, attach_excel: e.target.checked })}
                      className="rounded dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Incluir Excel</span>
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={exporting}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {exporting ? 'Enviando...' : 'Enviar Agora'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleScheduleEmail}
                    disabled={exporting}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    {exporting ? 'Agendando...' : 'Agendar'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
