import { useState, useEffect } from 'react';

export function useClinicLogo() {
  const [clinicLogo, setClinicLogo] = useState(null);

  useEffect(() => {
    // Função para carregar logo do localStorage
    const loadLogo = () => {
      try {
        const savedLogo = localStorage.getItem('gesclinic_logo');
        if (savedLogo) {
          const logoData = JSON.parse(savedLogo);
          setClinicLogo(logoData.logo_url);
        }
      } catch (error) {
        console.warn('Erro ao carregar logo da clínica:', error);
      }
    };

    // Carregar logo inicial
    loadLogo();

    // Escutar mudanças no localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'gesclinic_logo') {
        if (e.newValue) {
          try {
            const logoData = JSON.parse(e.newValue);
            setClinicLogo(logoData.logo_url);
          } catch (error) {
            console.warn('Erro ao processar mudança do logo:', error);
          }
        } else {
          setClinicLogo(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Também escutar eventos customizados para mudanças na mesma aba
    const handleLogoUpdate = (e) => {
      setClinicLogo(e.detail.logoUrl);
    };

    window.addEventListener('clinicLogoUpdated', handleLogoUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('clinicLogoUpdated', handleLogoUpdate);
    };
  }, []);

  return clinicLogo;
}
