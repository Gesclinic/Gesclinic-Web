import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';

const EMOJI_OPTIONS = ['📦', '💊', '🩺', '🧬', '🏥', '🧪', '🔬', '⚕️', '🚑', '💉', '🩹', '🧴', '🧼', '🧻', '👩‍⚕️', '🏨', '🛏️', '📋', '🗂️'];
const COLOR_OPTIONS = [
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Verde', value: '#10b981' },
  { label: 'Amarelo', value: '#f59e0b' },
  { label: 'Roxo', value: '#a855f7' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Ciano', value: '#06b6d4' },
  { label: 'Cinza', value: '#6b7280' },
];

export default function CategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  entityName = 'Categoria'
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    emoji: '📦',
    color: '#3b82f6',
    is_active: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        description: initialData.description || '',
        code: initialData.code || '',
        emoji: initialData.emoji || '📦',
        color: initialData.color || '#3b82f6',
        is_active: initialData.is_active !== false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        emoji: '📦',
        color: '#3b82f6',
        is_active: true
      });
    }
  }, [initialData, open]);

  // Auto-gerar code a partir do name
  useEffect(() => {
    if (!initialData && formData.name) {
      const code = formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      setFormData(prev => ({ ...prev, code }));
    }
  }, [formData.name, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
      description: formData.description?.trim() || null,
      code: formData.code?.trim() || null,
    };

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏷️</span>
            <div>
              <h2 className="text-lg font-bold">{initialData ? '✏️ Editar Categoria' : '➕ Nova Categoria'}</h2>
              <p className="text-blue-100 text-sm">Configure os dados da categoria de estoque</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-blue-700 rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form id="category-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5">
          {/* SEÇÃO 1: IDENTIDADE */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📂</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Identidade da Categoria</h3>
                <p className="text-sm text-gray-500">Nome, código e descrição</p>
              </div>
            </div>

            {/* Nome - Full Width */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Nome <span className="text-red-600 font-bold">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Medicamentos, Suprimentos, Equipamentos"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">Nome único e descritivo</p>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Descrição/Propósito
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Medicamentos genéricos e de marca para uso interno..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">Propósito e produtos incluídos</p>
            </div>

            {/* Código - Auto-gerado */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Código (Slug)
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="medicamentos"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">Código único (auto-gerado)</p>
            </div>
          </div>

          {/* SEÇÃO 2: VISUAL */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">🎨</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Visual</h3>
                <p className="text-sm text-gray-500">Ícone e cor para identificação</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Emoji */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Ícone/Emoji</label>
                <div className="grid grid-cols-5 gap-2 border border-gray-200 rounded-lg p-3">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={`text-2xl p-2 rounded transition-all ${
                        formData.emoji === emoji
                          ? 'bg-blue-500 scale-110'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Selecione um ícone</p>
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Cor da Categoria</label>
                <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: option.value })}
                      className={`w-full flex items-center gap-3 p-2 rounded transition-all ${
                        formData.color === option.value
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: option.value }}
                      />
                      <span className="text-sm font-medium text-gray-700">{option.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Cor para identificação visual</p>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center gap-3 justify-center">
              <span style={{ fontSize: '32px' }}>{formData.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{formData.name || 'Categoria'}</p>
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: formData.color }}
                >
                  Preview
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: STATUS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Status</h3>
                <p className="text-sm text-gray-500">Ativar ou desativar categoria</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <div className="flex-1">
                <label htmlFor="is_active" className="text-sm font-semibold text-gray-900 cursor-pointer block">
                  {formData.is_active ? '🟢 Categoria Ativa' : '⚪ Categoria Inativa'}
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  {formData.is_active
                    ? 'Categoria disponível para seleção'
                    : 'Categoria indisponível - não aparecerá em seleções'}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${formData.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-300 text-gray-800'}`}>
                {formData.is_active ? 'ATIVA' : 'INATIVA'}
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2"
          >
            ✕ Cancelar
          </Button>
          <Button
            form="category-form"
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {initialData ? '✓ Salvar' : '✓ Criar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
