import React, { useEffect, useState } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Alerta de Regras Incompletas
 * Verifica se as regras de agenda e check-in estão configuradas
 * Mostra avisos progressivos conforme aumenta a criticidade
 */
export function RulesAlert() {
  const { clinic, loadingClinic } = useClinicContext();
  const [rules, setRules] = useState({
    agendaRules: [],
    checkinRules: [],
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (loadingClinic || !clinic?.id) return;

    loadRules();
  }, [clinic?.id, loadingClinic]);

  async function loadRules() {
    try {
      setLoading(true);

      const [agendaRes, checkinRes] = await Promise.all([
        supabase
          .from('agenda_rules')
          .select('id, name, is_active')
          .eq('clinic_id', clinic.id)
          .eq('deleted_at', null),
        supabase
          .from('checkin_rules')
          .select('id, name, is_active')
          .eq('clinic_id', clinic.id)
          .eq('deleted_at', null),
      ]);

      setRules({
        agendaRules: agendaRes.data || [],
        checkinRules: checkinRes.data || [],
      });
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
    } finally {
      setLoading(false);
    }
  }

  // Contar regras ativas
  const agendaActive = rules.agendaRules.filter(r => r.is_active).length;
  const checkinActive = rules.checkinRules.filter(r => r.is_active).length;

  // Determinar nível de alerta
  const totalRules = rules.agendaRules.length + rules.checkinRules.length;
  const totalActive = agendaActive + checkinActive;

  let alertLevel = 'info'; // info, warning, error
  let message = '';

  if (totalRules === 0) {
    alertLevel = 'error';
    message = '❌ Nenhuma regra configurada - Sistema não está pronto';
  } else if (totalActive === 0) {
    alertLevel = 'error';
    message = '❌ Todas as regras estão desativadas - Ative-as na Base do Sistema';
  } else if (totalActive < totalRules / 2) {
    alertLevel = 'warning';
    message = `⚠️ ${totalRules - totalActive} regra(s) ainda não ativa(s)`;
  } else if (totalActive < totalRules) {
    alertLevel = 'info';
    message = `ℹ️ ${totalActive}/${totalRules} regras ativas`;
  }

  // Não mostrar se não há regras para configurar
  if (totalRules === 0 || loading) {
    return null;
  }

  const alertVariants = {
    error: 'border-red-300 bg-red-50',
    warning: 'border-yellow-300 bg-yellow-50',
    info: 'border-blue-300 bg-blue-50',
  };

  const textVariants = {
    error: 'text-red-900',
    warning: 'text-yellow-900',
    info: 'text-blue-900',
  };

  const iconVariants = {
    error: AlertTriangle,
    warning: AlertTriangle,
    info: AlertCircle,
  };

  const IconComponent = iconVariants[alertLevel];

  return (
    <div className={`border rounded-lg p-3 ${alertVariants[alertLevel]}`}>
      <div
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1">
          <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            alertLevel === 'error' ? 'text-red-600' :
            alertLevel === 'warning' ? 'text-yellow-600' :
            'text-blue-600'
          }`} />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${textVariants[alertLevel]}`}>
              {message}
            </p>
            {expanded && (
              <div className="mt-2 text-xs space-y-2">
                {rules.agendaRules.length > 0 && (
                  <div className="flex items-center gap-2">
                    {agendaActive > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    )}
                    <span>Regras de Agenda: {agendaActive}/{rules.agendaRules.length}</span>
                  </div>
                )}
                {rules.checkinRules.length > 0 && (
                  <div className="flex items-center gap-2">
                    {checkinActive > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    )}
                    <span>Regras de Check-in: {checkinActive}/{rules.checkinRules.length}</span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                  <a
                    href="/clinica/base-sistema/regras-operacionais/agenda-rules"
                    className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    ⚙️ Gerenciar Regras
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        <button className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className={`w-4 h-4 ${
              alertLevel === 'error' ? 'text-red-600' :
              alertLevel === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${
              alertLevel === 'error' ? 'text-red-600' :
              alertLevel === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`} />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Card com resumo de regras para Dashboard
 */
export function RulesSummaryCard() {
  const { clinic, loadingClinic } = useClinicContext();
  const [counts, setCounts] = useState({
    agendaTotal: 0,
    agendaActive: 0,
    checkinTotal: 0,
    checkinActive: 0,
  });

  useEffect(() => {
    if (loadingClinic || !clinic?.id) return;

    loadCounts();
  }, [clinic?.id, loadingClinic]);

  async function loadCounts() {
    try {
      const [agendaRes, checkinRes] = await Promise.all([
        supabase
          .from('agenda_rules')
          .select('id, is_active')
          .eq('clinic_id', clinic.id)
          .eq('deleted_at', null),
        supabase
          .from('checkin_rules')
          .select('id, is_active')
          .eq('clinic_id', clinic.id)
          .eq('deleted_at', null),
      ]);

      setCounts({
        agendaTotal: agendaRes.data?.length || 0,
        agendaActive: agendaRes.data?.filter(r => r.is_active).length || 0,
        checkinTotal: checkinRes.data?.length || 0,
        checkinActive: checkinRes.data?.filter(r => r.is_active).length || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3">📋 Regras do Sistema</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">📅 Agenda:</span>
          <span className="font-semibold">
            {counts.agendaActive}/{counts.agendaTotal}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">✅ Check-in:</span>
          <span className="font-semibold">
            {counts.checkinActive}/{counts.checkinTotal}
          </span>
        </div>
        <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center font-semibold">
          <span className="text-gray-900">Total:</span>
          <span className="text-blue-600">
            {counts.agendaActive + counts.checkinActive}/
            {counts.agendaTotal + counts.checkinTotal}
          </span>
        </div>
      </div>
    </div>
  );
}
