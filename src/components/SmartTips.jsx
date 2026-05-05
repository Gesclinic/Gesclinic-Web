import React, { useState, useEffect } from 'react';
import { AlertCircle, Lightbulb, Clock, DollarSign, Users, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Smart Tips - Dicas inteligentes contextuais
 * Fornece feedback útil enquanto o usuário preenche o formulário
 */
export function SmartTips({ formValues, errors, touched, hints = [] }) {
  const [visibleTips, setVisibleTips] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    const tips = [];

    // Dica: Data não preenchida
    if (touched.date && !formValues.date) {
      tips.push({
        id: 'date_empty',
        type: 'info',
        title: '📅 Selecione uma data',
        message: 'Escolha o dia do agendamento',
        icon: Clock,
      });
    }

    // Dica: Horário final não preenchido
    if (touched.startTime && !formValues.endTime) {
      tips.push({
        id: 'endtime_empty',
        type: 'info',
        title: '⏰ Defina a duração',
        message: 'Indique o horário final do atendimento',
        icon: Clock,
      });
    }

    // Dica: Paciente não selecionado
    if (touched.patientId && !formValues.patientId) {
      tips.push({
        id: 'patient_empty',
        type: 'info',
        title: '👤 Paciente obrigatório',
        message: 'Selecione o paciente que será atendido',
        icon: Users,
      });
    }

    // Dica: Profissional sem serviços
    if (touched.professionalId && formValues.professionalId && !formValues.serviceId) {
      tips.push({
        id: 'service_empty',
        type: 'info',
        title: '💼 Selecione um serviço',
        message: 'Escolha o tipo de atendimento a ser realizado',
        icon: Lightbulb,
      });
    }

    // Dica: Convênio afeta o preço
    if (formValues.insuranceId && !formValues.planId) {
      tips.push({
        id: 'plan_empty',
        type: 'info',
        title: '💰 Plano de saúde',
        message: 'Selecionar um plano garante melhor rastreabilidade de faturamento',
        icon: DollarSign,
      });
    }

    // Erros prioritários
    if (errors.startTime && touched.startTime) {
      tips.push({
        id: 'time_error',
        type: 'error',
        title: '❌ Horário inválido',
        message: errors.startTime,
        icon: AlertCircle,
      });
    }

    if (errors.endTime && touched.endTime) {
      tips.push({
        id: 'endtime_error',
        type: 'error',
        title: '❌ Horário inválido',
        message: errors.endTime,
        icon: AlertCircle,
      });
    }

    // Custom hints
    tips.push(...hints);

    // Filtrar dicas dispensadas
    const filtered = tips.filter((tip) => !dismissed.has(tip.id));
    setVisibleTips(filtered);
  }, [formValues, errors, touched, dismissed, hints]);

  if (visibleTips.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleTips.map((tip) => {
        const Icon = tip.icon || Lightbulb;
        const bgColor =
          tip.type === 'error'
            ? 'bg-red-50 border-red-200'
            : tip.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200';

        const textColor =
          tip.type === 'error'
            ? 'text-red-900'
            : tip.type === 'warning'
              ? 'text-yellow-900'
              : 'text-blue-900';

        const iconColor =
          tip.type === 'error'
            ? 'text-red-600'
            : tip.type === 'warning'
              ? 'text-yellow-600'
              : 'text-blue-600';

        return (
          <div key={tip.id} className={`border rounded-lg p-3 flex gap-3 items-start ${bgColor}`}>
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${textColor}`}>{tip.title}</p>
              <p className={`text-xs ${textColor} opacity-75`}>{tip.message}</p>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, tip.id]))}
              className="flex-shrink-0 hover:opacity-60 transition-opacity"
            >
              <X className={`w-4 h-4 ${iconColor}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Tips Drawer - Painel lateral com dicas
 */
export function SmartTipsDrawer({ isOpen, onClose, tips = [], section = 'agendamento' }) {
  const [expanded, setExpanded] = React.useState(null);

  const sections = {
    agendamento: {
      title: '📋 Dicas de Agendamento',
      tips: [
        {
          id: 'tip_1',
          title: 'Horário de atendimento',
          description: 'Respeite os horários comerciais configurados para cada profissional.',
        },
        {
          id: 'tip_2',
          title: 'Conflitos de agenda',
          description: 'O sistema avisa automaticamente se houver sobreposição de horários.',
        },
        {
          id: 'tip_3',
          title: 'Sala de atendimento',
          description: 'Salas não são obrigatórias, mas ajudam a organizar o espaço físico.',
        },
        {
          id: 'tip_4',
          title: 'Convênios',
          description: 'Selecionar o convênio correto garante faturamento adequado.',
        },
      ],
    },
    checkin: {
      title: '✅ Dicas de Check-in',
      tips: [
        {
          id: 'tip_1',
          title: 'Dados completos',
          description: 'Verifique se o paciente tem telefone e email preenchidos.',
        },
        {
          id: 'tip_2',
          title: 'Autorizações',
          description: 'Confirme autorizações de convênio antes de liberar para atendimento.',
        },
        {
          id: 'tip_3',
          title: 'Histórico',
          description: 'Verifique o histórico de atendimentos anteriores do paciente.',
        },
      ],
    },
  };

  const currentSection = sections[section] || sections.agendamento;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto">
      <div className="p-4 sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">{currentSection.title}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-2">
        {currentSection.tips.map((tip) => (
          <div key={tip.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === tip.id ? null : tip.id)}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-sm text-gray-900">{tip.title}</span>
              <span className="text-gray-400">{expanded === tip.id ? '▼' : '▶'}</span>
            </button>
            {expanded === tip.id && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                {tip.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Componente de checklist pré-agendamento
 */
export function PreAppointmentChecklist({ patient, professional, service }) {
  const [checks, setChecks] = React.useState({
    patientDataComplete: false,
    insuranceAuthorized: false,
    professionalAvailable: false,
    serviceAvailable: false,
  });

  React.useEffect(() => {
    // Validar dados do paciente
    const patientOk = patient && patient.name && patient.cpf && patient.email && patient.phone;
    setChecks((prev) => ({
      ...prev,
      patientDataComplete: !!patientOk,
    }));
  }, [patient]);

  const allOk = Object.values(checks).every((v) => v);
  const completionPercentage =
    (Object.values(checks).filter((v) => v).length / Object.keys(checks).length) * 100;

  return (
    <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-blue-900">✅ Checklist Pré-Agendamento</span>
        <span className="text-xs font-semibold text-blue-700">
          {completionPercentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-green-500 h-full transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {[
          {
            key: 'patientDataComplete',
            label: '📋 Dados do paciente completos',
          },
          { key: 'insuranceAuthorized', label: '✅ Autorização do convênio' },
          {
            key: 'professionalAvailable',
            label: '👨‍⚕️ Profissional disponível',
          },
          {
            key: 'serviceAvailable',
            label: '💼 Serviço disponível',
          },
        ].map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-xs text-blue-900">
            {checks[item.key] ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {allOk && (
        <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-900 font-semibold">
          🎉 Tudo pronto para criar o agendamento!
        </div>
      )}
    </div>
  );
}
