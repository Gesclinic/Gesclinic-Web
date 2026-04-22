import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X } from 'lucide-react';

interface CashFiltersProps {
  filters: {
    startDate?: string;
    endDate?: string;
    professionalId?: string;
    payerId?: string;
    type?: 'entrada' | 'saida';
    origin?: 'manual' | 'agenda';
  };
  onFiltersChange: (filters: any) => void;
  professionals: Array<{ id: string; name: string }>;
  payers: Array<{ id: string; name: string }>;
}

export const CashFilters: React.FC<CashFiltersProps> = ({
  filters,
  onFiltersChange,
  professionals,
  payers
}) => {
  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(val => val !== undefined && val !== '');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Data Inicial */}
        <Input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              startDate: e.target.value || undefined
            })
          }
          placeholder="Data Inicial"
          className="w-full"
        />

        {/* Data Final */}
        <Input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              endDate: e.target.value || undefined
            })
          }
          placeholder="Data Final"
          className="w-full"
        />

        {/* Profissional */}
        <Select
          value={filters.professionalId || ''}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              professionalId: value || undefined
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Profissional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {professionals.map((prof) => (
              <SelectItem key={prof.id} value={prof.id}>
                {prof.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Convênio */}
        <Select
          value={filters.payerId || ''}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              payerId: value || undefined
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Convênio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {payers.map((payer) => (
              <SelectItem key={payer.id} value={payer.id}>
                {payer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo */}
        <Select
          value={filters.type || ''}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              type: (value as 'entrada' | 'saida') || undefined
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>

        {/* Limpar */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="text-slate-600 hover:text-red-600"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
};
