// Mock para desenvolvimento sem Supabase configurado
export const mockClinicData = {
  id: 'clinic-demo',
  name: 'Clínica Demo',
  brand_name: 'Clínica Demo',
  logo_url: null,
  primary_color: '#1A5B8A',
  secondary_color: '#5DB053'
};

// Função mock para getClinic
export async function getMockClinic(clinicId) {
  console.log('🎭 Usando mock getClinic para:', clinicId);
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Tentar recuperar do localStorage primeiro
  const stored = localStorage.getItem('gesclinic_demo_data');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      console.log('📦 Dados recuperados do localStorage:', data);
      return { ...mockClinicData, ...data };
    } catch (e) {
      console.warn('⚠️ Erro ao recuperar dados do localStorage:', e);
    }
  }
  
  return mockClinicData;
}

// Função mock para updateClinicSettings
export async function updateMockClinicSettings(clinicId, patch) {
  console.log('🎭 Usando mock updateClinicSettings:', { clinicId, patch });
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Recuperar dados atuais
  const current = await getMockClinic(clinicId);
  const updated = { ...current, ...patch };
  
  // Salvar no localStorage
  localStorage.setItem('gesclinic_demo_data', JSON.stringify(updated));
  
  console.log('💾 Dados salvos no localStorage:', updated);
  return updated;
}

// Função mock para upload de logo
export async function mockUploadLogo(file, clinicId) {
  console.log('🎭 Mock upload de logo:', { filename: file.name, size: file.size });
  
  // Simular delay de upload
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Criar URL temporária
  const mockUrl = URL.createObjectURL(file);
  
  console.log('📎 URL mock criada:', mockUrl);
  return {
    path: `mock/${clinicId}/${Date.now()}-${file.name}`,
    publicUrl: mockUrl
  };
}