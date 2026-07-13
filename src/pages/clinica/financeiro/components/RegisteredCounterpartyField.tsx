import React, { useMemo, useState } from 'react';

export type SupplierRecord = {
  id: string;
  name: string;
  tax_id?: string;
  cnpj?: string;
  contact_name?: string;
};

type RegisteredCounterpartyFieldProps = {
  label: string;
  value: string;
  documentValue: string;
  suppliers: SupplierRecord[];
  loading: boolean;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDocumentChange: (value: string) => void;
  onCreate: () => void;
};

export function RegisteredCounterpartyField({
  label,
  value,
  documentValue,
  suppliers,
  loading,
  disabled,
  onNameChange,
  onDocumentChange,
  onCreate,
}: RegisteredCounterpartyFieldProps) {
  const [open, setOpen] = useState(false);

  const filteredSuppliers = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!term) {
      return suppliers.slice(0, 8);
    }
    return suppliers
      .filter((supplier) => {
        const document = supplier.tax_id || supplier.cnpj || '';
        return supplier.name?.toLowerCase().includes(term) || document.toLowerCase().includes(term);
      })
      .slice(0, 8);
  }, [suppliers, value]);

  const hasDocument = documentValue.trim().length > 0;

  return (
    <div className="space-y-2 text-sm font-semibold text-slate-700">
      <label className="block">
        {label}
        <div className="relative mt-2">
          <input
            value={value}
            onChange={(event) => {
              onNameChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none"
            placeholder="Buscar nos cadastrados..."
            autoComplete="off"
          />
          {open && filteredSuppliers.length > 0 && (
            <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {filteredSuppliers.map((supplier) => {
                const document = supplier.tax_id || supplier.cnpj || '';
                return (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => {
                      onNameChange(supplier.name || '');
                      onDocumentChange(document);
                      setOpen(false);
                    }}
                    className="w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50"
                  >
                    <span className="block font-semibold text-slate-800">{supplier.name}</span>
                    {document && <span className="block text-xs font-medium text-slate-500">CPF/CNPJ: {document}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </label>

      <div className="flex gap-2">
        <input
          value={documentValue}
          onChange={(event) => onDocumentChange(event.target.value)}
          disabled={disabled}
          className="min-w-0 flex-1 rounded-lg border-2 border-slate-200 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none"
          placeholder="CPF ou CNPJ"
        />
        <button
          type="button"
          onClick={onCreate}
          disabled={disabled || loading || !value.trim() || !hasDocument}
          className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '...' : 'Cadastrar'}
        </button>
      </div>
    </div>
  );
}