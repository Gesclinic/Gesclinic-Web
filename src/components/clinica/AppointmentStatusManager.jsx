import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  APPOINTMENT_STATUS,
  STATUS_LABELS,
  WORKFLOW_STEPS,
  getNextPossibleStatus,
  getAvailableActions,
  getStatusColor,
  getStatusLabel,
  isValidStatusTransition
} from "@/constants/appointmentStatus";
import {
  CheckCircle,
  Clock,
  CreditCard,
  UserCheck,
  Stethoscope,
  FileText,
  ArrowRight,
  Phone,
  Edit,
  X
} from "lucide-react";

const ACTION_ICONS = {
  'editar': Edit,
  'cancelar': X,
  'checkin': UserCheck,
  'registrar_chegada': Clock,
  'atualizar_cadastro': Edit,
  'validar_convenio': CreditCard,
  'receber_pagamento': CreditCard,
  'chamar_paciente': Phone,
  'cancelar_presenca': X,
  'abrir_prontuario': FileText,
  'evoluir': Stethoscope,
  'emitir_receita': FileText,
  'faturar': CreditCard,
  'repassar': ArrowRight,
  'visualizar_historico': FileText
};

/**
 * Componente para gerenciar transições de status de agendamentos
 */
export default function AppointmentStatusManager({ 
  appointment, 
  onStatusChange, 
  onActionExecute,
  disabled = false 
}) {
  const { toast } = useToast();
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionData, setActionData] = useState({});

  if (!appointment) return null;

  const currentStatus = appointment.status || APPOINTMENT_STATUS.AGENDADO;
  const nextPossibleStatus = getNextPossibleStatus(currentStatus);
  const availableActions = getAvailableActions(currentStatus);

  const handleStatusTransition = async (newStatus) => {
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      toast({
        title: "Transição inválida",
        description: "Esta mudança de status não é permitida no fluxo atual.",
        variant: "destructive"
      });
      return;
    }

    try {
      await onStatusChange(appointment.id, newStatus);
      
      // Executar gatilhos automáticos
      const workflow = WORKFLOW_STEPS[newStatus];
      if (workflow?.autoTrigger) {
        await executeAutoTrigger(workflow.autoTrigger, appointment);
      }

      toast({
        title: "Status atualizado",
        description: `Agendamento agora está como: ${getStatusLabel(newStatus)}`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do agendamento.",
        variant: "destructive"
      });
    }
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
    setActionData({});
    setShowActionDialog(true);
  };

  const executeAction = async () => {
    try {
      await onActionExecute(selectedAction, appointment, actionData);
      setShowActionDialog(false);
      toast({
        title: "Ação executada",
        description: `${selectedAction.replace('_', ' ').toUpperCase()} realizado com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível executar a ação.",
        variant: "destructive"
      });
    }
  };

  const executeAutoTrigger = async (trigger, appointment) => {
    console.log(`🤖 Executando gatilho automático: ${trigger}`, appointment);
    
    switch (trigger) {
      case 'cria_fila_espera':
        // Registrar na fila de espera
        break;
      case 'criar_guia_tiss_ou_pagamento':
        // Criar guia TISS se convênio ou pagamento se particular
        break;
      case 'abrir_tela_atendimento':
        // Navegar para tela de atendimento
        break;
      case 'enviar_guia_lote_gerar_repasse':
        // Enviar guia ao lote e gerar repasse médico
        break;
    }
  };

  const getActionIcon = (action) => {
    const IconComponent = ACTION_ICONS[action] || FileText;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Badge do status atual */}
      <Badge className={`${getStatusColor(currentStatus)} border`}>
        {getStatusLabel(currentStatus)}
      </Badge>

      {/* Menu de transições de status */}
      {nextPossibleStatus.length > 0 && !disabled && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowRight className="w-4 h-4 mr-1" />
              Próxima Etapa
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextPossibleStatus.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusTransition(status)}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {getStatusLabel(status)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Menu de ações disponíveis */}
      {availableActions.length > 0 && !disabled && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Ações
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableActions.map((action) => (
              <DropdownMenuItem
                key={action}
                onClick={() => handleActionClick(action)}
                className="flex items-center gap-2"
              >
                {getActionIcon(action)}
                {action.replace('_', ' ').toUpperCase()}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Dialog para ações que precisam de dados */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>
              {selectedAction?.replace('_', ' ').toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações necessárias para executar esta ação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedAction === 'receber_pagamento' && (
              <>
                <div>
                  <Label htmlFor="valor">Valor</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={actionData.valor || ''}
                    onChange={(e) => setActionData({...actionData, valor: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="metodo">Método de Pagamento</Label>
                  <select
                    id="metodo"
                    className="w-full border rounded px-3 py-2"
                    value={actionData.metodo || ''}
                    onChange={(e) => setActionData({...actionData, metodo: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>
              </>
            )}

            {selectedAction === 'evoluir' && (
              <div>
                <Label htmlFor="evolucao">Evolução do Atendimento</Label>
                <Textarea
                  id="evolucao"
                  rows={4}
                  value={actionData.evolucao || ''}
                  onChange={(e) => setActionData({...actionData, evolucao: e.target.value})}
                  placeholder="Descreva o atendimento realizado..."
                />
              </div>
            )}

            {(selectedAction === 'cancelar' || selectedAction === 'cancelar_presenca') && (
              <div>
                <Label htmlFor="motivo">Motivo do Cancelamento</Label>
                <Textarea
                  id="motivo"
                  rows={3}
                  value={actionData.motivo || ''}
                  onChange={(e) => setActionData({...actionData, motivo: e.target.value})}
                  placeholder="Informe o motivo..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={executeAction}>
              Executar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}