import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { LogOut, Building, UserCircle2, ChevronDown, Settings, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClinicContext } from '@/contexts/ClinicContext';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/layout/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserProfileModal from '@/components/common/UserProfileModal';

export default function Header() {
  const { user, signOut } = useAuth();
  const { clinic } = useClinicContext();
  const navigate = useNavigate();
  const [headerData, setHeaderData] = useState({ userName: 'Usuário', clinicName: 'Clínica' });
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [userProfileSection, setUserProfileSection] = useState('profile');
  const [logoUrl, setLogoUrl] = useState('');

  const openUserProfileModal = (section) => {
    setUserProfileSection(section);
    setShowUserProfileModal(true);
  };

  // Efeito para carregar dados sempre que mudar
  useEffect(() => {
    // Pegar dados da sessão customizada (prioritário) ou do contexto/Supabase
    const session = localStorage.getItem('gesclinic_session');
    const sessionData = session ? JSON.parse(session) : null;

    // Usar dados da sessão, fallback para contexto, fallback para user do Supabase
    const finalUserName = sessionData?.full_name || user?.full_name || user?.email || 'Usuário';
    const finalClinicName =
      sessionData?.clinic_name || clinic?.name || clinic?.brand_name || 'Clínica';

    console.log('🔍 [Header Debug]', {
      sessionData: sessionData,
      user: user,
      clinic: clinic,
      finalUserName: finalUserName,
      finalClinicName: finalClinicName,
      logo_url: clinic?.logo_url,
    });

    setHeaderData({
      userName: finalUserName,
      clinicName: finalClinicName,
    });
  }, [user, clinic]);

  // Efeito separado para atualizar URL da logo com cache-busting
  useEffect(() => {
    if (clinic?.logo_url) {
      // Adicionar parâmetro de cache busting com ID da clínica
      const bustedUrl = clinic.logo_url.includes('?') 
        ? `${clinic.logo_url}&v=${clinic.id?.substring(0, 8)}`
        : `${clinic.logo_url}?v=${clinic.id?.substring(0, 8)}`;
      console.log('🖼️ [Header] Logo URL atualizado:', bustedUrl);
      setLogoUrl(bustedUrl);
    } else {
      setLogoUrl('');
    }
  }, [clinic?.logo_url, clinic?.id]);

  const handleSignOut = async () => {
    // Limpar sessão customizada do localStorage
    localStorage.removeItem('gesclinic_session');
    localStorage.removeItem('gesclinic_clinic_data');

    // Tentar fazer logout do Supabase também (se houver)
    try {
      await signOut();
    } catch (err) {
      console.log('Sem autenticação Supabase ativa');
    }

    navigate('/login');
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 min-h-16 flex items-center">
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex items-center min-w-0 overflow-hidden">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 shadow-sm min-w-0">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white border border-slate-200 dark:border-slate-600">
                {logoUrl ? (
                  <img
                    key={logoUrl}
                    src={logoUrl}
                    alt={`${headerData.clinicName} logo`}
                    className="h-full w-full object-contain p-1"
                    onError={(e) => {
                      console.warn('❌ Erro ao carregar logo:', e);
                      setLogoUrl('');
                    }}
                  />
                ) : (
                  <Building className="w-4 h-4 text-[#1A5B8A] dark:text-blue-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Clinica ativa
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[220px] md:max-w-[320px]">
                  {headerData.clinicName}
                </p>
              </div>
            </div>
          </div>

          {/* Info do usuário */}
          <div className="flex items-center gap-2 md:gap-4 ml-auto min-w-0">

            {/* Notificações - ETAPA 8 */}
            <NotificationBell />

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Menu de usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                  <UserCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline max-w-[140px] truncate">{headerData.userName}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Bem-vindo
                    </span>
                    <span className="font-medium truncate">{headerData.userName}</span>
                    <span className="text-xs text-muted-foreground truncate">{headerData.clinicName}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openUserProfileModal('profile')}>
                  <UserCircle2 className="w-4 h-4 mr-2" />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openUserProfileModal('password')}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Alterar senha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/clinica/configuracoes')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configuracoes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-700">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <UserProfileModal
        isOpen={showUserProfileModal}
        initialSection={userProfileSection}
        onClose={() => setShowUserProfileModal(false)}
      />
    </>
  );
}
