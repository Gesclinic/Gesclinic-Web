import { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function ModalCriarAgendamento({ open, onOpenChange, data, onSubmit }) {
  /**
   * 🧠 ESTADO INTERNO
   * evita erro quando data ainda não existe
   */
  const [form, setForm] = useState({
    date: '',
    time: '',
    paciente: '',
    telefone: '',
    profissional: null,
    servico: null,
    billingType: 'PARTICULAR',
    plano: null,
    observacoes: '',
  });

  /**
   * 🔄 Sempre que abrir o modal com novos dados
   */
  useEffect(() => {
    if (data) {
      setForm({
        date: data.date || '',
        time: data.time || '',
        paciente: data.paciente || '',
        telefone: data.telefone || '',
        profissional: data.profissional || null,
        servico: data.servico || null,
        billingType: data.billingType || 'PARTICULAR',
        plano: data.plano || null,
        observacoes: data.observacoes || '',
      });
    }
  }, [data]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    onSubmit(form);
  }

  if (!data) {
    return null;
  } // 🛑 segurança total

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content">
        <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6 text-left">
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* DATA / HORA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>

            <div>
              <Label>Hora</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => updateField('time', e.target.value)}
              />
            </div>
          </div>

          {/* PACIENTE */}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Paciente</Label>
            <Input
              placeholder="Nome do paciente"
              value={form.paciente}
              onChange={(e) => updateField('paciente', e.target.value)}
            />
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              placeholder="WhatsApp"
              value={form.telefone}
              onChange={(e) => updateField('telefone', e.target.value)}
            />
          </div>
        </div>

        {/* PROFISSIONAL / SERVIÇO */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Profissional</Label>
            <Select
              value={form.profissional || ''}
              onValueChange={(v) => updateField('profissional', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profissional_1">Profissional Exemplo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Serviço</Label>
            <Select value={form.servico || undefined} onValueChange={(v) => updateField('servico', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Consulta / Exame" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consulta">Consulta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CONVÊNIO / PLANO */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Convênio</Label>
            <Select value={form.billingType} onValueChange={(v) => updateField('billingType', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTICULAR">Particular</SelectItem>
                <SelectItem value="CONVENIO">Convênio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Plano</Label>
            <Select value={form.plano || undefined} onValueChange={(v) => updateField('plano', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plano1">Plano Exemplo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* OBSERVAÇÕES */}
        <div>
          <Label>Observações</Label>
          <Textarea
            placeholder="Observações clínicas ou administrativas"
            value={form.observacoes}
            onChange={(e) => updateField('observacoes', e.target.value)}
          />
        </div>

        {/* AÇÕES */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button onClick={handleSubmit}>Criar Agendamento</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
