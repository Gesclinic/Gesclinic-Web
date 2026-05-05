import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { stockLocationsApi } from '@/lib/stockApi';

export default function LocationSelect({
  clinicId,
  value,
  locationId = '',
  onChange,
  required = false,
  hideLabel = false,
  label = 'Local de Estoque',
}) {
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clinicId) {
      return;
    }
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await stockLocationsApi.list(clinicId);
        setLocations(data || []);
      } catch (error) {
        console.error('Erro ao buscar locais de estoque:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, [clinicId]);

  const filtered = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(search.toLowerCase()) || (loc.id && loc.id.includes(search)),
  );

  const selected = locations.find((loc) => loc.id === locationId);

  const handleSelect = (location) => {
    setSearch(location.name);
    setOpen(false);
    onChange?.({ location: location.name, locationId: location.id });
  };

  // Keep input text synced when parent selection changes
  useEffect(() => {
    if (selected && selected.name !== search) {
      setSearch(selected.name);
    } else if (!selected && value && value !== search) {
      setSearch(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, value, locations]);

  const tryResolveTypedLocation = () => {
    if (!locations?.length || !search?.trim()) {
      return;
    }
    const exact = locations.find((l) => l.name.toLowerCase() === search.trim().toLowerCase());
    if (exact) {
      if (exact.id !== locationId) {
        onChange?.({ location: exact.name, locationId: exact.id });
      }
      return;
    }
    if (filtered.length === 1) {
      const only = filtered[0];
      if (only.id !== locationId) {
        onChange?.({ location: only.name, locationId: only.id });
      }
    }
  };

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <Label htmlFor="location">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id="location"
          type="text"
          placeholder="Buscar local por nome ou ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() =>
            setTimeout(() => {
              tryResolveTypedLocation();
              setOpen(false);
            }, 200)
          }
          required={required}
        />
        {open && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-md z-50 max-h-48 overflow-y-auto">
            {filtered.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => handleSelect(location)}
                className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex justify-between items-center ${
                  locationId === location.id ? 'bg-blue-100' : ''
                }`}
              >
                <span>{location.name}</span>
                <span className="text-xs text-gray-500">{location.id.substring(0, 8)}...</span>
              </button>
            ))}
          </div>
        )}
        {open && filtered.length === 0 && search && !loading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-md z-50 p-2 text-center text-gray-500">
            Nenhum local encontrado
          </div>
        )}
        {loading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-md z-50 p-2 text-center text-gray-500">
            Carregando...
          </div>
        )}
      </div>
      {/* ID removido conforme solicitação */}
    </div>
  );
}
