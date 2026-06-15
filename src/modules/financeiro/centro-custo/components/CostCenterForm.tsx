// src/modules/financeiro/centro-custo/components/CostCenterForm.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, ChevronRight } from 'lucide-react';
import type { CostCenter, CreateCostCenterPayload, UpdateCostCenterPayload } from '../types';
import * as costCentersApi from '../services/costCentersApi';

interface CostCenterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center?: CostCenter | null;
  onSave: (payload: CreateCostCenterPayload | UpdateCostCenterPayload) => Promise<void>;
  parentOptions: CostCenter[];
  clinicId: string;
  embedded?: boolean;
}

export const CostCenterForm: React.FC<CostCenterFormProps> = ({
  open,
  onOpenChange,
  center,
  onSave,
  parentOptions,
  clinicId,
  embedded = false,
}) => {
  const [formData, setFormData] = useState<CreateCostCenterPayload>({
    code: '',
    name: '',
    description: undefined,
    parent_id: undefined,
    manager_id: undefined,
    is_active: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedParent, setSelectedParent] = useState<CostCenter | null>(null);

  useEffect(() => {
    if (center) {
      setFormData({
        code: center.code,
        name: center.name,
        description: center.description || undefined,
        parent_id: center.parent_id || undefined,
        manager_id: center.manager_id || undefined,
        is_active: center.is_active,
      });
      const parent = parentOptions.find((p) => p.id === center.parent_id);
      setSelectedParent(parent || null);
    } else {
      setFormData({
        code: '',
        name: '',
        description: undefined,
        parent_id: undefined,
        manager_id: undefined,
        is_active: true,
      });
      setSelectedParent(null);
    }
    setError(null);
  }, [center, open, parentOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.code.trim()) {
      setError('Código é obrigatório');
      return;
    }

    if (!costCentersApi.validateCostCenterCode(formData.code)) {
      setError('Código deve conter apenas números e pontos (ex: 1, 1.1, 1.1.1)');
      return;
    }

    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    setSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar centro de custo');
    } finally {
      setSubmitting(false);
    }
  };

  const title = center ? 'Editar Centro de Custo' : 'Novo Centro de Custo';

  const header = embedded ? (
    <div className="pb-6 border-b">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    </div>
  ) : (
    <DialogHeader className="pb-6 sticky top-0 bg-white dark:bg-slate-950 z-10 -mx-8 px-8">
      <DialogTitle className="text-2xl">{title}</DialogTitle>
    </DialogHeader>
  );

  const footer = embedded ? (
    <div className="pt-8 border-t flex justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={submitting}
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={submitting} className="px-8">
        {submitting ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  ) : (
    <DialogFooter className="pt-8 border-t gap-3 sticky bottom-0 bg-white dark:bg-slate-950 -mx-8 px-8 py-6">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={submitting}
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={submitting} className="px-8">
        {submitting ? 'Salvando...' : 'Salvar'}
      </Button>
    </DialogFooter>
  );

  const formContent = (
    <>
        {header}

        <form onSubmit={handleSubmit} className={embedded ? 'space-y-7 pt-6' : 'space-y-7 pr-4'}>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <TooltipProvider>
            {/* Code */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="code" className="font-semibold">Código *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Ajuda sobre código" title="Ajuda sobre código" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5}>
                    Números separados por pontos (ex: 1, 1.1, 1.1.1)
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="1, 1.1, 1.1.1"
                disabled={submitting || !!center}
                className="font-mono text-sm"
                required
              />
            </div>

            {/* Name */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="name" className="font-semibold">Nome *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Ajuda sobre nome" title="Ajuda sobre nome" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5}>
                    Será usado para identificar o centro em relatórios e filtros
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Atendimentos"
                disabled={submitting}
                required
              />
            </div>

            {/* Parent - reorganizado */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="parent" className="font-semibold">Centro Pai (opcional)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Ajuda sobre centro pai" title="Ajuda sobre centro pai" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5}>
                    Forme hierarquias vinculando centros filhos a um centro pai
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(value) => {
                  const newParentId = value === 'none' ? undefined : value;
                  setFormData({ ...formData, parent_id: newParentId });
                  const parent = parentOptions.find((p) => p.id === newParentId);
                  setSelectedParent(parent || null);
                }}
                disabled={submitting || !!center}
              >
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Nenhum (centro raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (centro raiz)</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.code} - {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Preview da hierarquia */}
              {selectedParent && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  <span className="font-mono font-semibold">{selectedParent.code}</span>
                  <span className="flex-1">{selectedParent.name}</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">[novo]</span>
                </div>
              )}
            </div>

            {/* Responsável/Manager */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="manager" className="font-semibold">Responsável (opcional)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Ajuda sobre responsável" title="Ajuda sobre responsável" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5}>
                    Será preenchido dinamicamente com profissionais cadastrados
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="manager"
                value={formData.manager_id || ''}
                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value || undefined })}
                placeholder="ID do responsável (opcional)"
                disabled={submitting}
                className="text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="description" className="font-semibold">Descrição</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Ajuda sobre descrição" title="Ajuda sobre descrição" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5}>
                    Campo interno para anotações e detalhes relevantes
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional..."
                disabled={submitting}
                rows={4}
              />
            </div>

            {/* Active */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="active" className="font-semibold cursor-pointer">Ativo</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Ajuda sobre status ativo" title="Ajuda sobre status ativo" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5}>
                    Desative para arquivar centros que não são mais utilizados
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                <input
                  id="active"
                  type="checkbox"
                  aria-label="Centro ativo"
                  title="Centro ativo"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  disabled={submitting}
                  className="w-5 h-5 rounded cursor-pointer"
                />
                <span className="text-sm font-semibold">
                  {formData.is_active ? 'Centro ativo' : 'Centro inativo'}
                </span>
              </div>
            </div>
          </TooltipProvider>

          {/* Footer */}
          {footer}
        </form>
    </>
  );

  if (embedded) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {formContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto p-8">
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

export default CostCenterForm;
