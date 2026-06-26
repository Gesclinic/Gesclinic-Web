import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Garante que CardHeader está importado corretamente
import { Button } from '@/components/ui/button';
import { Plus, Trash2, CheckCircle, Loader, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parsePrescriptionObservations } from '@/lib/digitalPrescriptionMetadata';
import { generatePrescriptionHtml } from '@/lib/prescriptionHtmlTemplate';

// ...existing code...
/**
 * ============================================
 * ReceitaModal - Modal para criar receita
 * ============================================
 *
 * Formulário completo de receita com:
 * - Seleção de medicamentos
 * - Dosagem e frequência
 * - Duração do tratamento
 * - Assinatura digital
 */
const createEmptyMedicationForm = () => ({
  medicamento_id: '',
  forma_farmaceutica: '',
  via_administracao: '',
  dose: '',
  frequencia: '',
  duracao_dias: '',
  quantidade_total: '',
  unidade_quantidade: 'comprimidos',
  repeticoes: '0',
  instrucoes: '',
});

const makeTemplateStorageKey = (type, userId) =>
  `gesclinic:receitas:${type}:${userId || 'anonimo'}`;

const readTemplateStorage = (key) => {
  try {
    const rawValue = window.localStorage.getItem(key);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    console.warn('Falha ao carregar modelos de receita:', error);
    return [];
  }
};

const writeTemplateStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('Falha ao salvar modelos de receita:', error);
    return false;
  }
};

const makeTemplateName = (prefix, medications) => {
  const names = medications.map((med) => med.nome).filter(Boolean);
  if (names.length === 0) return prefix;
  if (names.length === 1) return `${prefix} - ${names[0]}`;
  return `${prefix} - ${names[0]} + ${names.length - 1}`;
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

function ReceitaDigitalModal(props) {
  // Clinic context
  const { clinic } = useClinicContext();
  // Usuário autenticado do contexto
  const { user } = useAuth();
  const {
    editingData,
    onClose,
    patientName,
    patientId,
    patientCpf,
    onSuccess = () => {},
    professionalName,
    professionalCouncilType,
    professionalCouncilNumber,
    professionalCouncilState,
    professionalCrm: professionalCrmProp,
    professionalUf: professionalUfProp,
    professionalSpecialty: professionalSpecialtyProp,
    professionalRqe: professionalRqeProp,
  } = props;
  // State para loading de ações assíncronas
  const [loading, setLoading] = useState(false);
  // State para controle do checkbox de certificado digital
  const [certificadoSelecionado, setCertificadoSelecionado] = useState(false);
  // Variáveis profissionais para evitar ReferenceError
  // Dados do profissional logado
  const professionalCouncilLabel =
    professionalCouncilType ||
    user?.user_metadata?.council_type ||
    COUNCIL_BY_KIND[user?.user_metadata?.professional_kind] ||
    'Conselho';
  const professionalCrm =
    professionalCouncilNumber ||
    professionalCrmProp ||
    user?.user_metadata?.council_number ||
    user?.user_metadata?.crm ||
    user?.user_metadata?.professional_crm ||
    user?.user_metadata?.CRM ||
    '';
  const professionalUf =
    professionalCouncilState ||
    professionalUfProp ||
    user?.user_metadata?.council_state ||
    user?.user_metadata?.uf ||
    user?.user_metadata?.professional_uf ||
    user?.user_metadata?.UF ||
    '';
  const professionalSpecialty =
    professionalSpecialtyProp ||
    user?.user_metadata?.specialty ||
    user?.user_metadata?.especialidade ||
    user?.user_metadata?.professional_specialty ||
    '';
  const professionalRqe =
    professionalRqeProp ||
    user?.user_metadata?.rqe ||
    user?.user_metadata?.professional_rqe ||
    user?.user_metadata?.RQE ||
    '';

  function getProfessionalName() {
    // Usa nome completo do user_metadata
    return (
      professionalName ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.nome ||
      user?.email ||
      'Profissional'
    );
  }

  function getClinicLogoForPrescription() {
    if (clinic?.logo_url || clinic?.logo) {
      return clinic.logo_url || clinic.logo;
    }
    if (typeof document === 'undefined') {
      return '';
    }
    return document.querySelector('img[alt$=" logo"]')?.src || '';
  }
  // CartaoSUS seguro para evitar ReferenceError
  const CartaoSUS = '';
  // Protocolo selecionado (evita ReferenceError)
  const [selectedProtocolName, setSelectedProtocolName] = useState('');

  // State hooks (declare ONCE at the top)
  const [step, setStep] = useState(1);
  const [medicamentos, setMedicamentos] = useState([]);
  const [searchMed, setSearchMed] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [prescriptionType, setPrescriptionType] = useState('simples');
  const [formData, setFormData] = useState(createEmptyMedicationForm);
  const [favoriteTemplates, setFavoriteTemplates] = useState([]);
  const [protocolOptions, setProtocolOptions] = useState([]);
  const [selectedFavoriteName, setSelectedFavoriteName] = useState('');
  const [templateFeedback, setTemplateFeedback] = useState('');

  // Tipos de receita disponíveis
  const PRESCRIPTION_TYPES = [
    {
      value: 'simples',
      label: 'Receita Simples',
      guidance: 'Receita comum para medicamentos não controlados.',
    },
    {
      value: 'controlada',
      label: 'Receita Controlada',
      guidance: 'Receita para medicamentos controlados (ex: antibióticos, psicotrópicos).',
    },
    {
      value: 'especial',
      label: 'Receita Especial',
      guidance: 'Receita para medicamentos de uso especial, como talidomida, retinoides, etc.',
    },
  ];
  // Helper to get selected prescription type object
  const selectedPrescriptionType =
    PRESCRIPTION_TYPES.find((t) => t.value === prescriptionType) || PRESCRIPTION_TYPES[0];

  const favoriteStorageKey = makeTemplateStorageKey('favoritos', user?.id);
  const protocolStorageKey = makeTemplateStorageKey('protocolos', user?.id);

  useEffect(() => {
    setFavoriteTemplates(readTemplateStorage(favoriteStorageKey));
    setProtocolOptions(readTemplateStorage(protocolStorageKey));
  }, [favoriteStorageKey, protocolStorageKey]);

  useEffect(() => {
    if (!templateFeedback) return undefined;
    const timeoutId = window.setTimeout(() => {
      setTemplateFeedback('');
    }, 3500);
    return () => window.clearTimeout(timeoutId);
  }, [templateFeedback]);

  useEffect(() => {
    if (!editingData) return;

    const parsedObservations = parsePrescriptionObservations(editingData.observacoes || '');
    const editingMedications = (editingData.medicamentos || []).map((medication, index) => ({
      ...medication,
      id: medication.id || `edit-${editingData.id || Date.now()}-${index}`,
    }));

    if (editingMedications.length === 1) {
      loadMedicationIntoForm(editingMedications[0]);
      setMedicamentos([]);
    } else {
      setMedicamentos(editingMedications);
      setFormData(createEmptyMedicationForm());
    }

    setObservacoes(parsedObservations.notes || '');
    setPrescriptionType(parsedObservations.metadata?.prescriptionType || 'simples');
    setSelectedProtocolName(parsedObservations.metadata?.protocolName || '');
    setSelectedFavoriteName('');
    setSearchMed('');
    setStep(1);
  }, [editingData]);

  const getDraftMedication = () => {
    const selectedMed = MEDICAMENTOS_EXEMPLO.find((m) => m.id == formData.medicamento_id);
    if (!selectedMed) return null;
    return {
      id: `draft-${Date.now()}`,
      medicamento_id: formData.medicamento_id,
      nome: selectedMed.nome,
      forma_farmaceutica: formData.forma_farmaceutica,
      via_administracao: formData.via_administracao,
      dose: formData.dose,
      frequencia: formData.frequencia,
      duracao_dias: formData.duracao_dias ? parseInt(formData.duracao_dias) : '',
      quantidade_total: formData.quantidade_total ? parseInt(formData.quantidade_total) : '',
      unidade_quantidade: formData.unidade_quantidade,
      repeticoes: parseInt(formData.repeticoes || 0),
      instrucoes: formData.instrucoes,
    };
  };

  const getCurrentTemplateMedications = () => {
    const draftMedication = getDraftMedication();
    if (draftMedication) return [...medicamentos, draftMedication];
    return medicamentos;
  };

  const loadMedicationIntoForm = (medicamento) => {
    setFormData({
      medicamento_id: String(medicamento.medicamento_id || ''),
      forma_farmaceutica: medicamento.forma_farmaceutica || '',
      via_administracao: medicamento.via_administracao || '',
      dose: medicamento.dose || '',
      frequencia: medicamento.frequencia || '',
      duracao_dias: medicamento.duracao_dias ? String(medicamento.duracao_dias) : '',
      quantidade_total: medicamento.quantidade_total ? String(medicamento.quantidade_total) : '',
      unidade_quantidade: medicamento.unidade_quantidade || 'comprimidos',
      repeticoes: medicamento.repeticoes != null ? String(medicamento.repeticoes) : '0',
      instrucoes: medicamento.instrucoes || '',
    });
  };

  const handleAplicarProtocolo = (protocol) => {
    const protocolMedications = protocol.medicamentos || [];
    if (protocolMedications.length === 1) {
      loadMedicationIntoForm(protocolMedications[0]);
      setMedicamentos([]);
    } else {
      setMedicamentos(protocolMedications);
      setFormData(createEmptyMedicationForm());
    }
    setObservacoes(protocol.observacoes || '');
    setPrescriptionType(protocol.prescriptionType || 'simples');
    setSelectedProtocolName(protocol.name || '');
    setSelectedFavoriteName('');
    setSearchMed('');
    setTemplateFeedback(`Editando protocolo: ${protocol.name}`);
    toast({ title: 'Protocolo carregado para edição', description: protocol.name });
  };

  const handleExcluirProtocolo = (protocolName) => {
    const nextProtocols = protocolOptions.filter((protocol) => protocol.name !== protocolName);
    if (!writeTemplateStorage(protocolStorageKey, nextProtocols)) {
      setTemplateFeedback('Não foi possível excluir o protocolo neste navegador.');
      toast({
        title: 'Erro ao excluir protocolo',
        description: 'O navegador bloqueou o armazenamento local.',
        variant: 'destructive',
      });
      return;
    }
    setProtocolOptions(nextProtocols);
    if (selectedProtocolName === protocolName) {
      setSelectedProtocolName('');
    }
    setTemplateFeedback(`Protocolo excluído: ${protocolName}`);
    toast({ title: 'Protocolo excluído', description: protocolName });
  };

  const handleSalvarProtocoloAtual = () => {
    const templateMedications = getCurrentTemplateMedications();
    if (templateMedications.length === 0) {
      setTemplateFeedback('Selecione ou adicione um medicamento antes de salvar o protocolo.');
      toast({
        title: 'Adicione um medicamento',
        description: 'Preencha ou adicione ao menos um medicamento antes de salvar o protocolo.',
        variant: 'destructive',
      });
      return;
    }
    const isEditingProtocol = Boolean(selectedProtocolName);
    const name = selectedProtocolName || makeTemplateName('Protocolo', templateMedications);
    const nextProtocol = {
      id: `${Date.now()}`,
      name,
      medicamentos: templateMedications,
      observacoes,
      prescriptionType,
    };
    const nextProtocols = [
      nextProtocol,
      ...protocolOptions.filter((protocol) => protocol.name !== nextProtocol.name),
    ];
    if (!writeTemplateStorage(protocolStorageKey, nextProtocols)) {
      setTemplateFeedback('Não foi possível salvar o protocolo neste navegador.');
      toast({
        title: 'Erro ao salvar protocolo',
        description: 'O navegador bloqueou o armazenamento local.',
        variant: 'destructive',
      });
      return;
    }
    setProtocolOptions(nextProtocols);
    setSelectedProtocolName(nextProtocol.name);
    setSelectedFavoriteName('');
    setTemplateFeedback(
      `${isEditingProtocol ? 'Protocolo atualizado' : 'Protocolo salvo'}: ${nextProtocol.name}`,
    );
    toast({
      title: isEditingProtocol ? 'Protocolo atualizado' : 'Protocolo salvo',
      description: nextProtocol.name,
    });
  };

  const handleSalvarFavorito = () => {
    const templateMedications = getCurrentTemplateMedications();
    if (templateMedications.length === 0) {
      setTemplateFeedback('Selecione ou adicione um medicamento antes de salvar o favorito.');
      toast({
        title: 'Adicione um medicamento',
        description: 'Preencha ou adicione ao menos um medicamento antes de salvar o favorito.',
        variant: 'destructive',
      });
      return;
    }
    const isEditingFavorite = Boolean(selectedFavoriteName);
    const name = selectedFavoriteName || makeTemplateName('Favorito', templateMedications);
    const nextFavorite = {
      id: `${Date.now()}`,
      name,
      medicamentos: templateMedications,
    };
    const nextFavorites = [
      nextFavorite,
      ...favoriteTemplates.filter((favorite) => favorite.name !== nextFavorite.name),
    ];
    if (!writeTemplateStorage(favoriteStorageKey, nextFavorites)) {
      setTemplateFeedback('Não foi possível salvar o favorito neste navegador.');
      toast({
        title: 'Erro ao salvar favorito',
        description: 'O navegador bloqueou o armazenamento local.',
        variant: 'destructive',
      });
      return;
    }
    setFavoriteTemplates(nextFavorites);
    setSelectedFavoriteName(nextFavorite.name);
    setSelectedProtocolName('');
    setTemplateFeedback(
      `${isEditingFavorite ? 'Favorito atualizado' : 'Favorito salvo'}: ${nextFavorite.name}`,
    );
    toast({
      title: isEditingFavorite ? 'Favorito atualizado' : 'Favorito salvo',
      description: nextFavorite.name,
    });
  };

  const handleAplicarFavorito = (favorite) => {
    const favoriteMedications = favorite.medicamentos || [];
    if (favoriteMedications.length === 1) {
      loadMedicationIntoForm(favoriteMedications[0]);
      setMedicamentos([]);
    } else {
      setMedicamentos(favoriteMedications);
      setFormData(createEmptyMedicationForm());
    }
    setSelectedFavoriteName(favorite.name || '');
    setSelectedProtocolName('');
    setSearchMed('');
    setTemplateFeedback(`Editando favorito: ${favorite.name}`);
    toast({ title: 'Favorito carregado para edição', description: favorite.name });
  };

  const handleExcluirFavorito = (favoriteName) => {
    const nextFavorites = favoriteTemplates.filter((favorite) => favorite.name !== favoriteName);
    if (!writeTemplateStorage(favoriteStorageKey, nextFavorites)) {
      setTemplateFeedback('Não foi possível excluir o favorito neste navegador.');
      toast({
        title: 'Erro ao excluir favorito',
        description: 'O navegador bloqueou o armazenamento local.',
        variant: 'destructive',
      });
      return;
    }
    setFavoriteTemplates(nextFavorites);
    if (selectedFavoriteName === favoriteName) {
      setSelectedFavoriteName('');
    }
    setTemplateFeedback(`Favorito excluído: ${favoriteName}`);
    toast({ title: 'Favorito excluído', description: favoriteName });
  };
  // Exemplo de medicamentos para busca (substitua por dados reais se necessário)
  const MEDICAMENTOS_EXEMPLO = [
    { id: 1, nome: 'Dipirona 500mg', apresentacao: 'Comprimido' },
    { id: 2, nome: 'Paracetamol 750mg', apresentacao: 'Comprimido' },
    { id: 3, nome: 'Amoxicilina 500mg', apresentacao: 'Cápsula' },
    { id: 4, nome: 'Ibuprofeno 400mg', apresentacao: 'Comprimido' },
    { id: 5, nome: 'Omeprazol 20mg', apresentacao: 'Cápsula' },
  ];

  // Filtro de medicamentos baseado na busca (deve vir após todos os useState)
  const filteredMedicamentos = searchMed
    ? MEDICAMENTOS_EXEMPLO.filter((med) => med.nome.toLowerCase().includes(searchMed.toLowerCase()))
    : MEDICAMENTOS_EXEMPLO;
  const { toast } = useToast();
  // Lista de unidades de quantidade padrão (stub)
  const UNIDADES_QUANTIDADE = [
    'comprimidos',
    'cápsulas',
    'ml',
    'mg',
    'g',
    'gotas',
    'ampolas',
    'frascos',
    'tubos',
    'aplicações',
    'outro',
  ];
  // Lista de frequências padrão (stub)
  const FREQUENCIAS = [
    '1x ao dia',
    '2x ao dia',
    '3x ao dia',
    '4x ao dia',
    '6/6h',
    '8/8h',
    '12/12h',
    '24/24h',
    'antes das refeições',
    'após as refeições',
    'ao deitar',
    'conforme orientação médica',
    'outro',
  ];
  // Lista de vias de administração padrão (stub)
  const VIAS_ADMINISTRACAO = [
    'oral',
    'sublingual',
    'tópica',
    'intravenosa',
    'intramuscular',
    'subcutânea',
    'retal',
    'inalatória',
    'oftálmica',
    'nasal',
    'outro',
  ];
  // Lista de formas farmacêuticas padrão (stub)
  const FORMAS_FARMACEUTICAS = [
    'comprimido',
    'cápsula',
    'xarope',
    'gotas',
    'pomada',
    'creme',
    'gel',
    'spray',
    'ampola',
    'pó',
    'outro',
  ];
  // Estado para o formulário de medicamento

  // Função utilitária para gerar o HTML padronizado da receita
  function gerarHtmlReceita({ receitaData, medicamentos, assinaturaDigital }) {
    return generatePrescriptionHtml({ receitaData, medicamentos, assinaturaDigital });
  }

  const handleImprimirParaAssinatura = async () => {
    if (medicamentos.length === 0) {
      toast({
        title: 'Nenhum medicamento',
        description: 'Adicione pelo menos um medicamento antes de imprimir',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const receitaData = {
        patient_id: patientId,
        patient_name: patientName,
        patient_cpf: patientCpf,
        professional_id: user?.id,
        professional_name: getProfessionalName(),
        professional_crm: professionalCrm,
        professional_uf: professionalUf,
        professional_council_label: professionalCouncilLabel,
        professional_specialty: professionalSpecialty,
        professional_rqe: professionalRqe,
        clinic_name: clinic?.name || '',
        clinic_cnpj: clinic?.cnpj || clinic?.cnpj_cpf || '',
        clinic_city: clinic?.city || '',
        clinic_state: clinic?.state || '',
        clinic_logo: getClinicLogoForPrescription(),
        clinic_address: clinic?.address || '',
        clinic_phone: clinic?.phone || '',
        medicamentos,
        observacoes,
        prescription_type: prescriptionType,
        protocol_name: selectedProtocolName,
        modo_assinatura: 'manual',
        data_emissao: new Date().toLocaleDateString('pt-BR'),
        hora_emissao: new Date().toLocaleTimeString('pt-BR'),
      };
      const htmlContent = gerarHtmlReceita({ receitaData, medicamentos, assinaturaDigital: false });
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          window.URL.revokeObjectURL(url);
        };
      }
      await onSuccess(receitaData);
      toast({
        title: '✅ Documento pronto para impressão!',
        description: 'Imprima e assine manualmente',
      });
    } catch (error) {
      console.error('Erro ao imprimir receita:', error);
      toast({
        title: 'Erro ao imprimir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    // 3. Tentar do user metadata
    if (user?.user_metadata?.full_name) {
      console.log('✅ Usando user.user_metadata.full_name:', user.user_metadata.full_name);
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.name) {
      console.log('✅ Usando user.user_metadata.name:', user.user_metadata.name);
      return user.user_metadata.name;
    }
    // 4. Fallback
    console.warn("⚠️ Usando fallback 'Profissional'");
    return 'Profissional';
  };

  // ...restante do código...
  // Função para adicionar medicamento
  const handleAdicionarMedicamento = () => {
    // Find the selected medication name
    const selectedMed = MEDICAMENTOS_EXEMPLO.find((m) => m.id == formData.medicamento_id);
    const novoMedicamento = {
      id: `${Date.now()}`,
      medicamento_id: formData.medicamento_id,
      nome: selectedMed ? selectedMed.nome : '',
      forma_farmaceutica: formData.forma_farmaceutica,
      via_administracao: formData.via_administracao,
      dose: formData.dose,
      frequencia: formData.frequencia,
      duracao_dias: parseInt(formData.duracao_dias),
      quantidade_total: parseInt(formData.quantidade_total),
      unidade_quantidade: formData.unidade_quantidade,
      repeticoes: parseInt(formData.repeticoes || 0),
      instrucoes: formData.instrucoes,
    };

    setMedicamentos([...medicamentos, novoMedicamento]);
    // Reset form
    setFormData(createEmptyMedicationForm());
    setSearchMed('');
    toast({
      title: 'Medicamento adicionado',
      description: 'Adicione mais medicamentos ou prossiga para assinar',
    });
  };

  const handleRemoverMedicamento = (id) => {
    setMedicamentos(medicamentos.filter((m) => m.id !== id));
  };

  const handleEditarMedicamento = (medicamento) => {
    loadMedicationIntoForm(medicamento);
    setMedicamentos(medicamentos.filter((item) => item.id !== medicamento.id));
    setTemplateFeedback(`Editando medicamento: ${medicamento.nome}`);
  };

  const handleAssinarCertificado = async () => {
    if (medicamentos.length === 0) {
      toast({
        title: 'Nenhum medicamento',
        description: 'Adicione pelo menos um medicamento antes de assinar',
        variant: 'destructive',
      });
      return;
    }
    if (!certificadoSelecionado) {
      toast({
        title: 'Certificado não selecionado',
        description: "Marque a opção 'Usar certificado digital A1'",
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const receitaData = {
        patient_id: patientId,
        patient_name: patientName,
        patient_cpf: patientCpf,
        professional_id: user?.id,
        professional_name: getProfessionalName(),
        professional_crm: professionalCrm,
        professional_uf: professionalUf,
        professional_council_label: professionalCouncilLabel,
        professional_specialty: professionalSpecialty,
        professional_rqe: professionalRqe,
        clinic_name: clinic?.name || '',
        clinic_cnpj: clinic?.cnpj || clinic?.cnpj_cpf || '',
        clinic_city: clinic?.city || '',
        clinic_state: clinic?.state || '',
        clinic_logo: getClinicLogoForPrescription(),
        clinic_address: clinic?.address || '',
        clinic_phone: clinic?.phone || '',
        medicamentos,
        observacoes,
        prescription_type: prescriptionType,
        protocol_name: selectedProtocolName,
        modo_assinatura: 'digital',
        certificado_id: 'A1-2024-001',
        data_emissao: new Date().toLocaleDateString('pt-BR'),
        hora_emissao: new Date().toLocaleTimeString('pt-BR'),
      };
      const htmlContent = gerarHtmlReceita({ receitaData, medicamentos, assinaturaDigital: true });
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      await onSuccess(receitaData);
      toast({
        title: '✅ Receita assinada com sucesso!',
        description: 'Receita assinada com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao assinar receita:', error);
      toast({
        title: 'Erro ao assinar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content">
        <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {editingData ? 'Editar Receita' : 'Nova Receita'}
          </DialogTitle>
          <p className="mt-1 text-sm text-gray-600">Passo {step} de 3</p>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Passo 1 - Medicamentos */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paciente</label>
                  <Input value={patientName} disabled className="bg-gray-50" />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-amber-950">
                            Melhoria 1: Favoritos do médico
                          </p>
                          <p className="text-xs text-amber-900">
                            Carregue combinações recorrentes sem redigitar.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSalvarFavorito}
                        >
                          {selectedFavoriteName ? 'Atualizar favorito' : 'Salvar favorito'}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {favoriteTemplates.length === 0 ? (
                          <p className="text-xs text-amber-900">Nenhum favorito salvo ainda.</p>
                        ) : (
                          favoriteTemplates.map((favorite) => (
                            <div
                              key={favorite.id || favorite.name}
                              className="flex items-center overflow-hidden rounded-md border border-amber-200 bg-white"
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-none px-3 text-amber-950 hover:bg-amber-100"
                                onClick={() => handleAplicarFavorito(favorite)}
                              >
                                Editar {favorite.name}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label={`Excluir favorito ${favorite.name}`}
                                className="h-8 rounded-none border-l border-amber-200 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleExcluirFavorito(favorite.name)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-sky-200 bg-sky-50">
                    <CardContent className="pt-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sky-950">
                            Melhoria 2: Protocolos prontos
                          </p>
                          <p className="text-xs text-sky-900">
                            Aplique modelos clínicos rápidos e salve os seus.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSalvarProtocoloAtual}
                        >
                          {selectedProtocolName ? 'Atualizar protocolo atual' : 'Salvar protocolo atual'}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {protocolOptions.length === 0 ? (
                          <p className="text-xs text-sky-900">Nenhum protocolo salvo ainda.</p>
                        ) : (
                          protocolOptions.map((protocol) => (
                            <div
                              key={protocol.id || protocol.name}
                              className="flex items-center overflow-hidden rounded-md border border-sky-200 bg-white"
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-none px-3 text-sky-950 hover:bg-sky-100"
                                onClick={() => handleAplicarProtocolo(protocol)}
                              >
                                Editar {protocol.name}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label={`Excluir protocolo ${protocol.name}`}
                                className="h-8 rounded-none border-l border-sky-200 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleExcluirProtocolo(protocol.name)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {templateFeedback ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
                    {templateFeedback}
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medicamento
                  </label>
                  <Input
                    placeholder="Buscar medicamento..."
                    value={searchMed}
                    onChange={(e) => setSearchMed(e.target.value)}
                    className="mb-3"
                  />

                  {searchMed && (
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto mb-4">
                      {filteredMedicamentos.map((med) => (
                        <button
                          key={med.id}
                          onClick={() => {
                            setFormData({ ...formData, medicamento_id: med.id.toString() });
                            setSearchMed('');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-200 last:border-0"
                        >
                          <p className="font-medium text-gray-900">{med.nome}</p>
                          <p className="text-xs text-gray-600">{med.apresentacao}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {formData.medicamento_id && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="font-medium text-blue-900">
                        {MEDICAMENTOS_EXEMPLO.find((m) => m.id == formData.medicamento_id)?.nome}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Forma farmacêutica
                    </label>
                    <select
                      value={formData.forma_farmaceutica}
                      onChange={(e) =>
                        setFormData({ ...formData, forma_farmaceutica: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecionar</option>
                      {FORMAS_FARMACEUTICAS.map((forma) => (
                        <option key={forma} value={forma}>
                          {forma}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Via de administração
                    </label>
                    <select
                      value={formData.via_administracao}
                      onChange={(e) =>
                        setFormData({ ...formData, via_administracao: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecionar</option>
                      {VIAS_ADMINISTRACAO.map((via) => (
                        <option key={via} value={via}>
                          {via}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dose</label>
                    <Input
                      placeholder="Ex: 1 comprimido"
                      value={formData.dose}
                      onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequência
                    </label>
                    <select
                      value={formData.frequencia}
                      onChange={(e) => setFormData({ ...formData, frequencia: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecionar</option>
                      {FREQUENCIAS.map((freq) => (
                        <option key={freq} value={freq}>
                          {freq}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duração (dias)
                  </label>
                  <Input
                    type="number"
                    placeholder="Ex: 7"
                    value={formData.duracao_dias}
                    onChange={(e) => setFormData({ ...formData, duracao_dias: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade total
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex: 30"
                      value={formData.quantidade_total}
                      onChange={(e) =>
                        setFormData({ ...formData, quantidade_total: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unidade</label>
                    <select
                      value={formData.unidade_quantidade}
                      onChange={(e) =>
                        setFormData({ ...formData, unidade_quantidade: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {UNIDADES_QUANTIDADE.map((unidade) => (
                        <option key={unidade} value={unidade}>
                          {unidade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repetições
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 2"
                      value={formData.repeticoes}
                      onChange={(e) => setFormData({ ...formData, repeticoes: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instruções Especiais (opcional)
                  </label>
                  <textarea
                    placeholder="Ex: Tomar com alimentos..."
                    value={formData.instrucoes}
                    onChange={(e) => setFormData({ ...formData, instrucoes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleAdicionarMedicamento}
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Medicamento
                </Button>

                {/* Lista de Medicamentos */}
                {medicamentos.length > 0 && (
                  <div className="space-y-3 mt-6 pt-6 border-t border-gray-200">
                    <p className="font-semibold text-gray-900">
                      Medicamentos ({medicamentos.length})
                    </p>
                    {medicamentos.map((med, idx) => (
                      <Card
                        key={med.id ? med.id : `${med.nome}-${med.dose}-${med.frequencia}-${idx}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{med.nome}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Forma/Via:</strong> {med.forma_farmaceutica} /{' '}
                                {med.via_administracao}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Dose:</strong> {med.dose}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Frequência:</strong> {med.frequencia}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Duração:</strong> {med.duracao_dias} dias
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Quantidade:</strong> {med.quantidade_total}{' '}
                                {med.unidade_quantidade}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Repetições:</strong> {med.repeticoes}
                              </p>
                              {med.instrucoes && (
                                <p className="text-sm text-gray-600">
                                  <strong>Instruções:</strong> {med.instrucoes}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditarMedicamento(med)}
                              >
                                <Pencil className="w-4 h-4" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleRemoverMedicamento(med.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Passo 2 - Observações */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Melhoria 3: Tipo de receita
                  </label>
                  <select
                    value={prescriptionType}
                    onChange={(e) => setPrescriptionType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PRESCRIPTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-600">{selectedPrescriptionType.guidance}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações Adicionais (opcional)
                  </label>
                  <textarea
                    placeholder="Observações clínicas, contraindicações, etc..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={10}
                  />
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <p className="text-sm text-blue-900">
                      <strong>💡 Dica:</strong> Adicione informações como restrições alimentares,
                      interações medicamentosas ou observações importantes para a farmácia.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="pt-6">
                    <p className="text-sm text-slate-700">
                      <strong>Tipo selecionado:</strong> {selectedPrescriptionType.label}
                    </p>
                    {selectedProtocolName ? (
                      <p className="mt-2 text-sm text-slate-700">
                        <strong>Protocolo aplicado:</strong> {selectedProtocolName}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Passo 3 - Assinatura Digital */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Card className="border-2 border-emerald-200 bg-emerald-50">
                  <CardHeader>
                    <CardTitle className="text-emerald-900 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Resumo da Receita
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">
                        Medicamentos ({medicamentos.length})
                      </p>
                      <div className="space-y-2">
                        {medicamentos.map((med) => (
                          <div
                            key={med.id}
                            className="text-sm text-gray-700 rounded-lg bg-white/70 p-3"
                          >
                            <p>
                              • <strong>{med.nome}</strong> - {med.dose}, {med.frequencia},{' '}
                              {med.duracao_dias}d
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              Forma: {med.forma_farmaceutica} | Via: {med.via_administracao} |
                              Quantidade: {med.quantidade_total} {med.unidade_quantidade} |
                              Repetições: {med.repeticoes}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Tipo de receita</p>
                      <p className="text-sm text-gray-700">{selectedPrescriptionType.label}</p>
                      {selectedProtocolName ? (
                        <p className="text-xs text-gray-600">Protocolo: {selectedProtocolName}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Profissional</p>
                      <p className="text-sm text-gray-700">{getProfessionalName()}</p>
                      <p className="text-xs text-gray-600">
                        {professionalCouncilLabel}: {professionalCrm || '_____'} /{' '}
                        {professionalUf || '_____'}
                      </p>
                      {professionalSpecialty && (
                        <p className="text-xs text-gray-600">
                          Especialidade: {professionalSpecialty}
                        </p>
                      )}
                      {professionalRqe && (
                        <p className="text-xs text-gray-600">RQE: {professionalRqe}</p>
                      )}
                    </div>
                    {observacoes && (
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">Observações</p>
                        <p className="text-sm text-gray-700">{observacoes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div>
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={certificadoSelecionado}
                      onChange={(e) => setCertificadoSelecionado(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-gray-900">
                      Usar certificado digital A1 para assinar
                    </span>
                  </label>
                </div>

                {/* Aviso MeMed removido */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-between gap-3 border-t border-gray-200 bg-white px-6 pb-6 pt-6">
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>

          <div className="flex gap-3">
            {step > 1 && (
              <Button onClick={() => setStep(step - 1)} variant="outline">
                Voltar
              </Button>
            )}

            {step < 3 && (
              <Button
                onClick={() => {
                  if (step === 1 && medicamentos.length === 0) {
                    toast({
                      title: 'Adicione medicamentos',
                      description: 'É necessário adicionar pelo menos um medicamento',
                      variant: 'destructive',
                    });
                    return;
                  }
                  setStep(step + 1);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Próximo
              </Button>
            )}

            {step === 3 && (
              <div className="flex gap-2">
                <Button
                  onClick={handleImprimirParaAssinatura}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Preparando...
                    </>
                  ) : (
                    <>📄 Imprimir para Assinatura Manual</>
                  )}
                </Button>

                <Button
                  onClick={handleAssinarCertificado}
                  disabled={loading || !certificadoSelecionado}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Assinando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Assinar com Certificado
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReceitaDigitalModal;
