import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LocationSelect from './LocationSelect';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { X } from 'lucide-react';

export default function InventoryDialog({ open, onOpenChange, onSubmit, clinicId, presentation = 'dialog', onCancel = null }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    date: '',
    locationId: '',
    location_name: '',
    conducted_by: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) {
      setForm({
        date: '',
        locationId: '',
        location_name: '',
        conducted_by: '',
        reason: '',
        notes: '',
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      const conductor = user?.email || user?.user_metadata?.name || '';
      setForm((f) => ({ ...f, date: f.date || today, conducted_by: conductor }));
    }
  }, [open, user]);

  const submit = (e) => {
    e.preventDefault();
    console.log('Form state before submit:', form);
    if (!form.locationId || form.locationId.trim() === '') {
      alert('❌ Selecione o local de estoque');
      return;
    }
    if (!form.reason || form.reason.trim() === '') {
      alert('❌ Selecione o motivo do inventário');
      return;
    }
    if (!form.date || form.date.trim() === '') {
      alert('❌ Selecione a data do inventário');
      return;
    }
    console.log('Submitting form:', form);
    onSubmit(form);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    onOpenChange?.(false);
  };

  const content = (
    <div className={presentation === 'page' ? 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden' : 'app-dialog-shell app-dialog-shell--content app-dialog-shell--wide'}>
        {/* Header */}
        {presentation !== 'page' && <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <h2 className="text-lg font-bold">Novo Inventário de Estoque</h2>
              <p className="text-purple-100 text-sm">
                Registre contagem e verificação de materiais
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-purple-700 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>}

        {/* CONTENT */}
        <form
          id="inventory-form"
          onSubmit={submit}
          className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5"
        >
          {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="font-lg font-bold text-gray-900">Informações Básicas</h3>
                <p className="text-sm text-gray-600">Data e localização do inventário</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Data do Inventário *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-500">Quando o inventário foi realizado</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Local de Estoque *
                </label>
                {clinicId ? (
                  <LocationSelect
                    clinicId={clinicId}
                    value={form.location_name}
                    locationId={form.locationId}
                    onChange={(d) => {
                      console.log('LocationSelect onChange:', d);
                      setForm({ ...form, locationId: d.locationId, location_name: d.location });
                    }}
                    hideLabel
                    required
                  />
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    ⚠️ Clínica não carregada
                  </div>
                )}
                <p className="text-xs text-gray-500">Segmento de estoque inventariado</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: RESPONSÁVEL E MOTIVO */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👤</span>
              <div>
                <h3 className="font-lg font-bold text-gray-900">Responsável e Motivo</h3>
                <p className="text-sm text-gray-600">Quem conduziu o inventário e por quê</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Conduzido Por</label>
                <input
                  type="text"
                  value={form.conducted_by}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Identificação automática do usuário</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Motivo do Inventário *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  required
                >
                  <option value="">Selecione um motivo</option>
                  <option value="auditoria">🔍 Auditoria periódica</option>
                  <option value="reconciliacao">📋 Reconciliação de sistema</option>
                  <option value="reposicao">🔄 Planejamento de reposição</option>
                  <option value="investigacao">🔎 Investigação de discrepância</option>
                  <option value="manutencao">🧹 Manutenção/Limpeza</option>
                  <option value="transferencia">📦 Antes de transferência</option>
                  <option value="outro">📌 Outro motivo</option>
                </select>
                <p className="text-xs text-gray-500">
                  Razão pela qual o inventário está sendo realizado
                </p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: ESCOPO DO INVENTÁRIO */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📍</span>
              <div>
                <h3 className="font-lg font-bold text-gray-900">Escopo do Inventário</h3>
                <p className="text-sm text-gray-600">Cobertura e prioritização da contagem</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition">
                <input
                  type="radio"
                  name="scope"
                  value="completo"
                  defaultChecked
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <span className="font-medium text-gray-900">Inventário Completo</span>
                  <p className="text-xs text-gray-600">Contar todos os itens no local</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition">
                <input
                  type="radio"
                  name="scope"
                  value="parcial"
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <span className="font-medium text-gray-900">Inventário Parcial</span>
                  <p className="text-xs text-gray-600">Contar itens específicos ou categoria</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition">
                <input
                  type="radio"
                  name="scope"
                  value="spot_check"
                  className="w-4 h-4 text-purple-600"
                />
                <div>
                  <span className="font-medium text-gray-900">Verificação Rápida</span>
                  <p className="text-xs text-gray-600">
                    Amostragem e verificação de itens críticos
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* SEÇÃO 4: OBSERVAÇÕES */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="font-lg font-bold text-gray-900">Observações</h3>
                <p className="text-sm text-gray-600">Contextualizar e documentar o inventário</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Notas adicionais (opcional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Discrepâncias esperadas, itens em falta, ou informações adicionais do inventário"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
              />
              <p className="text-xs text-gray-500">Máximo 500 caracteres</p>
            </div>
          </div>
        </form>

        {/* FOOTER */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="px-6"
          >
            ✕ Cancelar
          </Button>
          <Button
            form="inventory-form"
            type="submit"
            className="px-6 bg-purple-600 text-white hover:bg-purple-700"
          >
            ✓ Iniciar Inventário
          </Button>
        </div>
      </div>
  );

  if (presentation === 'page') {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-none w-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
}
