import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClinicContext } from '@/contexts/ClinicContext';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/layout/ThemeToggle';

export default function Header({ onToggleMenu }) {
  const { user, signOut } = useAuth();
  const { clinic } = useClinicContext();
  const navigate = useNavigate();
  const [headerData, setHeaderData] = useState({ userName: 'Usuário', clinicName: 'Clínica' });

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
    });

    setHeaderData({
      userName: finalUserName,
      clinicName: finalClinicName,
    });
  }, [user, clinic]);

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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 h-16 flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Botão de menu (Sidebar PRÓ) */}
        <button
          onClick={onToggleMenu}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-[#1A5B8A] dark:text-blue-400 transition"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Info do usuário */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Clínica */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{headerData.clinicName}</span>
          </div>

          {/* Notificações - ETAPA 8 */}
          <NotificationBell />

          {/* Dark Mode Toggle */}
          <ThemeToggle />

          {/* Usuário */}
          <div className="text-right border-r border-gray-200 dark:border-gray-600 pr-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">Bem-vindo</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{headerData.userName}</p>
          </div>

          {/* Botão Sair */}
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
