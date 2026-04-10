// Utilitário para forçar atualização do header de forma direta
export const forceHeaderUpdate = (clinicName) => {
  console.log("💥 ForceHeaderUpdate chamado com:", clinicName);
  
  // Estratégia 1: Atualizar APENAS o nome da clínica (não logos)
  const clinicNameElements = [
    'header p.text-sm.font-semibold.text-white', // Nome da clínica específico
    'header .bg-white\\/10 p.font-semibold',
    'header [class*="backdrop-blur"] p.font-semibold'
  ];

  let updated = 0;
  clinicNameElements.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element && element.textContent) {
        const currentText = element.textContent.trim();
        const shouldUpdate = 
          currentText.includes('Carregando') || 
          currentText.includes('Clínica Demo') ||
          currentText.includes('TESTE TEMPO REAL') ||
          currentText === '' ||
          currentText.length < 3;
          
        if (shouldUpdate) {
          console.log(`🎯 Atualizando NOME "${currentText}" -> "${clinicName}" em: ${selector}`);
          element.textContent = clinicName;
          updated++;
        } else {
          console.log(`ℹ️ Nome já válido: "${currentText}" em: ${selector}`);
        }
      }
    });
  });  // Estratégia 2: Atualizar localStorage
  const data = {
    name: clinicName,
    brand_name: clinicName,
    updated_at: new Date().toISOString()
  };
  localStorage.setItem('gesclinic_clinic_data', JSON.stringify(data));
  
  // Estratégia 3: Métodos globais
  if (window.updateClinicName) {
    window.updateClinicName(clinicName);
  }
  
  // Estratégia 4: Eventos
  window.dispatchEvent(new CustomEvent('clinicDataUpdated', { detail: data }));
  
  console.log(`✅ ${updated} nomes da clínica atualizados (logos intocadas)`);
  return updated;
};

// Função específica para atualizar APENAS a logo da clínica
export const updateClinicLogoOnly = (logoUrl) => {
  console.log("🎨 Atualizando APENAS logo da clínica:", logoUrl);
  
  // Seletores específicos para logo da clínica (NÃO pega a logo da Gesclinic)
  const clinicLogoSelectors = [
    'img[alt="Logo da Clínica"]',
    'header .bg-white\\/10 img:not([alt="Logo Gesclinic"])',
    'header [class*="backdrop-blur"] img[alt="Logo da Clínica"]'
  ];

  let updated = 0;
  clinicLogoSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(img => {
      if (img && img.tagName === 'IMG' && img.alt === 'Logo da Clínica') {
        const oldSrc = img.src;
        img.src = logoUrl;
        img.style.display = 'block'; // Garantir que esteja visível
        updated++;
        console.log(`✅ Logo da clínica atualizada: ${selector}`);
      }
    });
  });

  console.log(`🎨 ${updated} logos da clínica atualizadas (Gesclinic preservada)`);
  return updated;
};

// Função para monitorar mudanças no header
export const startHeaderMonitoring = () => {
  console.log("👁️ Iniciando monitoramento do header...");
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const savedData = localStorage.getItem('gesclinic_clinic_data');
        if (savedData) {
          try {
            const data = JSON.parse(savedData);
            const clinicName = data.brand_name || data.name;
            
            // Verificar se o header ainda mostra "Carregando"
            const headerText = document.querySelector('header p');
            if (headerText && headerText.textContent.includes('Carregando') && clinicName) {
              console.log("🔄 Header detectado com texto padrão, forçando atualização...");
              forceHeaderUpdate(clinicName);
            }
          } catch (e) {
            console.warn("Erro ao processar dados salvos:", e);
          }
        }
      }
    });
  });
  
  // Observar mudanças no header
  const header = document.querySelector('header');
  if (header) {
    observer.observe(header, {
      childList: true,
      subtree: true,
      characterData: true
    });
    console.log("✅ Observer conectado ao header");
  }
  
  return observer;
};