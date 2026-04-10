import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { labelForStatus, colorForStatus } from '@/lib/statusLabels';
import { updateAppointmentStatus } from '@/lib/agendaApi';
import { useClinicContext } from '@/contexts/ClinicContext';
import { finalizeAppointmentWithFinancials } from '@/lib/appointmentFinancialIntegrationApi';

const StatusSelector = ({ appointment, onStatusChange, compact = false }) => {
  const { clinicId } = useClinicContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [financialStatus, setFinancialStatus] = useState(null);

  const statusOptions = [
    { value: 'agendado', label: 'Agendado' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'presente', label: 'Presente' },
    { value: 'em_consultorio', label: 'Em Consultório' },
    { value: 'atendido', label: 'Atendido' },
    { value: 'faltou', label: 'Faltou' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === appointment.status) return;

    setIsUpdating(true);
    setFinancialStatus(null);
    try {
      // Map 'atendido' to 'attended' for database trigger compliance
      const dbStatus = newStatus === 'atendido' ? 'attended' : newStatus;

      // Update status in DB (use 'attended' for trigger)
      await updateAppointmentStatus(appointment.id, dbStatus);

      // If marking as "attended", trigger financial integration
      if (dbStatus === 'attended' && clinicId) {
        const financialResult = await finalizeAppointmentWithFinancials(
          appointment.id,
          clinicId
        );

        if (financialResult.success) {
          setFinancialStatus({
            success: true,
            ar: !!financialResult.ar,
            guide: !!financialResult.guide,
            message: financialResult.message
          });
          console.log('✅ Financial integration completed:', financialResult);
        } else {
          setFinancialStatus({
            success: false,
            message: financialResult.error || 'Erro ao processar financeiro'
          });
          console.warn('⚠️ Financial integration failed:', financialResult);
        }
      }

      onStatusChange && onStatusChange(appointment.id, newStatus);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setFinancialStatus({
        success: false,
        message: error.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStatus = appointment.status || 'agendado';
  const statusColors = colorForStatus(currentStatus);
  const statusLabel = labelForStatus(currentStatus);

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            disabled={isUpdating}
            className="h-auto p-1 hover:bg-gray-50"
          >
            <Badge 
              variant="outline"
              className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} cursor-pointer hover:opacity-80`}
            >
              {statusLabel}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Badge>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-[140px]">
          {statusOptions.map((option) => {
            const optionColors = colorForStatus(option.value);
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleStatusUpdate(option.value)}
                disabled={isUpdating}
                className="cursor-pointer"
              >
                <Badge 
                  variant="outline"
                  className={`${optionColors.bg} ${optionColors.text} ${optionColors.border} text-xs`}
                >
                  {option.label}
                </Badge>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge 
        variant="outline"
        className={`${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
      >
        {statusLabel}
      </Badge>

      {/* Financial Status Feedback */}
      {financialStatus && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          financialStatus.success
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {financialStatus.success ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>
                {financialStatus.ar && financialStatus.guide
                  ? '✅ AR + Guia'
                  : financialStatus.ar
                  ? '✅ AR'
                  : '✅ Processado'}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" />
              <span>{financialStatus.message}</span>
            </>
          )}
        </div>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={isUpdating}>
            {isUpdating ? 'Atualizando...' : 'Alterar'}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[160px]">
          {statusOptions.map((option) => {
            const optionColors = colorForStatus(option.value);
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleStatusUpdate(option.value)}
                disabled={isUpdating}
                className="cursor-pointer"
              >
                <Badge 
                  variant="outline"
                  className={`${optionColors.bg} ${optionColors.text} ${optionColors.border} text-xs mr-2`}
                >
                  {option.label}
                </Badge>

                {option.value === currentStatus && (
                  <span className="text-xs text-gray-500 ml-auto">Atual</span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default StatusSelector;
