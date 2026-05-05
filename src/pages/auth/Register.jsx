import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    clinicName: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (form.fullName.length < 3) {
      return 'Nome muito curto.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Email inválido.';
    }

    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(form.password)) {
      return 'Senha fraca — mínimo 8 caracteres com letra maiúscula, minúscula e número.';
    }

    if (form.clinicName.length < 3) {
      return 'Nome da clínica muito curto.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    try {
      setLoading(true);

      // 1) Criar usuário no Supabase Auth
      const { data: authUser, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authErr) {
        throw authErr;
      }
      const userId = authUser.user.id;

      // 2) Criar perfil
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: userId,
        full_name: form.fullName,
        email: form.email,
        role: 'admin',
        status: 'active',
      });

      if (profileErr) {
        throw profileErr;
      }

      // 3) Criar clínica — código gerado automaticamente pelo trigger
      const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .insert({
          name: form.clinicName,
        })
        .select('id, code')
        .single();

      if (clinicErr) {
        throw clinicErr;
      }

      // 4) Vincular user ↔ clínica
      const { error: linkErr } = await supabase.from('user_clinics').insert({
        user_id: userId,
        clinic_id: clinic.id,
        role: 'admin',
        status: 'active',
      });

      if (linkErr) {
        throw linkErr;
      }

      alert(`Conta criada com sucesso!\nCódigo da clínica: ${clinic.code}`);

      navigate('/login');
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <Card className="max-w-md w-full p-4">
        <CardHeader>
          <CardTitle className="text-center">Crie sua conta</CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              placeholder="Nome completo"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />

            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <Input
              placeholder="Senha forte"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <Input
              placeholder="Nome da Clínica"
              value={form.clinicName}
              onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Criando...' : 'Criar Conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
