/**
 * FinancialIntegrationStatus.jsx
 * 
 * PHASE 3B: Dashboard widget showing appointment → financial integration status
 * 
 * Displays:
 * - Today's appointments with financial status
 * - AR creation status
 * - TISS guide creation status (convênio only)
 * - Integration completion percentage
 * 
 * Location: Insert into ContasReceber.jsx
 * 
 * Date: April 11, 2026
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { listAppointmentsWithFinancialStatus, bulkValidateFinancialIntegration } from '@/lib/appointmentFinancialIntegrationApi';

export default function FinancialIntegrationStatus() {
  const { clinicId } = useClinicContext();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    withAR: 0,
    withGuide: 0,
    completed: 0,
    pending: 0,
    errors: 0,
  });

  // Load today's appointments with financial status
  useEffect(() => {
    if (!clinicId) return;

    const loadAppointments = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().split('T')[0];

        const data = await listAppointmentsWithFinancialStatus(clinicId, today, tomorrow);

        // Filter only attended or canceled
        const filtered = (data || []).filter(
          apt => apt.status === 'attended' || apt.status === 'cancelado'
        );

        setAppointments(filtered);

        // Calculate summary
        const withAR = filtered.filter(apt => apt.ar_receivables?.length > 0).length;
        const withGuide = filtered.filter(apt => apt.billing_guides?.length > 0).length;
        const completed = filtered.filter(
          apt => apt.financial_status === 'complete_with_guide' || apt.financial_status === 'complete_particular'
        ).length;
        const pending = filtered.filter(apt => apt.financial_status === 'pending').length;
        const errors = filtered.filter(apt => apt.financial_status === 'attended_no_financial').length;

        setSummary({
          total: filtered.length,
          withAR,
          withGuide,
          completed,
          pending,
          errors,
        });
      } catch (error) {
        console.error('Error loading financial integration status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [clinicId]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (summary.total === 0) return 0;
    return Math.round((summary.completed / summary.total) * 100);
  }, [summary]);

  if (loading) {
    return (
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
          <span>Carregando status de integração...</span>
        </div>
      </Card>
    );
  }

  if (summary.total === 0) {
    return (
      <Card className="p-4 bg-gray-50 border-gray-200">
        <p className="text-gray-600 text-sm">Nenhum atendimento finalizado hoje</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Status de Integração Financeira (Hoje)
        </h3>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {completionPercentage}% completo
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
          <div className="text-xs text-gray-600">Atendimentos</div>
        </Card>

        <Card className="p-3 text-center border-green-200 bg-green-50">
          <div className="text-2xl font-bold text-green-700">{summary.withAR}</div>
          <div className="text-xs text-green-600">✓ AR Criada</div>
        </Card>

        <Card className="p-3 text-center border-blue-200 bg-blue-50">
          <div className="text-2xl font-bold text-blue-700">{summary.withGuide}</div>
          <div className="text-xs text-blue-600">📋 Guias</div>
        </Card>

        <Card className="p-3 text-center border-purple-200 bg-purple-50">
          <div className="text-2xl font-bold text-purple-700">{summary.completed}</div>
          <div className="text-xs text-purple-600">✅ Completo</div>
        </Card>

        <Card className="p-3 text-center border-yellow-200 bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-700">{summary.pending}</div>
          <div className="text-xs text-yellow-600">⏳ Pendente</div>
        </Card>

        <Card className="p-3 text-center border-red-200 bg-red-50">
          <div className="text-2xl font-bold text-red-700">{summary.errors}</div>
          <div className="text-xs text-red-600">❌ Erro</div>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Details List */}
      <Card className="overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 text-sm">Detalhes dos Atendimentos</h4>
        </div>

        <div className="divide-y max-h-[400px] overflow-y-auto">
          {appointments.map((apt) => {
            const statusConfig = {
              complete_with_guide: {
                icon: CheckCircle2,
                label: 'AR + Guia',
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
              complete_particular: {
                icon: CheckCircle2,
                label: 'AR',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              partial_missing_guide: {
                icon: AlertCircle,
                label: 'AR (Sem Guia)',
                color: 'text-yellow-600',
                bg: 'bg-yellow-50',
              },
              attended_no_financial: {
                icon: AlertCircle,
                label: 'Erro/Sem AR',
                color: 'text-red-600',
                bg: 'bg-red-50',
              },
              canceled: {
                icon: Clock,
                label: 'Cancelado',
                color: 'text-gray-600',
                bg: 'bg-gray-50',
              },
              pending: {
                icon: Clock,
                label: 'Pendente',
                color: 'text-gray-600',
                bg: 'bg-gray-50',
              },
            };

            const config = statusConfig[apt.financial_status] || statusConfig.pending;
            const Icon = config.icon;

            return (
              <div
                key={apt.id}
                className={`p-3 flex items-center justify-between ${config.bg} hover:opacity-75 transition`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {apt.patient_name || 'Paciente'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {apt.professional_id && `Prof: ${apt.professional_id.slice(0, 8)}...`}
                      {apt.appointment_time && ` • ${new Date(apt.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {apt.ar_receivables?.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <DollarSign className="w-3 h-3 mr-1" />
                      AR
                    </Badge>
                  )}
                  {apt.billing_guides?.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      <FileText className="w-3 h-3 mr-1" />
                      Guia
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-xs ${config.color}`}>
                    {config.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Status Message */}
      {summary.errors > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            <strong>⚠️ Aviso:</strong> {summary.errors} atendimento(s) finalizado(s) sem AR criada. Verifique os triggers do banco de dados.
          </p>
        </div>
      )}

      {completionPercentage === 100 && summary.total > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>✅ Perfeito!</strong> Todos os {summary.total} atendimento(s) de hoje foram processados com sucesso!
          </p>
        </div>
      )}
    </div>
  );
}
