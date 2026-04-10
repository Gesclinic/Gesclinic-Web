import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { useClinic } from "@/contexts/useClinicContext";
import { forceHeaderUpdate, startHeaderMonitoring, updateClinicLogoOnly } from "@/utils/headerUpdater";

const LOGO_RULES = {
  recommended: "512x512 px (quadrado), PNG com fundo transparente",
  min: 128,
  maxMB: 5,
};

async function getImageSize(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    return { w: img.width, h: img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Função global para atualizar APENAS logo da clínica no header
function updateHeaderLogo(logoUrl) {
  console.log("🎯 Atualizando APENAS logo da clínica no header...");
  
  // Seletores ESPECÍFICOS para a logo da clínica (lado direito)
  const clinicLogoSelectors = [
    'img[alt="Logo da Clínica"]',
    'header .bg-white\\/10 img',
    'header [class*="backdrop-blur"] img',
    '.relative img[alt="Logo da Clínica"]'
  ];

  let updatedCount = 0;
  
  clinicLogoSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(img => {
      if (img && img.tagName === 'IMG' && img.alt === 'Logo da Clínica') {
        const oldSrc = img.src;
        img.src = logoUrl;
        updatedCount++;
        console.log(`✅ Logo da CLÍNICA atualizado: ${selector}`, {
          element: img,
          oldSrc: oldSrc.substring(0, 30) + '...',
          newSrc: logoUrl.substring(0, 30) + '...'
        });
      }
    });
  });

  console.log(`🎉 Total de ${updatedCount} logos DA CLÍNICA atualizadas (Gesclinic permanece inalterada)`);
  return updatedCount;
}

export default function Branding() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updateClinicDirectly } = useClinic();
  
  // Simular admin para desenvolvimento
  const isAdmin = true;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [primaryColor, setPrimaryColor] = useState("#1A5B8A");
  const [secondaryColor, setSecondaryColor] = useState("#5DB053");

  const buildPreview = useCallback((pathOrUrl) => {
    if (!pathOrUrl) {
      setLogoPreview(null);
      return;
    }
    
    // Usar URL direto se for blob ou http
    if (pathOrUrl.startsWith('blob:') || pathOrUrl.startsWith('http')) {
      setLogoPreview(pathOrUrl);
    } else {
      setLogoPreview(null);
    }
  }, []);

  const loadClinicProfile = useCallback(async () => {
    console.log("🔄 Carregando dados da clínica");
    setLoading(true);
    
    try {
      // Tentar carregar dados salvos
      const savedData = localStorage.getItem('gesclinic_clinic_data');
      const savedLogo = localStorage.getItem('gesclinic_logo');
      
      let data = {
        name: "Clínica Demo",
        brand_name: "Clínica Demo", 
        logo_url: null,
        primary_color: "#1A5B8A",
        secondary_color: "#5DB053"
      };

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          data = { ...data, ...parsed };
          console.log("📦 Dados recuperados do localStorage:", data);
        } catch (e) {
          console.warn("⚠️ Erro ao recuperar dados salvos");
        }
      }

      if (savedLogo) {
        try {
          const logoData = JSON.parse(savedLogo);
          data.logo_url = logoData.logo_url;
          console.log("🎨 Logo recuperado:", {
            fileName: logoData.logo_file_name,
            fileType: logoData.logo_file_type,
            fileSize: logoData.logo_file_size,
            dimensions: logoData.logo_dimensions,
            updatedAt: logoData.logo_updated_at,
            dataLength: logoData.logo_url ? logoData.logo_url.length : 0
          });

          // Atualizar header imediatamente se temos logo salvo
          if (logoData.logo_url) {
            setTimeout(() => updateHeaderLogo(logoData.logo_url), 100);
          }
        } catch (e) {
          console.warn("⚠️ Erro ao recuperar logo salvo:", e);
        }
      } else {
        console.log("ℹ️ Nenhum logo salvo encontrado");
      }

      // Atualizar estados
      setName(data.name || "");
      setBrandName(data.brand_name || "");
      setLogoUrl(data.logo_url || null);
      setPrimaryColor(data.primary_color || "#1A5B8A");
      setSecondaryColor(data.secondary_color || "#5DB053");

      // Atualizar preview do logo
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
        console.log("🎨 Preview do logo definido");
      }

      console.log("✅ Estados atualizados com sucesso");

    } catch (error) {
      console.error("❌ Erro inesperado:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClinicProfile();
    
    // Iniciar monitoramento do header
    const observer = startHeaderMonitoring();
    
    return () => {
      if (observer) observer.disconnect();
    };
  }, [loadClinicProfile]);

  async function onUploadLogo(e) {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("❌ Nenhum arquivo selecionado");
      return;
    }
    
    console.log("🔍 Upload iniciado:", {
      name: file.name,
      size: file.size,
      type: file.type
    });
    setSaving(true);
    
    try {
      // Validar tamanho
      if (file.size > LOGO_RULES.maxMB * 1024 * 1024) {
        throw new Error(`Arquivo muito grande. Máximo: ${LOGO_RULES.maxMB}MB`);
      }

      // Validar dimensões
      const { w, h } = await getImageSize(file);
      console.log("📐 Dimensões da imagem:", { width: w, height: h });
      
      if (Math.min(w, h) < LOGO_RULES.min) {
        throw new Error(`Imagem muito pequena. Mínimo: ${LOGO_RULES.min}x${LOGO_RULES.min}px`);
      }

      // Converter arquivo para base64 para persistência real
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      
      console.log("🔄 Arquivo convertido para base64, tamanho:", base64.length);

      // Criar preview imediato
      const previewUrl = URL.createObjectURL(file);
      console.log("📸 Preview criado:", previewUrl);
      
      // Atualizar estados imediatamente
      setLogoUrl(base64);
      setLogoPreview(base64);

      // Salvar dados completos no localStorage
      const logoData = {
        logo_url: base64,
        logo_file_name: file.name,
        logo_file_type: file.type,
        logo_file_size: file.size,
        logo_dimensions: { width: w, height: h },
        logo_updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('gesclinic_logo', JSON.stringify(logoData));
      console.log("💾 Logo salvo no localStorage:", {
        fileName: file.name,
        dataSize: base64.length,
        savedAt: logoData.logo_updated_at
      });

      // Atualizar APENAS a logo da clínica no header (não a da Gesclinic)
      const updatedLogos = updateClinicLogoOnly(base64);
      console.log(`🎨 ${updatedLogos} logos da clínica atualizadas`);

      // Disparar evento para componentes que escutam
      window.dispatchEvent(new CustomEvent('clinicLogoUpdated', {
        detail: { 
          logoUrl: base64,
          fileName: file.name 
        }
      }));

      toast({
        title: "Logo atualizado!",
        description: `${file.name} foi carregado com sucesso.`,
      });

    } catch (err) {
      console.error("❌ Erro no upload:", err);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: err.message,
      });
    } finally {
      setSaving(false);
      // NÃO limpar o input para permitir re-upload do mesmo arquivo se necessário
      // e.target.value = "";
    }
  }



  const onSave = async () => {
    console.log("💾 SALVANDO CONFIGURAÇÕES...");
    console.log("📝 Estados antes de salvar:");
    console.log("   name:", name);
    console.log("   brandName:", brandName);
    console.log("   primaryColor:", primaryColor);
    console.log("   secondaryColor:", secondaryColor);
    
    setSaving(true);
    
    try {
      // Preservar logo_url existente
      const savedLogo = localStorage.getItem('gesclinic_logo');
      let logoUrl = null;
      if (savedLogo) {
        try {
          const logoData = JSON.parse(savedLogo);
          logoUrl = logoData.logo_url;
        } catch (e) {}
      }

      const dataToSave = {
        name: name || "Clínica Demo",
        brand_name: brandName || name || "Clínica Demo",
        primary_color: primaryColor || "#1A5B8A",
        secondary_color: secondaryColor || "#5DB053",
        updated_at: new Date().toISOString()
      };

      // Incluir logo_url se existir
      if (logoUrl) {
        dataToSave.logo_url = logoUrl;
      }

      console.log("💾 Dados que serão salvos (preservando logo):", dataToSave);

      // Salvar no localStorage
      localStorage.setItem('gesclinic_clinic_data', JSON.stringify(dataToSave));
      console.log("💾 Dados salvos no localStorage:", dataToSave);

      // Atualizar contexto diretamente (mais confiável)
      if (updateClinicDirectly) {
        updateClinicDirectly(dataToSave);
      }

      console.log("📡 Contexto atualizado diretamente");

      toast({ 
        title: "Sucesso!", 
        description: "Configurações salvas com sucesso. Os nomes foram atualizados!" 
      });

    } catch (err) {
      console.error("❌ Erro ao salvar:", err);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Falha ao salvar as alterações.",
      });
    } finally {
      setSaving(false);
    }
  };

  const disabled = !isAdmin || saving || loading;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-0 md:p-4 lg:p-6"
    >
      <Helmet>
        <title>Identidade da Clínica - Gesclinic</title>
      </Helmet>

      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/clinica/configuracoes")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-primary">
          Identidade da Clínica
        </h1>
      </div>

      {!isAdmin && (
        <div className="rounded-md bg-amber-50 p-3 text-amber-800 border border-amber-200">
          Você tem acesso de leitura. Somente administradores podem editar.
        </div>
      )}

      {/* Logo Upload Section */}
      <Card className="shadow-lg border-none bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded bg-primary"></div>
            </div>
            Logo da Clínica
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Faça upload do logo oficial da sua clínica
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-muted/50 to-muted overflow-hidden border-2 border-dashed border-muted-foreground/20 flex-shrink-0 group hover:border-primary/50 transition-colors">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo da clínica"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground/50">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-grow space-y-3">
              <Label htmlFor="logo-upload" className="text-sm font-medium">
                Selecionar arquivo
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={onUploadLogo}
                disabled={disabled}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                  📏 Recomendado: {LOGO_RULES.recommended}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                  📦 Máximo: {LOGO_RULES.maxMB}MB
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                  🖼️ PNG/JPG/WEBP
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card className="shadow-lg border-none bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded bg-blue-500"></div>
            </div>
            Informações da Empresa
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure os dados básicos da sua clínica
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome oficial da empresa
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setName(newName);
                  
                  const displayName = brandName || newName;
                  
                  // Usar nova função de força bruta
                  console.log("📝 Forçando atualização do header com:", displayName);
                  const updated = forceHeaderUpdate(displayName);
                  
                  if (updated === 0) {
                    // Se não conseguiu pelo DOM, tentar após um pequeno delay
                    setTimeout(() => {
                      forceHeaderUpdate(displayName);
                    }, 100);
                  }
                }}
                placeholder="Ex.: Clínica Horizonte Ltda"
                disabled={disabled}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Razão social ou nome completo registrado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandName" className="text-sm font-medium">
                Nome fantasia <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="brandName"
                value={brandName}
                onChange={(e) => {
                  const newBrandName = e.target.value;
                  setBrandName(newBrandName);
                  
                  const displayName = newBrandName || name;
                  
                  // Usar nova função de força bruta
                  console.log("📝 Forçando atualização do header com:", displayName);
                  const updated = forceHeaderUpdate(displayName);
                  
                  if (updated === 0) {
                    // Se não conseguiu pelo DOM, tentar após um pequeno delay
                    setTimeout(() => {
                      forceHeaderUpdate(displayName);
                    }, 100);
                  }
                }}
                placeholder="Ex.: Clínica Horizonte"
                disabled={disabled}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Nome comercial ou marca utilizada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card className="shadow-lg border-none bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded bg-purple-500"></div>
            </div>
            Identidade Visual
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Personalize as cores da interface da sua clínica
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="primaryColor" className="text-sm font-medium">
                Cor Primária
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#1A5B8A"
                  disabled={disabled}
                  className="flex-grow h-11"
                />
                <div 
                  className="w-11 h-11 rounded-lg border-2 border-white shadow-md" 
                  style={{ backgroundColor: primaryColor }}
                  title={`Cor primária: ${primaryColor}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cor principal dos botões e elementos de destaque
              </p>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="secondaryColor" className="text-sm font-medium">
                Cor Secundária
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="secondaryColor"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#5DB053"
                  disabled={disabled}
                  className="flex-grow h-11"
                />
                <div 
                  className="w-11 h-11 rounded-lg border-2 border-white shadow-md" 
                  style={{ backgroundColor: secondaryColor }}
                  title={`Cor secundária: ${secondaryColor}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cor de apoio e elementos complementares
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Visualização das cores</h4>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: primaryColor }}
                />
                <span className="text-xs text-muted-foreground">Primária</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: secondaryColor }}
                />
                <span className="text-xs text-muted-foreground">Secundária</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Painel Teste Simples */}
      <div className="p-4 border-2 border-yellow-300 rounded-lg bg-yellow-50 mt-6">
        <h3 className="text-lg font-bold text-yellow-800 mb-4">🧪 Painel de Teste</h3>
        
        <div className="space-y-3">
          <button 
            className="w-full p-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
            onClick={() => alert('Teste funcionando!')}
          >
            📊 TESTAR
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button size="lg" disabled={disabled} onClick={onSave}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Salvar Alterações
        </Button>
      </div>
    </motion.div>
  );
}
                  
                  setLogoUrl(testUrl);
                  setLogoPreview(testUrl);
                  
                  const logoData = {
                    logo_url: testUrl,
                    logo_file_name: 'logo-teste.png',
                    created_at: new Date().toISOString()
                  };
                  
                  localStorage.setItem('gesclinic_logo', JSON.stringify(logoData));
                  console.log('💾 Logo salvo no localStorage:', logoData);
                  
                  // Atualização direta do DOM
                  console.log('🎯 Tentando atualizar logo do cabeçalho diretamente...');
                  
                  // Encontrar imagem do logo no cabeçalho
                  const headerLogo = document.querySelector('header img[alt*="Logo"]');
                  if (headerLogo) {
                    console.log('🖼️ Logo do header encontrado, atualizando src...');
                    headerLogo.src = testUrl;
                    headerLogo.alt = 'Logo da Clínica';
                    
                    // Adicionar indicador visual
                    let indicator = headerLogo.parentElement.querySelector('.logo-indicator');
                    if (!indicator) {
                      indicator = document.createElement('div');
                      indicator.className = 'logo-indicator';
                      indicator.style.cssText = 'position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #22c55e; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);';
                      indicator.title = 'Logo personalizado ativo';
                      headerLogo.parentElement.style.position = 'relative';
                      headerLogo.parentElement.appendChild(indicator);
                    }
                    
                    console.log('✅ Logo do header atualizado com sucesso!');
                  } else {
                    console.warn('❌ Logo do header não encontrado no DOM');
                  }
                  
                  // Também disparar eventos para compatibilidade
                  window.dispatchEvent(new CustomEvent('clinicLogoUpdated', {
                    detail: { logoUrl: testUrl }
                  }));
                  
                  if (window.updateClinicLogo) {
                    window.updateClinicLogo(testUrl);
                  }
                  
                  toast({ 
                    title: "Logo de teste carregado!", 
                    description: "Uma logo foi gerada automaticamente para teste" 
                  });
                });
              }}
            >
              🎨 Gerar Logo de Teste
            </Button>
            
            {/* BOTÃO 3: Recarregar página */}
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-4"
              onClick={() => {
                if (confirm("� Recarregar a página para aplicar as mudanças?")) {
                  window.location.reload();
                }
              }}
            >
              🔄 RECARREGAR PÁGINA
            </Button>

          </div>
          
          {/* Status simples */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700">
              <strong>Status:</strong> {logoPreview ? "Logo carregado ✅" : "Nenhum logo carregado ❌"} | 
              <strong> Dados salvos:</strong> {localStorage.getItem('gesclinic_clinic_data') ? "Sim ✅" : "Não ❌"}
            </p>
          </div>
          
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button size="lg" disabled={disabled} onClick={onSave}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Salvar Alterações
        </Button>
      </div>
    </motion.div>
  );
}
                      clinicLogos.forEach((img, index) => {
                        console.log(`🔄 Atualizando logo ${index + 1}:`, img);
                        img.src = logoData.logo_url;
                      });
                      
                      // Método 3: Evento customizado
                      window.dispatchEvent(new CustomEvent('clinicLogoUpdated', {
                        detail: { logoUrl: logoData.logo_url }
                      }));
                    }
                  } catch (e) {
                    console.error("Erro ao processar logo:", e);
                  }
                }
                
                if (savedData) {
                  try {
                    const data = JSON.parse(savedData);
                    const displayName = data.brand_name || data.name || "Teste FORÇADO";
                    
                    console.log("📝 Tentando função global updateClinicName");
                    if (window.updateClinicName) {
                      window.updateClinicName(displayName);
                    } else {
                      console.log("❌ Função global updateClinicName não existe!");
                    }
                    
                    // DOM BRUTO para nome também
                    console.log("💀 MÉTODO BRUTO: Forçando nome no DOM");
                    const clinicNames = document.querySelectorAll('[data-clinic-name]');
                    clinicNames.forEach((element, index) => {
                      console.log(`🔄 Atualizando nome ${index + 1}:`, element);
                      element.textContent = displayName;
                    });
                    
                  } catch (e) {
                    console.error("Erro ao processar nome:", e);
                  }
                }
                
                // Log de debug
                console.log("🔍 DEBUG: window.updateClinicLogo exists?", !!window.updateClinicLogo);
                console.log("🔍 DEBUG: window.updateClinicName exists?", !!window.updateClinicName);
                console.log("🔍 DEBUG: Logos encontradas:", document.querySelectorAll('[data-clinic-logo]').length);
                console.log("🔍 DEBUG: Nomes encontrados:", document.querySelectorAll('[data-clinic-name]').length);
                
                toast({ 
                  title: "FORÇADO BRUTALMENTE!", 
                  description: "Verificar console para logs detalhados"
                });
              }}
            >
              🔥 FORÇA BRUTA
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-100"
              onClick={() => {
                console.log("🔄 FORÇANDO ATUALIZAÇÃO DOS NOMES...");
                
                const currentData = {
                  name: name,
                  brand_name: brandName,
                  primary_color: primaryColor,
                  secondary_color: secondaryColor,
                  updated_at: new Date().toISOString()
                };

                console.log("📊 Dados atuais na página:", currentData);

                // Salvar no localStorage
                localStorage.setItem('gesclinic_clinic_data', JSON.stringify(currentData));
                
                // Disparar todos os eventos possíveis
                window.dispatchEvent(new CustomEvent('clinicDataUpdated', {
                  detail: currentData
                }));

                // Método global se disponível
                if (window.updateClinicContext) {
                  window.updateClinicContext(currentData);
                }

                // Forçar reload do contexto
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
                
                toast({ 
                  title: "Atualizando nomes!", 
                  description: "Página será recarregada em 1 segundo" 
                });
              }}
            >
              🔄 FORÇAR NOMES
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
              onClick={() => {
                localStorage.removeItem('gesclinic_logo');
                localStorage.removeItem('gesclinic_clinic_data');
                setLogoUrl(null);
                setLogoPreview(null);
                loadClinicProfile();
                
                // Disparar evento para limpar logo do Header
                window.dispatchEvent(new CustomEvent('clinicLogoUpdated', {
                  detail: { logoUrl: null }
                }));
                
                toast({ 
                  title: "Dados limpos!", 
                  description: "Todos os dados de teste foram removidos" 
                });
              }}
            >
              🗑️ Limpar Dados
            </Button>
          </div>
          
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Status:</strong> {logoPreview ? "Logo carregado ✅" : "Nenhum logo carregado ❌"} | 
              <strong> Dados salvos:</strong> {localStorage.getItem('gesclinic_clinic_data') ? "Sim ✅" : "Não ❌"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button size="lg" disabled={disabled} onClick={onSave}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Salvar Alterações
        </Button>
      </div>
    </motion.div>
  );
}

