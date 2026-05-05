import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, X } from 'lucide-react';
import { stockCategoriesApi } from '@/lib/stockApi';

export default function CategorySelect({ clinicId, value, onChange, hideLabel = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadCategories = useCallback(async () => {
    if (!clinicId) {
      return [];
    }
    setLoading(true);
    try {
      const data = await stockCategoriesApi.list(clinicId);
      setItems(data || []);
      return data || [];
    } catch (e) {
      console.error('Erro ao carregar categorias:', e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const onFocus = async () => {
      // Quando voltar do cadastro em outra aba, atualiza lista e tenta pré-selecionar
      const data = await loadCategories();
      const pendingName = localStorage.getItem('gc_cat_pending');
      if (pendingName) {
        const found = (data || []).find(
          (c) => (c.name || '').toLowerCase() === pendingName.toLowerCase(),
        );
        if (found) {
          handleSelect(found);
        }
        localStorage.removeItem('gc_cat_pending');
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadCategories]);

  useEffect(() => {
    const onStorage = async (e) => {
      if (e.key === 'gc_cat_created' && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          const data = await loadCategories();
          const found = (data || []).find((c) => c.id === msg.id);
          if (found) {
            handleSelect(found);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadCategories]);

  const selected = useMemo(() => items.find((c) => c.id === value) || null, [items, value]);

  const filtered = useMemo(() => {
    if (!search) {
      return items;
    }
    const t = search.toLowerCase();
    return items.filter((c) => c.name?.toLowerCase().includes(t));
  }, [items, search]);

  const handleSelect = (cat) => {
    onChange(cat?.id || null);
    setOpen(false);
    setSearch('');
  };

  const handleCreate = async () => {
    if (!search?.trim()) {
      return;
    }
    setCreating(true);
    try {
      const created = await stockCategoriesApi.create(clinicId, { name: search.trim() });
      const newItem = created || { id: created?.id, name: search.trim() };
      setItems((prev) => [newItem, ...prev]);
      handleSelect(newItem);
    } catch (e) {
      console.error('Erro ao criar categoria:', e);
    } finally {
      setCreating(false);
    }
  };

  const clearSelection = () => handleSelect(null);

  const innerContent = (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            id="category_id"
            placeholder="Selecione ou crie uma categoria..."
            value={open ? search : selected?.name || ''}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={loading}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSelection}
            title="Limpar categoria"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (search?.trim()) {
              localStorage.setItem('gc_cat_pending', search.trim());
            }
            window.open('/clinica/estoque/categorias', '_blank');
          }}
          title="Abrir cadastro de categorias em nova aba"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-sm text-gray-500">Carregando categorias...</div>
          ) : filtered.length === 0 ? (
            <div className="p-2">
              <div className="text-sm text-gray-500 px-2 py-2">Nenhuma categoria encontrada.</div>
              {!!search?.trim() && (
                <Button
                  type="button"
                  className="w-full flex items-center gap-2"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  <Plus className="h-4 w-4" /> Criar "{search.trim()}"
                </Button>
              )}
            </div>
          ) : (
            <>
              {!!search?.trim() &&
                !items.some((i) => i.name?.toLowerCase() === search.trim().toLowerCase()) && (
                  <div className="p-2 border-b">
                    <Button
                      type="button"
                      className="w-full flex items-center gap-2"
                      onClick={handleCreate}
                      disabled={creating}
                    >
                      <Plus className="h-4 w-4" /> Criar "{search.trim()}"
                    </Button>
                  </div>
                )}
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-b-0 ${value === c.id ? 'bg-blue-100' : ''}`}
                >
                  <div className="font-medium text-sm">{c.name}</div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );

  return hideLabel ? (
    innerContent
  ) : (
    <div className="space-y-2">
      <Label htmlFor="category_id">Categoria</Label>
      {innerContent}
    </div>
  );
}
