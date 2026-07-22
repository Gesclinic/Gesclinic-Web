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
import { Building2, CalendarDays, Edit2, Trash2 } from 'lucide-react';

export default function CartasOperadorasPage({ embedded = false }) {
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
    <div className="space-y-6 pb-8">
      {!embedded && (
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Building2 className="h-8 w-8 text-sky-700" />
            Operadoras de Cartão
          </h1>
          <p className="mt-2 text-gray-600">
            Parametrize adquirentes, gateways e o dia padrão de crédito na conta.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div>
          <form onSubmit={handleSave} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Building2 className="h-5 w-5 text-sky-700" />
                {editingId ? 'Editar operadora' : 'Nova operadora'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">Cadastre a adquirente ou processadora usada nos recebimentos de cartão.</p>
            </div>

            <div className="space-y-4 p-5">

            {/* Name */}
            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Nome da operadora *</Label>
              <Input
                type="text"
                name="name"
                placeholder="Ex: Stone, PagBank, PagSeguro"
                value={formData.name}
                onChange={handleInputChange}
                className="h-10 text-sm"
              />
            </div>

            {/* Settlement Day */}
            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Dia de crédito na conta (1-31) *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  name="settlement_day"
                  min="1"
                  max="31"
                  value={formData.settlement_day}
                  onChange={handleInputChange}
                  className="h-10 flex-1 text-sm"
                />
                <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-2 text-xs text-slate-500">dia do mês</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Observações</Label>
              <Input
                type="text"
                name="notes"
                placeholder="Ex: Conta corporativa..."
                value={formData.notes}
                onChange={handleInputChange}
                className="h-10 text-sm"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="h-10 flex-1 bg-sky-700 text-sm text-white hover:bg-sky-800"
              >
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  className="h-10 flex-1 text-sm"
                >
                  Cancelar
                </Button>
              )}
            </div>
            </div>
          </form>
        </div>

        <div>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Operadoras cadastradas</h2>
                <p className="text-xs text-slate-500">Operadoras disponíveis para cartões, taxas e conciliação.</p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {loading ? '...' : `${processors.length} cadastro${processors.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Carregando operadoras...</div>
            ) : processors.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                  <Building2 className="h-6 w-6" />
                </div>
                <p className="font-medium text-slate-800">Nenhuma operadora cadastrada</p>
                <p className="mt-1 text-sm text-slate-500">Use o formulário ao lado para cadastrar a primeira operadora.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {processors.map((processor) => (
                  <div
                    key={processor.id}
                    className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{processor.name}</p>
                      <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> Crédito: dia <strong>{processor.settlement_day}</strong></span>
                        {processor.notes && <span className="sm:col-span-2">{processor.notes}</span>}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(processor)}
                        className="rounded p-2 text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-700"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(processor.id)}
                        className="rounded p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
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
      <div className="rounded-lg border border-sky-100 bg-sky-50 p-5">
        <h3 className="font-semibold text-sky-900">Como funciona</h3>
        <ul className="mt-3 space-y-2 text-sm text-sky-800">
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
