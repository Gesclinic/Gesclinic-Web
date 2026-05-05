import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, X } from 'lucide-react';
import { stockSuppliersApi } from '@/lib/stockApi';

export default function SupplierSelect({
  clinicId,
  value,
  supplierId,
  onChange,
  required = false,
  reloadKey,
  hideLabel = false,
}) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!clinicId) {
      return;
    }

    const loadSuppliers = async () => {
      setLoading(true);
      try {
        const data = await stockSuppliersApi.list(clinicId);
        setSuppliers(data || []);
      } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSuppliers();
  }, [clinicId, reloadKey]);

  const filteredSuppliers = useMemo(() => {
    if (!search) {
      return suppliers;
    }
    const term = search.toLowerCase();
    return suppliers.filter(
      (s) => s.name?.toLowerCase().includes(term) || s.tax_id?.toLowerCase().includes(term),
    );
  }, [suppliers, search]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleSelect = (supplier) => {
    onChange({ supplier: supplier.name, supplierId: supplier.id });
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange({ supplier: '', supplierId: '' });
    setSearch('');
  };

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <Label htmlFor="supplier">
          Fornecedor {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              id="supplier"
              type="text"
              placeholder="Buscar fornecedor por nome ou CNPJ..."
              value={open ? search : value}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              disabled={loading}
              required={required}
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
          {supplierId && (
            <Button type="button" variant="outline" size="sm" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-sm text-gray-500">
                Carregando fornecedores...
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">
                {suppliers.length === 0
                  ? 'Nenhum fornecedor cadastrado'
                  : 'Nenhum fornecedor encontrado'}
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleSelect(supplier)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-b-0 ${
                    supplierId === supplier.id ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="font-medium text-sm">{supplier.name}</div>
                  {supplier.tax_id && (
                    <div className="text-xs text-gray-500">CNPJ/CPF: {supplier.tax_id}</div>
                  )}
                  {supplier.contact_name && (
                    <div className="text-xs text-gray-500">Contato: {supplier.contact_name}</div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {supplierId && selectedSupplier && (
        <div className="text-xs text-gray-600 mt-2">
          <strong>Selecionado:</strong> {selectedSupplier.name}
        </div>
      )}
    </div>
  );
}
