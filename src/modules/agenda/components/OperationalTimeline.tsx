/**
 * OPERATIONAL TIMELINE - Timeline do fluxo operacional
 * =================================================
 * 
 * Componente visual que mostra o progresso do agendamento
 */

import React from 'react';
import {
  OfficialAppointmentStatus,
  OPERATIONAL_FLOW_SEQUENCE,
  getStatusConfig,
} from '../constants/officialStatusModel';

interface TimelineStep {
  status: OfficialAppointmentStatus;
  completedAt?: string;
  isCurrentStatus?: boolean;
}

interface OperationalTimelineProps {
  currentStatus: OfficialAppointmentStatus;
  completionHistory?: Record<OfficialAppointmentStatus, string>; // timestamp
  showTimestamps?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Timeline que mostra o progresso operacional do agendamento
 */
export const OperationalTimeline = React.memo<OperationalTimelineProps>(
  ({
    currentStatus,
    completionHistory = {},
    showTimestamps = false,
    compact = false,
    className = '',
  }) => {
    // Encontrar índice do status atual no fluxo
    const currentIndex = OPERATIONAL_FLOW_SEQUENCE.indexOf(currentStatus);

    const steps: TimelineStep[] = OPERATIONAL_FLOW_SEQUENCE.map((status, index) => ({
      status,
      completedAt: completionHistory[status],
      isCurrentStatus: index === currentIndex,
    }));

    if (compact) {
      // Versão compacta: apenas ícones
      return (
        <div className={`flex gap-1 ${className}`}>
          {steps.map((step) => {
            const config = getStatusConfig(step.status);
            const isCompleted = step.completedAt !== undefined;
            const isCurrent = step.isCurrentStatus;

            return (
              <div
                key={step.status}
                className={`
                  flex items-center justify-center w-7 h-7 rounded-full border-2
                  transition-all
                  ${isCurrent ? 'ring-2 ring-offset-2' : ''}
                  ${isCompleted ? 'opacity-100' : 'opacity-50'}
                `}
                style={{
                  backgroundColor: config.backgroundColor,
                  borderColor: config.borderColor,
                  ringColor: config.textColor,
                }}
                title={`${config.label}${step.completedAt ? ` - ${step.completedAt}` : ''}`}
              >
                <span className="text-sm">{config.icon}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Versão completa com labels
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-sm font-semibold text-gray-700">
          Fluxo Operacional
        </div>

        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const config = getStatusConfig(step.status);
            const isCompleted = step.completedAt !== undefined;
            const isCurrent = step.isCurrentStatus;
            const isNext = index === currentIndex + 1;

            return (
              <React.Fragment key={step.status}>
                {/* Step */}
                <div
                  className={`
                    flex flex-col items-center flex-1
                    ${isCompleted ? 'opacity-100' : isCurrent ? 'opacity-100' : 'opacity-50'}
                  `}
                >
                  {/* Circle */}
                  <div
                    className={`
                      w-10 h-10 rounded-full border-3 flex items-center justify-center
                      font-semibold text-lg
                      transition-all
                      ${isCurrent ? 'ring-4 ring-offset-2 scale-110' : ''}
                      ${isNext ? 'ring-2 ring-offset-1' : ''}
                    `}
                    style={{
                      backgroundColor: config.backgroundColor,
                      borderColor: config.borderColor,
                      color: config.textColor,
                    }}
                  >
                    {isCompleted ? '✓' : config.icon}
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: config.textColor }}
                    >
                      {config.label}
                    </div>
                    {showTimestamps && step.completedAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(step.completedAt).toLocaleTimeString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div
                    className={`
                      h-1 flex-1 rounded-full
                      ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Status atual */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="text-xs font-semibold text-gray-600">Status Atual:</div>
          <div
            className="text-sm font-bold mt-1"
            style={{ color: getStatusConfig(currentStatus).textColor }}
          >
            {getStatusConfig(currentStatus).icon}{' '}
            {getStatusConfig(currentStatus).label}
          </div>
        </div>
      </div>
    );
  }
);

OperationalTimeline.displayName = 'OperationalTimeline';

export default OperationalTimeline;
