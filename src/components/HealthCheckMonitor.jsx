import React, { useEffect, useState } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  DollarSign,
  Database,
  Zap,
} from 'lucide-react';

/**
 * Monitor de Saúde do Sistema
 * Verifica status de configurações críticas e mostra avisos/alerts
 */
export function HealthCheckMonitor() {
  const { clinic, loadingClinic } = useClinicContext();
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState({
    clinic: 'loading',
    professionals: 'loading',
    services: 'loading',
    rooms: 'loading',
    insurances: 'loading',
    rules: 'loading',
    database: 'loading',
  });
  const [checks, setChecks] = useState({});

  // Realizar health checks quando clinic carrega
  useEffect(() => {
    if (loadingClinic || !clinic?.id) return;

    // Executa health checks em paralelo, não bloqueia a página
    runHealthChecks();
  }, [clinic?.id, loadingClinic]);

  async function runHealthChecks() {
    try {
      // Executar todas as checks em paralelo com timeout
      const results = await Promise.allSettled([
        withTimeout(checkProfessionals(), 3000),
        withTimeout(checkServices(), 3000),
        withTimeout(checkRooms(), 3000),
        withTimeout(checkInsurances(), 3000),
        withTimeout(checkRules(), 3000),
        withTimeout(checkDatabase(), 3000),
      ]);

      setHealthStatus({
        clinic: clinic?.id ? 'success' : 'error',
        professionals: results[0].status === 'fulfilled' ? results[0].value : 'error',
        services: results[1].status === 'fulfilled' ? results[1].value : 'error',
        rooms: results[2].status === 'fulfilled' ? results[2].value : 'error',
        insurances: results[3].status === 'fulfilled' ? results[3].value : 'error',
        rules: results[4].status === 'fulfilled' ? results[4].value : 'error',
        database: results[5].status === 'fulfilled' ? results[5].value : 'error',
      });
    } catch (error) {
      console.error('❌ Health check erro:', error);
    }
  }

  // Utility function para timeout
  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);
  }

  async function checkProfessionals() {
    try {
      const { count, error } = await supabase
        .from('professionals')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);
      
      if (error) {
        console.warn('Health check profissionais - aviso:', error.message);
        return 'warning';
      }
      const finalCount = count || 0;
      setChecks(prev => ({ ...prev, professionalsCount: finalCount }));
      return finalCount > 0 ? 'success' : 'warning';
    } catch (error) {
      console.warn('Health check profissionais - erro:', error.message);
      return 'warning';
    }
  }

  async function checkServices() {
    try {
      const { count, error } = await supabase
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);
      
      if (error) {
        console.warn('Health check serviços - aviso:', error.message);
        return 'warning';
      }
      const finalCount = count || 0;
      setChecks(prev => ({ ...prev, servicesCount: finalCount }));
      return finalCount > 0 ? 'success' : 'warning';
    } catch (error) {
      console.warn('Health check serviços - erro:', error.message);
      return 'warning';
    }
  }

  async function checkRooms() {
    try {
      const { count, error } = await supabase
        .from('rooms')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);
      
      if (error) {
        console.warn('Health check salas - aviso:', error.message);
        return 'warning';
      }
      const finalCount = count || 0;
      setChecks(prev => ({ ...prev, roomsCount: finalCount }));
      return finalCount > 0 ? 'success' : 'warning';
    } catch (error) {
      console.warn('Health check salas - erro:', error.message);
      return 'warning';
    }
  }

  async function checkInsurances() {
    try {
      const { count, error } = await supabase
        .from('health_insurances')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);
      
      if (error) {
        console.warn('Health check convênios - aviso:', error.message);
        return 'warning';
      }
      const finalCount = count || 0;
      setChecks(prev => ({ ...prev, insurancesCount: finalCount }));
      return finalCount > 0 ? 'success' : 'warning';
    } catch (error) {
      console.warn('Health check convênios - erro:', error.message);
      return 'warning';
    }
  }

  async function checkRules() {
    try {
      const { count, error } = await supabase
        .from('agenda_rules')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);
      
      if (error) {
        console.warn('Health check regras - aviso:', error.message);
        return 'info';
      }
      const finalCount = count || 0;
      setChecks(prev => ({ ...prev, rulesCount: finalCount }));
      return finalCount > 0 ? 'success' : 'info';
    } catch (error) {
      console.warn('Health check regras - erro:', error.message);
      return 'info';
    }
  }

  async function checkDatabase() {
    try {
      // Tenta fazer uma query simples para verificar conexão
      const { error } = await supabase
        .from('clinics')
        .select('id')
        .eq('id', clinic.id)
        .limit(1);
      
      return error ? 'warning' : 'success';
    } catch (error) {
      console.warn('Health check database - erro:', error.message);
      return 'warning';
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'info':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600 animate-spin" />;
    }
  }

  function getStatusBadgeVariant(status) {
    switch (status) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  }

  const criticalIssues = Object.entries(healthStatus).filter(
    ([key, status]) => status === 'error' && key !== 'rules' // Regras são opcionais
  );

  const warnings = Object.entries(healthStatus).filter(
    ([key, status]) => status === 'warning'
  );

  // Não mostrar se tudo está OK e não há avisos
  if (Object.values(healthStatus).every(s => s === 'success' || s === 'info')) {
    return null;
  }

  return (
    <div className="space-y-3 mb-4">
      {/* ERROS CRÍTICOS */}
      {criticalIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">❌ Problemas Críticos Detectados</div>
            <div className="text-sm space-y-1">
              {criticalIssues.map(([key, status]) => (
                <div key={key} className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span>{formatCheckName(key)}</span>
                </div>
              ))}
            </div>
            <div className="text-xs mt-2 opacity-90">
              ⚠️ Acesse Base do Sistema para configurar
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* AVISOS */}
      {warnings.length > 0 && (
        <Alert variant="secondary" className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <div className="font-semibold mb-1 text-yellow-900">⚠️ Configurações Incompletas</div>
            <div className="text-sm space-y-1">
              {warnings.map(([key, status]) => (
                <div key={key} className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="text-yellow-900">{formatCheckName(key)} não configurado</span>
                </div>
              ))}
            </div>
            <div className="text-xs mt-2 opacity-75">
              💡 Configure na Base do Sistema para melhor experiência
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* STATUS RESUMIDO */}
      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          {getStatusIcon(healthStatus.database)}
          <Badge variant={getStatusBadgeVariant(healthStatus.database)}>
            <Database className="w-3 h-3 mr-1" />
            Database
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(healthStatus.professionals)}
          <Badge variant={getStatusBadgeVariant(healthStatus.professionals)}>
            <Users className="w-3 h-3 mr-1" />
            Profissionais ({checks.professionalsCount || 0})
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(healthStatus.services)}
          <Badge variant={getStatusBadgeVariant(healthStatus.services)}>
            <Zap className="w-3 h-3 mr-1" />
            Serviços ({checks.servicesCount || 0})
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(healthStatus.rooms)}
          <Badge variant={getStatusBadgeVariant(healthStatus.rooms)}>
            <Calendar className="w-3 h-3 mr-1" />
            Salas ({checks.roomsCount || 0})
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(healthStatus.insurances)}
          <Badge variant={getStatusBadgeVariant(healthStatus.insurances)}>
            <DollarSign className="w-3 h-3 mr-1" />
            Convênios ({checks.insurancesCount || 0})
          </Badge>
        </div>
      </div>
    </div>
  );
}

function formatCheckName(key) {
  const names = {
    clinic: 'Clínica',
    professionals: 'Profissionais',
    services: 'Serviços',
    rooms: 'Salas',
    insurances: 'Convênios',
    rules: 'Regras de Agenda',
    database: 'Conexão Database',
  };
  return names[key] || key;
}
