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
import { generatePrescriptionHtml } from '@/lib/prescriptionHtmlTemplate';

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

const COUNCIL_BY_KIND = {
  medico: 'CRM',
  dentista: 'CRO',
  nutricionista: 'CRN',
  fisioterapeuta: 'CREFITO',
  psicologo: 'CRP',
  enfermeiro: 'COREN',
  fonoaudiologo: 'CREFONO',
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
      professionalCouncilLabel: parsed.metadata?.professionalCouncilLabel || '',
      professionalCouncilNumber: parsed.metadata?.professionalCouncilNumber || '',
      professionalCouncilState: parsed.metadata?.professionalCouncilState || '',
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
      professionalCouncilLabel: receitaData.professional_council_label,
      professionalCouncilNumber: receitaData.professional_crm,
      professionalCouncilState: receitaData.professional_uf,
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

      const htmlContent = generatePrescriptionHtml({
        receitaData: {
          ...receita,
          observacoes: receitaView.notes,
          protocol_name: receitaView.protocolName,
          prescription_type: receitaView.prescriptionType,
          professional_council_label:
            receitaView.professionalCouncilLabel || (receita.professional_crm ? 'CRM' : ''),
          professional_crm: receitaView.professionalCouncilNumber || receita.professional_crm,
          professional_uf: receitaView.professionalCouncilState || receita.professional_uf,
          clinic_address: receita.clinic_address || clinic?.address || '',
          clinic_phone: receita.clinic_phone || clinic?.phone || '',
          clinic_logo: receita.clinic_logo || clinic?.logo_url || clinic?.logo || '',
          data_emissao:
            receita.data_emissao ||
            (receita.created_at ? new Date(receita.created_at).toLocaleDateString('pt-BR') : ''),
        },
        medicamentos: receita.medicamentos || [],
        assinaturaDigital: receita.modo_assinatura === 'digital',
        validationUrl: `gesclinic:receita:${receita.id}`,
      });

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
          professionalName={professionalData?.name || getProfessionalName()}
          professionalCouncilType={
            professionalData?.council_type ||
            COUNCIL_BY_KIND[professionalData?.professional_kind] ||
            (professionalData?.cremepe_crm || professionalData?.crm ? 'CRM' : '') ||
            ''
          }
          professionalCouncilNumber={
            professionalData?.council_number || professionalData?.cremepe_crm || professionalData?.crm || ''
          }
          professionalCouncilState={
            professionalData?.council_state || professionalData?.uf || professionalData?.state || ''
          }
          professionalCrm={professionalData?.council_number || professionalData?.cremepe_crm || professionalData?.crm || ''}
          professionalUf={professionalData?.council_state || professionalData?.uf || professionalData?.state || ''}
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
