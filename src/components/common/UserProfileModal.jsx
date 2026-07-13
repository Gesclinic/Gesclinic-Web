import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Save, Lock } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const UserProfileModal = ({ isOpen, initialSection = 'profile', onClose }) => {
  const { user, reloadUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [email] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.user_metadata?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  if (!isOpen) {
    return null;
  }

  const getSavedSession = () => {
    try {
      return JSON.parse(localStorage.getItem('gesclinic_session') || 'null');
    } catch (err) {
      return null;
    }
  };

  const updateSavedSession = (updates) => {
    const savedSession = getSavedSession();
    if (!savedSession) {
      return;
    }

    localStorage.setItem('gesclinic_session', JSON.stringify({ ...savedSession, ...updates }));
  };

  /** 🔹 Upload de avatar para o Supabase Storage */
  const handleAvatarUpload = async (file) => {
    if (!file) {
      return;
    }
    const filePath = `avatars/${user.id}-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('avatars').upload(filePath, file);
    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  /** 🔹 Atualiza nome e avatar */
  const handleSave = async () => {
    setSaving(true);
    try {
      const savedSession = getSavedSession();
      const userId = savedSession?.user_id || user?.id;
      const userEmail = savedSession?.email || user?.email;
      let newAvatarUrl = avatarPreview;
      if (avatarFile) {
        newAvatarUrl = await handleAvatarUpload(avatarFile);
      }

      let profileUpdated = false;
      let lastProfileError = null;

      if (userId) {
        const { data, error } = await supabase
          .from('users')
          .update({ full_name: name })
          .eq('id', userId)
          .select('id')
          .maybeSingle();

        if (error) {
          lastProfileError = error;
        } else {
          profileUpdated = !!data;
        }
      }

      if (!profileUpdated && userEmail) {
        const { data, error } = await supabase
          .from('users')
          .update({ full_name: name })
          .eq('email', userEmail)
          .select('id')
          .maybeSingle();

        if (error) {
          lastProfileError = error;
        } else {
          profileUpdated = !!data;
        }
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          avatar_url: newAvatarUrl || '',
        },
      });

      if (!profileUpdated && authError) {
        throw lastProfileError || authError;
      }

      updateSavedSession({ full_name: name, avatar_url: newAvatarUrl || '' });

      await reloadUser?.();

      toast({
        title: 'Perfil atualizado com sucesso!',
        description: 'Suas informações foram salvas.',
        className: 'bg-emerald-600 text-white border-none',
      });

      onClose();
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      toast({
        title: 'Erro ao salvar alterações',
        description: err?.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  /** 🔹 Troca o avatar com validação de 2MB */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Imagem muito grande',
          description: 'O tamanho máximo permitido é 2 MB.',
          variant: 'destructive',
        });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  /** 🔹 Remove o avatar */
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
  };

  /** 🔹 Atualiza senha */
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha ambos os campos de senha.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas diferentes',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }

      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua nova senha já está ativa.',
        className: 'bg-emerald-600 text-white border-none',
      });
    } catch (err) {
      console.error('Erro ao alterar senha:', err.message);
      toast({
        title: 'Erro ao alterar senha',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="app-modal-overlay backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="app-modal-shell app-modal-shell--compact relative rounded-xl bg-white p-6 shadow-lg"
          >
            {/* 🔹 Cabeçalho */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {activeSection === 'password' ? 'Alterar senha' : 'Meu Perfil'}
              </h2>
              <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm font-medium text-gray-600">
              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                className={`rounded-md px-3 py-2 transition ${
                  activeSection === 'profile' ? 'bg-white text-[#1A5B8A] shadow-sm' : 'hover:text-gray-900'
                }`}
              >
                Meu perfil
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('password')}
                className={`rounded-md px-3 py-2 transition ${
                  activeSection === 'password' ? 'bg-white text-[#1A5B8A] shadow-sm' : 'hover:text-gray-900'
                }`}
              >
                Alterar senha
              </button>
            </div>

            {activeSection === 'profile' && (
              <>
                {/* 🔹 Avatar */}
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div className="relative">
                    <img
                      src={avatarPreview || 'https://via.placeholder.com/80x80?text=User'}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border border-gray-300"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1 bg-[#1A5B8A] rounded-full hover:bg-[#174f78]"
                    >
                      <Upload className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {avatarPreview && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remover foto
                    </button>
                  )}
                </div>

                {/* 🔹 Dados do usuário */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nome completo</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#1A5B8A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="mt-1 w-full border border-gray-200 bg-gray-100 rounded-md px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 🔹 Alterar senha */}
            {activeSection === 'password' && (
              <div className="pt-1">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-gray-600" /> Alterar senha
                </h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#1A5B8A] focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#1A5B8A] focus:outline-none"
                  />

                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="flex items-center justify-center gap-2 bg-[#1A5B8A] text-white px-4 py-2 rounded-md hover:bg-[#174f78] w-full disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    {changingPassword ? 'Alterando...' : 'Salvar nova senha'}
                  </button>
                </div>
              </div>
            )}

            {/* 🔹 Salvar perfil */}
            {activeSection === 'profile' && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#1A5B8A] text-white px-4 py-2 rounded-md hover:bg-[#174f78] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserProfileModal;
