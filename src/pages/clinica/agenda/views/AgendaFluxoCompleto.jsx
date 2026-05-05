/**
 * AgendaFluxoCompleto.jsx
 *
 * 🧠 WRAPPER PRINCIPAL - FLUXO COMPLETO DE ATENDIMENTO
 *
 * Este componente:
 * ✅ Detecta o perfil do usuário
 * ✅ Renderiza a view apropriada (Recepção, Profissional, Gestor)
 * ✅ Carrega dados de agendamentos
 * ✅ Controla permissões
 * ✅ Atualiza dados em tempo real
 *
 * Fluxo:
 * AGENDAMENTO → RECEPÇÃO (check-in) → PROFISSIONAL (atendimento) → FINALIZADO
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  APPOINTMENT_STATUS,
  AGENDA_MODE,
  getAgendaModeForRole,
  getVisibleStatusByRole,
} from '@/lib/appointmentStatusEnums';
import { listAppointments } from '@/lib/appointmentsApi';

// Views específicas por perfil
import AgendaRecepcaoView from './AgendaRecepcaoView';
import AgendaProfessionalView from './AgendaProfessionalView';
import AgendaGestorView from './AgendaGestorView';

import { Loader, AlertCircle } from 'lucide-react';

export default function AgendaFluxoCompleto() {
  const { user, currentRole, loading: authLoading } = useAuth();
  const { clinicId, loadingClinic } = useClinicContext();

  // Estado local
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ============================================
  // 1️⃣ DETERMINAR MODO BASEADO NO PERFIL
  // ============================================

  const agendaMode = getAgendaModeForRole(currentRole);
  const visibleStatus = getVisibleStatusByRole(currentRole);

  // ============================================
  // 2️⃣ CARREGAR AGENDAMENTOS
  // ============================================

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clinicId) {
        setAppointments([]);
        return;
      }

      // Carrega agendamentos de hoje
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().split('T')[0];

      // 🔒 RBAC: Se for profissional, buscar seu professional_id
      let userProfessionalId = null;
      if (currentRole?.toLowerCase?.() === 'profissional' && user?.email) {
        const { supabase } = await import('@/lib/customSupabaseClient');
        const { data: profData } = await supabase
          .from('professionals')
          .select('id')
          .eq('email', user.email)
          .eq('clinic_id', clinicId)
          .maybeSingle();
        if (profData?.id) {
          userProfessionalId = profData.id;
          console.log('🔒 [RBAC] Profissional detectado. Professional ID:', userProfessionalId);
        }
      }

      const data = await listAppointments({
        clinicId,
        start: today,
        end: tomorrow,
        userRole: currentRole,
        userProfessionalId: userProfessionalId,
      });

      // Filtra apenas os status visíveis para este perfil
      const filtered = data.filter((apt) => visibleStatus.includes(apt.status));

      setAppointments(filtered);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      setError('Erro ao carregar agendamentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [clinicId, visibleStatus, currentRole, user?.id]);

  // ============================================
  // 3️⃣ EFFECTS
  // ============================================

  // Carrega dados inicialmente
  useEffect(() => {
    if (!authLoading && !loadingClinic) {
      loadAppointments();
    }
  }, [authLoading, loadingClinic, loadAppointments, refreshKey]);

  // Poll para atualizar a cada 30 segundos (em produção, use WebSocket)
  useEffect(() => {
    if (!authLoading && !loadingClinic && clinicId) {
      const interval = setInterval(() => {
        loadAppointments();
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    }
  }, [authLoading, loadingClinic, clinicId, loadAppointments]);

  // ============================================
  // 4️⃣ FUNÇÃO REFRESH
  // ============================================

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // ============================================
  // 5️⃣ RENDERIZAÇÃO
  // ============================================

  // Aguardando autenticação
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600 font-medium">Autenticando...</p>
        </div>
      </div>
    );
  }

  // Sem clínica
  if (!clinicId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={40} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Clínica não configurada</h1>
          <p className="text-gray-600">Entre em contato com o administrador.</p>
        </div>
      </div>
    );
  }

  // Carregando agendamentos
  if (loading && appointments.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-600 font-medium">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  // Erro ao carregar
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={40} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // 6️⃣ RENDERIZAR VIEW CORRETA
  // ============================================

  const ViewComponent =
    {
      [AGENDA_MODE.RECEPTION]: AgendaRecepcaoView,
      [AGENDA_MODE.PROFESSIONAL]: AgendaProfessionalView,
      [AGENDA_MODE.MANAGER]: AgendaGestorView,
    }[agendaMode] || AgendaRecepcaoView;

  return (
    <ViewComponent
      appointments={appointments}
      onRefresh={handleRefresh}
      professionalId={agendaMode === AGENDA_MODE.PROFESSIONAL ? user?.id : null}
    />
  );
}
