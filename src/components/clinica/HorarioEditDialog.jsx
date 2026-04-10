
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";

/**
 * 🕒 Modal de Edição de Horário Profissional
 * Permite editar dia da semana, início, fim e status ativo.
 */
export default function HorarioEditDialog({ open, onClose, horario, onSaved }) {
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [active, setActive] = useState(true);
  const [isFree, setIsFree] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (horario) {
      setWeekday(horario.weekday || 1);
      setStartTime(horario.start_time || "08:00");
      setEndTime(horario.end_time || "18:00");
      setActive(horario.active ?? true);
      setIsFree(horario.is_free ?? true);
    }
  }, [horario]);


  if (!horario) return null;

  const diasSemana = [
    { value: 1, label: "Segunda-feira" },
    { value: 2, label: "Terça-feira" },
    { value: 3, label: "Quarta-feira" },
    { value: 4, label: "Quinta-feira" },
    { value: 5, label: "Sexta-feira" },
    { value: 6, label: "Sábado" },
    { value: 0, label: "Domingo" },
  ];

  async function handleSave() {
    setSaving(true);
    try {
      if (!horario.schedule_id) {
        // Inserção de novo registro
        const { error } = await supabase.from("professional_schedules").insert({
          professional_id: horario.professional_id,
          clinic_id: horario.clinic_id,
          weekday,
          start_time: startTime,
          end_time: endTime,
          active,
          is_free: isFree,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast({ title: "✅ Novo horário criado com sucesso!" });
      } else {
        // Atualização de registro existente
        const { error } = await supabase
          .from("professional_schedules")
          .update({
            weekday,
            start_time: startTime,
            end_time: endTime,
            active,
            is_free: isFree,
            updated_at: new Date().toISOString(),
          })
          .eq("id", horario.schedule_id);

        if (error) throw error;
        toast({ title: "✅ Horário atualizado com sucesso!" });
      }

      if(onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar horário:", err);
      toast({ title: "❌ Erro ao salvar horário", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="app-dialog-shell app-dialog-shell--compact">
        <DialogHeader>
          <DialogTitle>{horario?.schedule_id ? 'Editar Horário' : 'Novo Horário'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Dia da Semana</Label>
            <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {diasSemana.map((dia) => (
                  <SelectItem key={dia.value} value={String(dia.value)}>
                    {dia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Início</Label>
              <Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">Fim</Label>
              <Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 rounded-md border p-3">
            <Label htmlFor="active-switch">Ativo</Label>
            <Switch id="active-switch" checked={active} onCheckedChange={setActive} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="isfree-switch">Horário Livre (para encaixe)</Label>
            <Switch id="isfree-switch" checked={isFree} onCheckedChange={setIsFree} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
