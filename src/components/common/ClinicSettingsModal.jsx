import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Image, Palette } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { useClinic } from "@/contexts/useClinicContext";
import { useToast } from "@/components/ui/use-toast";
import logoFallback from "@/assets/Logo_Gesclinic_G.png";

/**
 * Modal de configurações da clínica
 * Permite alterar nome fantasia, logo e cores institucionais
 * com pré-visualização em tempo real e aplicação imediata do tema
 */
const ClinicSettingsModal = ({ isOpen, onClose }) => {
  const { clinic, reloadClinic, applyTheme } = useClinic();
  const { toast } = useToast();
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [primaryColor, setPrimaryColor] = useState("#1A5B8A");
  const [secondaryColor, setSecondaryColor] = useState("#5DB053");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clinic) {
      setBrandName(clinic.brand_name || "");
      setLogoUrl(clinic.logo_url || "");
      setPrimaryColor(clinic.primary_color || "#1A5B8A");
      setSecondaryColor(clinic.secondary_color || "#5DB053");
    }
  }, [clinic]);

  if (!isOpen) return null;

  /** 🔹 Upload da logo para o Supabase Storage */
  const handleLogoUpload = async (file) => {
    if (!file) return;
    const path = `logos/${clinic.id}-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("logos").upload(path, file);
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(path);
    return publicUrlData.publicUrl;
  };

  /** 🔹 Salvar configurações */
  const handleSave = async () => {
    if (!clinic?.id) return;
    setSaving(true);
    try {
      let newLogoUrl = logoUrl;
      if (logoFile) newLogoUrl = await handleLogoUpload(logoFile);

      const { error } = await supabase
        .from("clinics")
        .update({
          brand_name: brandName,
          logo_url: newLogoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        })
        .eq("id", clinic.id);

      if (error) throw error;

      await reloadClinic?.();

      // ✅ Aplica o tema imediatamente sem recarregar
      applyTheme?.({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      });

      toast({
        title: "Configurações salvas!",
        description: "As informações da clínica foram atualizadas com sucesso.",
        className: "bg-emerald-600 text-white border-none",
      });

      onClose();
    } catch (err) {
      console.error("Erro ao salvar clínica:", err.message);
      toast({
        title: "Erro ao salvar",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /** 🔹 Selecionar logo */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 3 MB.",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      setLogoUrl(URL.createObjectURL(file));
    }
  };

  /** 🔹 Remover logo */
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoUrl("");
  };

  /** 🔹 Pré-visualização dinâmica do cabeçalho */
  const HeaderPreview = () => (
    <div
      className="rounded-t-xl flex items-center justify-between px-4 py-3 shadow"
      style={{
        background: primaryColor,
        color: "#fff",
      }}
    >
      <div className="flex items-center gap-3">
        <img
          src={logoUrl || logoFallback}
          alt="Logo preview"
          className="h-8 w-8 object-contain"
        />
        <div>
          <p className="font-semibold text-sm leading-tight">{brandName || "Gesclinic Web"}</p>
          <p className="text-xs opacity-80">Pré-visualização</p>
        </div>
      </div>

      <div
        className="px-2 py-1 rounded text-xs font-medium"
        style={{
          background: secondaryColor,
          color: "#fff",
        }}
      >
        AGENDA
      </div>
    </div>
  );

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
            transition={{ duration: 0.25 }}
            className="app-modal-shell app-modal-shell--compact relative overflow-hidden rounded-xl bg-white shadow-lg"
          >
            {/* Cabeçalho de pré-visualização */}
            <HeaderPreview />

            <div className="p-6">
              {/* Título e fechar */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-800">
                  Configurações da Clínica
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Logo */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="relative">
                  <img
                    src={logoUrl || "https://via.placeholder.com/100x100?text=Logo"}
                    alt="Logo da clínica"
                    className="w-24 h-24 object-contain border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() =>
                      document.getElementById("logoInput")?.click()
                    }
                    className="absolute bottom-0 right-0 p-1 bg-[#1A5B8A] rounded-full hover:bg-[#174f78]"
                  >
                    <Image className="w-4 h-4 text-white" />
                  </button>
                </div>
                <input
                  id="logoInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {logoUrl && (
                  <button
                    onClick={handleRemoveLogo}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remover logo
                  </button>
                )}
              </div>

              {/* Campos */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#1A5B8A] focus:outline-none"
                  />
                </div>

                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Palette className="w-4 h-4 text-gray-500" /> Cor Primária
                    </label>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="mt-2 w-full h-10 cursor-pointer border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Palette className="w-4 h-4 text-gray-500" /> Cor Secundária
                    </label>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="mt-2 w-full h-10 cursor-pointer border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Botão salvar */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#1A5B8A] text-white px-4 py-2 rounded-md hover:bg-[#174f78] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClinicSettingsModal;