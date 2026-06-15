import React, { useState, useMemo, useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  BadgePercent,
  Plus,
  Banknote,
  Building2,
  FileText,
  User,
  Briefcase,
  Calculator,
  DivideIcon,
  GitBranch,
  CheckCircle2,
} from 'lucide-react';
import BankAccountsManager from '@/pages/clinica/configuracoes/BankAccountsManager';

export default function RepassConfigurationModal({
  open,
  onOpenChange,
  editingRuleId,
  rule,
  professionals,
  services,
  issRate,
  regimesTaxRates,
  onSaveRule,
  getProfessionalName,
  getServiceName,
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('regra');
  const [simulatedValue, setSimulatedValue] = useState(100);

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (open && rule) {
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
    } else if (open) {
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
    setActiveTab('regra');
  }, [open, rule]);

  const serviceGroups = [
    { value: 'consultas', label: '👨‍⚕️ Consultas' },
    { value: 'exames', label: '🔬 Exames' },
    { value: 'cirurgias', label: '🏥 Cirurgias' },
    { value: 'procedimentos', label: '⚙️ Procedimentos' },
  ];

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

  const handleSave = async () => {
    if (!formData.professional_id) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione o profissional',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.service_id && !formData.service_type) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione um serviço ou um grupo de serviços',
        variant: 'destructive',
      });
      return;
    }

    if (formData.percentual < 0 || formData.percentual > 100) {
      toast({
        title: 'Valor inválido',
        description: 'O percentual deve estar entre 0 e 100',
        variant: 'destructive',
      });
      return;
    }

    await onSaveRule(formData, editingRuleId);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-none p-0 flex flex-col gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 px-6 py-5 border-b border-blue-200/30 dark:border-blue-800/30 flex items-center gap-3 sticky top-0 z-50 backdrop-blur-sm flex-shrink-0">
          <div className="bg-blue-500/10 dark:bg-blue-500/20 p-2.5 rounded-lg">
            <BadgePercent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold">⚙️ Centro de Configuração de Repassos</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Gerencie regras de repasse, contas bancárias e convênios em um único lugar
            </DialogDescription>
          </div>
        </div>

        {/* Tabs Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {/* Tab List */}
          <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 px-6 flex-shrink-0">
            <TabsList className="w-full justify-start gap-2 bg-transparent border-b-0 h-auto p-0">
              <TabsTrigger 
                value="regra"
                className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all"
              >
                <BadgePercent className="w-4 h-4 mr-2" />
                Regra de Repasse
              </TabsTrigger>
              <TabsTrigger 
                value="contas"
                className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all"
              >
                <Banknote className="w-4 h-4 mr-2" />
                Contas Bancárias
              </TabsTrigger>
              <TabsTrigger 
                value="convenios"
                className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all"
              >
                <FileText className="w-4 h-4 mr-2" />
                Convênios
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* TAB 1: REGRA */}
            <TabsContent value="regra" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                {/* Coluna 1 */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-500 rounded-full" />
                    Vinculação
                  </h3>

                  {/* Profissional */}
                  <div className="space-y-3">
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
                      <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Selecione um profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo de Regra */}
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
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        👤 Serviço Individual
                      </button>
                      <button
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
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        👥 Grupo de Serviços
                      </button>
                    </div>
                  </div>

                  {/* Serviço */}
                  {formData.rule_type === 'individual' ? (
                    <div className="space-y-3">
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
                        <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-3">
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
                        <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Selecione um grupo" />
                        </SelectTrigger>
                        <SelectContent>
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

                {/* Coluna 2 */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <div className="w-1 h-5 bg-orange-500 rounded-full" />
                    Configuração Financeira
                  </h3>

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 rounded-lg p-5 space-y-5 border border-slate-200/50 dark:border-slate-700/50">
                    {/* Regime */}
                    <div className="space-y-3">
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
                        <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(regimesTaxRates).map(([code, regime]) => (
                            <SelectItem key={code} value={code}>
                              {regime.name} - {(regime.rate * 100).toFixed(2)}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {regimesTaxRates[formData.regime_code]?.description}
                      </p>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded p-2">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          📍 ISS Municipal Configurado: <span className="font-semibold">{(issRate * 100).toFixed(2)}%</span>
                        </p>
                      </div>

                      {/* ISS Customizado */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            ⚙️
                          </div>
                          ISS Customizado (Opcional)
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            placeholder={`${(issRate * 100).toFixed(2)}`}
                            value={formData.iss_customizado || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                iss_customizado: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            className="h-10 bg-white dark:bg-slate-800 text-sm flex-1"
                          />
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">%</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          💡 Deixe em branco para usar o ISS municipal padrão da clínica
                        </p>
                      </div>
                    </div>

                    {/* Forma de Cálculo */}
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
                        <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRUTO">💰 Sobre valor bruto</SelectItem>
                          <SelectItem value="LIQUIDO">📊 Sobre valor líquido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Percentual */}
                    <div className="space-y-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <DivideIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        Percentual de Repasse
                      </label>
                      <div className="flex items-end gap-3">
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
                          className="h-14 bg-white dark:bg-slate-800 text-2xl font-bold text-center"
                        />
                        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {formData.percentual}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulador */}
              {formData.percentual && (
                <div className="px-6 pb-6 pt-0">
                  <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">📊 Simulador:</p>
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
                          className="w-24 h-8 bg-white dark:bg-slate-800 text-xs font-semibold text-center"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      {(() => {
                        const regime = regimesTaxRates[formData.regime_code];
                        const effectiveRate = formData.iss_customizado
                          ? formData.iss_customizado / 100
                          : regime?.rate;
                        const calc = calculateRepasse({
                          gross: simulatedValue,
                          taxRate: effectiveRate,
                          repassePercent: formData.percentual,
                          mode: formData.tipo_base,
                        });
                        return (
                          <>
                            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded">
                              <span>💰 Bruto:</span>
                              <span>R$ {calc.gross.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-orange-50 dark:bg-orange-900/10 rounded">
                              <span>🏛️ Impostos ({(effectiveRate * 100).toFixed(2)}%):</span>
                              <span>- R$ {calc.taxValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded">
                              <span>💚 Líquido:</span>
                              <span>R$ {calc.net.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <span>👨‍⚕️ Profissional ({formData.percentual}%):</span>
                              <span className="font-bold">R$ {calc.professional.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                              <span>🏥 Clínica:</span>
                              <span className="font-bold">R$ {calc.clinic_value.toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: CONTAS */}
            <TabsContent value="contas" className="flex-1 overflow-y-auto">
              <div className="p-6">
                <BankAccountsManager />
              </div>
            </TabsContent>

            {/* TAB 3: CONVÊNIOS */}
            <TabsContent value="convenios" className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Gerenciar Convênios
                    </CardTitle>
                    <CardDescription>
                      Cadastre e configure convênios com suas tabelas de preço
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center">
                      <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">
                        Funcionalidade em Desenvolvimento
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        Cadastro de convênios com taxas e tabelas de preço
                      </p>
                      <Button disabled className="gap-2">
                        <Plus className="w-4 h-4" />
                        Novo Convênio
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900/40 dark:to-slate-800/40 px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex gap-3 justify-end flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-slate-300 dark:border-slate-600 font-medium px-6"
          >
            Cancelar
          </Button>
          {activeTab === 'regra' && (
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6 shadow-lg"
              disabled={
                !formData.professional_id || (!formData.service_id && !formData.service_type)
              }
            >
              {editingRuleId ? '✏️ Atualizar Regra' : '➕ Criar Regra'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
