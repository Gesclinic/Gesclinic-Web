import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LocationSelect from './LocationSelect';
import ProductSelect from './ProductSelect';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { X, Trash2 } from 'lucide-react';

export default function StockRequestDialog({ open, onOpenChange, onSubmit, clinicId }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    date: '',
    locationId: '',
    location_name: '',
    requested_by: '',
    purpose: '',
    notes: '',
    products: [],
  });

  const [temp, setTemp] = useState({ itemId: '', product: '', qty: '', item_note: '' });
  const [editingIndex, setEditing] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm({
        date: '',
        locationId: '',
        location_name: '',
        requested_by: '',
        purpose: '',
        notes: '',
        products: [],
      });
      setTemp({ itemId: '', product: '', qty: '', item_note: '' });
      setEditing(null);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const requester = user?.email || user?.user_metadata?.name || '';
      setForm((f) => ({ ...f, date: f.date || today, requested_by: requester }));
    }
  }, [open, user]);

  const addLine = () => {
    if (!temp.itemId || !(parseFloat(temp.qty) > 0)) {
      return;
    }
    const line = {
      itemId: temp.itemId,
      product: temp.product,
      qty: temp.qty,
      item_note: temp.item_note,
    };
    if (editingIndex !== null) {
      const copy = [...form.products];
      copy[editingIndex] = line;
      setForm({ ...form, products: copy });
      setEditing(null);
    } else {
      setForm({ ...form, products: [...form.products, line] });
    }
    setTemp({ itemId: '', product: '', qty: '', item_note: '' });
  };

  const removeLine = (idx) => {
    setForm({ ...form, products: form.products.filter((_, i) => i !== idx) });
    if (editingIndex === idx) {
      setEditing(null);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.locationId) {
      return alert('Selecione o local');
    }
    if (!form.purpose) {
      return alert('Selecione a finalidade');
    }
    if (!form.products.length) {
      return alert('Adicione pelo menos um item');
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h2 className="text-lg font-bold">Nova Requisição de Materiais</h2>
              <p className="text-blue-100 text-sm">Solicite produtos conforme necessidade</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-blue-700 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <form
          id="request-form"
          onSubmit={submit}
          className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5"
        >
          {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <div>
                <h3 className="font-lg font-bold text-gray-900">Informações Básicas</h3>
                <p className="text-sm text-gray-600">Data, local e identificação da requisição</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Data *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Local de Estoque *
                </label>
                <LocationSelect
                  clinicId={clinicId}
                  value={form.location_name}
                  locationId={form.locationId}
                  onChange={(d) =>
                    setForm({ ...form, locationId: d.locationId, location_name: d.location })
                  }
                  hideLabel
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: SOLICITAÇÃO */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📝</span>
              <div>
                <h3 className="font-lg font-bold text-gray-900">Dados da Solicitação</h3>
                <p className="text-sm text-gray-600">Solicitante e finalidade da requisição</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Solicitante</label>
                <input
                  type="text"
                  value={form.requested_by}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Identificação automática do usuário</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Finalidade *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  required
                >
                  <option value="">Selecione uma finalidade</option>
                  <option value="paciente">🏥 Atendimento a paciente</option>
                  <option value="reposicao_sala">🔄 Reposição de sala</option>
                  <option value="consumo_admin">📊 Consumo administrativo</option>
                  <option value="uso_interno">🏢 Uso interno</option>
                  <option value="outros">📌 Outros</option>
                </select>
                <p className="text-xs text-gray-500">Selecione a finalidade da requisição</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: PRODUTOS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="font-lg font-bold text-gray-900">Itens da Requisição</h3>
                <p className="text-sm text-gray-600">
                  Produtos solicitados ({form.products.length} item
                  {form.products.length !== 1 ? 's' : ''})
                </p>
              </div>
            </div>

            {/* Add Item Form */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Buscar produto por nome ou código
                </label>
                <ProductSelect
                  clinicId={clinicId}
                  value={temp.product}
                  itemId={temp.itemId}
                  hideLabel
                  onChange={(d) => setTemp({ ...temp, product: d.product, itemId: d.itemId })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Quantidade *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={temp.qty}
                    onChange={(e) => setTemp({ ...temp, qty: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Observação do item (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Detalhe específico sobre este item"
                  value={temp.item_note}
                  onChange={(e) => setTemp({ ...temp, item_note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setTemp({ itemId: '', product: '', qty: '', item_note: '' });
                  }}
                  className={editingIndex === null ? 'hidden' : ''}
                >
                  Cancelar edição
                </Button>
                <Button
                  type="button"
                  onClick={addLine}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingIndex !== null ? 'Atualizar item' : 'Adicionar item'}
                </Button>
              </div>
            </div>

            {/* Items Table */}
            {form.products.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Produto</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Quantidade
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Observação
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {form.products.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-900">{p.product}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {parseFloat(p.qty).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{p.item_note || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditing(idx);
                                setTemp(p);
                              }}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(idx)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SEÇÃO 4: OBSERVAÇÕES GERAIS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="font-lg font-bold text-gray-900">Observações Gerais</h3>
                <p className="text-sm text-gray-600">Detalhes e contexto da requisição</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Notas adicionais (opcional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Detalhes, justificativa ou informações adicionais da requisição"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
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
            onClick={() => onOpenChange(false)}
            className="px-6"
          >
            ✕ Cancelar
          </Button>
          <Button
            form="request-form"
            type="submit"
            className="px-6 bg-blue-600 text-white hover:bg-blue-700"
          >
            ✓ Salvar Requisição
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
