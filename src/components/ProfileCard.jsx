import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient.js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Trash2, UserCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/SupabaseAuthContext";

export default function ProfileCard() {
  const { profile, user, loading: authLoading, refreshUserClinics } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      setAvatarUrl(profile?.avatar_url);
      setLoading(false);
    }
  }, [profile, authLoading]);

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file || !user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = `${publicUrlData.publicUrl}?t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      await refreshUserClinics();
      toast({ title: "Foto atualizada com sucesso!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao enviar imagem", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    if (!user) {
        setUploading(false);
        return;
    }

    try {
        if (avatarUrl) {
            const fileName = avatarUrl.split('/').pop().split('?')[0];
            await supabase.storage.from('avatars').remove([`public/${fileName}`]);
        }

        const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: null, updated_at: new Date().toISOString() })
            .eq("id", user.id);

        if (updateError) throw updateError;

        setAvatarUrl(null);
        await refreshUserClinics();
        toast({ title: "Foto removida" });
    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao remover foto", description: error.message });
    } finally {
        setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm mx-auto shadow-none border-0 bg-transparent">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-center text-primary">Gerenciar Avatar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Avatar className="h-32 w-32 border-2 border-primary/20 shadow-lg">
          <AvatarImage src={avatarUrl} alt="Avatar do usuário" />
          <AvatarFallback>
            <UserCircle className="h-full w-full text-muted-foreground/30" />
          </AvatarFallback>
        </Avatar>

        <div className="flex gap-2 mt-2">
          <Button asChild variant="outline" size="sm" disabled={uploading}>
            <label className="cursor-pointer flex items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
              {uploading ? (
                 <Loader2 className="inline-block w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="inline-block w-4 h-4 mr-1" />
              )}
               {uploading ? "Enviando..." : "Nova Foto"}
            </label>
          </Button>
          {avatarUrl && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={uploading}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Remover
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}