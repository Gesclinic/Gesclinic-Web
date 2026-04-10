import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { listOrcamentoItens, getOrcamentoDetails } from '@/lib/orcamentosApi';
import OrcamentoForm from './OrcamentoForm';
import { Loader2 } from 'lucide-react';

export default function OrcamentoDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  loading = false,
}) {
  const { clinicId } = useAuth();
  const isEdit = Boolean(initialData?.id);
  const [fullData, setFullData] = useState(initialData);
  const [fetchingItems, setFetchingItems] = useState(false);

  useEffect(() => {
    if (open && isEdit && initialData?.id) {
      setFetchingItems(true);
      getOrcamentoDetails(initialData.id)
        .then(details => {
          setFullData({ 
            ...initialData, 
            items: details.items,
            extraProfessionals: details.extraProfessionals,
            extraMaterials: details.extraMaterials
          });
        })
        .catch(err => console.error("Failed to load items", err))
        .finally(() => setFetchingItems(false));
    } else if (open && !isEdit) {
      setFullData(null);
    }
  }, [open, isEdit, initialData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
          <DialogDescription>Preencha os detalhes do orçamento abaixo.</DialogDescription>
        </DialogHeader>

        {fetchingItems ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <OrcamentoForm 
            clinicId={clinicId}
            initialData={fullData}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}