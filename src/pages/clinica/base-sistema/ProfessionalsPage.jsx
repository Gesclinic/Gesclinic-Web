// src/pages/clinica/base-sistema/ProfessionalsPage.jsx
// ============================================================
// CRUD Completo de Profissionais - Base do Sistema com ABAS
// Abas: Dados | Serviços | Convênios | Agenda | Financeiro
// Cache invalidation: 2025-03-17 v2
// ============================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/lib/customSupabaseClient';
import * as professionalsApi from '@/lib/professionalsApi';
import * as professionalServicesApi from '@/lib/professionalServicesApi';
import * as professionalPayerApi from '@/lib/professionalPayerApi';
import * as professionalScheduleApi from '@/lib/professionalScheduleApi';
import * as servicesApi from '@/lib/servicesApi';
import * as healthInsurancesApi from '@/lib/healthInsurancesApi';
import { DAYS_OF_WEEK, PAYMENT_METHODS } from '@/lib/selectConstants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus, Edit2, X, Check, Users, FileText, Download, User } from 'lucide-react';
import BaseSystemHeader from '@/components/layout/BaseSystemHeader';
import { Alert } from '@/components/layout/BaseSystemAlert';
import EmptyState from '@/components/layout/EmptyState';
import { maskCPF, maskPhone } from '@/components/forms/MaskedInput';
import { ProfessionalServicesTab } from '@/components/base-sistema/ProfessionalServicesTab';
import { ProfessionalScheduleTab } from '@/components/base-sistema/ProfessionalScheduleTab';
import ProfessionalConveniosTab from '@/components/base-sistema/ProfessionalConveniosTab';

// Memoized ProfessionalRow component - prevents re-renders when parent updates
const ProfessionalRow = React.memo(
  ({ professional, selectProfessional, handleEditInList, handleInactivate, submitting }) => (
    <tr className="border-b hover:bg-gray-50 transition">
      <td
        className="py-3 px-4 font-medium text-blue-600 cursor-pointer hover:text-blue-700"
        onClick={() => selectProfessional(professional)}
      >
        <div className="flex items-center gap-3">
          {professional.photo_url ? (
            <img
              src={professional.photo_url}
              alt={professional.name}
              className="w-10 h-10 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
              {professional.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <span>{professional.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-gray-600">
        {professional.cpf ? maskCPF(professional.cpf) : '-'}
      </td>
      <td className="py-3 px-4 text-gray-600">{professional.specialization || '-'}</td>
      <td className="py-3 px-4 text-gray-600">{professional.email || '-'}</td>
      <td className="py-3 px-4 text-gray-600">
        {professional.phone ? maskPhone(professional.phone) : '-'}
      </td>
      <td className="py-3 px-4 text-center">
        {professional.active ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="w-3 h-3" />
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <X className="w-3 h-3" />
            Inativo
          </span>
        )}
      </td>
      <td className="py-3 px-4 flex justify-center gap-2">
        <button
          onClick={() => handleEditInList(professional)}
          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
          disabled={submitting}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        {professional.active && (
          <button
            onClick={() => handleInactivate(professional.id, professional.name)}
            className="p-2 hover:bg-yellow-100 rounded-lg text-yellow-600 transition"
            disabled={submitting}
            title="Inativar profissional"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  ),
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if professional data or key handlers change
    return (
      prevProps.professional.id === nextProps.professional.id &&
      prevProps.professional.active === nextProps.professional.active &&
      prevProps.professional.name === nextProps.professional.name &&
      prevProps.submitting === nextProps.submitting
    );
  },
);

ProfessionalRow.displayName = 'ProfessionalRow';

export function ProfessionalsPage() {
  // ============================================================
  // STATES & HOOKS
  // ============================================================
  const { user, clinicId } = useAuth();
  const { clinic, loadingClinic } = useClinicContext();
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [healthInsurances, setHealthInsurances] = useState([]);
  const [professionalServices, setProfessionalServices] = useState({});
  const [professionalPayers, setProfessionalPayers] = useState({});
  const [financialRules, setFinancialRules] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cacheError, setCacheError] = useState(null);

  const [showListForm, setShowListForm] = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    specialization: '',
    rqe: '',
    cremepe_crm: '',
    commercial_address: '',
    city: '',
    state: '',
    zip_code: '',
    active: true,
    documents: [],
    photo_url: null,
  });

  const [documentUploading, setDocumentUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [tabLoading, setTabLoading] = useState(false);
  const [scheduleFormState, setScheduleFormState] = useState({
    isEditing: false,
    hasUnsavedData: false,
  });
  const [associatedUser, setAssociatedUser] = useState(null);
  const [userRole, setUserRole] = useState('profissional');
  const [showAccessProfileModal, setShowAccessProfileModal] = useState(false);
  const [tempUserRole, setTempUserRole] = useState('profissional');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Estados para vincular usuário existente
  const [showLinkUserModal, setShowLinkUserModal] = useState(false);
  const [searchUsersInput, setSearchUsersInput] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [linkingUser, setLinkingUser] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0); // Força re-render

  const {
    pageNum,
    pageSize,
    goToPage,
    prevPage,
    nextPage,
    totalPages,
    items: paginatedProfessionals,
  } = usePagination(professionals || [], 10);

  // ============================================================
  // LOAD DATA
  // ============================================================
  const loadData = useCallback(async () => {
    if (!clinicId || !user) {
      console.warn('🔴 [ProfessionalsPage] Missing clinicId or user:', {
        clinicId,
        user: user?.email,
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [ProfessionalsPage] Loading professionals for clinicId:', clinicId);

      const [profs, svcs, insurances] = await Promise.all([
        professionalsApi.listProfessionals(clinicId),
        servicesApi.listServices(clinicId),
        healthInsurancesApi.listHealthInsurances(clinicId),
      ]);

      console.log('✅ [ProfessionalsPage] Loaded professionals:', {
        count: profs?.length || 0,
        data: profs,
        clinicId,
      });

      setProfessionals(profs || []);
      setServices(svcs || []);
      setHealthInsurances(insurances || []);
    } catch (err) {
      console.error('❌ [ProfessionalsPage] Error loading data:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [clinicId, user, setProfessionals, setServices, setHealthInsurances]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔗 Buscar usuário associado quando selecionar profissional
  React.useEffect(() => {
    const loadAssociatedUser = async () => {
      console.log('🔄 [loadAssociatedUser] useEffect disparado!');
      console.log('📊 selectedProfessional:', selectedProfessional);
      console.log('🏥 clinicId:', clinicId);

      if (!clinicId || (!selectedProfessional?.email && !selectedProfessional?.cpf)) {
        console.log('⚠️ [loadAssociatedUser] Sem clinicId ou sem email/cpf');
        setAssociatedUser(null);
        setUserRole('profissional');
        return;
      }

      // Normaliza CPF (remove máscara)
      const normalizeCpf = (cpf) => (cpf ? cpf.replace(/\D/g, '') : '');
      const email = (selectedProfessional.email || '').trim().toLowerCase();
      const cpf = normalizeCpf(selectedProfessional.cpf || '');
      console.log('[DEBUG] selectedProfessional.email:', selectedProfessional.email);
      console.log('[DEBUG] selectedProfessional.cpf:', selectedProfessional.cpf);
      console.log('[DEBUG] Email normalizado:', email);
      console.log('[DEBUG] CPF normalizado:', cpf);
      console.log('[DEBUG] Buscando usuário associado:', { email, cpf, clinicId });

      try {
        // 1. Buscar por email + clinic_id
        const { data: userByEmail, error: errorByEmail } = await supabase
          .from('users')
          .select('id, email, full_name, role, clinic_id, cpf')
          .eq('email', email)
          .eq('clinic_id', clinicId)
          .maybeSingle();
        console.log('[DEBUG] 📧 Resultado busca por email:', { email, userByEmail, errorByEmail });

        let user = userByEmail;

        // 2. Se não achou, buscar por CPF (normalizado) + clinic_id
        if (!user && cpf) {
          const { data: userByCpf, error: errorByCpf } = await supabase
            .from('users')
            .select('id, email, full_name, role, clinic_id, cpf')
            .eq('cpf', cpf)
            .eq('clinic_id', clinicId)
            .maybeSingle();
          console.log('[DEBUG] 🆔 Resultado busca por CPF:', { cpf, userByCpf, errorByCpf });
          user = userByCpf;
        }

        if (user) {
          console.log('🔗 [PROFISSIONAL] ✅ Usuário associado encontrado:', user);
          setAssociatedUser(user);
          setUserRole(user.role || 'profissional');
        } else {
          console.log('[DEBUG] ❌ Nenhum usuário associado encontrado para:', {
            email,
            cpf,
            clinicId,
          });
          setAssociatedUser(null);
          setUserRole('profissional');
        }
      } catch (err) {
        console.error('❌ Erro ao buscar usuário associado:', err);
        setAssociatedUser(null);
      }
    };

    loadAssociatedUser();
  }, [selectedProfessional?.email, selectedProfessional?.cpf, clinicId]);

  // Carrega dados das abas quando muda
  React.useEffect(() => {
    const loadTabData = async () => {
      if (!editingListId || !clinicId) {
        return;
      }

      try {
        setTabLoading(true);

        // Carregar serviços do profissional
        if (activeTab === 'servicos') {
          const profServices = await professionalServicesApi.getProfessionalServices(editingListId);
          setProfessionalServices({
            ...professionalServices,
            [editingListId]: profServices?.map((ps) => ps.service_id) || [],
          });
        }
      } catch (err) {
        console.error('Erro ao carregar dados da aba:', err);
      } finally {
        setTabLoading(false);
      }
    };

    loadTabData();
  }, [activeTab, editingListId, clinicId]);

  // ============================================================
  // FORM HANDLERS
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clinicId || !user) {
      return;
    }

    // Salvar dados gerais (quando em "dados" aba)
    // Abas de serviços e disponibilidades agora salvam automaticamente via componentes
    try {
      setSubmitting(true);
      setError(null);

      const dataToSave = {
        clinic_id: clinicId,
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.replace(/\D/g, '') || null,
        cpf: formData.cpf?.replace(/\D/g, '') || null,
        specialization: formData.specialization?.trim() || null,
        cremepe_crm: formData.cremepe_crm?.trim() || null,
        rqe: formData.rqe?.trim() || null,
        commercial_address: formData.commercial_address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        zip_code: formData.zip_code?.trim() || null,
        active: formData.active,
        photo_url: formData.photo_url || null,
        documents: formData.documents.length > 0 ? JSON.stringify(formData.documents) : null,
      };

      if (editingListId) {
        console.log(
          '📝 [handleSubmit] Atualizando profissional:',
          editingListId,
          'com user_id:',
          dataToSave.user_id,
        );
        console.log('📧 [handleSubmit] Email que será salvo:', dataToSave.email);
        console.log('🆔 [handleSubmit] CPF que será salvo:', dataToSave.cpf);
        await professionalsApi.updateProfessional(editingListId, dataToSave);

        // 🔗 Atualizar papel do usuário associado se foi mudado
        if (associatedUser && userRole && userRole !== associatedUser.role) {
          console.log('🔗 [PROFISSIONAL] Atualizando papel do usuário para:', userRole);
          try {
            const { error: updateUserError } = await supabase
              .from('users')
              .update({ role: userRole, updated_at: new Date().toISOString() })
              .eq('id', associatedUser.id);

            if (updateUserError) {
              console.warn(
                '⚠️ [PROFISSIONAL] Erro ao atualizar papel do usuário:',
                updateUserError,
              );
            } else {
              console.log('✅ [PROFISSIONAL] Papel do usuário atualizado');
            }
          } catch (err) {
            console.warn('⚠️ [PROFISSIONAL] Erro ao atualizar papel:', err);
          }
        }

        // Salvar serviços do profissional se foram alterados
        if (professionalServices[editingListId]?.length > 0) {
          const serviceIds = professionalServices[editingListId] || [];
          for (const serviceId of serviceIds) {
            try {
              await professionalServicesApi.upsertProfessionalService(editingListId, serviceId);
            } catch (err) {
              console.warn('Erro ao salvar serviço:', err);
            }
          }
        }
      } else {
        await professionalsApi.createProfessional(clinicId, dataToSave);
      }

      const updated = await professionalsApi.listProfessionals(clinicId);
      setProfessionals(updated || []);

      // Atualizar selectedProfessional com dados atualizados para forçar reload do usuário associado
      if (editingListId) {
        const updatedProfessional = updated?.find((p) => p.id === editingListId);
        if (updatedProfessional) {
          console.log('🔄 Atualizando selectedProfessional com dados novos:', updatedProfessional);
          setSelectedProfessional(updatedProfessional);
        }
      }

      setSuccess(
        editingListId
          ? '✅ Profissional atualizado com sucesso!'
          : '✅ Profissional criado com sucesso!',
      );
      setTimeout(() => {
        closeListForm();
        setSelectedDocType('');
        setSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Error saving professional:', err);
      setError(err.message || 'Erro ao salvar profissional');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewInList = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      specialization: '',
      rqe: '',
      cremepe_crm: '',
      commercial_address: '',
      city: '',
      state: '',
      zip_code: '',
      active: true,
      documents: [],
      photo_url: null,
    });
    setEditingListId(null);
    setSelectedProfessional(null); // Clear selected professional for new one
    setAssociatedUser(null); // No associated user for new professional
    setUserRole('profissional');
    setShowListForm(true);
    setSelectedDocType('');
  };

  const handleEditInList = async (professional) => {
    setFormData({
      name: professional.name || '',
      email: professional.email || '',
      phone: professional.phone || '',
      cpf: professional.cpf || '',
      specialization: professional.specialization || '',
      rqe: professional.rqe || '',
      cremepe_crm: professional.cremepe_crm || '',
      commercial_address: professional.commercial_address || '',
      city: professional.city || '',
      state: professional.state || '',
      zip_code: professional.zip_code || '',
      active: professional.active !== false,
      documents: professional.documents
        ? typeof professional.documents === 'string'
          ? JSON.parse(professional.documents)
          : professional.documents
        : [],
      photo_url: professional.photo_url || null,
    });
    console.log('[DEBUG] Abrindo modal para:', professional);
    setEditingListId(professional.id);

    // 🔄 Trigger useEffect asap to load associated user BEFORE showing modal
    setSelectedProfessional(professional);

    // Aguardar um pouco para useEffect disparar e carregar o usuário
    await new Promise((r) => setTimeout(r, 200));

    setShowListForm(true);
    setSelectedDocType('');
    setActiveTab('dados'); // Reset para aba de dados
  };

  const closeListForm = () => {
    setShowListForm(false);
    setEditingListId(null);
    setScheduleFormState({ isEditing: false, hasUnsavedData: false });
    // NÃO RESETAR associatedUser/userRole aqui - deixar para quando abrir novo profissional
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      specialization: '',
      rqe: '',
      cremepe_crm: '',
      commercial_address: '',
      city: '',
      state: '',
      zip_code: '',
      active: true,
      documents: [],
      photo_url: null,
    });
    setSelectedDocType('');
  };

  const handleCloseWithCheck = () => {
    const hasData = Object.entries(formData).some(([key, value]) => {
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
      if (typeof value === 'number') {
        return value !== 0;
      }
      if (typeof value === 'boolean') {
        return value !== true;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return false;
    });

    if (hasData) {
      if (window.confirm('Tem certeza que deseja sair? As alterações não salvas serão perdidas.')) {
        closeListForm();
      }
    } else {
      closeListForm();
    }
  };

  const selectProfessional = (professional) => {
    setSelectedProfessional(professional);
  };

  const handleInactivate = async (id) => {
    if (!window.confirm('Tem certeza que deseja desativar este profissional?')) {
      return;
    }

    try {
      setSubmitting(true);
      await professionalsApi.updateProfessional(id, { active: false });
      const updated = await professionalsApi.listProfessionals(clinicId);
      setProfessionals(updated || []);
    } catch (err) {
      console.error('Error inactivating professional:', err);
      setError(err.message || 'Erro ao desativar profissional');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAccessProfileModal = () => {
    if (!associatedUser) {
      setError('Nenhum usuário associado a este profissional');
      return;
    }
    setTempUserRole(userRole);
    setShowAccessProfileModal(true);
  };

  const handleCreateAssociatedUser = async () => {
    console.log('🔍 handleCreateAssociatedUser chamado');
    // Buscar profissional da lista usando editingListId
    const professional = professionals?.find((p) => p.id === editingListId);
    console.log('👨‍⚕️ Professional encontrado:', professional);
    console.log('📝 FormData:', formData);

    const dataToUse = professional || formData;
    console.log('📊 Data to use:', dataToUse);

    if (!dataToUse?.email || !dataToUse?.name) {
      console.error('❌ Email ou Name ausentes:', {
        email: dataToUse?.email,
        name: dataToUse?.name,
      });
      setError('Dados do profissional incompletos - Nome e Email são obrigatórios');
      return;
    }

    console.log('✅ Validação inicial passou');

    // Normaliza CPF (remove máscara)
    const normalizeCpf = (cpf) => (cpf ? cpf.replace(/\D/g, '') : '');
    const email = dataToUse.email;
    const cpf = normalizeCpf(dataToUse.cpf || '');

    console.log('📧 Email normalizado:', email);
    console.log('🆔 CPF normalizado:', cpf);
    console.log('🏥 ClinicId:', clinicId);

    try {
      setUpdatingRole(true);
      console.log('⏳ Estado updatingRole definido como true');
      setError(null);

      // Checar se já existe usuário com mesmo email OU CPF na clínica
      console.log('🔎 Checando se email já existe...');
      const { data: existingUserByEmail, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      console.log('📋 Query email result:', { existingUserByEmail, emailError });

      let existingUserByCpf = null;
      if (cpf) {
        console.log('🔎 Checando se CPF já existe...');
        const res = await supabase
          .from('users')
          .select('id')
          .eq('cpf', cpf)
          .eq('clinic_id', clinicId)
          .maybeSingle();
        console.log('📋 Query CPF result:', res);
        console.log(
          '📋 res.data:',
          res.data,
          '| Tipo:',
          typeof res.data,
          '| Booleano:',
          !!res.data,
        );
        existingUserByCpf = res.data;
      }

      console.log('🔍 Verificação duplicata:');
      console.log(
        '  - existingUserByEmail:',
        existingUserByEmail,
        '| Booleano:',
        !!existingUserByEmail,
      );
      console.log('  - existingUserByCpf:', existingUserByCpf, '| Booleano:', !!existingUserByCpf);
      console.log('  - Condicional (|): ', existingUserByEmail || existingUserByCpf);

      console.log('🚨 Verificando condições ANTES do if...');
      console.log('  -> (!!existingUserByEmail):', !!existingUserByEmail);
      console.log('  -> (!!existingUserByCpf):', !!existingUserByCpf);
      console.log(
        '  -> (existingUserByEmail || existingUserByCpf):',
        !!(existingUserByEmail || existingUserByCpf),
      );

      if (existingUserByEmail || existingUserByCpf) {
        console.error('❌ ENTROU NO IF - Usuário duplicado encontrado');
        setError(
          'Já existe um usuário com este e-mail ou CPF vinculado à clínica. Não é possível criar outro.',
        );
        setUpdatingRole(false);
        console.log('❌ setError e setUpdatingRole chamados - retornando...');
        setTimeout(() => {
          setError(null);
        }, 5000);
        return;
      }
      console.log('✅ Nenhum usuário duplicado - continuando com criação...');

      // Criar novo usuário - apenas com campos que existem na tabela
      const userId = crypto.randomUUID();
      console.log('🆕 Nova ID gerada:', userId);
      console.log('📤 Inserindo novo usuário com dados:', {
        id: userId,
        email: dataToUse.email,
        full_name: dataToUse.name,
        username: dataToUse.name.toLowerCase().replace(/\s+/g, '.'),
        cpf: cpf || null,
        phone: dataToUse.phone || null,
        clinic_id: clinicId,
        role: 'profissional',
        status: 'ativo',
      });

      const { error: createError } = await supabase.from('users').insert({
        id: userId,
        email: dataToUse.email,
        full_name: dataToUse.name,
        username: dataToUse.name.toLowerCase().replace(/\s+/g, '.'),
        cpf: cpf || null,
        phone: dataToUse.phone || null,
        clinic_id: clinicId,
        role: 'profissional',
        status: 'ativo',
        created_at: new Date().toISOString(),
      });

      if (createError) {
        console.error('❌ Erro ao inserir usuário:', createError);
        setError('Erro ao criar usuário associado: ' + (createError.message || ''));
        setUpdatingRole(false);
        setTimeout(() => {
          setError(null);
        }, 5000);
        return;
      }

      console.log('✅ Usuário inserido com sucesso');

      // Buscar o usuário criado
      console.log('🔍 Buscando usuário recém-criado...');
      const { data: newUser, error: fetchError } = await supabase
        .from('users')
        .select('id, email, full_name, role, clinic_id')
        .eq('id', userId);

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (fetchError) {
        console.error('❌ Erro ao buscar usuário criado:', fetchError);
        setError('Usuário criado, mas não foi possível buscar os dados.');
        setUpdatingRole(false);
        setTimeout(() => {
          setError(null);
        }, 5000);
        return;
      }

      console.log('✅ Usuário buscado com sucesso:', newUser);

      setAssociatedUser(newUser);
      setUserRole('profissional');
      setSuccess('✅ Usuário criado e associado com sucesso!');
      console.log('✅ Estados atualizados, sucesso!');
      setTimeout(() => {
        setSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('❌ Erro catch:', err);
      setError('Erro ao criar usuário associado: ' + (err.message || err.error_description || ''));
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setUpdatingRole(false);
      console.log('🔚 Finally: updatingRole definido como false');
    }
  };

  const handleCloseAccessProfileModal = () => {
    setShowAccessProfileModal(false);
    setTempUserRole('profissional');
  };

  const handleSaveAccessProfile = async () => {
    if (!associatedUser) {
      setError('Nenhum usuário associado');
      return;
    }

    try {
      setUpdatingRole(true);
      setError(null);

      const { error: updateUserError } = await supabase
        .from('users')
        .update({ role: tempUserRole, updated_at: new Date().toISOString() })
        .eq('id', associatedUser.id);

      if (updateUserError) {
        throw updateUserError;
      }

      console.log('✅ [PERFIL] Papel do usuário atualizado para:', tempUserRole);
      setUserRole(tempUserRole);
      setAssociatedUser({ ...associatedUser, role: tempUserRole });
      setSuccess('✅ Perfil de acesso atualizado com sucesso!');

      setTimeout(() => {
        handleCloseAccessProfileModal();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('❌ Erro ao atualizar papel:', err);
      setError(err.message || 'Erro ao atualizar perfil de acesso');
    } finally {
      setUpdatingRole(false);
    }
  };

  // ============================================================
  // SEARCH AND LINK EXISTING USERS
  // ============================================================

  const handleSearchUsers = async (searchTerm) => {
    try {
      setSearchUsersInput(searchTerm);
      setAvailableUsers([]);

      if (!searchTerm || searchTerm.trim().length < 2) {
        return;
      }

      console.log('🔍 Buscando usuários contendo:', searchTerm);

      // Buscar usuários que correspondem ao termo de busca (nome ou email)
      const { data: users, error: err } = await supabase
        .from('users')
        .select('id, email, full_name, role, clinic_id, status')
        .eq('clinic_id', clinicId)
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (err) {
        console.error('❌ Erro ao buscar usuários:', err);
        setError('Erro ao buscar usuários: ' + err.message);
        setTimeout(() => setError(null), 5000);
        return;
      }

      console.log('✅ Usuários encontrados:', users);
      setAvailableUsers(users || []);
    } catch (err) {
      console.error('❌ Erro ao buscar usuários:', err);
      setError('Erro ao buscar usuários');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleLinkExistingUser = async (selectedUser) => {
    try {
      setLinkingUser(true);
      setError(null);

      console.log('🔗 Vinculando usuário:', selectedUser);
      console.log('👨‍⚕️ Professional ID:', editingListId);
      console.log('📧 Email do usuário:', selectedUser.email);
      console.log('📧 Email do profissional (formData):', formData.email);

      // Atualizar formData com email do usuário vinculado
      const updatedFormData = {
        ...formData,
        email: selectedUser.email || formData.email,
        cpf: selectedUser.cpf || formData.cpf,
      };

      console.log('📝 FormData atualizado:', updatedFormData);
      setFormData(updatedFormData);

      // ⭐ SALVAR IMEDIATAMENTE o profissional com o novo email
      console.log('💾 Salvando vínculo imediatamente no banco...');

      const dataToSave = {
        clinic_id: clinicId,
        name: updatedFormData.name?.trim() || formData.name?.trim(),
        email: updatedFormData.email?.trim() || null,
        phone: updatedFormData.phone?.replace(/\D/g, '') || null,
        cpf: updatedFormData.cpf?.replace(/\D/g, '') || null,
        specialization: updatedFormData.specialization?.trim() || null,
        cremepe_crm: updatedFormData.cremepe_crm?.trim() || null,
        rqe: updatedFormData.rqe?.trim() || null,
        commercial_address: updatedFormData.commercial_address?.trim() || null,
        city: updatedFormData.city?.trim() || null,
        state: updatedFormData.state?.trim() || null,
        zip_code: updatedFormData.zip_code?.trim() || null,
        active: updatedFormData.active,
        photo_url: updatedFormData.photo_url || null,
        documents:
          updatedFormData.documents?.length > 0 ? JSON.stringify(updatedFormData.documents) : null,
      };

      console.log('📤 Dados a salvar (vínculo):', dataToSave);

      if (editingListId) {
        await professionalsApi.updateProfessional(editingListId, dataToSave);
        console.log('✅ Vínculo salvo no banco de dados!');

        // Aguardar um pouco para o banco processar
        await new Promise((r) => setTimeout(r, 500));

        // 🔄 Recarregar a lista de profissionais
        const updated = await professionalsApi.listProfessionals(clinicId);
        setProfessionals(updated || []);
        console.log('🔄 Lista de profissionais recarregada');

        // 🔄 Atualizar selectedProfessional com dados novos para disparar loadAssociatedUser
        const updatedProfessional = updated?.find((p) => p.id === editingListId);
        if (updatedProfessional) {
          console.log('📝 Atualizando selectedProfessional:', updatedProfessional);
          setSelectedProfessional(updatedProfessional);
        }
      }

      // 🔄 FORÇA RE-RENDER da modal
      setRefreshCounter((prev) => prev + 1);

      setSuccess('✅ Usuário vinculado e salvo com sucesso!');

      // Aguard mais tempo para garantir que o useEffect dispare, faça a query, e carregue usuário
      await new Promise((r) => setTimeout(r, 1200));

      // Fechar modal de busca
      setShowLinkUserModal(false);
      setSearchUsersInput('');
      setAvailableUsers([]);

      setTimeout(() => setSuccess(null), 3000);

      console.log('✅ Vínculo completo!');
    } catch (err) {
      console.error('❌ Erro ao vincular usuário:', err);
      setError('Erro ao vincular usuário: ' + err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLinkingUser(false);
    }
  };

  // ============================================================
  // PHOTO HANDLERS
  // ============================================================

  const handleDocumentUpload = () => {};
  const removeDocument = () => {};

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, photo_url: event.target.result });
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setFormData({ ...formData, photo_url: null });
  };

  const handleCameraCapture = (photoData) => {
    setFormData({ ...formData, photo_url: photoData });
    setShowCameraModal(false);
  };

  // Force cache bust: timestamp 2025-03-17-v3
  // ============================================================
  // Render: Listagem Principal
  // ============================================================

  return (
    <div className="space-y-6 w-full mx-auto">
      <BaseSystemHeader
        category="4.1 Cadastros Estruturais"
        title="Profissionais"
        subtitle="Gerencie os profissionais da clínica"
      />

      {cacheError && <Alert type="error" title="Aviso" message={cacheError} onClose={() => {}} />}

      {success && (
        <Alert type="success" title="Sucesso" message={success} onClose={() => setSuccess(null)} />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Profissionais Cadastrados ({professionals.length})</CardTitle>
          <Button
            onClick={handleNewInList}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Profissional
          </Button>
        </CardHeader>
        <CardContent>
          {professionals.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12 mx-auto text-gray-400" />}
              title="Nenhum profissional cadastrado"
              description="Comece adicionando seu primeiro profissional para gerenciar a clínica"
              action={
                <Button onClick={handleNewInList} className="bg-blue-600 hover:bg-blue-700">
                  Cadastrar Primeiro Profissional
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">CPF</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Especialização
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Telefone</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(paginatedProfessionals || []).map((professional) => (
                      <ProfessionalRow
                        key={professional.id}
                        professional={professional}
                        selectProfessional={selectProfessional}
                        handleEditInList={handleEditInList}
                        handleInactivate={handleInactivate}
                        submitting={submitting}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Página {pageNum + 1} de {totalPages} ({professionals.length} profissionais)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={prevPage} disabled={pageNum === 0}>
                      ← Anterior
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(0, pageNum - 2);
                        const pageNumber = start + i;
                        if (pageNumber >= totalPages) {
                          return null;
                        }
                        return (
                          <Button
                            key={pageNumber}
                            variant={pageNum === pageNumber ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(pageNumber)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNumber + 1}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={pageNum >= totalPages - 1}
                    >
                      Próximo →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {showListForm && (
        <div className="app-modal-overlay" key={`modal-${editingListId}-${refreshCounter}`}>
          <div className="app-modal-shell app-modal-shell--form app-modal-shell--medium">
            <Card
              key={`card-${editingListId}-${refreshCounter}`}
              className="app-modal-card shadow-2xl border-0"
            >
              {/* Header */}
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg shadow-md"
                style={{ flexShrink: 0 }}
              >
                <div className="flex items-center gap-3">
                  <User size={24} className="text-white" />
                  <h2 className="text-xl font-bold text-white">
                    {editingListId ? '✏️ Editar Profissional' : '➕ Novo Profissional'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleCloseWithCheck()}
                  className="text-white hover:bg-blue-600 p-2 rounded-full transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* MENSAGENS DE ERRO/SUCESSO */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">❌</span>
                    <div>
                      <p className="text-sm font-semibold text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-sm font-semibold text-green-800">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* NAVEGAÇÃO DE ABAS */}
              {editingListId && (
                <div className="border-b bg-white" style={{ flexShrink: 0 }}>
                  <div className="flex gap-2 px-6 overflow-x-auto">
                    {[
                      { id: 'dados', label: '📋 Dados' },
                      { id: 'servicos', label: '🔧 Serviços' },
                      { id: 'convenios', label: '🏥 Convênios' },
                      { id: 'disponibilidade', label: '📅 Disponibilidades' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Content - Scrollable */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                {/* ABA: DADOS */}
                {activeTab === 'dados' && (
                  <form
                    id="professional-form"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    style={{ padding: '24px' }}
                  >
                    <div style={{ width: '100%' }}>
                      {/* SEÇÃO 1: FOTO E NOME */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                        <div className="border-b pb-3">
                          <h3 className="text-lg font-bold text-gray-900">
                            👤 Foto e Identificação
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Informações básicas do profissional
                          </p>
                        </div>

                        {/* Foto e Nome - Alinhados */}
                        <div className="flex gap-4 items-start">
                          {/* Foto */}
                          <div className="flex flex-col items-center gap-2">
                            {formData.photo_url ? (
                              <div className="flex flex-col items-center gap-2">
                                <img
                                  src={formData.photo_url}
                                  alt="Foto do profissional"
                                  className="w-32 h-40 object-cover rounded-lg border-2 border-blue-300 shadow"
                                />
                                {/* Ícones abaixo da foto */}
                                <div className="flex gap-2">
                                  <input
                                    type="file"
                                    id="photo-upload-existing"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                    disabled={submitting || photoUploading}
                                    accept="image/*"
                                  />
                                  <label
                                    htmlFor="photo-upload-existing"
                                    className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-full text-lg shadow transition cursor-pointer"
                                    title="Upload de arquivo"
                                  >
                                    📁
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setShowCameraModal(true)}
                                    className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full text-lg shadow transition"
                                    title="Capturar nova foto"
                                    disabled={submitting || photoUploading}
                                  >
                                    📷
                                  </button>
                                  <a
                                    href={formData.photo_url}
                                    download="foto-profissional"
                                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full text-lg shadow transition"
                                    title="Baixar foto"
                                  >
                                    ⬇️
                                  </a>
                                  <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full text-lg shadow transition"
                                    title="Remover foto"
                                    disabled={submitting}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer group">
                                <input
                                  type="file"
                                  id="photo-upload"
                                  onChange={handlePhotoUpload}
                                  className="hidden"
                                  disabled={submitting || photoUploading}
                                  accept="image/*"
                                />
                                <label
                                  htmlFor="photo-upload"
                                  className="cursor-pointer flex flex-col items-center gap-1 w-full h-full flex items-center justify-center"
                                >
                                  <span className="text-3xl">📁</span>
                                  <span className="text-xs text-gray-600 group-hover:text-blue-600 font-semibold">
                                    Arquivo
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setShowCameraModal(true)}
                                  className="text-2xl hover:scale-110 transition"
                                  title="Usar câmera"
                                  disabled={submitting || photoUploading}
                                >
                                  📷
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Nome e Especialização */}
                          <div className="flex-1 space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Nome <span className="text-red-600 font-bold">*</span>
                              </label>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Dr. João Silva"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={submitting}
                                autoFocus
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                Nome completo do profissional
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Especialização
                              </label>
                              <input
                                type="text"
                                value={formData.specialization}
                                onChange={(e) =>
                                  setFormData({ ...formData, specialization: e.target.value })
                                }
                                placeholder="Ex: Cardiologia, Clínico Geral"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={submitting}
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                Especialidade profissional
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SEÇÃO 2: DADOS PESSOAIS */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                        <div className="border-b pb-3">
                          <h3 className="text-lg font-bold text-gray-900">📝 Dados Pessoais</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Informações de contato e documentação
                          </p>
                        </div>

                        {/* CPF, Email, Telefone - 3 colunas */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              CPF
                            </label>
                            <input
                              type="text"
                              value={formData.cpf}
                              onChange={(e) =>
                                setFormData({ ...formData, cpf: maskCPF(e.target.value) })
                              }
                              placeholder="000.000.000-00"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={submitting}
                            />
                            <p className="text-xs text-gray-500 mt-2">CPF do profissional</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              Email
                            </label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="email@exemplo.com"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={submitting}
                            />
                            <p className="text-xs text-gray-500 mt-2">Email para contato</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              Telefone
                            </label>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) =>
                                setFormData({ ...formData, phone: maskPhone(e.target.value) })
                              }
                              placeholder="(11) 99999-9999"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={submitting}
                            />
                            <p className="text-xs text-gray-500 mt-2">Telefone para contato</p>
                          </div>
                        </div>
                      </div>

                      {/* SEÇÃO 2.5: PERFIL DE ACESSO */}
                      <div
                        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
                        key={`access-section-${refreshCounter}`}
                      >
                        <div className="border-b pb-3">
                          <h3 className="text-lg font-bold text-gray-900">🔐 Perfil de Acesso</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Usuário e permissões de sistema
                          </p>
                        </div>

                        {associatedUser ? (
                          <div className="space-y-4" key={`associated-user-${associatedUser.id}`}>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                🔗 Usuário Associado
                              </p>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>
                                  <strong>Nome:</strong>{' '}
                                  {associatedUser.full_name || associatedUser.name}
                                </p>
                                <p>
                                  <strong>Email:</strong> {associatedUser.email}
                                </p>
                                <p>
                                  <strong>ID:</strong> {associatedUser.id.substring(0, 8)}...
                                </p>
                                <p>
                                  <strong>Papel:</strong>{' '}
                                  <span className="font-semibold text-blue-600">{userRole}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleOpenAccessProfileModal}
                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition"
                              >
                                ✏️ Editar Perfil de Acesso
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Deseja desvincular este usuário?')) {
                                    setAssociatedUser(null);
                                    setUserRole('profissional');
                                    setFormData({ ...formData, email: '', cpf: '' });
                                  }
                                }}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition"
                              >
                                🔌 Desvincular
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4" key="no-associated-user">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                ⚠️ Nenhum usuário associado
                              </p>
                              <p className="text-sm text-gray-600">
                                Este profissional não possui um usuário de acesso ao sistema ainda.
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={handleCreateAssociatedUser}
                                disabled={updatingRole || associatedUser}
                                title={
                                  associatedUser
                                    ? "Usuário já vinculado. Use 'Desvincular' para criar novo."
                                    : ''
                                }
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {updatingRole ? (
                                  <>⏳ Criando...</>
                                ) : associatedUser ? (
                                  <>✅ Usuário Vinculado</>
                                ) : (
                                  <>🆕 Criar Novo</>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowLinkUserModal(true)}
                                disabled={linkingUser}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {linkingUser ? <>⏳ Vinculando...</> : <>🔗 Vincular Existente</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SEÇÃO 3: DADOS PROFISSIONAIS */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                        <div className="border-b pb-3">
                          <h3 className="text-lg font-bold text-gray-900">
                            🏥 Dados Profissionais
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Registro profissional e licenças
                          </p>
                        </div>

                        {/* CRM/Conselho, UF, RQE - alinhados em uma linha */}
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              Nº Conselho/CRM
                            </label>
                            <input
                              type="text"
                              value={formData.cremepe_crm || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, cremepe_crm: e.target.value })
                              }
                              placeholder="Ex: 123456"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={submitting}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              UF
                            </label>
                            <input
                              type="text"
                              value={formData.state || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  state: e.target.value.toUpperCase().slice(0, 2),
                                })
                              }
                              placeholder="UF"
                              maxLength={2}
                              className="uppercase w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={submitting}
                            />
                          </div>
                          <div className="col-span-5">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              RQE (Registro de Especialista)
                            </label>
                            <input
                              type="text"
                              value={formData.rqe || ''}
                              onChange={(e) => setFormData({ ...formData, rqe: e.target.value })}
                              placeholder="Ex: 54321"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      </div>

                      {/* SEÇÃO 4: ENDEREÇO COMERCIAL */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                        <div className="border-b pb-3">
                          <h3 className="text-lg font-bold text-gray-900">📍 Endereço Comercial</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Localização do consultório ou clínica
                          </p>
                        </div>

                        {/* Endereço */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Endereço
                          </label>
                          <input
                            type="text"
                            value={formData.commercial_address || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, commercial_address: e.target.value })
                            }
                            placeholder="Rua, número, complemento"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-2">Endereço completo</p>
                        </div>

                        {/* Cidade, Estado, CEP */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              Cidade
                            </label>
                            <input
                              type="text"
                              value={formData.city || ''}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              placeholder="Ex: São Paulo"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={submitting}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              Estado
                            </label>
                            <input
                              type="text"
                              value={formData.state || ''}
                              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                              placeholder="UF"
                              maxLength="2"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                              disabled={submitting}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              CEP
                            </label>
                            <input
                              type="text"
                              value={formData.zip_code || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, zip_code: e.target.value })
                              }
                              placeholder="00000-000"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      </div>

                      {/* SEÇÃO 5: DOCUMENTOS */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                        <div className="border-b pb-3">
                          <h3 className="text-lg font-bold text-gray-900">📎 Documentos</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Anexe cópias de documentos importantes
                          </p>
                        </div>

                        {/* Tipo e Upload na mesma linha */}
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <select
                              value={selectedDocType}
                              onChange={(e) => setSelectedDocType(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              disabled={submitting || documentUploading}
                            >
                              <option value="">Selecione o tipo...</option>
                              <option value="rg">RG</option>
                              <option value="cpf">CPF</option>
                              <option value="cnh">CNH</option>
                              <option value="comprovante_endereco">Comprovante de Endereço</option>
                              <option value="certificado_graduacao">
                                Certificado de Graduação
                              </option>
                              <option value="certificado_rqe">Certificado de RQE</option>
                              <option value="contrato_servico">Contrato de Serviço</option>
                            </select>
                          </div>

                          <input
                            type="file"
                            id="document-upload"
                            onChange={handleDocumentUpload}
                            className="hidden"
                            disabled={submitting || documentUploading}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                          />
                          <label
                            htmlFor="document-upload"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition flex items-center gap-2 font-semibold whitespace-nowrap"
                          >
                            {documentUploading ? (
                              <>
                                <span>📤 Enviando...</span>
                              </>
                            ) : (
                              <>➕ Adicionar</>
                            )}
                          </label>
                        </div>

                        {/* Lista de documentos anexados */}
                        {formData.documents &&
                          Array.isArray(formData.documents) &&
                          formData.documents.length > 0 && (
                            <div className="space-y-2 mt-4 pt-4 border-t">
                              <p className="text-sm font-semibold text-gray-900 mb-3">
                                ✅ Documentos adicionados:
                              </p>
                              {formData.documents.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between gap-2 p-3 bg-green-50 rounded-lg border border-green-200"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <span className="text-green-700 font-semibold">✓</span>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {doc.name}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {doc.type.replace(/_/g, ' ').toUpperCase()}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800 font-bold"
                                    disabled={submitting}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>

                      {/* SEÇÃO 6: STATUS */}
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <div className="border-b pb-3 mb-4">
                          <h3 className="text-lg font-bold text-gray-900">✓ Status</h3>
                          <p className="text-sm text-gray-600 mt-1">Situação do profissional</p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              id="active"
                              checked={formData.active}
                              onChange={(e) =>
                                setFormData({ ...formData, active: e.target.checked })
                              }
                              className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                              disabled={submitting}
                            />
                            <span className="text-sm font-semibold text-gray-800 flex-1">
                              Profissional Ativo
                            </span>
                            <span className="text-xs text-gray-500">
                              Disponível para agendamentos
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                )}

                {/* ABA: SERVIÇOS */}
                {activeTab === 'servicos' && editingListId && (
                  <div style={{ padding: '24px' }}>
                    <ProfessionalServicesTab
                      profesionalId={editingListId}
                      clinicId={clinicId}
                      submitting={submitting}
                    />
                  </div>
                )}

                {/* ABA: CONVÊNIOS */}
                {activeTab === 'convenios' && editingListId && (
                  <div style={{ padding: '24px' }}>
                    <ProfessionalConveniosTab
                      profesionalId={editingListId}
                      clinicId={clinicId}
                      submitting={submitting}
                    />
                  </div>
                )}

                {/* ABA: DISPONIBILIDADES */}
                {activeTab === 'disponibilidade' && editingListId && (
                  <div style={{ padding: '24px' }}>
                    <ProfessionalScheduleTab
                      profesionalId={editingListId}
                      clinicId={clinicId}
                      submitting={submitting}
                      onFormStateChange={setScheduleFormState}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="border-t bg-gradient-to-r from-gray-50 to-white px-6 py-3 flex items-center justify-end gap-3 shadow-md rounded-b-lg"
                style={{ flexShrink: 0 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'disponibilidade' && scheduleFormState.hasUnsavedData) {
                      window.__ProfessionalScheduleTab?.resetForm?.();
                      setScheduleFormState({ isEditing: false, hasUnsavedData: false });
                    } else {
                      handleCloseWithCheck();
                    }
                  }}
                  className="px-6 py-2 bg-white text-gray-800 font-semibold rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition"
                  disabled={submitting}
                >
                  ✕ Cancelar
                </button>

                {/* Botões específicos da aba de Disponibilidades */}
                {activeTab === 'disponibilidade' && scheduleFormState.hasUnsavedData ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.__ProfessionalScheduleTab?.handleAddSchedule?.();
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-md flex items-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span>⌛</span>
                        {scheduleFormState.isEditing ? 'Salvando...' : 'Adicionando...'}
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        {scheduleFormState.isEditing ? 'Salvar Horário' : 'Adicionar Horário'}
                      </>
                    )}
                  </button>
                ) : (
                  /* Botão padrão para outras abas */
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit(e);
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-md flex items-center gap-2"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span>⌛</span>
                        {editingListId ? 'Atualizando...' : 'Criando...'}
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        {editingListId ? 'Atualizar' : 'Criar'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal de Câmera */}
      {showCameraModal && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCameraModal(false)}
          isLoading={photoUploading}
        />
      )}

      {/* Modal de Perfil de Acesso */}
      {showAccessProfileModal && associatedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-900">🔐 Editar Perfil de Acesso</h2>
              <p className="text-sm text-gray-600 mt-1">
                Altere o papel/perfil do usuário no sistema
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Informações do Usuário</p>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Nome:</strong> {associatedUser.full_name}
                </p>
                <p>
                  <strong>Email:</strong> {associatedUser.email}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Selecione o Novo Papel
              </label>
              <select
                value={tempUserRole}
                onChange={(e) => setTempUserRole(e.target.value)}
                disabled={updatingRole}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="profissional">👨‍⚕️ Profissional</option>
                <option value="recepcao">🎯 Recepção</option>
                <option value="financeiro">💰 Financeiro</option>
                <option value="estoque">📦 Estoque</option>
                <option value="faturamento">📄 Faturamento</option>
                <option value="admin">🔐 Administrador</option>
              </select>
              <p className="text-xs text-gray-500">
                Papel atual: <strong>{userRole}</strong>
              </p>
            </div>

            <div className="border-t pt-4 flex gap-3">
              <button
                type="button"
                onClick={handleCloseAccessProfileModal}
                disabled={updatingRole}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAccessProfile}
                disabled={updatingRole || tempUserRole === userRole}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingRole ? '⏳ Salvando...' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VINCULAR USUÁRIO EXISTENTE */}
      {showLinkUserModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-shell app-modal-shell--medium">
            <Card className="app-modal-card shadow-2xl border-0">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg shadow-md">
                <h2 className="text-xl font-bold text-white">🔗 Vincular Usuário Existente</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkUserModal(false);
                    setSearchUsersInput('');
                    setAvailableUsers([]);
                  }}
                  className="text-white hover:bg-blue-600 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    🔍 Buscar Usuário (Nome ou Email)
                  </label>
                  <input
                    type="text"
                    value={searchUsersInput}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Digite o nome ou email do usuário..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={linkingUser}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">Mínimo 2 caracteres para buscar</p>
                </div>

                {/* LISTA DE USUÁRIOS */}
                <div className="max-h-96 overflow-y-auto">
                  {availableUsers.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700 mb-3">
                        📋 {availableUsers.length} usuário(s) encontrado(s)
                      </p>
                      {availableUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleLinkExistingUser(user)}
                          disabled={linkingUser}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-600 mt-1">📧 {user.email}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                                {user.role}
                              </span>
                              {user.status && (
                                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">
                                  {user.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkExistingUser(user);
                            }}
                            disabled={linkingUser}
                            className="ml-3 px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded transition disabled:opacity-50"
                          >
                            {linkingUser ? '⏳...' : '✅ Vincular'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : searchUsersInput.length >= 2 ? (
                    <p className="text-center py-8 text-gray-600">
                      ❌ Nenhum usuário encontrado para "{searchUsersInput}"
                    </p>
                  ) : (
                    <p className="text-center py-8 text-gray-500">
                      🔍 Digite para buscar usuários...
                    </p>
                  )}
                </div>

                <div className="border-t pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkUserModal(false);
                      setSearchUsersInput('');
                      setAvailableUsers([]);
                    }}
                    disabled={linkingUser}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTES DAS ABAS
// ============================================================

function TabDados({ formData, setFormData, handleSubmit, submitting }) {
  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {/* Foto do Profissional - Display */}
      {formData.photo_url && (
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <img
            src={formData.photo_url}
            alt="Foto do profissional"
            className="w-24 h-32 object-cover rounded border border-gray-300"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Foto anexada</p>
            <p className="text-xs text-gray-600 mt-1">
              📸 Clique em "Editar Profissional" para alterar
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <input
            type="text"
            value={formData.cpf}
            onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
            placeholder="000.000.000-00"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Especialização</label>
        <input
          type="text"
          value={formData.specialization}
          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
          placeholder="Ex: Clínico Geral"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@exemplo.com"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
          placeholder="(11) 99999-9999"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5">
          <label className="block text-sm font-semibold text-gray-800 mb-2">Nº Conselho/CRM</label>
          <input
            type="text"
            value={formData.cremepe_crm || ''}
            onChange={(e) => setFormData({ ...formData, cremepe_crm: e.target.value })}
            placeholder="Ex: 123456"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={submitting}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-800 mb-2">UF</label>
          <input
            type="text"
            value={formData.state || ''}
            onChange={(e) =>
              setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })
            }
            placeholder="UF"
            maxLength={2}
            className="uppercase w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={submitting}
          />
        </div>
        <div className="col-span-5">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            RQE (Registro de Especialista)
          </label>
          <input
            type="text"
            value={formData.rqe || ''}
            onChange={(e) => setFormData({ ...formData, rqe: e.target.value })}
            placeholder="Ex: 54321"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Comercial</label>
        <input
          type="text"
          value={formData.commercial_address || ''}
          onChange={(e) => setFormData({ ...formData, commercial_address: e.target.value })}
          placeholder="Rua, número, complemento"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
          <input
            type="text"
            value={formData.city || ''}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Cidade"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <input
            type="text"
            value={formData.state || ''}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="UF"
            maxLength="2"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
          <input
            type="text"
            value={formData.zip_code || ''}
            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
            placeholder="00000-000"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">📎 Anexar Documentos</label>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <select
              value={selectedDocType || ''}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            >
              <option value="">Selecione o tipo de documento</option>
              {/* Adicione opções conforme necessário */}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          className="rounded border-gray-300"
          disabled={submitting}
        />
        <label htmlFor="active" className="text-sm font-medium text-gray-700">
          Ativo
        </label>
      </div>

      <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Salvar Dados'}
      </Button>
    </form>
  );
}

// ============================================================
// COMPONENTES DAS ABAS
// ============================================================

function TabServicos({ services, selectedServices, toggleService, saveServices, submitting }) {
  if (!services || services.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Nenhum serviço cadastrado na clínica</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        {services.map((service) => (
          <label
            key={service.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedServices?.has(service.id)}
              onChange={() => toggleService(service.id)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
              disabled={submitting}
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{service.name}</p>
              <p className="text-sm text-gray-500">{service.description || 'Sem descrição'}</p>
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={saveServices}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        disabled={submitting}
      >
        {submitting ? 'Salvando...' : 'Salvar Serviços'}
      </button>
    </div>
  );
}

function TabConvenios({ healthInsurances, selectedPayers, togglePayer, savePayers, submitting }) {
  if (!healthInsurances || healthInsurances.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Nenhum convênio cadastrado na clínica</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        {healthInsurances.map((insurance) => (
          <label
            key={insurance.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedPayers?.has(insurance.id)}
              onChange={() => togglePayer(insurance.id)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
              disabled={submitting}
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{insurance.name}</p>
              <p className="text-sm text-gray-500">Código: {insurance.code}</p>
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={savePayers}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        disabled={submitting}
      >
        {submitting ? 'Salvando...' : 'Salvar Convênios'}
      </button>
    </div>
  );
}

function TabFinanceiro({ financialRules, setFinancialRules, submitting }) {
  return (
    <div className="space-y-4 w-full">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Percentual de Comissão (%)
        </label>
        <input
          type="number"
          value={financialRules?.commission_percentage || 0}
          onChange={(e) =>
            setFinancialRules({
              ...financialRules,
              commission_percentage: parseFloat(e.target.value) || 0,
            })
          }
          min="0"
          max="100"
          step="0.01"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Taxa Mínima (R$)</label>
        <input
          type="number"
          value={financialRules?.minimum_fee || 0}
          onChange={(e) =>
            setFinancialRules({
              ...financialRules,
              minimum_fee: parseFloat(e.target.value) || 0,
            })
          }
          min="0"
          step="0.01"
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Modal de Câmera
// ============================================================

function CameraModal({ onCapture, onClose, isLoading }) {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [cameraError, setCameraError] = React.useState(null);
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError('Não foi possível acessar a câmera. Verifique as permissões.');
        console.error('Erro ao acessar câmera:', err);
      }
    };

    startCamera();

    return () => {
      // Parar a câmera ao desmontar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log('🛑 Parando track da câmera:', track.kind);
          track.stop();
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const handleClose = () => {
    // Parar a câmera antes de fechar
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log('🛑 Parando track ao fechar:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    onClose();
  };

  const handleCapture = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      onCapture(canvasRef.current);
    }
  };

  return (
    <div className="app-modal-overlay">
      <Card className="app-modal-shell app-modal-shell--compact shadow-lg">
        <CardHeader className="border-b">
          <CardTitle>Capturar Foto</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {cameraError ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium mb-4">{cameraError}</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border border-gray-300 bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCapture}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? 'Capturando...' : '📸 Capturar'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
