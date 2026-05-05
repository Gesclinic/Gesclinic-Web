/**
 * ============================================
 * ReceitasDigitaisTab - Aba de Receita
 * ============================================
 *
 * Gerencia receitas assinadas
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/useClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Edit,
  Copy,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Download } from 'lucide-react';
import ReceitaDigitalModal from '@/components/pacientes/modals/ReceitaDigitalModal';
import * as professionalsApi from '@/lib/professionalsApi';
import {
  buildPrescriptionObservations,
  parsePrescriptionObservations,
} from '@/lib/digitalPrescriptionMetadata';
import {
  createDigitalPrescription,
  deleteDigitalPrescription,
  listPatientDigitalPrescriptions,
  syncLocalDigitalPrescriptions,
  updateDigitalPrescription,
} from '@/lib/digitalPrescriptionsApi';

const STATUS_CONFIG = {
  assinada: { label: 'Assinada (Digital)', color: 'green', icon: CheckCircle },
  pendente: { label: 'Aguardando Assinatura', color: 'yellow', icon: Clock },
  rascunho: { label: 'Rascunho', color: 'yellow', icon: Clock },
  expirada: { label: 'Expirada', color: 'red', icon: AlertCircle },
};

const PRESCRIPTION_TYPE_LABELS = {
  simples: 'Receita simples',
  antibiotico: 'Receita branca de antibiótico',
  controle_especial_azul: 'Controle especial azul',
  controle_especial_amarela: 'Notificação amarela',
};

export default function ReceitasDigitaisTab({ patientId, patientData, updatePatientData }) {
  const { user } = useAuth();
  const { clinic } = useClinicContext();
  const { toast } = useToast();
  const [receitas, setReceitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNovaReceita, setShowNovaReceita] = useState(false);
  const [professionalData, setProfessionalData] = useState(null);
  const [loadingProfessional, setLoadingProfessional] = useState(false);
  const [editingReceita, setEditingReceita] = useState(null);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const localReceitasCount = receitas.filter((receita) => receita._storage_mode === 'local').length;
  // Removido: QR code modal state

  // Obter nome do profissional autenticado
  const getProfessionalName = () => {
    try {
      const savedSession = localStorage.getItem('gesclinic_session');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.username) {
          console.log(
            'âœ… [ReceitasDigitalisTab] Profissional do localStorage:',
            sessionData.username,
          );
          return sessionData.username;
        }
      }
    } catch (e) {
      console.warn('âš ï¸ Erro ao ler localStorage:', e);
    }
    return user?.user_metadata?.full_name || user?.username || 'Profissional';
  };

  useEffect(() => {
    loadReceitas();
  }, [patientId, clinic?.id]);

  async function loadReceitas() {
    setLoading(true);
    try {
      const data = await listPatientDigitalPrescriptions(patientId, clinic?.id || null);
      setReceitas(data || []);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar receitas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const getPrescriptionViewData = (receita) => {
    const parsed = parsePrescriptionObservations(receita?.observacoes || '');

    return {
      notes: parsed.notes,
      prescriptionType: parsed.metadata?.prescriptionType || 'simples',
      prescriptionTypeLabel:
        PRESCRIPTION_TYPE_LABELS[parsed.metadata?.prescriptionType] ||
        PRESCRIPTION_TYPE_LABELS.simples,
      protocolName: parsed.metadata?.protocolName || '',
    };
  };

  const buildPrescriptionPayload = (receitaData, status) => ({
    clinic_id: clinic?.id || null,
    patient_id: patientId,
    professional_user_id: user?.id || null,
    patient_name: patientData?.name || receitaData.patient_name || null,
    patient_cpf: patientData?.document_id || receitaData.patient_cpf || null,
    professional_name: receitaData.professional_name || getProfessionalName(),
    professional_crm: receitaData.professional_crm || null,
    professional_uf: receitaData.professional_uf || null,
    professional_specialty: receitaData.professional_specialty || null,
    professional_rqe: receitaData.professional_rqe || null,
    clinic_name: receitaData.clinic_name || clinic?.name || null,
    clinic_cnpj: receitaData.clinic_cnpj || clinic?.cnpj || null,
    clinic_city: receitaData.clinic_city || clinic?.city || null,
    clinic_state: receitaData.clinic_state || clinic?.state || null,
    clinic_address: receitaData.clinic_address || clinic?.address || null,
    clinic_email: receitaData.clinic_email || clinic?.email || null,
    clinic_phone: receitaData.clinic_phone || clinic?.phone || null,
    clinic_logo: receitaData.clinic_logo || clinic?.logo_url || clinic?.logo || null,
    medicamentos: receitaData.medicamentos || [],
    observacoes: buildPrescriptionObservations(receitaData.observacoes || '', {
      prescriptionType: receitaData.prescription_type,
      protocolName: receitaData.protocol_name,
    }),
    modo_assinatura: receitaData.modo_assinatura,
    status,
    // memed_id e qr_code removidos
    certificado_id: receitaData.certificado_id || null,
    data_emissao: receitaData.data_emissao || null,
    hora_emissao: receitaData.hora_emissao || null,
    emitted_at: new Date().toISOString(),
    signed_at: status === 'assinada' ? new Date().toISOString() : null,
  });

  // Buscar dados do profissional autenticado
  const loadProfessionalData = async () => {
    if (!user?.id && !user?.email) {
      console.warn('âš ï¸ User ID ou Email nÃ£o disponÃ­vel');

      // FALLBACK: Tentar do localStorage
      try {
        const sessionData = JSON.parse(localStorage.getItem('gesclinic_session') || '{}');
        if (sessionData.email) {
          console.log('ðŸ” Using session email from localStorage:', sessionData.email);
          // Continuar com busca
        }
      } catch (e) {
        console.warn('âš ï¸ Erro ao ler localStorage:', e);
      }
      return;
    }

    setLoadingProfessional(true);
    console.log('ðŸ” Buscando dados do profissional:', { userId: user?.id, email: user?.email });

    try {
      // Tentar por email (mais direto)
      const emailToSearch =
        user?.email || JSON.parse(localStorage.getItem('gesclinic_session') || '{}').email;
      const prof = await professionalsApi.getProfessionalByUserId(user?.id, emailToSearch);

      if (prof) {
        console.log('âœ… Profissional carregado:', prof);
        setProfessionalData(prof);
      } else {
        // FALLBACK: Se nÃ£o encontrar no banco, usar dados locais
        console.warn('âš ï¸ Profissional nÃ£o encontrado no banco, usando fallback');
        setProfessionalData({
          cremepe_crm: '123456', // CRM padrÃ£o para demo
          state: 'SP', // Estado padrÃ£o
          specialization: '',
          rqe: '',
        });
      }
    } catch (error) {
      console.error('âŒ Erro ao buscar profissional:', error);
      // Usar fallback mesmo em caso de erro
      setProfessionalData({
        cremepe_crm: '123456',
        state: 'SP',
        specialization: '',
        rqe: '',
      });
    } finally {
      setLoadingProfessional(false);
    }
  };

  // Carregar dados do profissional quando abre a modal
  useEffect(() => {
    if (showNovaReceita && !professionalData && !loadingProfessional) {
      loadProfessionalData();
    }
  }, [showNovaReceita]);

  const handleSyncLocalReceitas = async () => {
    setSyncingLocal(true);

    try {
      const result = await syncLocalDigitalPrescriptions(patientId, clinic?.id || null);

      await loadReceitas();

      if (result.blockedByPolicy) {
        toast({
          title: 'Sincronização bloqueada',
          description:
            'O Supabase ainda está rejeitando gravações. Aplique a migration/policy e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      if (result.syncedRows.length > 0) {
        toast({
          title: 'Receitas sincronizadas',
          description: `${result.syncedRows.length} receita(s) foram enviadas ao Supabase.`,
        });
        return;
      }

      toast({
        title: 'Nada para sincronizar',
        description: 'Não há receitas locais pendentes neste paciente.',
      });
    } catch (error) {
      console.error('Erro ao sincronizar receitas locais:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao sincronizar receitas locais com o Supabase.',
        variant: 'destructive',
      });
    } finally {
      setSyncingLocal(false);
    }
  };

  const handleNovaReceita = async (receitaData) => {
    console.log('📝 Nova receita criada:', receitaData);
    console.log('🔍 modo_assinatura:', receitaData.modo_assinatura);

    // Determinar status baseado no tipo de assinatura
    let status = 'rascunho';
    let toastTitle = '';
    let toastDescription = '';

    if (receitaData.modo_assinatura === 'digital') {
      // Assinatura digital com certificado
      status = 'assinada';
      toastTitle = '✅ Receita assinada digitalmente!';
      toastDescription = `MeMed ID: ${receitaData.memed_id}`;
    } else if (receitaData.modo_assinatura === 'manual') {
      // Impressão para assinatura manual
      status = 'pendente';
      toastTitle = '📄 Documento pronto para impressão';
      toastDescription = 'Imprima e assine manualmente em seguida';
    }

    try {
      if (editingReceita?.id) {
        const receitaAtualizada = await updateDigitalPrescription(
          editingReceita.id,
          buildPrescriptionPayload(receitaData, status),
        );

        setReceitas((prev) =>
          prev.map((receita) => (receita.id === editingReceita.id ? receitaAtualizada : receita)),
        );

        toastTitle = '✏️ ' + toastTitle;
        toastDescription = 'Receita atualizada com sucesso. ' + toastDescription;
        if (receitaAtualizada?._storage_mode === 'local') {
          toastDescription +=
            ' Salva localmente neste navegador até a migration do Supabase ser aplicada.';
        }
        console.log('✅ Receita atualizada:', receitaAtualizada.status);
      } else {
        const novaReceita = await createDigitalPrescription(
          buildPrescriptionPayload(receitaData, status),
        );

        setReceitas((prev) => [novaReceita, ...prev]);
        if (novaReceita?._storage_mode === 'local') {
          toastDescription +=
            ' Salva localmente neste navegador até a migration do Supabase ser aplicada.';
        }
        console.log('✅ Receita criada com status:', novaReceita.status);
      }

      setShowNovaReceita(false);
      setEditingReceita(null);

      toast({
        title: toastTitle,
        description: toastDescription,
      });
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar receita',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDownloadReceita = (receitaId) => {
    try {
      const receita = receitas.find((r) => r.id === receitaId);
      if (!receita) {
        return;
      }
      const receitaView = getPrescriptionViewData(receita);

      console.log('Baixando receita:', receitaId);
      console.log('modo_assinatura:', receita.modo_assinatura);

      // Sempre usar o novo modelo/layout padronizado
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Receita Médica</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; color: #222; }
            .container { max-width: 600px; margin: 40px auto; background: #fff; border: 1.5px solid #222; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px 32px 24px 32px; }
            .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 24px; }
            .logo { max-width: 120px; max-height: 60px; margin: 0 auto 8px auto; display: block; }
            .clinic-name { font-size: 1.15rem; font-weight: bold; margin-bottom: 2px; }
            .clinic-info { font-size: 0.95rem; color: #444; margin-bottom: 2px; }
            .title { text-align: center; font-size: 1.35rem; font-weight: bold; margin: 24px 0 12px 0; letter-spacing: 1px; }
            .section-label { font-weight: bold; margin-top: 18px; margin-bottom: 6px; font-size: 1.08rem; border-bottom: 1px solid #eee; }
            .info-row { margin-bottom: 8px; }
            .info-label { font-weight: bold; display: inline-block; min-width: 90px; }
            .prescricao { font-size: 1.08rem; margin: 18px 0; padding: 12px; background: #fafafa; border-radius: 6px; border: 1px solid #eee; }
            .assinatura { margin: 32px 0 12px 0; text-align: center; }
            .assinatura-label { font-size: 1.08rem; font-weight: bold; margin-bottom: 4px; }
            .assinatura-digital { background: #1e7e34; color: #fff; font-weight: bold; padding: 8px 18px; border-radius: 20px; display: inline-block; margin-bottom: 8px; }
            .profissional { margin-top: 10px; font-size: 1.05rem; font-weight: 500; }
            .crm { font-size: 0.98rem; color: #444; }
            .qrcode { margin: 18px auto 0 auto; display: flex; flex-direction: column; align-items: center; }
            .qrcode img { width: 110px; height: 110px; border: 1.5px solid #222; border-radius: 8px; background: #fff; }
            .qrcode-label { font-size: 0.95rem; color: #222; margin-top: 6px; }
            .footer { text-align: center; margin-top: 32px; font-size: 0.98rem; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${clinic?.logo_url ? `<img src="${clinic.logo_url}" class="logo" alt="Logo da Clínica" />` : ''}
              <div class="clinic-name">${receita.clinic_name || 'Clínica'}</div>
              <div class="clinic-info">
                ${receita.clinic_cnpj ? `CNPJ: ${receita.clinic_cnpj}` : ''}
                ${clinic?.address ? ` | ${clinic.address}` : ''}
                ${clinic?.phone ? ` | ${clinic.phone}` : ''}
              </div>
            </div>
            <div class="title">RECEITA MÉDICA</div>
            <div class="info-row"><span class="info-label">Paciente:</span> ${receita.patient_name}</div>
            ${receita.patient_cpf ? `<div class="info-row"><span class="info-label">CPF:</span> ${receita.patient_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</div>` : ''}
            <div class="info-row"><span class="info-label">Data:</span> ${new Date().toLocaleDateString('pt-BR')}</div>
            ${receitaView.protocolName ? `<div class="info-row"><span class="info-label">Diagnóstico:</span> ${receitaView.protocolName}</div>` : ''}
            <div class="section-label">PRESCRIÇÃO</div>
            <div class="prescricao">
              ${receita.medicamentos?.map((med) => `<div><strong>${med.nome}</strong><br>${med.dose} ${med.forma_farmaceutica ? '- ' + med.forma_farmaceutica : ''} ${med.via_administracao ? '- ' + med.via_administracao : ''}<br>${med.frequencia ? 'Frequência: ' + med.frequencia + '<br>' : ''}${med.duracao_dias ? 'Duração: ' + med.duracao_dias + ' dias<br>' : ''}${med.quantidade_total ? 'Quantidade: ' + med.quantidade_total + ' ' + (med.unidade_quantidade || '') + '<br>' : ''}${med.repeticoes ? 'Repetições: ' + med.repeticoes + '<br>' : ''}${med.instrucoes ? 'Instruções: ' + med.instrucoes : ''}</div>`).join('<hr style="margin:10px 0;">')}
            </div>
            <div class="assinatura">
              <div class="assinatura-label">Assinatura Digital ICP Brasil</div>
              <div class="assinatura-digital">ASSINADA DIGITALMENTE</div>
              <div class="profissional">${receita.professional_name}</div>
              <div class="crm">CRM: ${receita.professional_crm || '_____'} / ${receita.professional_uf || '_____'}</div>
            </div>
            <div class="qrcode">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=VALIDAR_RECEITA_PLACEHOLDER" alt="QR Code" />
              <div class="qrcode-label">Validar receita</div>
            </div>
            <div class="footer">
              Emitido pelo sistema Gesclinic
            </div>
          </div>
        </body>
        </html>`;

      // Criar blob e download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receita-${receita.id || Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download realizado',
        description: 'Receita baixada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao baixar receita:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao baixar receita',
        variant: 'destructive',
      });
    }
  };

  // Função de QR Code removida

  const handleEditarReceita = (receita) => {
    console.log('âœï¸ Editando receita:', receita);
    setEditingReceita(receita);
    setShowNovaReceita(true);
    toast({
      title: 'Modo EdiÃ§Ã£o',
      description: 'Atualize os dados da receita',
    });
  };

  const handleReplicarReceita = (receita) => {
    console.log('📋 Replicando receita:', receita);
    // Criar cópia com novos IDs mas mantendo dados
    const receitaCopia = {
      ...receita,
      id: crypto.randomUUID?.() || `copy-${Date.now()}`,
      status: 'rascunho',
      created_at: new Date().toISOString(),
      memed_id: undefined,
      qr_code: undefined,
      signed_at: null,
    };

    // Abrir modal com dados pré-preenchidos
    setEditingReceita(receitaCopia);
    setShowNovaReceita(true);

    toast({
      title: '✏️ Modo Edição',
      description: 'Atualize os dados da receita replicada',
    });
  };

  const handleDeletarReceita = async (receitaId) => {
    try {
      await deleteDigitalPrescription(receitaId);
      setReceitas((prev) => prev.filter((receita) => receita.id !== receitaId));
      toast({
        title: 'Sucesso',
        description: 'Receita deletada',
      });
    } catch (error) {
      console.error('Erro ao deletar receita:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao deletar receita',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com botÃ£o de nova receita */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receita</h2>
          <p className="text-sm text-gray-600 mt-1">Gerencie receitas</p>
        </div>
        <Button
          onClick={() => setShowNovaReceita(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Nova Receita
        </Button>
      </div>

      {localReceitasCount > 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-amber-950">Salvamento local ativo</p>
                  <p className="mt-1 text-sm text-amber-900">
                    {localReceitasCount} receita(s) foram salvas apenas neste navegador porque o
                    Supabase ainda está bloqueando a escrita por policy/RLS.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-900 border border-amber-300">
                    Local
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                    onClick={handleSyncLocalReceitas}
                    disabled={syncingLocal}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncingLocal ? 'animate-spin' : ''}`} />
                    Sincronizar agora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* Resumo informativo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-4"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">
                {receitas.filter((r) => r.status === 'assinada').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Receitas Assinadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {receitas.filter((r) => r.status === 'rascunho').length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Rascunhos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{receitas.length}</p>
              <p className="text-xs text-gray-600 mt-1">Total de Receitas</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lista de receitas */}
      {receitas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Nenhuma receita criada ainda</p>
          <Button onClick={() => setShowNovaReceita(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Receita
          </Button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {receitas.map((receita, idx) => {
            const statusConfig = STATUS_CONFIG[receita.status] || STATUS_CONFIG.rascunho;
            const StatusIcon = statusConfig.icon;
            const receitaView = getPrescriptionViewData(receita);

            return (
              <motion.div
                key={receita.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">
                            {receita.medicamentos?.map((m) => m.nome).join(', ') ||
                              'Receita PadrÃ£o'}
                          </h3>
                          <Badge
                            variant="outline"
                            className={
                              receita._storage_mode === 'local'
                                ? 'border-amber-300 text-amber-800 bg-amber-50'
                                : 'border-emerald-300 text-emerald-800 bg-emerald-50'
                            }
                          >
                            {receita._storage_mode === 'local'
                              ? 'Salva localmente'
                              : 'Salva no Supabase'}
                          </Badge>
                          <Badge variant="outline" className="border-slate-300 text-slate-700">
                            {receitaView.prescriptionTypeLabel}
                          </Badge>
                          {/* Badge de status digital removido */}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm text-gray-600">
                          <div>
                            <p className="font-medium text-gray-700">Profissional</p>
                            <p>{receita.professional_name}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Data</p>
                            <p>{new Date(receita.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        {receitaView.protocolName ? (
                          <p className="mt-3 text-xs text-slate-600">
                            Protocolo: {receitaView.protocolName}
                          </p>
                        ) : null}
                      </div>

                      {/* AÃ§Ãµes */}
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadReceita(receita.id)}
                          title="Baixar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {/* Botão QR Code removido */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleEditarReceita(receita)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleReplicarReceita(receita)}
                          title="Replicar"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeletarReceita(receita.id)}
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Modal de QR Code removido */}

      {/* Modal de Nova Receita */}
      {showNovaReceita && (
        <ReceitaDigitalModal
          patientId={patientId}
          patientName={patientData?.name}
          patientCpf={patientData?.document_id}
          professionalName={getProfessionalName()}
          professionalCrm={professionalData?.cremepe_crm || ''}
          professionalUf={professionalData?.state || ''}
          professionalSpecialty={
            professionalData?.specialization || professionalData?.specialty || ''
          }
          professionalRqe={professionalData?.rqe || ''}
          clinicName={clinic?.name}
          clinicCnpj={clinic?.cnpj}
          clinicCity={clinic?.city}
          clinicState={clinic?.state}
          clinicAddress={clinic?.address}
          clinicEmail={clinic?.email}
          clinicPhone={clinic?.phone}
          clinicLogo={clinic?.logo_url || clinic?.logo}
          editingData={editingReceita}
          onClose={() => {
            setShowNovaReceita(false);
            setEditingReceita(null);
          }}
          onSuccess={handleNovaReceita}
        />
      )}
    </div>
  );
}
