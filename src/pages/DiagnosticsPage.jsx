import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DiagnosticsPage() {
  const auth = useAuth();
  const [dbData, setDbData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function diagnose() {
      try {
        // 1. Obter sessão
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        setSessionData({
          user_id: session?.user?.id,
          email: session?.user?.email,
          name: session?.user?.user_metadata?.name,
        });

        if (!session?.user?.id) {
          throw new Error("Nenhuma sessão ativa");
        }

        // 2. Buscar dados do usuário no banco
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, email, clinic_id, name, role")
          .eq("id", session.user.id)
          .single();

        if (userError) throw userError;

        setDbData(user);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    diagnose();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>🔍 Diagnóstico - Autenticação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm font-mono space-y-2">
              <div><strong>User ID (Sessão):</strong> {sessionData?.user_id || "❌ NULL"}</div>
              <div><strong>Email (Sessão):</strong> {sessionData?.email || "❌ NULL"}</div>
              <div><strong>Nome (Sessão):</strong> {sessionData?.name || "❌ NULL"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔍 Diagnóstico - Banco de Dados</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
                <strong>❌ Erro:</strong> {error}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm font-mono space-y-2">
                  <div><strong>ID:</strong> {dbData?.id || "❌ NULL"}</div>
                  <div><strong>Email:</strong> {dbData?.email || "❌ NULL"}</div>
                  <div><strong>Clinic ID:</strong> {dbData?.clinic_id ? `✅ ${dbData.clinic_id}` : "❌ NULL"}</div>
                  <div><strong>Nome:</strong> {dbData?.name || "❌ NULL"}</div>
                  <div><strong>Role:</strong> {dbData?.role || "❌ NULL"}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔍 Diagnóstico - AuthContext</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm font-mono space-y-2">
              <div><strong>User:</strong> {auth.user?.email || "❌ NULL"}</div>
              <div><strong>ClinicId:</strong> {auth.clinicId ? `✅ ${auth.clinicId}` : "❌ NULL"}</div>
              <div><strong>CurrentRole:</strong> {auth.currentRole || "❌ NULL"}</div>
              <div><strong>Loading:</strong> {auth.loading ? "true" : "false"}</div>
            </div>
          </CardContent>
        </Card>

        {dbData?.clinic_id && !auth.clinicId && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle>⚠️ Problema Identificado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-800 mb-4">
                O banco de dados HAS o clinic_id, mas o AuthContext não carregou. Isso é um problema de timing ou cache.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                🔄 Recarregar Página
              </Button>
            </CardContent>
          </Card>
        )}

        {!dbData?.clinic_id && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle>❌ Problema Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-800 mb-4">
                O clinic_id NÃO está salvo no banco para este usuário. Preciso atualizar manualmente no Supabase.
              </p>
              <div className="text-sm text-red-700 space-y-2 font-mono bg-red-100 p-3 rounded mb-4">
                <p>Execute no Supabase SQL Editor:</p>
                <p className="font-bold">UPDATE users SET clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'::uuid WHERE email = '{sessionData?.email}';</p>
              </div>
            </CardContent>
          </Card>
        )}

        {auth.clinicId && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle>✅ Tudo OK!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-800 mb-4">Você pode criar pacientes agora!</p>
              <Button 
                onClick={() => window.location.href = "/clinica/pacientes/novo"}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                ✅ Ir para Novo Paciente
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
