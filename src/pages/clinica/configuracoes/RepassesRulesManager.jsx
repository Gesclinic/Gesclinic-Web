import React, { useEffect, useState, useMemo } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RepassConfigurationModal from '@/pages/clinica/configuracoes/RepassConfigurationModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BadgePercent,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Settings2,
  User,
  Briefcase,
  Calculator,
  DivideIcon,
  GitBranch,
} from 'lucide-react';

export default function RepassesRulesManager() {
  const { clinic } = useClinicContext();
  const { toast } = useToast();
  const clinicId = clinic?.id;

  // ===== FUNÇÃO DE CÁLCULO DE REPASSE =====
  const calculateRepasse = ({ gross, taxRate, repassePercent, mode = 'LIQUIDO' }) => {
    const taxValue = gross * taxRate;
    const net = gross - taxValue;
    let base = gross;
    if (mode === 'LIQUIDO') {
      base = net;
    }
    const professional = base * (repassePercent / 100);
    const clinic_value = base - professional;
    return { gross, taxValue, net, professional, clinic_value };
  };

  // ===== DEFINIÇÃO DE REGIMES COM TAXAS CORRETAS =====
  const regimesTaxRates = {
    simples_3: {
      name: 'Simples Nacional (Anexo III - Serviços)',
      rate: 0.18,
      description: 'Alíquota única Anexo III',
    },
    simples_5: {
      name: 'Simples Nacional (Anexo V - Tecnologia)',
      rate: 0.15,
      description: 'Alíquota única Anexo V',
    },
    simples_r: {
      name: 'Simples com Fator R',
      rate: 0.1493,
      description: 'PIS 3.65% + COFINS 7.65% + ISS 5%',
    },
    presumido: {
      name: 'Lucro Presumido - Normal',
      rate: 0.2325,
      description: 'IR 1.6% + CSLL 8% + COFINS 7.6% + PIS 1.65% + ISS 5%',
    },
    presumido_hospitalar: {
      name: 'Lucro Presumido - Equiparação Hospitalar',
      rate: 0.156,
      description: 'IR 0.8% + CSLL 3.2% + COFINS 7.6% + PIS 1.6% + ISS 2.4%',
    },
    real_conservador: {
      name: 'Lucro Real - Conservador',
      rate: 0.233,
      description: 'COFINS 7.65% + PIS 1.65% + ISS 5% + IR+CSLL 9%',
    },
    real_otimizado: {
      name: 'Lucro Real - Otimizado (Equip.)',
      rate: 0.175,
      description: 'COFINS 7.65% + PIS 1.65% + ISS 2.4% + IR+CSLL 5.8%',
    },
  };

  // Data
  const [rules, setRules] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // ISS Rate - derivado de clinic settings
  // Normaliza para decimal se vier em % (ex: 3 -> 0.03, 0.05 -> 0.05)
  const normalizeIssRate = (rate) => {
    if (!rate && rate !== 0) return 0.05; // Default 5%
    const num = parseFloat(rate);
    // Se for > 1, assume que é percentual (ex: 3, 5, 10) e converte
    return num > 1 ? num / 100 : num;
  };
  const issRate = normalizeIssRate(clinic?.iss_rate);

  // Form states
  const [showDialog, setShowDialog] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState(null);

  const [formData, setFormData] = useState({
    professional_id: '',
    service_id: '',
    service_type: null, // 'consultas', 'exames', 'cirurgias', 'procedimentos' ou null
    rule_type: 'individual', // 'individual' ou 'group'
    tipo_base: 'LIQUIDO', // BRUTO ou LIQUIDO
    percentual: 70,
    ativo: true,
    regime_code: 'presumido', // código do regime
    iss_customizado: null, // ISS customizável (opcional)
  });

  const [simulatedValue, setSimulatedValue] = useState(100); // Valor para simulação

  // Opções de grupos de serviço
  const serviceGroups = [
    { value: 'consultas', label: '👨‍⚕️ Consultas' },
    { value: 'exames', label: '🔬 Exames' },
    { value: 'cirurgias', label: '🏥 Cirurgias' },
    { value: 'procedimentos', label: '⚙️ Procedimentos' },
  ];

  // Load data
  useEffect(() => {
    if (clinicId) {
      loadAllData();
    }
  }, [clinicId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Carregar de ambas as tabelas para manter compatibilidade
      const [revenueRes, repasseRes, profsRes, servicesRes] = await Promise.all([
        supabase
          .from('revenue_rules')
          .select('*')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }),
        supabase
          .from('repasse_config')
          .select('id, clinic_id, professional_id, service_id, tipo_base, percentual, ativo, regime_code, iss_customizado, created_at')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }),
        supabase.from('professionals').select('id, name').eq('clinic_id', clinicId).order('name'),
        supabase.from('services').select('id, name').eq('clinic_id', clinicId).order('name'),
      ]);

      // Log de erro se houver
      if (revenueRes.error) {
        console.error('Erro ao carregar regras (revenue_rules):', revenueRes.error);
      }
      if (repasseRes.error) {
        console.error('Erro ao carregar regras (repasse_config):', repasseRes.error);
      }
      if (profsRes.error) {
        console.error('Erro ao carregar profissionais:', profsRes.error);
      }
      if (servicesRes.error) {
        console.error('Erro ao carregar serviços:', servicesRes.error);
      }

      // Combinar regras de ambas as tabelas (evitar duplicatas)
      const revenueRules = revenueRes.data || [];
      const repasseRules = (repasseRes.data || []).map((rule) => ({
        ...rule,
        // Normalizar campos de revenue_rules se necessário
      }));

      // Mesclar arrays (usar revenue_rules como base, adicionar repasse_config se não duplicarem)
      const allRules = [
        ...revenueRules,
        ...repasseRules.filter((r) => !revenueRules.find((rv) => rv.id === r.id)),
      ];

      console.log('Regras carregadas - revenue_rules:', revenueRules.length);
      console.log('Regras carregadas - repasse_config:', repasseRules.length);
      console.log('Total de regras:', allRules.length);

      setRules(allRules);
      setProfessionals(profsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as regras de repasse',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rule = null) => {
    setSimulatedValue(100); // Reset valor de simulação
    if (rule) {
      setEditingRuleId(rule.id);
      setFormData({
        professional_id: rule.professional_id || '',
        service_id: rule.service_id || '',
        service_type: rule.service_type || null,
        rule_type: rule.service_type ? 'group' : 'individual',
        tipo_base: rule.tipo_base || 'LIQUIDO',
        percentual: rule.percentual || 70,
        ativo: rule.ativo !== false,
        regime_code: rule.regime_code || 'presumido',
        iss_customizado: rule.iss_customizado || null,
      });
    } else {
      setEditingRuleId(null);
      setFormData({
        professional_id: '',
        service_id: '',
        service_type: null,
        rule_type: 'individual',
        tipo_base: 'LIQUIDO',
        percentual: 70,
        ativo: true,
        regime_code: 'presumido',
        iss_customizado: null,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingRuleId(null);
    setFormData({
      professional_id: '',
      service_id: '',
      service_type: null,
      rule_type: 'individual',
      tipo_base: 'LIQUIDO',
      percentual: 70,
      ativo: true,
      regime_code: 'presumido',
      iss_customizado: null,
    });
  };

  const handleSaveRule = async (formDataToSave, ruleId) => {
    const payload = {
      clinic_id: clinicId,
      professional_id: formDataToSave.professional_id,
      service_id: formDataToSave.rule_type === 'individual' ? formDataToSave.service_id : null,
      tipo_base: formDataToSave.tipo_base,
      percentual: formDataToSave.percentual,
      ativo: formDataToSave.ativo,
      regime_code: formDataToSave.regime_code,
      iss_customizado: formDataToSave.iss_customizado,
    };

    try {
      if (ruleId) {
        const { error } = await supabase
          .from('repasse_config')
          .update(payload)
          .eq('id', ruleId);

        if (error) {
          throw error;
        }
        toast({
          title: 'Sucesso',
          description: 'Regra de repasse atualizada',
        });
      } else {
        const { error } = await supabase.from('repasse_config').insert([payload]);

        if (error) {
          throw error;
        }
        toast({
          title: 'Sucesso',
          description: 'Regra de repasse criada',
        });
      }

      loadAllData();
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao salvar regra';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async () => {
    try {
      const { error } = await supabase.from('repasse_config').delete().eq('id', deleteRuleId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Regra de repasse removida',
      });

      setShowDeleteAlert(false);
      setDeleteRuleId(null);
      loadAllData();
    } catch (error) {
      console.error('Erro ao deletar regra:', error);
      const errorMessage = error?.message || 'Erro ao remover regra';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getProfessionalName = (id) => {
    return professionals.find((p) => p.id === id)?.name || '-';
  };

  const getServiceName = (id) => {
    return services.find((s) => s.id === id)?.name || '-';
  };

  const ruleStats = useMemo(() => {
    return {
      total: rules.length,
      active: rules.filter((r) => r.ativo !== false).length,
      averagePercentual:
        rules.length > 0
          ? (rules.reduce((acc, r) => acc + (r.percentual || 0), 0) / rules.length).toFixed(1)
          : 0,
    };
  }, [rules]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando regras de repasse...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        [role="dialog"] [role="listbox"],
        [role="dialog"] [role="option"],
        [role="dialog"] [role="presentation"],
        [role="dialog"] .radix-select-content {
          z-index: 99999 !important;
          position: relative !important;
          pointer-events: auto !important;
        }
        .radix-select-content {
          z-index: 99999 !important;
          pointer-events: auto !important;
        }
        [role="dialog"] > div {
          position: relative;
          z-index: 0;
        }
      `}</style>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 shadow-sm hover:shadow-md transition">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total de Regras</p>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {ruleStats.total}
                  </div>
                </div>
                <BadgePercent className="w-10 h-10 text-blue-300 dark:text-blue-700 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/40 shadow-sm hover:shadow-md transition">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Ativas</p>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {ruleStats.active}
                  </div>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-300 dark:text-green-700 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/40 shadow-sm hover:shadow-md transition">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Repasse Médio</p>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {ruleStats.averagePercentual}%
                  </div>
                </div>
                <Calculator className="w-10 h-10 text-orange-300 dark:text-orange-700 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => handleOpenDialog()}
            className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nova Regra
          </Button>
        </div>

        {/* Rules List */}
        {rules.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/20 shadow-none">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BadgePercent className="w-8 h-8 text-blue-400 dark:text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Nenhuma regra configurada
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Crie uma regra para controlar automaticamente o percentual de repasse por
                    profissional e serviço
                  </p>
                </div>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar Primeira Regra
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <Card
                key={rule.id}
                className={`relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 ${
                  rule.ativo !== false
                    ? 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800/40'
                    : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900/30 dark:to-slate-800/20 opacity-75'
                }`}
              >
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />

                {/* Status Badge - Top Right */}
                <div className="absolute top-3 right-3">
                  {rule.ativo !== false ? (
                    <div className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100/80 dark:bg-green-900/40 px-2.5 py-1.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Ativa
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/40 px-2.5 py-1.5 rounded-full">
                      ⊘ Inativa
                    </div>
                  )}
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                      <BadgePercent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-base truncate">
                      {getProfessionalName(rule.professional_id) || 'Sem profissional'}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Tipo de Regra */}
                  <div className="flex items-center gap-2 text-xs">
                    {rule.service_type ? (
                      <>
                        <div className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                          👥 Grupo:{' '}
                          {rule.service_type === 'consultas'
                            ? 'Consultas'
                            : rule.service_type === 'exames'
                              ? 'Exames'
                              : rule.service_type === 'cirurgias'
                                ? 'Cirurgias'
                                : 'Procedimentos'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                          👤 Individual
                        </div>
                      </>
                    )}
                  </div>

                  {/* Serviço */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Serviço
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {rule.service_type
                        ? `Todos os ${rule.service_type.charAt(0).toUpperCase() + rule.service_type.slice(1)}`
                        : getServiceName(rule.service_id) || 'Não especificado'}
                    </p>
                  </div>

                  {/* Percentual destacado */}
                  <div className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg p-3 border border-blue-200/50 dark:border-blue-800/30 text-center">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
                      Repasse
                    </p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {rule.percentual || 0}
                      <span className="text-base ml-1">%</span>
                    </p>
                  </div>

                  {/* Base type */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Base:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize bg-slate-200/50 dark:bg-slate-700/50 px-2 py-1 rounded">
                      {rule.tipo_base === 'bruto' ? '💰 Bruto' : '📊 Líquido'}
                    </span>
                  </div>

                  {/* Regime */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Regime:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 bg-purple-100/50 dark:bg-purple-900/30 px-2 py-1 rounded">
                      {regimesTaxRates[rule.regime_code]?.name || 'Regime Desconhecido'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(rule)}
                      className="flex-1 h-9 text-xs font-medium border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      ✏️ Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeleteRuleId(rule.id);
                        setShowDeleteAlert(true);
                      }}
                      className="h-9 px-2 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Configuration Modal with Tabs */}
        <RepassConfigurationModal
          open={showDialog}
          onOpenChange={setShowDialog}
          editingRuleId={editingRuleId}
          rule={rules.find((r) => r.id === editingRuleId) || null}
          professionals={professionals}
          services={services}
          issRate={issRate}
          regimesTaxRates={regimesTaxRates}
          onSaveRule={handleSaveRule}
          getProfessionalName={getProfessionalName}
          getServiceName={getServiceName}
        />
        {/* OLD DIALOG - TO BE REMOVED */}
        {false && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="w-[90vw] h-[90vh] max-w-none p-0 flex flex-col gap-0">
            {/* Header com gradiente - STICKY COM ALTO Z-INDEX */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 px-6 py-5 border-b border-blue-200/30 dark:border-blue-800/30 flex items-center gap-3 sticky top-0 z-50 backdrop-blur-sm flex-shrink-0">
              <div className="bg-blue-500/10 dark:bg-blue-500/20 p-2.5 rounded-lg">
                <BadgePercent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold">➕ Nova Regra de Repasse</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Defina percentual de repasse por profissional e serviço
                </DialogDescription>
              </div>
            </div>

            {/* Conteúdo Scrollável */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 py-6">
                  {/* Coluna 1: Seleção */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className="w-1 h-5 bg-blue-500 rounded-full" />
                      Vinculação
                    </h3>

                    {/* SEÇÃO 1: Profissional */}
                    <div className="space-y-3 overflow-visible">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        Profissional
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <Select
                        value={formData.professional_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, professional_id: value })
                        }
                      >
                        <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-blue-300 transition text-base">
                          <SelectValue placeholder="Selecione um profissional" />
                        </SelectTrigger>
                        <SelectContent className="z-[99999] overflow-visible">
                          {professionals.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              Nenhum profissional encontrado
                            </div>
                          ) : (
                            professionals.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* SEÇÃO 2: Tipo de Regra */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <GitBranch className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        Tipo de Regra
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              rule_type: 'individual',
                              service_type: null,
                            })
                          }
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition font-medium text-sm ${
                            formData.rule_type === 'individual'
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
                          }`}
                        >
                          👤 Serviço Individual
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              rule_type: 'group',
                              service_id: '',
                              service_type: 'consultas',
                            })
                          }
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition font-medium text-sm ${
                            formData.rule_type === 'group'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-purple-300'
                          }`}
                        >
                          👥 Grupo de Serviços
                        </button>
                      </div>
                    </div>

                    {/* SEÇÃO 3: Serviço ou Grupo */}
                    {formData.rule_type === 'individual' ? (
                      <div className="space-y-3 overflow-visible">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Briefcase className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          Serviço
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <Select
                          value={formData.service_id}
                          onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                        >
                          <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition text-base">
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                          <SelectContent className="z-[99999] overflow-visible">
                            {services.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                Nenhum serviço encontrado
                              </div>
                            ) : (
                              services.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-visible">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Briefcase className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          </div>
                          Grupo de Serviços
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <Select
                          value={formData.service_type}
                          onValueChange={(value) =>
                            setFormData({ ...formData, service_type: value })
                          }
                        >
                          <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-purple-300 transition text-base">
                            <SelectValue placeholder="Selecione um grupo de serviços" />
                          </SelectTrigger>
                          <SelectContent className="z-[99999] overflow-visible">
                            {serviceGroups.map((group) => (
                              <SelectItem key={group.value} value={group.value}>
                                {group.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Coluna 2: Configuração Financeira */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className="w-1 h-5 bg-orange-500 rounded-full" />
                      Configuração Financeira
                    </h3>

                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 rounded-lg p-5 space-y-5 border border-slate-200/50 dark:border-slate-700/50">
                      {/* Regime Tributário - 7 Opções */}
                      <div className="space-y-3 overflow-visible">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            📊
                          </div>
                          Regime Tributário
                        </label>
                        <Select
                          value={formData.regime_code}
                          onValueChange={(value) =>
                            setFormData({ ...formData, regime_code: value })
                          }
                        >
                          <SelectTrigger className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-purple-300 transition text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[99999] overflow-visible">
                            <SelectItem value="simples_3">
                              🏢 Simples Nacional (Anexo III - Serviços) - 18%
                            </SelectItem>
                            <SelectItem value="simples_5">
                              🏢 Simples Nacional (Anexo V - Tecnologia) - 15%
                            </SelectItem>
                            <SelectItem value="simples_r">
                              📈 Simples com Fator R - 14,93%
                            </SelectItem>
                            <SelectItem value="presumido">
                              📋 Lucro Presumido - Normal - 23,25%
                            </SelectItem>
                            <SelectItem value="presumido_hospitalar">
                              🏥 Lucro Presumido - Equiparação Hospitalar - 15,6%
                            </SelectItem>
                            <SelectItem value="real_conservador">
                              🔍 Lucro Real - Conservador - 23,3%
                            </SelectItem>
                            <SelectItem value="real_otimizado">
                              🏥 Lucro Real - Otimizado (Equip.) - 17,5%
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {regimesTaxRates[formData.regime_code]?.description}
                        </p>
                      </div>

                      {/* Forma de Cálculo (BRUTO vs LIQUIDO) */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            💰
                          </div>
                          Forma de Cálculo
                        </label>
                        <Select
                          value={formData.tipo_base}
                          onValueChange={(value) => setFormData({ ...formData, tipo_base: value })}
                        >
                          <SelectTrigger className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-blue-300 transition text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[99999] overflow-visible">
                            <SelectItem value="BRUTO">
                              💰 Sobre valor bruto (sem deduções)
                            </SelectItem>
                            <SelectItem value="LIQUIDO">
                              📊 Sobre valor líquido (recomendado - com deduções)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {formData.tipo_base === 'BRUTO'
                            ? 'Repasse calculado sobre o valor total sem descontos de impostos'
                            : 'Repasse calculado após descontar os impostos'}
                        </p>
                      </div>

                      {/* ISS Customizável (Campo Opcional) */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            🏛️
                          </div>
                          ISS Customizável (%)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          placeholder="Deixe em branco para usar padrão"
                          value={formData.iss_customizado || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              iss_customizado: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {formData.iss_customizado ? (
                            <span className="text-orange-600 dark:text-orange-400 font-semibold">
                              ✏️ Customizado: {formData.iss_customizado}% (Padrão:{' '}
                              {(regimesTaxRates[formData.regime_code]?.rate * 100).toFixed(2)}%)
                            </span>
                          ) : (
                            <>
                              ISS padrão:{' '}
                              {(regimesTaxRates[formData.regime_code]?.rate * 100).toFixed(2)}%
                            </>
                          )}
                        </p>
                      </div>

                      {/* Percentual de Repasse */}
                      <div className="space-y-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <DivideIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          </div>
                          Percentual de Repasse
                        </label>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={formData.percentual}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  percentual: Number(e.target.value),
                                })
                              }
                              className="h-14 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 focus:border-blue-500 transition text-2xl font-bold text-center"
                            />
                          </div>
                          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 min-w-fit pb-1">
                            {formData.percentual}%
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Quantidade em percentual repassada ao profissional
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview de Cálculo - Nova com calculateRepasse */}
                {formData.percentual && (
                  <div className="space-y-3 mt-4">
                    {/* Resumo da Regra */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-300 dark:border-blue-700/50 rounded-lg p-4 flex gap-3">
                      <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-bold text-base mb-1">📋 Resumo da Regra</p>
                        <p className="leading-relaxed text-xs mb-2">
                          <span className="font-semibold">
                            {getProfessionalName(formData.professional_id) || 'O profissional'}
                          </span>{' '}
                          receberá{' '}
                          <span className="inline-block bg-blue-200 dark:bg-blue-800/60 px-2.5 py-1 rounded font-bold text-blue-700 dark:text-blue-200">
                            {formData.percentual}%
                          </span>{' '}
                          do valor{' '}
                          <span className="font-semibold capitalize">
                            {formData.tipo_base === 'BRUTO' ? 'bruto' : 'líquido'}
                          </span>{' '}
                          pelo serviço{' '}
                          <span className="font-semibold">
                            {getServiceName(formData.service_id) || 'selecionado'}
                          </span>
                        </p>
                        <p className="text-xs opacity-90 border-t border-blue-200 dark:border-blue-800 pt-2">
                          Regime:{' '}
                          <span className="font-semibold">
                            {regimesTaxRates[formData.regime_code]?.name || 'Regime'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Cálculo Exemplo */}
                    {(() => {
                      const regime = regimesTaxRates[formData.regime_code];
                      if (!regime) {
                        return null;
                      }

                      // Usar ISS customizado se fornecido, caso contrário usar o padrão do regime
                      const effectiveRate = formData.iss_customizado
                        ? formData.iss_customizado / 100
                        : regime.rate;

                      const calc = calculateRepasse({
                        gross: simulatedValue,
                        taxRate: effectiveRate,
                        repassePercent: formData.percentual,
                        mode: formData.tipo_base,
                      });
                      return (
                        <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              📊 Simulador de Cálculo:
                            </p>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                Valor Bruto (R$):
                              </label>
                              <Input
                                type="number"
                                min={0.01}
                                step={10}
                                value={simulatedValue}
                                onChange={(e) => setSimulatedValue(Number(e.target.value) || 0)}
                                className="w-24 h-8 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-blue-500 text-xs font-semibold text-center"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            {/* Valor Bruto */}
                            <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-600 dark:text-slate-400">
                                💰 Valor Bruto:
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                R$ {calc.gross.toFixed(2)}
                              </span>
                            </div>

                            {/* Impostos */}
                            <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/10 rounded border border-orange-200 dark:border-orange-700/30">
                              <span className="text-orange-700 dark:text-orange-300">
                                🏛️ Impostos ({(effectiveRate * 100).toFixed(2)}%
                                {formData.iss_customizado ? ' ✏️ customizado' : ''}):
                              </span>
                              <span className="font-semibold text-orange-700 dark:text-orange-300">
                                - R$ {calc.taxValue.toFixed(2)}
                              </span>
                            </div>

                            {/* Valor Líquido */}
                            <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded border border-emerald-200 dark:border-emerald-700/30">
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                💚 Valor Líquido:
                              </span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                R$ {calc.net.toFixed(2)}
                              </span>
                            </div>

                            {formData.tipo_base === 'LIQUIDO' && (
                              <div className="text-slate-500 dark:text-slate-400 text-center text-xs italic py-1">
                                ↓ Aplicando {formData.percentual}% de repasse sobre LÍQUIDO
                              </div>
                            )}
                            {formData.tipo_base === 'BRUTO' && (
                              <div className="text-slate-500 dark:text-slate-400 text-center text-xs italic py-1">
                                ↓ Aplicando {formData.percentual}% de repasse sobre BRUTO
                              </div>
                            )}

                            {/* Repasse Profissional */}
                            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800/30">
                              <span className="text-blue-700 dark:text-blue-300 font-semibold">
                                👨‍⚕️ Profissional:
                              </span>
                              <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">
                                R$ {calc.professional.toFixed(2)}
                              </span>
                            </div>

                            {/* Repasse Clínica */}
                            <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800/30">
                              <span className="text-indigo-700 dark:text-indigo-300 font-semibold">
                                🏥 Clínica:
                              </span>
                              <span className="text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                R$ {calc.clinic_value.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Footer com botões */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900/40 dark:to-slate-800/40 px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex gap-3 justify-end flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium px-6"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveRule}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 shadow-lg"
                disabled={
                  !formData.professional_id || (!formData.service_id && !formData.service_type)
                }
              >
                {editingRuleId ? '✏️  Atualizar Regra' : '➕ Criar Regra'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
        {/* END OLD DIALOG */}

        {/* Delete Alert */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent className="border-0">
            <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogHeader className="pt-6 pl-16">
              <AlertDialogTitle className="text-lg">Remover Regra de Repasse?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm mt-2">
                A regra será permanentemente removida do sistema. Esta ação não pode ser desfeita e
                não afetará os repassos já calculados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end pt-4">
              <AlertDialogCancel className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRule}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Remover Regra
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
