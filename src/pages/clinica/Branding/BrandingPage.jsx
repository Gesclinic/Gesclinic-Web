import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Loader2, Palette, Building2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BrandingConfig() {
  const { toast } = useToast();

  // Estados locais para gerenciar os dados
  const [logoDataUrl, setLogoDataUrl] = useState(() => localStorage.getItem('clinicLogo') || '');
  const [clinicName, setClinicName] = useState(
    () => localStorage.getItem('clinicName') || 'Sua Clínica',
  );
  const [brandName, setBrandName] = useState(() => localStorage.getItem('brandName') || '');
  const [primaryColor, setPrimaryColor] = useState(
    () => localStorage.getItem('primaryColor') || '#3B82F6',
  );
  const [secondaryColor, setSecondaryColor] = useState(
    () => localStorage.getItem('secondaryColor') || '#10B981',
  );
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Função para atualizar logo no header - FORÇANDO ATUALIZAÇÃO DIRETA NO DOM
  const updateHeaderLogo = useCallback((logoUrl, name) => {
    console.log('🔄 Forçando atualização direta do header...', {
      logoUrl: logoUrl ? 'presente' : 'ausente',
      name,
    });

    // Aguardar um pequeno delay para garantir que o DOM esteja pronto
    setTimeout(() => {
      // Atualizar logo no header
      const headerLogo = document.querySelector('[data-clinic-logo]');
      console.log('🎯 Header logo element encontrado:', !!headerLogo);
      if (headerLogo && logoUrl) {
        headerLogo.src = logoUrl;
        headerLogo.style.display = 'block';
        console.log('✅ Logo atualizada diretamente no DOM');
      }

      // Atualizar nome da clínica no header
      const headerName = document.querySelector('[data-clinic-name]');
      console.log('🎯 Header name element encontrado:', !!headerName);
      if (headerName && name) {
        headerName.textContent = name;
        console.log('✅ Nome atualizado diretamente no DOM para:', name);
      }

      // Tentar também por outros seletores
      const allNameElements = document.querySelectorAll('p');
      allNameElements.forEach((el) => {
        if (
          el.textContent.includes('Carregando') ||
          el.textContent.includes('Gesclinic') ||
          el.dataset.clinicName !== undefined
        ) {
          console.log('🔍 Elemento encontrado:', el.textContent);
          el.textContent = name;
        }
      });
    }, 100);
  }, []);

  const handleLogoUpload = useCallback(
    async (event) => {
      console.log('📁 Upload iniciado...', event.target.files);
      const file = event.target.files[0];
      if (!file) {
        console.log('❌ Nenhum arquivo selecionado');
        return;
      }
      console.log('✅ Arquivo selecionado:', file.name, file.type, file.size);

      // Validar tipo e tamanho do arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro no upload',
          description: 'Por favor, selecione apenas arquivos de imagem.',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 5MB.',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target.result;
          setLogoDataUrl(result);

          // Salvar no localStorage
          localStorage.setItem('clinicLogo', result);
          console.log('💾 Logo salva no localStorage');

          // Atualizar header
          updateHeaderLogo(result, clinicName);

          // Disparar evento personalizado
          window.dispatchEvent(
            new CustomEvent('clinicDataUpdated', {
              detail: { name: clinicName, logo: result },
            }),
          );

          toast({
            title: 'Logo enviada com sucesso',
            description: 'Sua logo foi atualizada!',
          });

          setLoading(false);
        };

        reader.onerror = () => {
          toast({
            title: 'Erro no upload',
            description: 'Ocorreu um erro ao processar a imagem.',
            variant: 'destructive',
          });
          setLoading(false);
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Erro no upload:', error);
        toast({
          title: 'Erro no upload',
          description: 'Falha ao enviar a imagem.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    },
    [clinicName, updateHeaderLogo, toast],
  );

  const handleNameChange = useCallback(
    (newName) => {
      console.log('📝 Nome alterado para:', newName);
      setClinicName(newName);

      // Salvar no formato que o Header espera
      const clinicData = {
        name: newName,
        brand_name: newName,
      };
      localStorage.setItem('gesclinic_clinic_data', JSON.stringify(clinicData));
      localStorage.setItem('clinicName', newName);
      console.log('💾 Nome salvo no localStorage');

      // Forçar atualização do header
      updateHeaderLogo(logoDataUrl, newName);

      // Disparar evento personalizado para o Header escutar
      window.dispatchEvent(
        new CustomEvent('clinicDataUpdated', {
          detail: { name: newName, logo: logoDataUrl },
        }),
      );
    },
    [logoDataUrl, updateHeaderLogo],
  );

  const handleSave = useCallback(() => {
    // Salvar todas as configurações
    localStorage.setItem('clinicName', clinicName);
    localStorage.setItem('brandName', brandName);
    localStorage.setItem('primaryColor', primaryColor);
    localStorage.setItem('secondaryColor', secondaryColor);

    toast({
      title: 'Configurações salvas',
      description: 'Todas as configurações foram salvas com sucesso!',
    });
  }, [clinicName, brandName, primaryColor, secondaryColor, toast]);

  // Função de teste
  const handleTest = useCallback(() => {
    console.log('🧪 Teste iniciado');
    toast({
      title: 'Teste de Toast',
      description: 'Se você vê isso, o toast está funcionando!',
    });

    // Testar atualização do header
    updateHeaderLogo(logoDataUrl, clinicName);
  }, [toast, updateHeaderLogo, logoDataUrl, clinicName]);

  // Função para forçar atualização do header
  const handleForceUpdate = useCallback(() => {
    console.log('💪 Forçando atualização do header com dados atuais');
    console.log('📊 Dados atuais:', {
      clinicName,
      logoDataUrl: logoDataUrl ? 'presente' : 'ausente',
    });

    // Teste direto de atualização do DOM
    console.log('🔍 Procurando elementos no DOM...');

    // Listar todos os elementos com texto para debug
    const allTextElements = document.querySelectorAll('p, span, div, h1, h2, h3');
    console.log('📝 Elementos de texto encontrados:', allTextElements.length);

    allTextElements.forEach((el, index) => {
      if (
        el.textContent &&
        (el.textContent.includes('Carregando') ||
          el.textContent.includes('Gesclinic') ||
          el.hasAttribute('data-clinic-name'))
      ) {
        console.log(`🎯 Elemento ${index}:`, el.textContent, el.tagName, el.className);
        el.textContent = clinicName;
        el.style.color = 'red'; // Para facilitar identificação
      }
    });

    updateHeaderLogo(logoDataUrl, clinicName);
  }, [updateHeaderLogo, logoDataUrl, clinicName]);

  // Efeito para forçar atualização do header quando a página carrega
  useEffect(() => {
    console.log('🚀 Página de branding carregada - forçando atualização do header');

    // Adicionar função global para teste no console
    window.testUpdateHeader = (name = clinicName) => {
      console.log('🧪 Teste manual do header com nome:', name);
      const headerElement = document.querySelector('[data-clinic-name]');
      if (headerElement) {
        headerElement.textContent = name;
        headerElement.style.backgroundColor = 'yellow';
        console.log('✅ Header atualizado com sucesso!');
      } else {
        console.log('❌ Elemento [data-clinic-name] não encontrado');
        console.log('🔍 Elementos disponíveis:', document.querySelectorAll('p'));
      }
    };

    setTimeout(() => {
      updateHeaderLogo(logoDataUrl, clinicName);
    }, 500);
  }, [updateHeaderLogo, logoDataUrl, clinicName]);

  return (
    <div className="container mx-auto p-6 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuração de Marca</h1>
        <p className="text-gray-600">Personalize a identidade visual da sua clínica</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload de Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Logo da Clínica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview da Logo */}
            {logoDataUrl && (
              <div className="flex justify-center">
                <img
                  src={logoDataUrl}
                  alt="Logo da clínica"
                  className="max-h-32 max-w-full object-contain rounded-lg border"
                />
              </div>
            )}

            {/* Botão de Upload */}
            <div className="flex flex-col items-center gap-4">
              <Button
                type="button"
                onClick={() => {
                  console.log('🔘 Clicando no botão de upload...');
                  fileInputRef.current?.click();
                }}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {logoDataUrl ? 'Alterar Logo' : 'Enviar Logo'}
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Informações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clinicName">Nome da Clínica</Label>
              <Input
                id="clinicName"
                value={clinicName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Digite o nome da sua clínica"
              />
            </div>

            <div>
              <Label htmlFor="brandName">Nome da Marca</Label>
              <Input
                id="brandName"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Nome comercial (opcional)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cores da Marca */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cores da Marca</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondaryColor">Cor Secundária</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botões */}
      <div className="mt-8 flex justify-end gap-4">
        <Button onClick={handleTest} variant="outline" className="px-6">
          🧪 Testar Toast
        </Button>
        <Button onClick={handleForceUpdate} variant="outline" className="px-6">
          💪 Forçar Atualização
        </Button>
        <Button onClick={handleSave} className="px-8">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
