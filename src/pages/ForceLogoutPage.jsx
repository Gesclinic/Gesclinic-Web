import React, { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForceLogoutPage() {
  useEffect(() => {
    async function logout() {
      try {
        await supabase.auth.signOut();
        // Aguardar um pouco e redirecionar
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        window.location.href = '/login';
      }
    }

    logout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🔄 Desconectando...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-center">Sua sessão está sendo encerrada.</p>
            <p className="text-center text-sm text-gray-600">
              Você será redirecionado para fazer login novamente em alguns segundos...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
