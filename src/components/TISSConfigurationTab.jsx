/**
 * Componente: TISSConfigurationTab
 * ================================
 * Aba para configurar TISS em operadoras/convênios
 * - ANS Code
 * - TISS Endpoint
 * - Credenciais
 * - Método de submissão
 * 
 * Data: Abril 11, 2026
 */

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export function TISSConfigurationTab({ insurance, insuranceId, onUpdate, clinicId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    registration_ans: insurance?.registration_ans || "",
    tiss_enabled: insurance?.tiss_enabled || false,
    submission_method: insurance?.submission_method || "HTTP",
    tiss_endpoint: insurance?.tiss_endpoint || "",
    tiss_username: insurance?.tiss_username || "",
    tiss_password: insurance?.tiss_password || "",
    tiss_response_email: insurance?.tiss_response_email || "",
  });

  useEffect(() => {
    if (insurance) {
      console.log("🔄 [TISS] Atualizando formData com dados do insurance:", {
        id: insurance.id,
        registration_ans: insurance.registration_ans,
        tiss_enabled: insurance.tiss_enabled,
        submission_method: insurance.submission_method,
        tiss_endpoint: insurance.tiss_endpoint,
        tiss_username: insurance.tiss_username,
      });
      
      setFormData({
        registration_ans: insurance.registration_ans || "",
        tiss_enabled: insurance.tiss_enabled || false,
        submission_method: insurance.submission_method || "HTTP",
        tiss_endpoint: insurance.tiss_endpoint || "",
        tiss_username: insurance.tiss_username || "",
        tiss_password: insurance.tiss_password || "",
        tiss_response_email: insurance.tiss_response_email || "",
      });
    }
  }, [insurance?.id]);

  const handleChange = (field, value) => {
    console.log(`📝 [TISS] Campo alterado - ${field}:`, value);
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      console.log(`📊 [TISS] FormData após alteração:`, updated);
      return updated;
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      console.log("📝 [TISS] Salvando configurações:", { insuranceId, clinicId });
      console.log("📋 [TISS] FormData atual:", formData);

      // Validações
      if (formData.tiss_enabled) {
        console.log("🔍 [TISS] TISS habilitado - validando campos obrigatórios...");
        
        if (!formData.registration_ans?.trim()) {
          throw new Error("Código ANS é obrigatório quando TISS está habilitado");
        }
        console.log("✅ [TISS] Código ANS OK:", formData.registration_ans);
        
        if (!formData.submission_method) {
          throw new Error("Método de submissão é obrigatório");
        }
        console.log("✅ [TISS] Método de submissão OK:", formData.submission_method);
        
        if (formData.submission_method === "HTTP" && !formData.tiss_endpoint?.trim()) {
          throw new Error("Endpoint TISS é obrigatório para submissão HTTP");
        }
        console.log("✅ [TISS] Endpoint OK:", formData.tiss_endpoint);
        
        if (!formData.tiss_username?.trim() || !formData.tiss_password?.trim()) {
          throw new Error("Credenciais (usuário e senha) são obrigatórias");
        }
        console.log("✅ [TISS] Credenciais OK");
      }

      const updateData = {
        registration_ans: formData.registration_ans || null,
        tiss_enabled: formData.tiss_enabled,
        submission_method: formData.submission_method || null,
        tiss_endpoint: formData.tiss_endpoint || null,
        tiss_username: formData.tiss_username || null,
        tiss_password: formData.tiss_password || null,
        tiss_response_email: formData.tiss_response_email || null,
      };

      console.log("📤 [TISS] Dados para UPDATE:", updateData);

      const { error: updateError, data } = await supabase
        .from("payers")
        .update(updateData)
        .eq("id", insuranceId)
        .eq("clinic_id", clinicId)
        .select();

      console.log("📥 [TISS] Resposta Supabase:", { error: updateError, data });

      if (updateError) throw updateError;

      setSuccess(true);
      onUpdate?.();
      console.log("✅ Configurações TISS salvas com sucesso!");
    } catch (err) {
      console.error("❌ Erro ao salvar configurações TISS:", err.message || err);
      setError(err.message || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* INFORMAÇÃO GERAL */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Configuração TISS</h3>
        <p className="text-sm text-blue-800">
          Preencha os dados abaixo para habilitar integração TISS/ANS com esta operadora.
        </p>
      </div>

      {/* ALERT DE ERRO */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ALERT DE SUCESSO */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">Salvo com sucesso!</AlertTitle>
          <AlertDescription className="text-green-800">
            Configurações TISS foram atualizadas.
          </AlertDescription>
        </Alert>
      )}

      {/* CAMPOS TISS */}
      <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
        {/* Habilitar TISS */}
        <div className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg">
          <input
            type="checkbox"
            id="tiss_enabled"
            checked={formData.tiss_enabled}
            onChange={(e) => handleChange("tiss_enabled", e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 cursor-pointer"
          />
          <label htmlFor="tiss_enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
            ✅ Habilitar TISS para esta operadora
          </label>
        </div>

        {/* Se TISS habilitado, mostrar campos */}
        {formData.tiss_enabled && (
          <>
            {/* Código ANS */}
            <div>
              <Label className="text-sm font-medium">📌 Código ANS *</Label>
              <Input
                placeholder="Ex: 342856"
                value={formData.registration_ans}
                onChange={(e) => handleChange("registration_ans", e.target.value)}
                maxLength="20"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Código de registro junto à ANS (Agência Nacional de Saúde Suplementar)
              </p>
            </div>

            {/* Método de Submissão */}
            <div>
              <Label className="text-sm font-medium">📤 Método de Submissão *</Label>
              <Select
                value={formData.submission_method}
                onValueChange={(value) => handleChange("submission_method", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP">🌐 HTTP API</SelectItem>
                  <SelectItem value="SFTP">📁 SFTP</SelectItem>
                  <SelectItem value="PORTAL">🌍 Web Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Endpoint TISS (se HTTP) */}
            {formData.submission_method === "HTTP" && (
              <div>
                <Label className="text-sm font-medium">🔗 Endpoint TISS *</Label>
                <Input
                  placeholder="Ex: https://api.unimed.com.br/tiss"
                  value={formData.tiss_endpoint}
                  onChange={(e) => handleChange("tiss_endpoint", e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">URL do servidor TISS da operadora</p>
              </div>
            )}

            {/* Usuário */}
            <div>
              <Label className="text-sm font-medium">👤 Usuário TISS *</Label>
              <Input
                placeholder="Usuário para autenticação"
                value={formData.tiss_username}
                onChange={(e) => handleChange("tiss_username", e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Senha */}
            <div>
              <Label className="text-sm font-medium">🔐 Senha TISS *</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha para autenticação"
                  value={formData.tiss_password}
                  onChange={(e) => handleChange("tiss_password", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">⚠️ Será encriptada no servidor</p>
            </div>

            {/* Email de Resposta */}
            <div>
              <Label className="text-sm font-medium">📧 Email para Respostas TISS</Label>
              <Input
                type="email"
                placeholder="contato@clinica.com.br"
                value={formData.tiss_response_email}
                onChange={(e) => handleChange("tiss_response_email", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Opcional: para receber notificações TISS</p>
            </div>
          </>
        )}
      </div>

      {/* BOTÕES */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
        >
          {loading ? "💾 Salvando..." : "💾 Salvar Configurações TISS"}
        </Button>
      </div>

      {/* INFO DE TISS HABILITADO */}
      {formData.tiss_enabled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-900 font-semibold">✅ TISS Habilitado</p>
          <p className="text-xs text-green-800 mt-1">
            Esta operadora agora pode receber guias TISS do sistema.
          </p>
        </div>
      )}
    </div>
  );
}
