import React, { createContext, useContext, useState, useEffect } from 'react';

const ClinicLogoContext = createContext();

export const ClinicLogoProvider = ({ children }) => {
  const [clinicLogo, setClinicLogo] = useState(null);

  useEffect(() => {
    // Carregar logo inicial
    const loadLogo = () => {
      try {
        const savedLogo = localStorage.getItem('gesclinic_logo');
        if (savedLogo) {
          const logoData = JSON.parse(savedLogo);
          console.log('🎨 ClinicLogoContext: Logo carregado:', logoData.logo_file_name);
          setClinicLogo(logoData.logo_url);
        } else {
          setClinicLogo(null);
        }
      } catch (error) {
        console.warn('⚠️ ClinicLogoContext: Erro ao carregar logo:', error);
        setClinicLogo(null);
      }
    };

    loadLogo();

    // Listener para mudanças
    const handleStorageChange = (e) => {
      if (e.key === 'gesclinic_logo') {
        loadLogo();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateLogo = (logoUrl) => {
    console.log('🔄 ClinicLogoContext: Atualizando logo para:', logoUrl);
    setClinicLogo(logoUrl);
  };

  return (
    <ClinicLogoContext.Provider value={{ clinicLogo, updateLogo }}>
      {children}
    </ClinicLogoContext.Provider>
  );
};

export const useClinicLogo = () => {
  const context = useContext(ClinicLogoContext);
  if (!context) {
    throw new Error('useClinicLogo deve ser usado dentro de ClinicLogoProvider');
  }
  return context;
};