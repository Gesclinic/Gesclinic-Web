import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import CategorySelect from '@/components/clinica/estoque/CategorySelect';
import { Package, X } from 'lucide-react';

export default function StockItemDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  clinicId = null,
}) {
  const genSku = (name) => {
    const base = (name || 'PROD')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 8);
    const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
    return `${base || 'PROD'}-${rand}`;
  };

  const [formData, setFormData] = useState({
    // Identidade
    name: '',
    sku: '',
    category_id: '',
    // Operacional
    unit_type: '',
    cost_price: '',
    storage_type: 'Ambiente',
    brand: '',
    // Regulatório
    anvisa_registration: '',
    warnings: '',
    barcode: '',
    // Fornecimento
    supplier_id: '',
    units_per_package: '',
    // Descrição
    description: '',
    // Estoque
    min_stock: '',
    max_stock: '',
    // Status
    is_active: true,
  });

  const [skuEdited, setSkuEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        sku: initialData.sku || '',
        category_id: initialData.category_id || '',
        unit_type: initialData.unit_type || '',
        cost_price:
          initialData.cost_price !== null && initialData.cost_price !== undefined
            ? initialData.cost_price
            : '',
        storage_type: initialData.storage_type || 'Ambiente',
        brand: initialData.brand || '',
        anvisa_registration: initialData.anvisa_registration || '',
        warnings: initialData.warnings || '',
        barcode: initialData.barcode || '',
        supplier_id: initialData.supplier_id || '',
        units_per_package:
          initialData.units_per_package !== null && initialData.units_per_package !== undefined
            ? initialData.units_per_package
            : '',
        description: initialData.description || '',
        min_stock:
          initialData.min_stock !== null && initialData.min_stock !== undefined
            ? initialData.min_stock
            : '',
        max_stock:
          initialData.max_stock !== null && initialData.max_stock !== undefined
            ? initialData.max_stock
            : '',
        is_active: initialData.is_active !== false,
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        category_id: '',
        unit_type: '',
        cost_price: '',
        storage_type: 'Ambiente',
        brand: '',
        anvisa_registration: '',
        warnings: '',
        barcode: '',
        supplier_id: '',
        units_per_package: '',
        description: '',
        min_stock: '',
        max_stock: '',
        is_active: true,
      });
      setSkuEdited(false);
    }
  }, [initialData, open]);

  // Auto-gerar SKU ao digitar nome quando criando novo item e SKU não foi editado manualmente
  useEffect(() => {
    if (!initialData && !skuEdited) {
      setFormData((prev) => ({ ...prev, sku: genSku(prev.name) }));
    }
  }, [formData.name, initialData, skuEdited]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }

    const payload = {
      ...formData,
      // Normalizar valores vazios
      description: formData.description?.trim() || null,
      category_id: formData.category_id || null,
      unit_type: formData.unit_type || null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      brand: formData.brand?.trim() || null,
      anvisa_registration: formData.anvisa_registration?.trim() || null,
      warnings: formData.warnings?.trim() || null,
      barcode: formData.barcode?.trim() || null,
      supplier_id: formData.supplier_id || null,
      units_per_package: formData.units_per_package ? parseInt(formData.units_per_package) : null,
      min_stock: formData.min_stock ? parseInt(formData.min_stock) : 0,
      max_stock: formData.max_stock ? parseInt(formData.max_stock) : null,
    };

    if (!payload.sku || !payload.sku.trim()) {
      payload.sku = genSku(payload.name);
    }

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📦</span>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? '✏️ Editar Produto' : '➕ Novo Produto'}
              </h2>
              <p className="text-blue-100 text-sm">Nome, código, categoria e marca</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-blue-700 rounded transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <form
          id="product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5"
        >
          {/* SEÇÃO 1: IDENTIDADE DO PRODUTO */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Identidade do Produto</h3>
                <p className="text-sm text-gray-500">Nome, código, categoria e marca</p>
              </div>
            </div>

            {/* Nome - Full Width */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Nome do Produto <span className="text-red-600 font-bold">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Seringas 10ml estéril, Ataduras, Termômetro digital"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">Nome único e descritivo do produto</p>
            </div>

            {/* Código, Categoria e Marca - 3 Colunas */}
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Código (SKU)
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) => {
                    setFormData({ ...formData, sku: e.target.value });
                    setSkuEdited(true);
                  }}
                  placeholder="PROD-12AB"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Código único e auto-gerado</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Categoria</label>
                <CategorySelect
                  clinicId={clinicId}
                  value={formData.category_id}
                  onChange={(val) => setFormData({ ...formData, category_id: val })}
                />
                <p className="text-xs text-gray-500 mt-2">Tipo do produto</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Marca/Fabricante
                </label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Ex: Johnson, Cristália"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Fabricante do produto</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: OPERACIONAL */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">⚕️</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Operacional</h3>
                <p className="text-sm text-gray-500">Unidade, preço e condições de armazenagem</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Unidade de Medida
                </label>
                <select
                  value={formData.unit_type}
                  onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="">Selecione...</option>
                  <option value="Unidade">Unidade</option>
                  <option value="Caixa">Caixa</option>
                  <option value="Frasco">Frasco</option>
                  <option value="Par">Par</option>
                  <option value="Pacote">Pacote</option>
                  <option value="Cento">Cento</option>
                  <option value="Litro">Litro</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Como o produto é comprado</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Preço de Custo
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-sm">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="25.50"
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Custo unitário de compra</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Armazenagem
                </label>
                <select
                  value={formData.storage_type}
                  onChange={(e) => setFormData({ ...formData, storage_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="Ambiente">🌡️ Ambiente (15-25°C)</option>
                  <option value="Refrigerado">❄️ Refrigerado (4-8°C)</option>
                  <option value="Congelado">🧊 Congelado (-18°C)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Condição de armazenagem</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: REGULATÓRIO */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">🏥</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Regulatório & Rastreabilidade</h3>
                <p className="text-sm text-gray-500">
                  Registro, código de barras e avisos críticos
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Registro ANVISA
                </label>
                <Input
                  value={formData.anvisa_registration}
                  onChange={(e) =>
                    setFormData({ ...formData, anvisa_registration: e.target.value })
                  }
                  placeholder="Ex: 10012345-6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Para medicamentos e dispositivos médicos
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Código de Barras (EAN)
                </label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Ex: 7894900123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Para identificação e rastreabilidade</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Avisos Críticos
              </label>
              <Textarea
                value={formData.warnings}
                onChange={(e) => setFormData({ ...formData, warnings: e.target.value })}
                placeholder="Ex: ⚠️ Requer Receita | 🔒 Controlado | ☠️ Tóxico | 🚫 COM"
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Alertas obrigatórios: Receita, Controlado, Tóxico, COM
              </p>
            </div>
          </div>

          {/* SEÇÃO 4: FORNECIMENTO */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Fornecimento</h3>
                <p className="text-sm text-gray-500">Fornecedor e embalagem</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Fornecedor Padrão
                </label>
                <Input
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  placeholder="ID ou nome do fornecedor"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Principal fornecedor deste produto</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Unidades por Embalagem
                </label>
                <Input
                  type="number"
                  value={formData.units_per_package}
                  onChange={(e) => setFormData({ ...formData, units_per_package: e.target.value })}
                  placeholder="Ex: 100"
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Quantidade de unidades por caixa</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: DESCRIÇÃO TÉCNICA */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📝</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Descrição Técnica</h3>
                <p className="text-sm text-gray-500">Especificações e características</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Descrição Detalhada
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Seringa de 10ml estéril, com agulha 25x0,7mm, uso único, esterilizada por óxido de etileno, pronta para uso..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Especificações técnicas, compatibilidades e indicações
              </p>
            </div>
          </div>

          {/* SEÇÃO 6: CONTROLE DE ESTOQUE */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Controle de Estoque</h3>
                <p className="text-sm text-gray-500">Níveis mínimo e máximo</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Estoque Mínimo
                </label>
                <Input
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  placeholder="Ex: 10"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Gatilho para reposição automática</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Estoque Máximo
                </label>
                <Input
                  type="number"
                  value={formData.max_stock}
                  onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                  placeholder="Ex: 500"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Limite máximo de armazenagem</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 7: STATUS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Status do Produto</h3>
                <p className="text-sm text-gray-500">Ativar ou desativar</p>
              </div>
            </div>

            {/* Card de Status */}
            <div className="flex items-center space-x-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <div className="flex-1">
                <label
                  htmlFor="is_active"
                  className="text-sm font-semibold text-gray-900 cursor-pointer block"
                >
                  {formData.is_active ? '🟢 Produto Ativo' : '⚪ Produto Inativo'}
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  {formData.is_active
                    ? 'Produto disponível para uso e seleção em pedidos'
                    : 'Produto indisponível - não aparecerá em seleções'}
                </p>
              </div>
              <span
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${formData.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-300 text-gray-800'}`}
              >
                {formData.is_active ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>
          </div>
        </form>

        {/* FOOTER */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-gray-300 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            form="product-form"
            type="submit"
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {initialData ? '✓ Salvar' : '✓ Criar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
