// src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

import logoGesclinic from '@/assets/logo_gesclinic_g.png';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Building2, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ===========================================================
  // 🔐 LOGIN CUSTOMIZADO — VALIDAR CONTRA TABELA USERS
  // ===========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const clinicCode = e.target.clinicCode.value.trim().toUpperCase();
      const username = e.target.username.value.trim().toLowerCase();
      const password = e.target.password.value;

      if (!clinicCode || !username || !password) {
        setError('Preencha todos os campos.');
        return;
      }

      const { data, error: loginError } = await supabase.functions.invoke('secure-login', {
        body: { clinicCode, username, password },
      });
      if (loginError || !data?.access_token || !data?.refresh_token) {
        setError('Credenciais inválidas.');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) {
        setError('Não foi possível iniciar a sessão. Tente novamente.');
        return;
      }

      localStorage.removeItem('gesclinic_session');
      localStorage.removeItem('gesclinic_active_company_id');
      localStorage.removeItem('gesclinic_clinic_data');
      navigate('/clinica');
    } catch {
      setError('Não foi possível iniciar a sessão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================
  // 🎨 UI DO LOGIN
  // ===========================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-slate-100 opacity-20"></div>

      <div className="relative w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg bg-white">
            <img src={logoGesclinic} alt="Logo Gesclinic" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gesclinic Web</h1>
          <p className="text-gray-600">Sistema de Gestão Clínica</p>
        </div>

        {/* Card de Login */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-center">
              Digite suas credenciais de acesso
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form method="post" className="space-y-5" onSubmit={handleSubmit}>
              {/* Código da Clínica */}
              <div>
                <Label className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Código da Clínica
                </Label>
                <Input
                  id="clinicCode"
                  name="clinicCode"
                  type="text"
                  placeholder="Ex: GESCL-A1B2-C3D4"
                  required
                  disabled={loading}
                  className="text-sm"
                />
              </div>

              {/* Nome de Usuário */}
              <div>
                <Label className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome de Usuário
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Digite seu nome de usuário"
                  required
                  disabled={loading}
                  className="text-sm"
                />
              </div>

              {/* Senha */}
              <div>
                <Label className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    required
                    disabled={loading}
                    className="pr-10 text-sm"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              {/* Botão de Login */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-3 text-center text-sm">
              <Link to="/forgot-password" className="text-blue-600 hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            {/* Link para Registro */}
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-blue-600 hover:underline font-medium">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© 2026 Gesclinic. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
