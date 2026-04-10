import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, X } from 'lucide-react';

// Tipos de documentos que podem ser anexados
const DOCUMENT_TYPES = [
  { id: 'sanitary', label: 'Vigilância Sanitária', requiresExpiry: true },
  { id: 'fire', label: 'Bombeiro', requiresExpiry: true },
  { id: 'permit', label: 'Alvará', requiresExpiry: true },
  { id: 'cnpj_card', label: 'Cartão CNPJ', requiresExpiry: false },
  { id: 'social_contract', label: 'Contrato Social', requiresExpiry: false },
  { id: 'invoice', label: 'Nota Fiscal', requiresExpiry: false },
  { id: 'contract', label: 'Contrato', requiresExpiry: false },
  { id: 'certificate', label: 'Certificado', requiresExpiry: false },
  { id: 'insurance', label: 'Seguro', requiresExpiry: false },
  { id: 'other', label: 'Outro', requiresExpiry: false }
];

export default function StockSupplierDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData = null
}) {
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    contact_name: '',
    email: '',
    phone: '',
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    postal_code: '',
    notes: '',
    documents: []
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        tax_id: initialData.tax_id || '',
        contact_name: initialData.contact_name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        street: initialData.street || '',
        neighborhood: initialData.neighborhood || '',
        city: initialData.city || '',
        state: initialData.state || '',
        postal_code: initialData.postal_code || '',
        notes: initialData.notes || '',
        documents: initialData.documents || []
      });
    } else {
      setFormData({
        name: '',
        tax_id: '',
        contact_name: '',
        email: '',
        phone: '',
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        postal_code: '',
        notes: '',
        documents: []
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    // Persiste apenas metadados dos documentos (tipo, nome do arquivo, validade)
    const docMeta = (formData.documents || []).map(d => ({
      type: d.type,
      fileName: d.fileName || '',
      expiryDate: d.expiryDate || null,
    }));
    const normalizeCep = (value) => {
      const digits = (value || '').replace(/\D/g, '');
      return digits.length === 8 ? digits : null;
    };
    const normalizeState = (value) => {
      const v = (value || '').trim().toUpperCase();
      return v.length === 2 ? v : null;
    };
    onSubmit({ 
      ...formData, 
      postal_code: normalizeCep(formData.postal_code),
      state: normalizeState(formData.state),
      documents: docMeta 
    });
  };

  const handleAddDocument = () => {
    setFormData({
      ...formData,
      documents: [...formData.documents, { id: Date.now(), type: 'sanitary', file: null, fileName: '', expiryDate: '' }]
    });
  };

  const handleRemoveDocument = (docId) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter(doc => doc.id !== docId)
    });
  };

  const handleDocumentChange = (docId, field, value) => {
    setFormData({
      ...formData,
      documents: formData.documents.map(doc =>
        doc.id === docId ? { ...doc, [field]: value } : doc
      )
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white p-6 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏢</span>
            <div>
              <h2 className="text-lg font-bold">{initialData ? '✏️ Editar Fornecedor' : '➕ Novo Fornecedor'}</h2>
              <p className="text-orange-100 text-sm">Gerencie informações e documentos do fornecedor</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-orange-700 rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form id="supplier-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-5">
          {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Informações Básicas</h3>
                <p className="text-sm text-gray-500">Dados principais do fornecedor</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Nome/Razão Social <span className="text-red-600 font-bold">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do fornecedor"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Razão social ou nome comercial</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">CNPJ/CPF</label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-2">Identificação fiscal</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">E-mail</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="fornecedor@exemplo.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Email principal</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: CONTATO */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
            <div className="flex items-center gap-3 border-b pb-4">
              <span className="text-2xl">👤</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Contato</h3>
                <p className="text-sm text-gray-500">Pessoa responsável</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Nome do Contato</label>
                      <Input
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        placeholder="Nome da pessoa de contato"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">Responsável principal</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Telefone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">Telefone de contato</p>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 3: ENDEREÇO */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <span className="text-2xl">📍</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Endereço</h3>
                      <p className="text-sm text-gray-500">Localização do fornecedor</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Rua <span className="text-red-600 font-bold">*</span></label>
                    <Input
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Nome da rua"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2">Endereço completo</p>
                  </div>

                  <div className="grid grid-cols-4 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Bairro</label>
                      <Input
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="Bairro"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">CEP</label>
                      <Input
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        placeholder="00000-000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Cidade</label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Cidade"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">UF</label>
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="UF"
                        maxLength={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 4: DOCUMENTOS */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 mb-5">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📎</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Documentos Anexados</h3>
                        <p className="text-sm text-gray-500">Certificados e comprovantes</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddDocument}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Doc
                    </Button>
                  </div>

                  {formData.documents && formData.documents.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {formData.documents.map((doc) => {
                        const docType = DOCUMENT_TYPES.find(dt => dt.id === doc.type);
                        const requiresExpiry = docType?.requiresExpiry || false;
                        return (
                          <div key={doc.id} className="flex flex-col gap-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                            <div className="flex gap-3 items-end">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-900 mb-2">Tipo</label>
                                <select
                                  value={doc.type}
                                  onChange={(e) => handleDocumentChange(doc.id, 'type', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  {DOCUMENT_TYPES.map(dt => (
                                    <option key={dt.id} value={dt.id}>{dt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-900 mb-2">Arquivo</label>
                                <Input
                                  type="file"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    handleDocumentChange(doc.id, 'file', file);
                                    handleDocumentChange(doc.id, 'fileName', file?.name || '');
                                  }}
                                  className="text-xs"
                                />
                              </div>
                              {requiresExpiry && (
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-900 mb-2">Validade</label>
                                  <Input
                                    type="date"
                                    value={doc.expiryDate || ''}
                                    onChange={(e) => handleDocumentChange(doc.id, 'expiryDate', e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveDocument(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                      <p className="text-sm text-gray-500">Nenhum documento anexado</p>
                      <p className="text-xs text-gray-400 mt-1">Clique em "Adicionar Doc" para anexar certificados</p>
                    </div>
                  )}
                </div>

                {/* SEÇÃO 5: OBSERVAÇÕES */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Observações</h3>
                      <p className="text-sm text-gray-500">Informações adicionais</p>
                    </div>
                  </div>

                  <div>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Informações complementares sobre o fornecedor..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">Condições especiais, histórico, preferências</p>
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
            form="supplier-form"
            type="submit"
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {initialData ? '✓ Salvar' : '✓ Criar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
