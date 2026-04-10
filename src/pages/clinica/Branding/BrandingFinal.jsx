import React, { useState, useRef, useCallback } from 'react';
import { Upload, Loader2 } from 'lucide-react';

export default function Branding() {
  const [logoDataUrl, setLogoDataUrl] = useState(() => localStorage.getItem('clinicLogo') || '');
  const [clinicName, setClinicName] = useState(() => localStorage.getItem('clinicName') || 'Sua Clínica');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const showToast = (title, description) => {
    // Toast simples sem biblioteca externa
    const toastDiv = document.createElement('div');
    toastDiv.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded shadow-lg z-50';
    toastDiv.innerHTML = `<strong>${title}</strong><br>${description}`;
    document.body.appendChild(toastDiv);
    setTimeout(() => toastDiv.remove(), 3000);
  };

  const updateHeaderLogo = useCallback((logoUrl) => {
    const clinicLogos = document.querySelectorAll('[data-clinic-logo]');
    clinicLogos.forEach(logo => {
      if (logoUrl) {
        logo.src = logoUrl;
        logo.style.display = 'block';
      } else {
        logo.style.display = 'none';
      }
    });
  }, []);

  const updateHeaderName = useCallback((name) => {
    const clinicNames = document.querySelectorAll('[data-clinic-name]');
    clinicNames.forEach(nameElement => {
      nameElement.textContent = name;
    });
  }, []);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Erro', 'Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Erro', 'A imagem deve ter no máximo 5MB.');
      return;
    }

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataUrl = e.target.result;
        setLogoDataUrl(dataUrl);
        localStorage.setItem('clinicLogo', dataUrl);
        updateHeaderLogo(dataUrl);
        showToast('Sucesso', 'Logo atualizada com sucesso!');
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        showToast('Erro', 'Erro ao processar a imagem.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      showToast('Erro', 'Erro ao ler o arquivo.');
      setLoading(false);
    };

    reader.readAsDataURL(file);
  }, [updateHeaderLogo]);

  const handleNameChange = useCallback((event) => {
    const newName = event.target.value;
    setClinicName(newName);
    localStorage.setItem('clinicName', newName);
    updateHeaderName(newName);
  }, [updateHeaderName]);

  const removeLogo = useCallback(() => {
    setLogoDataUrl('');
    localStorage.removeItem('clinicLogo');
    updateHeaderLogo('');
    showToast('Sucesso', 'Logo removida com sucesso!');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [updateHeaderLogo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Configuração de Marca</h1>
          <p className="text-gray-600">Personalize a identidade visual da sua clínica</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload de Logo */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Logo da Clínica</h2>
              <p className="text-gray-600 text-sm">Faça upload da logo da sua clínica (máx. 5MB)</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label 
                    htmlFor="logo-upload" 
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {loading ? (
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                      ) : logoDataUrl ? (
                        <img 
                          src={logoDataUrl} 
                          alt="Logo da clínica" 
                          className="max-w-full max-h-48 object-contain"
                        />
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gray-400 mb-4" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, JPEG (Máx. 5MB)</p>
                        </>
                      )}
                    </div>
                    <input 
                      id="logo-upload" 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      disabled={loading}
                    />
                  </label>
                </div>

                {logoDataUrl && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                    >
                      {loading ? 'Processando...' : 'Alterar Logo'}
                    </button>
                    <button
                      onClick={removeLogo}
                      disabled={loading}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                    >
                      Remover Logo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Configurações do Nome */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Nome da Clínica</h2>
              <p className="text-gray-600 text-sm">Configure o nome que aparecerá no cabeçalho</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="clinic-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Clínica
                  </label>
                  <input
                    id="clinic-name"
                    type="text"
                    value={clinicName}
                    onChange={handleNameChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Digite o nome da clínica"
                  />
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Pré-visualização do Cabeçalho</h3>
                  <div className="bg-white rounded-md p-4 border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-600 font-bold text-lg">Gesclinic Web</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {logoDataUrl && (
                        <img 
                          src={logoDataUrl} 
                          alt="Logo preview" 
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <span className="font-medium text-gray-700">{clinicName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Dicas importantes:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• A logo será exibida no cabeçalho ao lado do nome da clínica</li>
            <li>• Use imagens em alta resolução para melhor qualidade</li>
            <li>• Formatos recomendados: PNG com fundo transparente</li>
            <li>• As alterações são aplicadas automaticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

