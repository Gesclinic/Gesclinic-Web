import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { listCardProcessors } from '@/lib/cardProcessorsApi';

export default function CartasPage() {
  const { clinic } = useClinicContext();
  const [cards, setCards] = useState([]);
  const [processors, setProcessors] = useState([]);
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

  // Carregar cartões e operadoras cadastrados
  useEffect(() => {
    if (clinic?.id) {
      loadCards();
      loadProcessors();
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💳 Cartões de Pagamento</h1>
          <p className="text-gray-600 mt-2">
            Registre os cartões da clínica e configure datas de pagamento
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORMULÁRIO */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingId ? '✏️ Editar Cartão' : '➕ Novo Cartão'}
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Bandeira *</Label>
                  <Select
                    value={formData.brand || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, brand: value })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VISA">Visa</SelectItem>
                      <SelectItem value="MASTERCARD">MasterCard</SelectItem>
                      <SelectItem value="ELO">Elo</SelectItem>
                      <SelectItem value="AMEX">American Express</SelectItem>
                      <SelectItem value="DINERS">Diners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Últimos 4 Dígitos *</Label>
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
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold">Titular *</Label>
                  <Input
                    type="text"
                    placeholder="Nome completo"
                    value={formData.holder_name}
                    onChange={(e) =>
                      setFormData({ ...formData, holder_name: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm font-semibold">Validade (MM)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="12"
                      value={formData.expiry_month}
                      onChange={(e) =>
                        setFormData({ ...formData, expiry_month: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Ano (YY)</Label>
                    <Input
                      type="number"
                      min="24"
                      max="99"
                      placeholder="26"
                      value={formData.expiry_year}
                      onChange={(e) =>
                        setFormData({ ...formData, expiry_year: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Dia de Pagamento (1-31)</Label>
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
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold">Operadora de Processamento</Label>
                  <Select
                    value={formData.processor_id || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, processor_id: value })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
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
                  <Label className="text-sm font-semibold">Observações</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Cartão corporativo..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                  >
                    {editingId ? '💾 Atualizar' : '➕ Adicionar'}
                  </Button>
                  {editingId && (
                    <Button
                      onClick={() => {
                        setEditingId(null);
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
                      }}
                      className="px-4 h-9 text-sm bg-gray-300 hover:bg-gray-400"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* LISTA DE CARTÕES */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  📋 Cartões Cadastrados ({cards.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-center text-gray-500">Carregando...</div>
              ) : cards.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nenhum cartão cadastrado. Crie um novo!
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {cards.map((card) => (
                    <div key={card.id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {card.brand} •••• {card.last_4_digits}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {card.holder_name}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>💳 Válido até: {card.expiry_month}/{card.expiry_year}</p>
                            <p>📅 Dia de Pagamento: {card.payment_day}º</p>
                            {card.card_processors && (
                              <p>🏢 Operadora: {card.card_processors.name} (Crédito: {card.card_processors.settlement_day}º)</p>
                            )}
                            {card.notes && <p>📝 {card.notes}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleEdit(card)}
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white h-8 w-8 p-0"
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button
                            onClick={() => handleDelete(card.id)}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0"
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
