import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Trash2, UserCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import UserInfoCard from '@/components/common/UserInfoCard';

export default function Profile() {
  const { user, profile: authProfile, loading: authLoading, refreshUserClinics } = useAuth();
  const [form, setForm] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const { toast } = useToast();

  // Carrega dados do usuário no form ao montar
  useEffect(() => {
    if (authProfile) {
      setForm({
        full_name: authProfile.full_name || user?.user_metadata?.full_name || '',
        phone: authProfile.phone || user?.user_metadata?.phone || '',
        avatar_url: authProfile.avatar_url || '',
      });
      setPreview(authProfile.avatar_url || '');
      setLoading(false);
    }
  }, [authProfile, user]);

  // Upload de avatar
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) {
        throw uploadError;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, avatar_url: data.publicUrl }));
      setPreview(data.publicUrl);
      toast({ title: 'Foto atualizada', description: 'Sua foto de perfil foi atualizada.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao enviar foto', description: err.message });
    }
    setUploading(false);
  };

  // Remover avatar
  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      setForm((prev) => ({ ...prev, avatar_url: '' }));
      setPreview('');
      toast({ title: 'Foto removida', description: 'Sua foto de perfil foi removida.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao remover foto', description: err.message });
    }
    setUploading(false);
  };

  // Salvar alterações
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          phone: form.phone,
          avatar_url: form.avatar_url,
        })
        .eq('id', user.id);
      if (error) {
        throw error;
      }
      toast({ title: 'Perfil atualizado', description: 'Seus dados foram salvos com sucesso.' });
      refreshUserClinics?.();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar perfil', description: err.message });
    }
    setSaving(false);
  };

  return (
    <>
      <Helmet>
        <title>Meu Perfil - Gesclinic Web</title>
        <meta
          name="description"
          content="Edite seus dados de perfil, incluindo nome, telefone e foto."
        />
      </Helmet>
      <div className="w-full mx-auto space-y-6 p-4">
        {/* Card principal do perfil */}
        <Card className="shadow-lg border-gray-100/10">
          <CardHeader className="flex flex-col items-center text-center">
            <CardTitle className="text-2xl font-bold text-primary">Meu Perfil</CardTitle>
            <div className="relative mt-6">
              {preview ? (
                <img
                  src={preview}
                  alt="Avatar"
                  className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <UserCircle className="h-28 w-28 text-gray-300" />
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                  <Loader2 className="animate-spin text-primary w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <label className="cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  Nova Foto
                </label>
              </Button>
              {preview && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remover
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50/50 p-4 rounded-b-lg">
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar alterações
            </Button>
          </CardFooter>
        </Card>
        {/* Card de dados do usuário */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Dados do Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <b>Nome:</b> {form.full_name || user?.user_metadata?.full_name || user?.name || '-'}
              </div>
              <div>
                <b>Email:</b> {user?.email || '-'}
              </div>
              <div>
                <b>Telefone:</b> {form.phone || user?.user_metadata?.phone || '-'}
              </div>
              <div>
                <b>Função:</b> {authProfile?.role || user?.user_metadata?.role || '-'}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Card de dados da clínica */}
        {/* Uncomment and provide clinic data if available */}
        {/*
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Dados da Clínica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><b>Nome:</b> {clinic?.brand_name || clinic?.name || "-"}</div>
              <div><b>CNPJ:</b> {clinic?.cnpj || "-"}</div>
              <div><b>Email:</b> {clinic?.email || "-"}</div>
              <div><b>Telefone:</b> {clinic?.phone || "-"}</div>
              <div><b>Endereço:</b> {clinic?.address || "-"}</div>
              <div><b>Cidade:</b> {clinic?.city || "-"}</div>
              <div><b>Estado:</b> {clinic?.state || "-"}</div>
            </div>
          </CardContent>
        </Card>
        */}
      </div>
    </>
  );
}
