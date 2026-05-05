import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const diasSemana = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export default function DuplicateDialog({ open, onClose, horario, onDuplicated }) {
  const { toast } = useToast();
  const [targetDay, setTargetDay] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!horario) {
    return null;
  }

  const handleDuplicate = async () => {
    if (targetDay === null) {
      toast({
        title: 'Selecione um dia',
        description: 'Por favor, escolha um dia da semana para duplicar o horário.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Verifica se já existe horário nesse dia
      const { data: existente, error: checkError } = await supabase
        .from('professional_schedules')
        .select('id')
        .eq('professional_id', horario.professional_id)
        .eq('weekday', targetDay)
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (existente?.length > 0) {
        toast({
          title: 'Horário já existe',
          description: `Já existe uma configuração de horário para ${diasSemana.find((d) => d.value === targetDay).label}.`,
          variant: 'warning',
        });
        return;
      }

      // Cria novo registro duplicado
      const { error: insertError } = await supabase.from('professional_schedules').insert({
        clinic_id: horario.clinic_id,
        professional_id: horario.professional_id,
        weekday: targetDay,
        start_time: horario.start_time,
        end_time: horario.end_time,
        appointment_duration: horario.appointment_duration || 30,
        slot_duration_min: horario.slot_duration_min || 30,
        active: true,
        is_active: true,
        is_free: horario.is_free ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: '✅ Sucesso!',
        description: `Horário duplicado para ${diasSemana.find((d) => d.value === targetDay).label}.`,
        variant: 'success',
      });

      onDuplicated?.();
      onClose();
    } catch (err) {
      console.error('Erro ao duplicar horário:', err);
      toast({
        title: '❌ Erro ao duplicar',
        description: err.message || 'Não foi possível duplicar o horário.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setTargetDay(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="app-dialog-shell app-dialog-shell--compact">
        <DialogHeader>
          <DialogTitle>Duplicar Horário</DialogTitle>
          <DialogDescription>
            Copie o horário de{' '}
            <strong>
              {horario.weekday_name} ({horario.start_time} - {horario.end_time})
            </strong>{' '}
            para outro dia da semana.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="target-day">Selecione o novo dia da semana</Label>
          <Select onValueChange={(v) => setTargetDay(Number(v))}>
            <SelectTrigger id="target-day">
              <SelectValue placeholder="Escolha um dia..." />
            </SelectTrigger>
            <SelectContent>
              {diasSemana
                .filter((dia) => dia.value !== horario.weekday) // não deixa duplicar para o mesmo dia
                .map((dia) => (
                  <SelectItem key={dia.value} value={String(dia.value)}>
                    {dia.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleDuplicate} disabled={isSaving}>
            {isSaving ? 'Duplicando...' : 'Duplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
