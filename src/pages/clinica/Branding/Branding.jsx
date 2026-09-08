import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Branding({
  name,
  setName,
  brandName,
  setBrandName,
  primaryColor,
  setPrimaryColor,
  secondaryColor,
  setSecondaryColor,
  logoUrl,
  setLogoUrl,
  disabled,
  saving,
  onSave,
}) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(logoUrl);

  const handleLogoUpload = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 5MB.',
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Formato inválido',
          description: 'Por favor, selecione apenas arquivos de imagem.',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setLogoPreview(imageUrl);
        setLogoUrl(imageUrl);

        // Salvar no localStorage
        const logoData = {
          logo_url: imageUrl,
          logo_file_name: file.name,
          logo_file_type: file.type,
          logo_file_size: file.size,
          created_at: new Date().toISOString(),
        };

        localStorage.setItem('gesclinic_logo', JSON.stringify(logoData));

        toast({
          title: 'Logo carregada!',
          description: `${file.name} foi carregada com sucesso.`,
        });
      };

      reader.readAsDataURL(file);
    },
    [setLogoUrl, toast],
  );

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Seção Logo da Clínica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Logo da Clínica</CardTitle>
          <p className="text-sm text-gray-600">Faça upload do logo oficial da sua clínica</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Preview da logo"
                  className="w-32 h-32 object-contain border-2 border-gray-200 rounded-lg bg-gray-50"
                />
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
            )}

            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                Escolher arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                Recomendado: 512x512 px (quadrado). PNG com fundo transparente. Máximo 5MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Informações de Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Empresa</CardTitle>
          <p className="text-sm text-gray-600">Configure os dados básicos da sua clínica</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome oficial de empresa</Label>
              <Input
                id="name"
                placeholder="Clínica Demo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 mt-1">Razão social ou nome completo registrado</p>
            </div>
            <div>
              <Label htmlFor="brandName">Nome fantasia (opcional)</Label>
              <Input
                id="brandName"
                placeholder="Clínica Demo"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 mt-1">Nome comercial da marca utilizado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Identidade Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual</CardTitle>
          <p className="text-sm text-gray-600">Personalize as cores da interface da sua clínica</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={disabled}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={disabled}
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Cor principal dos botões e elementos de destaque
              </p>
            </div>
            <div>
              <Label>Cor Secundária</Label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={disabled}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={disabled}
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Cor de apoio e elementos complementares</p>
            </div>
          </div>

          <div className="mt-6">
            <Label>Visualização das cores</Label>
            <div className="flex items-center gap-3 mt-2">
              <div
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: primaryColor }}
                title="Primária"
              />
              <span className="text-sm font-medium">Primária</span>
              <div
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: secondaryColor }}
                title="Secundária"
              />
              <span className="text-sm font-medium">Secundária</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Painel de Teste Simples */}
      <div className="p-4 border-2 border-yellow-300 rounded-lg bg-yellow-50 mt-6">
        <h3 className="text-lg font-bold text-yellow-800 mb-4">🧪 Painel de Teste</h3>
        <div className="space-y-3">
          <button
            className="w-full p-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
            onClick={() => alert('Sistema funcionando!')}
          >
            📊 TESTAR SISTEMA
          </button>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end pt-4">
        <Button size="lg" disabled={disabled} onClick={onSave}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Salvar Alterações
        </Button>
      </div>
    </motion.div>
  );
}
