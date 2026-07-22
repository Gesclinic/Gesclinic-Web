import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Building2, CalendarDays, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { listCardProcessors } from '@/lib/cardProcessorsApi';
import { listCardBrands } from '@/lib/cardParametersApi';

export default function CartasPage({ embedded = false }) {
  const { clinic } = useClinicContext();
  const [cards, setCards] = useState([]);
  const [processors, setProcessors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    brand: '',
    last_4_digits: '',
    holder_name: '',
    expiry_month: '',
    expiry_year: '',
    payment_day: 1,
    processor_id: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      brand: '',
      last_4_digits: '',
      holder_name: '',
      expiry_month: '',
      expiry_year: '',
      payment_day: 1,
      processor_id: '',
      notes: '',
    });
    setEditingId(null);
  };

  const getBrandName = (code) => brands.find((brand) => (brand.code || brand.name) === code)?.name || code;

  // Carregar cartões e operadoras cadastrados
  useEffect(() => {
    if (clinic?.id) {
      loadCards();
      loadProcessors();
      loadBrands();
    }
  }, [clinic?.id]);

  const loadCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinic_payment_cards')
        .select('*, card_processors(name, settlement_day)')
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (err) {
      console.error('❌ Erro ao carregar cartões:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProcessors = async () => {
    try {
      const data = await listCardProcessors(clinic.id);
      setProcessors(data || []);
    } catch (err) {
      console.error('❌ Erro ao carregar operadoras:', err);
    }
  };

  const loadBrands = async () => {
    try {
      const data = await listCardBrands(clinic.id);
      setBrands(data || []);
    } catch (err) {
      console.error('❌ Erro ao carregar bandeiras:', err);
    }
  };

  const handleSave = async () => {
    if (!formData.brand || !formData.last_4_digits || !formData.holder_name) {
      alert('⚠️ Preencha os campos obrigatórios');
      return;
    }

    try {
      const saveData = {
        ...formData,
        processor_id: formData.processor_id || null,
      };

      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from('clinic_payment_cards')
          .update({
            ...saveData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        console.log('✅ Cartão atualizado');
      } else {
        // Criar
        const { error } = await supabase
          .from('clinic_payment_cards')
          .insert({
            clinic_id: clinic.id,
            ...saveData,
          });

        if (error) throw error;
        console.log('✅ Cartão criado');
      }

      resetForm();
      loadCards();
    } catch (err) {
      console.error('❌ Erro ao salvar cartão:', err);
      alert('Erro ao salvar cartão');
    }
  };

  const handleEdit = (card) => {
    setEditingId(card.id);
    setFormData({
      brand: card.brand,
      last_4_digits: card.last_4_digits,
      holder_name: card.holder_name,
      expiry_month: card.expiry_month || '',
      expiry_year: card.expiry_year || '',
      payment_day: card.payment_day || 1,
      processor_id: card.processor_id || '',
      notes: card.notes || '',
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este cartão?')) return;

    try {
      const { error } = await supabase
        .from('clinic_payment_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Cartão removido');
      loadCards();
    } catch (err) {
      console.error('❌ Erro ao remover cartão:', err);
      alert('Erro ao remover cartão');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="max-w-6xl">
        {!embedded && (
          <div className="mb-6">
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <CreditCard className="h-8 w-8 text-sky-700" />
              Cartões de Pagamento
            </h1>
            <p className="text-gray-600 mt-2">
              Parametrize cartões, bandeiras, operadoras e dia de pagamento esperado.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* FORMULÁRIO */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <CreditCard className="h-5 w-5 text-sky-700" />
                  {editingId ? 'Editar cartão' : 'Novo cartão'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">Informe somente os dados necessários para identificar o cartão na conciliação.</p>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Bandeira *</Label>
                  <Select
                    value={formData.brand || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, brand: value })
                    }
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id || brand.code} value={brand.code || brand.name}>
                          {brand.name || brand.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Últimos 4 dígitos *</Label>
                  <Input
                    type="text"
                    maxLength="4"
                    placeholder="0000"
                    value={formData.last_4_digits}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        last_4_digits: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    className="h-10 text-sm"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Titular *</Label>
                  <Input
                    type="text"
                    placeholder="Nome completo"
                    value={formData.holder_name}
                    onChange={(e) =>
                      setFormData({ ...formData, holder_name: e.target.value })
                    }
                    className="h-10 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Validade (MM)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="12"
                      value={formData.expiry_month}
                      onChange={(e) =>
                        setFormData({ ...formData, expiry_month: e.target.value })
                      }
                      className="h-10 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Ano (YY)</Label>
                    <Input
                      type="number"
                      min="24"
                      max="99"
                      placeholder="26"
                      value={formData.expiry_year}
                      onChange={(e) =>
                        setFormData({ ...formData, expiry_year: e.target.value })
                      }
                      className="h-10 bg-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Dia de pagamento (1-31)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payment_day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_day: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                      })
                    }
                    className="h-10 text-sm"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Operadora de processamento</Label>
                  <Select
                    value={formData.processor_id || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, processor_id: value })
                    }
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {processors.map((proc) => (
                        <SelectItem key={proc.id} value={proc.id}>
                          {proc.name} (Crédito: {proc.settlement_day}º)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Observações</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Cartão corporativo..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="h-10 text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    className="h-10 flex-1 bg-sky-700 text-sm text-white hover:bg-sky-800"
                  >
                    {editingId ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  {editingId && (
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="h-10 px-4 text-sm"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* LISTA DE CARTÕES */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Cartões cadastrados</h2>
                  <p className="text-xs text-slate-500">Cartões usados para orientar recebimento e conciliação.</p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{cards.length} cadastro{cards.length === 1 ? '' : 's'}</span>
              </div>

              {loading ? (
                <div className="p-10 text-center text-sm text-slate-500">Carregando cartões...</div>
              ) : cards.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-slate-800">Nenhum cartão cadastrado</p>
                  <p className="mt-1 text-sm text-slate-500">Use o formulário ao lado para cadastrar o primeiro cartão.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cards.map((card) => (
                    <div key={card.id} className="p-4 transition hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {getBrandName(card.brand)} •••• {card.last_4_digits}
                            </span>
                            <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                              {card.holder_name}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> Validade: {card.expiry_month || '--'}/{card.expiry_year || '--'}</p>
                            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> Pagamento: dia {card.payment_day}</p>
                            {card.card_processors && (
                              <p className="flex items-center gap-2 sm:col-span-2"><Building2 className="h-4 w-4 text-slate-400" /> Operadora: {card.card_processors.name} (crédito: {card.card_processors.settlement_day}º)</p>
                            )}
                            {card.notes && <p className="sm:col-span-2">{card.notes}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleEdit(card)}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-slate-600 hover:text-sky-700"
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button
                            onClick={() => handleDelete(card.id)}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
