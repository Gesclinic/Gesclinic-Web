import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';
import LocationSelect from '@/components/clinica/estoque/LocationSelect';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';

export default function Transferencias() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [originFilter, setOriginFilter] = useState({ id: '', name: '' });
  const [destFilter, setDestFilter] = useState({ id: '', name: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const { clinicId } = useClinicContext();
  const { toast } = useToast();
  const [defaultDest, setDefaultDest] = useState({ id: '', name: '' });

  useEffect(() => {
    const savedId = localStorage.getItem('gesclinic_default_dest_location');
    if (!savedId) {
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('stock_locations')
          .select('id,name')
          .eq('id', savedId)
          .single();
        if (!error && data) {
          setDefaultDest({ id: data.id, name: data.name });
        }
      } catch {}
    })();
  }, []);

  const saveDefaultDest = () => {
    if (!destFilter.id) {
      toast({
        variant: 'destructive',
        title: 'Selecione um destino',
        description: 'Escolha o local de destino para salvar como padrão.',
      });
      return;
    }
    localStorage.setItem('gesclinic_default_dest_location', destFilter.id);
    setDefaultDest({ ...destFilter });
    toast({ title: 'Destino padrão salvo' });
  };

  const applyMyPendings = () => {
    if (defaultDest.id) {
      setDestFilter({ ...defaultDest });
      setStatusFilter('pendente');
      return;
    }
    if (destFilter.id) {
      const ok = window.confirm(
        'Deseja usar o destino selecionado como padrão para "Meus Pendentes"?',
      );
      if (ok) {
        saveDefaultDest();
        setStatusFilter('pendente');
      }
      return;
    }
    toast({
      variant: 'destructive',
      title: 'Destino padrão não definido',
      description: 'Selecione um destino ou salve um padrão para usar "Meus Pendentes".',
    });
  };
  const breadcrumbs = useBreadcrumbs([
    { label: 'Estoque', path: '/clinica/estoque' },
    { label: 'Transferências' },
  ]);

  const loadTransfers = async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(
          'id, created_at, movement_type, quantity, notes, stock_item_id, location_id, item:stock_items(name), location:stock_locations(name)',
        )
        .eq('clinic_id', clinicId)
        .ilike('notes', 'Transferência%')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        throw error;
      }

      // Agrupar por token
      const tokenRe = /Transferência\s([a-z0-9-]+)/i;
      const destIdRe = /DEST_ID=([0-9a-fA-F-]+)/;
      const groups = new Map();
      for (const r of data || []) {
        const match = (r.notes || '').match(tokenRe);
        const token = match ? match[1] : `legacy-${r.id}`;
        const key = `${r.item?.name || ''}|${r.qty}`;
        if (!groups.has(token)) {
          groups.set(token, { date: r.move_date, items: new Map(), note: r.notes || '' });
        }
        const g = groups.get(token);
        if (!g.items.has(key)) {
          g.items.set(key, {
            item: r.item?.name || '-',
            item_id: r.item_id,
            qty: r.qty,
            exit: null,
            entry: null,
          });
        }
        const rec = g.items.get(key);
        if (r.type === 'exit') {
          rec.exit = r;
        } else if (r.type === 'entry') {
          rec.entry = r;
        }
        if (!g.date || (r.move_date && r.move_date > g.date)) {
          g.date = r.move_date;
        }
        if (!g.note && r.notes) {
          g.note = r.notes;
        }
      }

      // Linearizar linhas
      const table = [];
      for (const [, g] of groups) {
        for (const [, rec] of g.items) {
          const parsedDestId = destIdRe.exec(g.note || '')?.[1] || '';
          table.push({
            date: g.date,
            item: rec.item,
            item_id: rec.item_id,
            qty: rec.qty,
            origem: rec.exit?.location?.name || '-',
            destino: rec.entry?.location?.name || '-',
            origemId: rec.exit?.location_id || '',
            destinoId: rec.entry?.location_id || parsedDestId,
            token: (g.note || '').match(tokenRe)?.[1] || '',
            notes: (g.note || '')
              .replace(tokenRe, '')
              .replace(/\s-\s*/, '')
              .trim(),
            status: rec.entry ? 'aceita' : 'pendente',
          });
        }
      }
      setRows(table);
    } catch (err) {
      console.error('Erro ao carregar transferências:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar transferências',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [clinicId]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (startDate && (!r.date || r.date < startDate)) {
        return false;
      }
      if (endDate && (!r.date || r.date > endDate)) {
        return false;
      }
      if (originFilter.id && r.origemId !== originFilter.id) {
        return false;
      }
      if (destFilter.id && r.destinoId !== destFilter.id) {
        return false;
      }
      if (statusFilter && r.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [rows, startDate, endDate, originFilter, destFilter, statusFilter]);

  const revertTransfer = async (row) => {
    const ok = window.confirm(`Reverter transferência de ${row.qty} do item ${row.item}?`);
    if (!ok) {
      return;
    }
    try {
      if (!row.origemId || !row.destinoId) {
        toast({
          variant: 'destructive',
          title: 'Sem dados suficientes',
          description:
            'Não foi possível identificar origem e destino desta transferência (registro antigo).',
        });
        return;
      }
      const token = row.token || Math.random().toString(36).slice(2, 10);
      const baseNote = `Reversão Transferência ${token} - ${row.destino} -> ${row.origem}`;
      const exitBack = {
        clinic_id: clinicId,
        item_id: row.item_id,
        type: 'exit',
        location_id: row.destinoId,
        qty: row.qty,
        unit_cost: null,
        move_date: new Date().toISOString().slice(0, 10),
        notes: baseNote,
      };
      const entryBack = {
        clinic_id: clinicId,
        item_id: row.item_id,
        type: 'entry',
        location_id: row.origemId,
        qty: row.qty,
        unit_cost: null,
        move_date: new Date().toISOString().slice(0, 10),
        notes: baseNote,
      };
      const { error: e1 } = await supabase.from('stock_movements').insert(exitBack);
      if (e1) {
        throw e1;
      }
      const { error: e2 } = await supabase.from('stock_movements').insert(entryBack);
      if (e2) {
        throw e2;
      }
      toast({ title: 'Transferência revertida' });
      await loadTransfers();
    } catch (err) {
      console.error('Erro ao reverter:', err);
      toast({ variant: 'destructive', title: 'Erro ao reverter', description: err.message });
    }
  };

  const acceptTransfer = async (row) => {
    if (!row.destinoId) {
      toast({
        variant: 'destructive',
        title: 'Destino não identificado',
        description: 'Não foi possível identificar o local de destino para esta transferência.',
      });
      return;
    }
    const ok = window.confirm(
      `Aceitar transferência de ${row.qty} do item ${row.item} para o destino?`,
    );
    if (!ok) {
      return;
    }
    try {
      const baseNote = `Transferência ${row.token}`;
      const entry = {
        clinic_id: clinicId,
        item_id: row.item_id,
        type: 'entry',
        location_id: row.destinoId,
        qty: row.qty,
        unit_cost: null,
        move_date: new Date().toISOString().slice(0, 10),
        notes: row.notes ? `${baseNote} | ${row.notes}` : baseNote,
      };
      const { error } = await supabase.from('stock_movements').insert(entry);
      if (error) {
        throw error;
      }
      toast({ title: 'Transferência aceita e entrada registrada' });
      await loadTransfers();
    } catch (err) {
      console.error('Erro ao aceitar:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao aceitar transferência',
        description: err.message,
      });
    }
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Transferências"
      subtitle="Transfira produtos entre locais, setores ou unidades."
      actions={
        <Button
          className="bg-purple-600 text-white flex items-center"
          onClick={() => navigate('/clinica/estoque/transferencias/nova')}
        >
          <ArrowRightLeft className="mr-2 w-4 h-4" /> Nova Transferência
        </Button>
      }
    >
      <Card className="p-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
          <div>
            <label className="text-xs block mb-1">Data inicial</label>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs block mb-1">Data final</label>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs block mb-1">Origem</label>
            <LocationSelect
              clinicId={clinicId}
              value={originFilter.name}
              locationId={originFilter.id}
              onChange={(d) => setOriginFilter({ id: d.locationId, name: d.location })}
              hideLabel
            />
          </div>
          <div>
            <label className="text-xs block mb-1">Destino</label>
            <LocationSelect
              clinicId={clinicId}
              value={destFilter.name}
              locationId={destFilter.id}
              onChange={(d) => setDestFilter({ id: d.locationId, name: d.location })}
              hideLabel
            />
          </div>
          <div>
            <label className="text-xs block mb-1">Status</label>
            <select
              className="border rounded px-3 py-2 w-full text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="aceita">Aceitas</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="secondary" size="sm" onClick={applyMyPendings}>
            Meus Pendentes
          </Button>
          {destFilter.id && destFilter.id !== defaultDest.id && (
            <Button variant="outline" size="sm" onClick={saveDefaultDest}>
              Salvar destino como padrão
            </Button>
          )}
        </div>
        {(startDate || endDate || originFilter.id || destFilter.id || statusFilter) && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setOriginFilter({ id: '', name: '' });
                setDestFilter({ id: '', name: '' });
                setStatusFilter('');
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500">Nenhuma transferência encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Produto</th>
                <th className="px-4 py-2 text-right">Quantidade</th>
                <th className="px-4 py-2 text-left">Origem</th>
                <th className="px-4 py-2 text-left">Destino</th>
                <th className="px-4 py-2 text-left">Observação</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {r.date ? format(new Date(r.date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">{r.item}</td>
                  <td className="px-4 py-3 text-right">{r.qty}</td>
                  <td className="px-4 py-3">{r.origem}</td>
                  <td className="px-4 py-3">{r.destino}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.notes || '-'}</td>
                  <td className="px-4 py-3">
                    {r.status === 'pendente' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                        Pendente de aceite
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                        Aceita
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {r.status === 'pendente' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 text-white"
                          onClick={() => acceptTransfer(r)}
                          disabled={!r.destinoId}
                        >
                          Aceitar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revertTransfer(r)}
                        disabled={!r.origemId || !r.destinoId}
                        title={
                          !r.origemId || !r.destinoId
                            ? 'Transferência antiga sem origem/destino completos'
                            : undefined
                        }
                      >
                        Reverter
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

    </PageLayout>
  );
}
