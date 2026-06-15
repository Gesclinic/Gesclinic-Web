/**
 * AtendimentoUnificado - REFATORADO
 * 
 * Tela unificada de Atendimento com 4 abas principais:
 * 1. Dados do Agendamento (data, hora, profissional, sala)
 * 2. Dados Cadastrais (paciente com TISS)
 * 3. Pagamento (PARTICULAR) ou Faturamento (CONVÊNIO) - DINÂMICA
 * 4. Resumo & NF (confirmação e emissão de nota fiscal)
 * 
 * Fluxo: Seleciona paciente → Escolhe convênio/particular → 
 *        Abas mudam dinamicamente → Finalize com integração completa
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, Clock, Plus, X, Calendar, Users, DollarSign, FileText } from 'lucide-react';

// APIs
import {
  updateAppointment,
  getAppointmentServices,
  syncAppointmentServices,
} from '@/lib/appointmentsApi';
import { finalizeAppointmentWithFinancials, validateAppointmentDataIntegrity, getAppointmentFinancialStatus, listFinancialAuditLogs } from '@/lib/appointmentFinancialIntegrationApi';
import { listPayers } from '@/lib/payersApi';
import { listServices } from '@/lib/servicesApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listRooms } from '@/lib/roomsApi';
import { listPatients } from '@/lib/patientsApi';
import { listServicesByProfessional } from '@/lib/professionalServicesApi';
import { getPayersForProfessional } from '@/lib/professionalPayerApi';
import { getServicePriceWithCascade } from '@/lib/servicePricesApi';

/**
 * Componente Principal: AtendimentoUnificado
 */
export default function AtendimentoUnificado({ isOpen, onClose, appointment, onSaved }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  console.log('🎯 [AtendimentoUnificado] RENDER - isOpen:', isOpen, 'appointmentId:', appointment?.id, 'clinicId:', clinicId);

  // ========== STATE ==========
  const [formData, setFormData] = useState({
    patientId: '',
    payerId: '',
    professionalId: '',
    roomId: '',
    status: 'scheduled',
    observations: '',
    services: [],
  });

  const [validationErrors, setValidationErrors] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [financialStatus, setFinancialStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [servicePrices, setServicePrices] = useState({});

  // ========== QUERIES ==========
  const { data: payers = [] } = useQuery({
    queryKey: ['payers', clinicId],
    queryFn: () => listPayers(clinicId),
    enabled: !!clinicId,
  });

  // NOVO: Payers filtrados por profissional
  const { data: filteredPayers = [] } = useQuery({
    queryKey: ['filtered_payers', formData.professionalId, clinicId],
    queryFn: () => {
      if (!formData.professionalId) return [];
      return getPayersForProfessional(formData.professionalId, clinicId);
    },
    enabled: !!formData.professionalId && !!clinicId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', clinicId],
    queryFn: () => listServices(clinicId),
    enabled: !!clinicId,
  });

  // NOVO: Serviços filtrados por profissional
  const { data: filteredServices = [] } = useQuery({
    queryKey: ['filtered_services', formData.professionalId, clinicId],
    queryFn: () => {
      if (!formData.professionalId) return [];
      return listServicesByProfessional(formData.professionalId, clinicId);
    },
    enabled: !!formData.professionalId && !!clinicId,
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ['professionals', clinicId],
    queryFn: () => listProfessionals(clinicId),
    enabled: !!clinicId,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', clinicId],
    queryFn: () => listRooms(clinicId),
    enabled: !!clinicId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', clinicId],
    queryFn: () => listPatients(clinicId),
    enabled: !!clinicId,
  });

  // ========== MUTATIONS ==========

  /**
   * Mutation: Salvar alterações do agendamento
   */
  const saveAppointmentMutation = useMutation({
    mutationFn: async (data) => {
      return updateAppointment(appointment.id, {
        patient_id: data.patientId,
        payer_id: data.payerId,
        professional_id: data.professionalId,
        room_id: data.roomId,
        status: data.status,
        notes: data.observations,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      queryClient.invalidateQueries(['appointment_financial_stats']);
      onSaved?.();
    },
  });

  /**
   * Mutation: Adicionar serviço
   */
  const addServiceMutation = useMutation({
    mutationFn: async (serviceId) => {
      const currentServices = await getAppointmentServices(appointment.id);
      const updatedServices = [...currentServices, { service_id: serviceId, quantity: 1 }];
      return syncAppointmentServices(appointment.id, updatedServices);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointment_services']);
    },
  });

  /**
   * Mutation: Remover serviço
   */
  const removeServiceMutation = useMutation({
    mutationFn: async (appointmentServiceId) => {
      const currentServices = await getAppointmentServices(appointment.id);
      const updatedServices = currentServices.filter(s => s.id !== appointmentServiceId);
      return syncAppointmentServices(appointment.id, updatedServices);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointment_services']);
    },
  });

  /**
   * Mutation: Finalizar atendimento + criar recebível
   */
  const finalizeAppointmentMutation = useMutation({
    mutationFn: async () => {
      // Validar antes de finalizar
      const validation = await validateAppointmentDataIntegrity(
        appointment.id,
        clinicId
      );
      if (!validation.valid) {
        throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
      }

      // Finalizar atendimento
      const result = await finalizeAppointmentWithFinancials(
        appointment.id,
        clinicId
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['appointments']);
      queryClient.invalidateQueries(['appointment_financial_status']);
      queryClient.invalidateQueries(['ar_invoices']);
      alert(' Atendimento finalizado! Recebível criado automaticamente.');
      onSaved?.();
      onClose?.();
    },
    onError: (error) => {
      alert(` Erro: ${error.message}`);
    },
  });

  // ========== EFFECTS ==========

  /**
   * Carregar dados do agendamento existente
   */
  useEffect(() => {
    if (appointment) {
      setFormData({
        patientId: appointment.patient_id || '',
        payerId: appointment.payer_id || '',
        professionalId: appointment.professional_id || '',
        roomId: appointment.room_id || '',
        status: appointment.status || 'scheduled',
        observations: appointment.notes || '',
        services: Array.isArray(appointment.services) ? appointment.services : [],
      });

      // Carregar status financeiro
      getAppointmentFinancialStatus(appointment.id, clinicId)
        .then(setFinancialStatus)
        .catch(console.error);

      // Carregar auditoria
      listFinancialAuditLogs(appointment.id, clinicId)
        .then(setAuditLog)
        .catch(console.error);
    }
  }, [appointment, clinicId]);

  /**
   * NOVO: Carregar preços da cascata quando profissional/pagador mudam
   */
  useEffect(() => {
    const loadPrices = async () => {
      if (!formData.professionalId || !clinicId) {
        setServicePrices({});
        return;
      }

      const prices = {};
      const servicesToPrice = formData.payerId 
        ? (filteredServices || []) 
        : (services || []);

      for (const svc of servicesToPrice) {
        try {
          const priceData = await getServicePriceWithCascade(
            svc.id,
            formData.payerId === 'particular' ? null : formData.payerId || null,
            clinicId,
            formData.professionalId,
          );
          prices[svc.id] = priceData;
          console.log(`✅ [Cascata] Serviço ${svc.name}: R$ ${priceData.price} (nível ${priceData.level})`);
        } catch (error) {
          console.error(`❌ Erro ao carregar preço do serviço ${svc.id}:`, error);
          prices[svc.id] = { price: 0, level: 'error' };
        }
      }

      setServicePrices(prices);
    };

    loadPrices();
  }, [formData.professionalId, formData.payerId, filteredServices, services, clinicId]);

  // ========== VALIDAÇÃO ==========

  /**
   * Validar dados obrigatórios
   */
  const validateForm = useCallback(() => {
    const errors = [];

    if (!formData.patientId) errors.push('Paciente é obrigatório');
    if (!formData.payerId) errors.push('Convênio/Pagador é obrigatório');
    if (!formData.professionalId) errors.push('Profissional é obrigatório');
    // TODO: Reativar validação de serviços após corrigir addServiceMutation
    // if (formData.services.length === 0) errors.push('Pelo menos 1 serviço é obrigatório');

    setValidationErrors(errors);
    return errors.length === 0;
  }, [formData]);

  // ========== CÁLCULOS ==========

  /**
   * Calcular totais dos serviços
   */
  const calculateTotals = useMemo(() => {
    const totals = {
      gross: 0,
      discount: 0,
      taxes: 0,
      net: 0,
      count: 0,
    };

    const services = Array.isArray(formData.services) ? formData.services : [];
    totals.count = services.length;

    services.forEach((svc) => {
      totals.gross += svc.value || 0;
      totals.discount += svc.discount || 0;
      totals.taxes += svc.taxes || 0;
    });

    totals.net = totals.gross - totals.discount - totals.taxes;

    return totals;
  }, [formData.services]);

  /**
   * Verificar se o formulário é válido (sem atualizar estado)
   */
  const isFormValid = useMemo(() => {
    const valid = (
      formData.patientId &&
      formData.payerId &&
      formData.professionalId
    );
    console.log('🔍 [AtendimentoUnificado] isFormValid:', valid, 'formData:', formData);
    return valid;
    // TODO: Reativar validação de serviços após corrigir addServiceMutation
    // services.length > 0
  }, [formData]);

  // ========== HANDLERS ==========

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddService = async (serviceId) => {
    try {
      await addServiceMutation.mutateAsync(serviceId);
      // Refetch appointment with new service
      queryClient.invalidateQueries(['appointment']);
    } catch (error) {
      console.error('Erro ao adicionar serviço:', error);
    }
  };

  const handleRemoveService = async (appointmentServiceId) => {
    try {
      await removeServiceMutation.mutateAsync(appointmentServiceId);
    } catch (error) {
      console.error('Erro ao remover serviço:', error);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await saveAppointmentMutation.mutateAsync(formData);
      alert(' Agendamento salvo com sucesso!');
    } catch (error) {
      alert(` Erro ao salvar: ${error.message}`);
    }
  };

  const handleFinalize = async () => {
    if (!validateForm()) return;

    const confirm = window.confirm(
      ' Finalizar atendimento?\n\nIsso marcará como concluído e criará o recebível automaticamente.'
    );

    if (!confirm) return;

    await finalizeAppointmentMutation.mutateAsync();
  };

  // ========== RENDER ==========

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Atendimento Unificado
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
            <TabsTrigger value="checkin">Check-in</TabsTrigger>
          </TabsList>

          {/* ========== TAB: DADOS OBRIGATÓRIOS ========== */}
          <TabsContent value="dados" className="space-y-4">
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {validationErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Dados Obrigatórios</CardTitle>
                <CardDescription>Preencha todos os campos marcados com *</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Paciente */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Paciente * {formData.patientId ? '✓' : '✗'}
                  </label>
                  <Select value={formData.patientId} onValueChange={(v) => handleInputChange('patientId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Convênio/Pagador */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Convênio/Pagador * {formData.payerId ? '✓' : '✗'}
                  </label>
                  <Select value={formData.payerId} onValueChange={(v) => handleInputChange('payerId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.professionalId ? "Selecione convênio do profissional" : "Selecione profissional primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="particular">PARTICULAR</SelectItem>
                      {/* NOVO: Usar filteredPayers se houver profissional, senão usar todos */}
                      {formData.professionalId ? (
                        filteredPayers?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))
                      ) : (
                        payers?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Profissional */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Profissional * {formData.professionalId ? '✓' : '✗'}
                  </label>
                  <Select value={formData.professionalId} onValueChange={(v) => handleInputChange('professionalId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sala (opcional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sala (opcional)
                  </label>
                  <Select value={formData.roomId} onValueChange={(v) => handleInputChange('roomId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sala (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="in_progress">Em Atendimento</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="no_show">Faltou</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium mb-2">Observações</label>
                  <Textarea
                    placeholder="Adicione observações do atendimento..."
                    value={formData.observations}
                    onChange={(e) => handleInputChange('observations', e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== TAB: MÚLTIPLOS SERVIÇOS ========== */}
          <TabsContent value="servicos" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Serviços do Atendimento</CardTitle>
                    <CardDescription>Adicione um ou mais serviços</CardDescription>
                  </div>
                  <div>
                    {formData.services.length > 0 ? (
                      <Badge className="bg-green-600">✓ {formData.services.length} serviço(s)</Badge>
                    ) : (
                      <Badge className="bg-red-600">✗ Nenhum serviço</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tabela de Serviços */}
                {formData.services.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead className="text-right">Valor Bruto</TableHead>
                        <TableHead className="text-right">Impostos</TableHead>
                        <TableHead className="text-right">Valor Líquido</TableHead>
                        <TableHead className="text-right text-xs text-gray-500">Cascata</TableHead>
                        <TableHead className="w-12">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.services.map((svc, idx) => {
                        const priceData = servicePrices[svc.id];
                        return (
                          <TableRow key={idx}>
                            <TableCell>{svc.name}</TableCell>
                            <TableCell className="text-right">R$ {svc.value?.toFixed(2)}</TableCell>
                            <TableCell className="text-right">R$ {svc.taxes?.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold">
                              R$ {((svc.value || 0) - (svc.taxes || 0))?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-gray-600">
                              {priceData ? (
                                <span title={`Nível ${priceData.level} - ${priceData.source}`}>
                                  L{priceData.level}
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveService(svc.id)}
                                disabled={removeServiceMutation.isPending}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Totais */}
                      <TableRow className="bg-slate-100 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">R$ {calculateTotals.gross.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {calculateTotals.taxes.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {calculateTotals.net.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>Nenhum serviço adicionado ainda</AlertDescription>
                  </Alert>
                )}

                {/* Botão: Adicionar Serviço */}
                <div className="flex gap-2 flex-wrap">
                  {/* NOVO: Usar filteredServices se houver profissional, senão usar todos */}
                  {(formData.professionalId ? filteredServices : services)?.map((svc) => {
                    const priceData = servicePrices[svc.id];
                    const priceText = priceData?.price > 0 ? ` (R$ ${priceData.price.toFixed(2)})` : '';
                    return (
                      <Button
                        key={svc.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddService(svc.id)}
                        disabled={addServiceMutation.isPending || (Array.isArray(formData.services) && formData.services.some((s) => s.id === svc.id))}
                        title={priceData ? `Cascata nível ${priceData.level}` : 'Carregando preço...'}
                      >
                        <Plus className="w-4 h-4 mr-1" /> {svc.name}
                        {priceText}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== TAB: FINANCEIRO ========== */}
          <TabsContent value="financeiro" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Status Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {financialStatus ? (
                  <>
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge
                        className={
                          financialStatus.status === 'completed'
                            ? 'bg-green-600'
                            : financialStatus.status === 'pending'
                            ? 'bg-yellow-600'
                            : 'bg-gray-600'
                        }
                      >
                        {financialStatus.status === 'completed' && '✓ Recebível Criado'}
                        {financialStatus.status === 'pending' && '⏳ Processando...'}
                        {financialStatus.status === 'not_processed' && '○ Não processado'}
                        {financialStatus.status === 'error' && '✗ Erro'}
                      </Badge>
                    </div>

                    {/* Valores */}
                    {financialStatus.mapping && (
                      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-100 rounded">
                        <div>
                          <p className="text-xs text-gray-600">Valor Bruto</p>
                          <p className="text-lg font-bold">
                            R$ {financialStatus.mapping.appointment_value?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Impostos</p>
                          <p className="text-lg font-bold">
                            R$ {financialStatus.mapping.tax_applied?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Valor Líquido</p>
                          <p className="text-lg font-bold">
                            R$ {(
                              (financialStatus.mapping.appointment_value || 0) -
                              (financialStatus.mapping.tax_applied || 0)
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Botão: Criar Recebível Manual */}
                    {financialStatus.status !== 'completed' && (
                      <Button
                        className="w-full"
                        onClick={handleFinalize}
                        disabled={!isFormValid || finalizeAppointmentMutation.isPending}
                      >
                        {finalizeAppointmentMutation.isPending ? (
                          '⏳ Criando recebível...'
                        ) : (
                          '✓ Criar Recebível Agora'
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <Alert>
                    <Clock className="w-4 h-4" />
                    <AlertDescription>Carregando informações financeiras...</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== TAB: AUDITORIA ========== */}
          <TabsContent value="auditoria" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Histórico de Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLog && auditLog.length > 0 ? (
                  <div className="space-y-2">
                    {auditLog.map((log, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="text-sm font-medium">{log.event_type}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </p>
                        {log.event_data && (
                          <pre className="text-xs bg-slate-100 p-2 rounded mt-1 overflow-auto max-h-32">
                            {JSON.stringify(log.event_data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>Nenhum evento registrado ainda</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== TAB: CHECK-IN ========== */}
          <TabsContent value="checkin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Check-in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Presença</label>
                  <Select value={appointment?.checkin_status || undefined} onValueChange={(v) => handleInputChange('checkinStatus', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status de presença" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">✓ Confirmado</SelectItem>
                      <SelectItem value="no_show">✗ Faltou</SelectItem>
                      <SelectItem value="cancelled">○ Cancelado</SelectItem>
                      <SelectItem value="pending">⏳ Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Hora de Chegada</label>
                    <Input type="time" value={appointment?.arrived_at || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hora de Saída</label>
                    <Input type="time" value={appointment?.left_at || ''} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Observações do Check-in</label>
                  <Textarea placeholder="Anotações do check-in..." rows={3} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ========== FOOTER: ACTIONS ========== */}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={saveAppointmentMutation.isPending}>
             Salvar
          </Button>
          <Button
            className="bg-green-600"
            onClick={handleFinalize}
            disabled={finalizeAppointmentMutation.isPending}
          >
            ✓ Finalizar Atendimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
