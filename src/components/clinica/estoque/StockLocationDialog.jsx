import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, X } from 'lucide-react';

// Gera código único para depósito baseado em timestamp e número aleatório
const generateLocationCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `LOC-${timestamp}${random}`;
};

export default function StockLocationDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData = null
}) {
  const [formData, setFormData] = useState({ 
    name: '', 
    is_default: false
  });
  const [displayCode, setDisplayCode] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({ 
        name: initialData.name || '', 
        is_default: initialData.is_default || false,
        id: initialData.id 
      });
      setDisplayCode(generateLocationCode());
    } else {
      setFormData({ 
        name: '', 
        is_default: false
      });
      setDisplayCode(generateLocationCode());
    }
  }, [initialData, open]);

  const handleGenerateCode = () => {
    setDisplayCode(generateLocationCode());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nome do local é obrigatório');
      return;
    }
    onSubmit({
      name: formData.name,
      is_default: formData.is_default,
      id: formData.id
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white p-6 rounded-t-lg sticky top-0 z-20 -mx-6 -mt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏢</span>
              <div>
                <h2 className="text-lg font-bold">
                  {initialData ? 'Editar Local de Estoque' : 'Novo Local de Estoque'}
                </h2>
                <p className="text-amber-100 text-sm">Registre contagem e verificação de materiais</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-amber-700 h-8 w-8 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5">
          
          {/* SEÇÃO 1: INFORMAÇÕES DO LOCAL */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📍</span>
              <div>
                <h3 className="font-semibold text-gray-900">Identificação do Local</h3>
                <p className="text-sm text-gray-600">Nome e referência visual do local</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Nome do Local *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Almoxarifado, Sala de Medicamentos"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-500">Local onde o estoque será armazenado</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Código (referência visual)</label>
                <div className="flex gap-2">
                  <Input
                    value={displayCode}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    title="Gerar novo código"
                    className="border-gray-300 hover:bg-gray-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Código gerado automaticamente (referência visual)</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: CONFIGURAÇÕES */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">⚙️</span>
              <div>
                <h3 className="font-semibold text-gray-900">Configurações</h3>
                <p className="text-sm text-gray-600">Opções do local de estoque</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer">
                <input
                  id="is_default"
                  type="checkbox"
                  checked={formData.is_default || false}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 rounded border border-gray-300 cursor-pointer accent-amber-600"
                />
                <label htmlFor="is_default" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900">Marcar como local padrão</div>
                  <p className="text-xs text-gray-600">Este será o local selecionado por padrão em novos registros</p>
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* FOOTER */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg -mx-6 -mb-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-300 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            onClick={handleSubmit}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {initialData ? 'Salvar Alterações' : 'Criar Local'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
