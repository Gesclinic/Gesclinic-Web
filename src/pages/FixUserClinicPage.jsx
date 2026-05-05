import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FixUserClinicPage() {
  const auth = useAuth();
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Mostrar estado atual do auth
    setDebugInfo({
      user: auth.user?.email,
      userId: auth.user?.id,
      clinicId: auth.clinicId,
      currentRole: auth.currentRole,
      loading: auth.loading,
      isAuthenticated: auth.isAuthenticated,
    });
  }, [auth]);

  const handleLogout = async () => {
    // Fazer logout forçado
    const { supabase } = await import('@/lib/customSupabaseClient');
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>⏳ Carregando...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🔍 Status da Autenticação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm font-mono">
              <div className="mb-2">
                <strong>Email:</strong> {debugInfo.user || '❌ undefined'}
              </div>
              <div className="mb-2">
                <strong>UserID:</strong> {debugInfo.userId?.slice(0, 8)}...{' '}
              </div>
              <div className="mb-2">
                <strong>ClinicID:</strong>{' '}
                {debugInfo.clinicId ? `✅ ${debugInfo.clinicId.slice(0, 8)}...` : '❌ NULL'}
              </div>
              <div className="mb-2">
                <strong>Role:</strong> {debugInfo.currentRole || '❌ undefined'}
              </div>
              <div>
                <strong>Loading:</strong> {debugInfo.loading ? 'true' : 'false'}
              </div>
            </div>

            {debugInfo.clinicId ? (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-green-800 font-semibold">✅ Clínica está associada!</p>
                <p className="text-green-700 text-sm mt-2">Você pode criar pacientes agora.</p>
                <Button
                  onClick={() => (window.location.href = '/clinica/pacientes/novo')}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700"
                >
                  ✅ Ir para Novo Paciente
                </Button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800 font-semibold">❌ ClinicID não carregado!</p>
                <p className="text-red-700 text-sm mt-2">
                  Você precisa fazer logout e login novamente para recarregar a sessão.
                </p>
                <Button
                  onClick={handleLogout}
                  className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                >
                  🚪 Fazer Logout
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
