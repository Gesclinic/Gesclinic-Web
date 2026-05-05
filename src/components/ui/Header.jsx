import { Bell, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/useClinicContext';

export default function Header() {
  const { user, logout } = useAuth();
  const clinicContext = useClinicContext();
  const clinic = clinicContext?.clinic;

  return (
    <header className="w-full bg-white h-16 border-b flex items-center justify-between px-6 shadow-sm">
      <div className="font-semibold text-lg text-primary">{clinic?.brand_name || 'Clínica'}</div>

      <div className="flex items-center gap-4">
        <Bell className="text-gray-600 cursor-pointer" size={20} />

        <div className="flex items-center gap-2">
          <UserCircle size={28} className="text-gray-600" />
          <span className="text-gray-700 font-medium">{user?.full_name}</span>
        </div>

        <button
          onClick={logout}
          className="text-sm px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
