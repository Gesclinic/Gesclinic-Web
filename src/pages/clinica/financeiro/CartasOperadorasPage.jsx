import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  listCardProcessors,
  createCardProcessor,
  updateCardProcessor,
  deleteCardProcessor,
} from '@/lib/cardProcessorsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Edit2 } from 'lucide-react';

export default function CartasOperadorasPage() {
  const { isAuthenticated } = useAuth();
  const { clinicId, loadingClinic } = useClinicContext();

  const [processors, setProcessors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    settlement_day: 1,
    notes: '',
  });

  // Load processors
  const loadProcessors = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const data = await listCardProcessors(clinicId);
      setProcessors(data);
    } catch (error) {
      console.error('Error loading processors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAuthenticated && !loadingClinic && clinicId) {
      loadProcessors();
    }
  }, [isAuthenticated, loadingClinic, clinicId]);

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'settlement_day' ? parseInt(value) || 1 : value,
    }));
  };

  // Handle add/update
  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Informe o nome da operadora');
      return;
    }

    if (formData.settlement_day < 1 || formData.settlement_day > 31) {
      alert('Dia deve estar entre 1 e 31');
      return;
    }

    try {
      if (editingId) {
        // Update
        await updateCardProcessor(editingId, formData);
      } else {
        // Create
        await createCardProcessor(clinicId, formData);
      }

      // Reload and reset
      await loadProcessors();
      setFormData({ name: '', settlement_day: 1, notes: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving processor:', error);
      alert('Erro ao salvar operadora');
    }
  };

  // Handle edit
  const handleEdit = (processor) => {
    setEditingId(processor.id);
    setFormData({
      name: processor.name,
      settlement_day: processor.settlement_day,
      notes: processor.notes || '',
    });
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta operadora?')) return;

    try {
      await deleteCardProcessor(id);
      await loadProcessors();
    } catch (error) {
      console.error('Error deleting processor:', error);
      alert('Erro ao deletar operadora');
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', settlement_day: 1, notes: '' });
  };

  if (loadingClinic) {
    return <div className="p-8 text-center text-gray-500">Carregando clínica...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">💳 Operadoras de Cartão</h1>
        <p className="mt-2 text-gray-600">
          Registre as operadoras de processamento (Stone, PagBank, etc) e configure o dia de crédito
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Form - Left Column */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSave} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingId ? '✏️ Editar Operadora' : '➕ Nova Operadora'}
            </h2>

            {/* Name */}
            <div>
              <Label className="text-sm font-semibold">Nome da Operadora *</Label>
              <Input
                type="text"
                name="name"
                placeholder="Ex: Stone, PagBank, PagSeguro"
                value={formData.name}
                onChange={handleInputChange}
                className="h-9 text-sm"
              />
            </div>

            {/* Settlement Day */}
            <div>
              <Label className="text-sm font-semibold">Dia de Crédito na Conta (1-31) *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  name="settlement_day"
                  min="1"
                  max="31"
                  value={formData.settlement_day}
                  onChange={handleInputChange}
                  className="h-9 flex-1 text-sm"
                />
                <span className="text-xs text-gray-500">dia do mês</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-semibold">Observações</Label>
              <Input
                type="text"
                name="notes"
                placeholder="Ex: Conta corporativa..."
                value={formData.notes}
                onChange={handleInputChange}
                className="h-9 text-sm"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 h-9 text-sm"
              >
                {editingId ? '💾 Atualizar' : '➕ Adicionar'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 h-9 text-sm"
                >
                  ✕ Cancelar
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* List - Right Columns */}
        <div className="lg:col-span-2">
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="flex items-center justify-between text-xl font-semibold text-gray-900">
              📋 Operadoras Cadastradas
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-normal text-blue-700">
                {loading ? '...' : processors.length}
              </span>
            </h2>

            {loading ? (
              <div className="py-12 text-center text-gray-500">Carregando...</div>
            ) : processors.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                Nenhuma operadora cadastrada. Crie uma nova!
              </div>
            ) : (
              <div className="space-y-2">
                {processors.map((processor) => (
                  <div
                    key={processor.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{processor.name}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                        <span>📅 Crédito: dia <strong>{processor.settlement_day}</strong></span>
                        {processor.notes && <span>📝 {processor.notes}</span>}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(processor)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(processor.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Deletar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="font-semibold text-blue-900">ℹ️ Como funciona</h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li>
            <strong>Stone:</strong> Crédita geralmente no D+1 (próximo dia útil)
          </li>
          <li>
            <strong>PagBank:</strong> Crédita geralmente no D+1 ou D+2
          </li>
          <li>
            <strong>PagSeguro:</strong> Crédita em dia específico do mês (ex: 10º dia)
          </li>
          <li>
            <strong>Mercado Pago:</strong> Crédita geralmente no D+1 a D+3
          </li>
        </ul>
      </div>
    </div>
  );
}
