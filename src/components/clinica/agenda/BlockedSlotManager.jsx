import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Unlock, AlertTriangle } from 'lucide-react';
import { updateAppointmentStatus } from '@/lib/agendaApi';
import { supabase } from '@/lib/customSupabaseClient';

const BlockedSlotManager = ({ appointment, onStatusChange }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [blockReason, setBlockReason] = useState(
    appointment?.notes || appointment?.block_reason || '',
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUnblock = async () => {
    setIsUpdating(true);
    try {
      // Em vez de mudar status, vamos remover o bloqueio definindo is_blocked=false e status=agendado
      const { data, error } = await supabase
        .from('appointments')
        .update({
          is_blocked: false,
          status: 'agendado',
        })
        .eq('id', appointment.id);

      if (error) {
        throw error;
      }

      onStatusChange && onStatusChange(appointment.id, 'agendado');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Erro ao desbloquear horário:', error);
      // TODO: Mostrar toast de erro
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateReason = async () => {
    setIsUpdating(true);
    try {
      // Aqui você pode criar uma função específica para atualizar apenas o motivo
      // Por enquanto, vamos usar uma abordagem simples
      const { data, error } = await supabase
        .from('appointments')
        .update({ notes: blockReason })
        .eq('id', appointment.id);

      if (error) {
        throw error;
      }

      setIsEditDialogOpen(false);
      // TODO: Mostrar toast de sucesso
    } catch (error) {
      console.error('Erro ao atualizar motivo:', error);
      // TODO: Mostrar toast de erro
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Bloqueado
        </Badge>

        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditDialogOpen(true);
          }}
          className="h-6 text-xs"
        >
          <Edit className="w-3 h-3 mr-1" />
          Editar
        </Button>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Gerenciar Bloqueio</DialogTitle>
            <DialogDescription>
              Edite o motivo do bloqueio ou desbloqueie o horário.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="blockReason">Motivo do Bloqueio</Label>
              <Textarea
                id="blockReason"
                placeholder="Ex: Manutenção, Ausência do profissional, etc."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Horário:{' '}
                {new Date(appointment.start_time).toLocaleString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600">
                Profissional: {appointment.professional_name || 'Não informado'}
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>

            <Button variant="outline" onClick={handleUpdateReason} disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar Motivo'}
            </Button>

            <Button
              variant="default"
              onClick={handleUnblock}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              <Unlock className="w-4 h-4 mr-1" />
              {isUpdating ? 'Desbloqueando...' : 'Desbloquear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BlockedSlotManager;
