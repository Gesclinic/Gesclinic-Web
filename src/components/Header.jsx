import React from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClinicContext } from '@/contexts/ClinicContext';

export default function Header({ onToggleMenu }) {
  const { user, signOut } = useAuth();
  const { clinic } = useClinicContext();
  const navigate = useNavigate();

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

  // Pegar dados da sessão customizada ou do user do Supabase
  const session = localStorage.getItem('gesclinic_session');
  const userData = session ? JSON.parse(session) : user;
  const userName = userData?.full_name || userData?.email || 'Usuário';
  const clinicName = clinic?.name || 'Clínica';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 h-16 flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Botão de menu (Sidebar PRÓ) */}
        <button
          onClick={onToggleMenu}
          className="p-2 rounded-lg hover:bg-gray-100 text-[#1A5B8A] transition"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Info do usuário */}
        <div className="flex items-center gap-6 ml-auto">
          {/* Clínica */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">{clinicName}</span>
          </div>

          {/* Usuário */}
          <div className="text-right border-r border-gray-200 pr-6">
            <p className="text-xs text-gray-600">Bem-vindo</p>
            <p className="font-semibold text-gray-900 text-sm">{userName}</p>
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
