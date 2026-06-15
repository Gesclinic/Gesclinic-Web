import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export function SaveFilterDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  loading = false,
}) {
  const [filterName, setFilterName] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!filterName.trim()) {
      setError('Nome do filtro é obrigatório');
      return;
    }

    if (existingNames.includes(filterName)) {
      setError('Esse nome já existe. Deseja sobrescrever?');
      return;
    }

    onSave(filterName);
    setFilterName('');
    setError('');
    onOpenChange(false);
  };

  const handleOverwrite = () => {
    if (filterName.trim()) {
      onSave(filterName);
      setFilterName('');
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Salvar Filtro</DialogTitle>
          <DialogDescription>
            Dê um nome para este filtro e ele será salvo para uso posterior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filter-name">Nome do Filtro</Label>
            <Input
              id="filter-name"
              placeholder="Ex: Contas de Maio"
              value={filterName}
              onChange={(e) => {
                setFilterName(e.target.value);
                setError('');
              }}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFilterName('');
              setError('');
            }}
            disabled={loading}
          >
            Cancelar
          </Button>

          {error?.includes('sobrescrever') ? (
            <Button onClick={handleOverwrite} disabled={loading}>
              Sobrescrever
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={loading}>
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
