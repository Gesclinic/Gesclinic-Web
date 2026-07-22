import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createCardBrand,
  createCardSettlementType,
  deleteCardBrand,
  deleteCardSettlementType,
  listCardBrands,
  listCardSettlementTypes,
  updateCardBrand,
  updateCardSettlementType,
} from '@/lib/cardParametersApi';

const emptyBrand = { code: '', name: '' };
const emptySettlement = { code: '', name: '', days_offset: '' };

export default function CartoesParametrosPage() {
  const { clinicId } = useClinicContext();
  const [brands, setBrands] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [brandForm, setBrandForm] = useState(emptyBrand);
  const [settlementForm, setSettlementForm] = useState(emptySettlement);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editingSettlementId, setEditingSettlementId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      setError('');
      const [brandRows, settlementRows] = await Promise.all([
        listCardBrands(clinicId),
        listCardSettlementTypes(clinicId),
      ]);
      setBrands(brandRows || []);
      setSettlements(settlementRows || []);
    } catch (err) {
      console.error('Erro ao carregar parâmetros de cartão:', err);
      setError(err.message || 'Erro ao carregar parâmetros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const saveBrand = async (event) => {
    event.preventDefault();
    try {
      setError('');
      setNotice('');
      if (editingBrandId) await updateCardBrand(editingBrandId, brandForm);
      else await createCardBrand(clinicId, brandForm);
      setBrandForm(emptyBrand);
      setEditingBrandId(null);
      setNotice('Bandeira salva com sucesso.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Erro ao salvar bandeira');
    }
  };

  const saveSettlement = async (event) => {
    event.preventDefault();
    try {
      setError('');
      setNotice('');
      if (editingSettlementId) await updateCardSettlementType(editingSettlementId, settlementForm);
      else await createCardSettlementType(clinicId, settlementForm);
      setSettlementForm(emptySettlement);
      setEditingSettlementId(null);
      setNotice('Forma de recebimento salva com sucesso.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Erro ao salvar forma de recebimento');
    }
  };

  const editBrand = (brand) => {
    setEditingBrandId(brand.id || null);
    setBrandForm({ code: brand.code || brand.name || '', name: brand.name || brand.code || '' });
  };

  const editSettlement = (settlement) => {
    setEditingSettlementId(settlement.id || null);
    setSettlementForm({
      code: settlement.code || '',
      name: settlement.name || settlement.code || '',
      days_offset: settlement.days_offset ?? '',
    });
  };

  const removeBrand = async (brand) => {
    if (!brand.id) {
      setError('Recarregue os parâmetros para concluir a sincronização desta bandeira.');
      return;
    }
    if (!confirm(`Remover a bandeira ${brand.name}?`)) return;
    await deleteCardBrand(brand.id);
    await loadData();
  };

  const removeSettlement = async (settlement) => {
    if (!settlement.id) {
      setError('Recarregue os parâmetros para concluir a sincronização desta forma.');
      return;
    }
    if (!confirm(`Remover a forma ${settlement.name}?`)) return;
    await deleteCardSettlementType(settlement.id);
    await loadData();
  };

  return (
    <div className="space-y-5">
      {(error || notice) && (
        <div className={`rounded-lg border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || notice}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Bandeiras</h2>
            <p className="text-sm text-slate-500">Cadastre as bandeiras usadas em vendas e taxas.</p>
          </div>
          <form onSubmit={saveBrand} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label>Código *</Label>
              <Input value={brandForm.code} onChange={(event) => setBrandForm((current) => ({ ...current, code: event.target.value }))} placeholder="VISA" />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input value={brandForm.name} onChange={(event) => setBrandForm((current) => ({ ...current, name: event.target.value }))} placeholder="Visa" />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                {editingBrandId ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </form>

          <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {loading ? <p className="p-4 text-sm text-slate-500">Carregando...</p> : brands.map((brand) => (
              <div key={brand.id || brand.code} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="font-medium text-slate-900">{brand.name}</p>
                  <p className="text-xs text-slate-500">{brand.code}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="rounded p-2 text-slate-600 hover:bg-slate-100" onClick={() => editBrand(brand)} title="Editar bandeira">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded p-2 text-red-600 hover:bg-red-50" onClick={() => removeBrand(brand)} title="Remover bandeira">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Formas de Recebimento</h2>
            <p className="text-sm text-slate-500">Defina os prazos usados para cálculo de taxa e liquidação.</p>
          </div>
          <form onSubmit={saveSettlement} className="grid gap-3 sm:grid-cols-[0.9fr_1.4fr_0.8fr_auto]">
            <div>
              <Label>Código *</Label>
              <Input value={settlementForm.code} onChange={(event) => setSettlementForm((current) => ({ ...current, code: event.target.value }))} placeholder="D+1" />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input value={settlementForm.name} onChange={(event) => setSettlementForm((current) => ({ ...current, name: event.target.value }))} placeholder="D+1 (Próximo dia)" />
            </div>
            <div>
              <Label>Dias</Label>
              <Input type="number" value={settlementForm.days_offset} onChange={(event) => setSettlementForm((current) => ({ ...current, days_offset: event.target.value }))} placeholder="1" />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                {editingSettlementId ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </form>

          <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {loading ? <p className="p-4 text-sm text-slate-500">Carregando...</p> : settlements.map((settlement) => (
              <div key={settlement.id || settlement.code} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="font-medium text-slate-900">{settlement.name}</p>
                  <p className="text-xs text-slate-500">{settlement.code}{settlement.days_offset !== null && settlement.days_offset !== undefined ? ` · ${settlement.days_offset} dia(s)` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="rounded p-2 text-slate-600 hover:bg-slate-100" onClick={() => editSettlement(settlement)} title="Editar forma">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded p-2 text-red-600 hover:bg-red-50" onClick={() => removeSettlement(settlement)} title="Remover forma">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
