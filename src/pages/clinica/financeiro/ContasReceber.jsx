import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Filter, ChevronDown, Check, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { listReceivables, arStatusOptions, updateReceivable } from "@/lib/receivablesApi";
import { listAccountPlans, listCostCenters } from "@/lib/financeApi";
import { listProfessionals } from "@/lib/professionalsApi";
import { supabase } from "@/lib/customSupabaseClient";
import { useNavigate } from "react-router-dom";
import FinancialIntegrationStatus from "@/components/clinica/financeiro/FinancialIntegrationStatus";

export default function ContasReceber() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Financeiro", path: "/clinica/financeiro" },
    { label: "Contas a Receber" }
  ]);
  const { clinicId } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    payer: "",
    status: "",
    origin: "",
    payerType: "",
    professionalId: "",
    ccId: "",
    planId: "",
    emissionStart: "",
    emissionEnd: "",
    dueStart: "",
    dueEnd: "",
    receivedStart: "",
    receivedEnd: "",
    search: "",
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [confirmReceived, setConfirmReceived] = useState(null);

  // Calcular resumo financeiro
  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + (Number(r.valor_bruto) || 0), 0);
    const received = rows.filter(r => r.status === 'received').reduce((s, r) => s + (Number(r.valor_bruto) || 0), 0);
    const pending = rows.filter(r => r.status !== 'received').reduce((s, r) => s + (Number(r.valor_bruto) || 0), 0);
    const overdue = rows.filter(r => r.status !== 'received' && new Date(r.data_vencimento) < new Date()).reduce((s, r) => s + (Number(r.valor_bruto) || 0), 0);
    
    return { total, received, pending, overdue };
  }, [rows]);

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      console.log('📊 [ContasReceber] Aplicando filtros:', {
        payer: filters.payer || '(vazio)',
        payerType: filters.payerType || '(vazio)',
        status: filters.status || '(vazio)',
        origin: filters.origin || '(vazio)',
        professionalId: filters.professionalId || '(vazio)',
        planId: filters.planId || '(vazio)',
        dueStart: filters.dueStart || '(vazio)',
        dueEnd: filters.dueEnd || '(vazio)',
      });
      
      const data = await listReceivables({
        clinicId,
        payer: filters.payer,
        payerType: filters.payerType || null,
        status: filters.status || null,
        origin: filters.origin || null,
        professionalId: filters.professionalId || null,
        ccId: filters.ccId || null,
        planId: filters.planId || null,
        emissionStart: filters.emissionStart || null,
        emissionEnd: filters.emissionEnd || null,
        dueStart: filters.dueStart || null,
        dueEnd: filters.dueEnd || null,
        receivedStart: filters.receivedStart || null,
        receivedEnd: filters.receivedEnd || null,
        search: filters.search || null,
        limit: 100,
      });
      
      console.log('📊 [ContasReceber] Resultados retornados:', data?.length || 0);
      if (data?.length === 0) {
        console.warn('⚠️ [ContasReceber] Nenhum resultado encontrado com os filtros aplicados');
      }
      
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("❌ Receivables load error", e?.message || e);
      console.error("   Stack:", e?.stack);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clinicId]);
  useEffect(() => { if (!clinicId) return; (async()=>{ try{ const ps = await listProfessionals(clinicId); setProfessionals(ps||[]);}catch{}})(); }, [clinicId]);
  useEffect(() => { if (!clinicId) return; (async()=>{ try{ const cs = await listAccountPlans(clinicId); setPlans((cs||[]).filter(c=>!!c.parent_id)); const cc = await listCostCenters(clinicId); setCostCenters(cc||[]); }catch{}})(); }, [clinicId]);

  // Funções para manipular descrição e convênio
  const extractConvenioFromDescription = (desc) => {
    if (!desc) return null;
    const desc_lower = desc.toLowerCase();
    
    if (desc_lower.includes('particular')) return 'Particular';
    if (desc_lower.includes('unimed')) {
      const match = desc.match(/Unimed[^-]*/i);
      return match ? match[0].trim() : 'Unimed';
    }
    if (desc_lower.includes('sulamerica')) return 'SulAmérica';
    if (desc_lower.includes('bradesco')) return 'Bradesco';
    if (desc_lower.includes('notre dame')) return 'Notre Dame';
    
    const parts = desc.split(' - ');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && lastPart.length > 0 && lastPart.length < 100) {
        return lastPart;
      }
    }
    return null;
  };

  const formatPaymentMethod = (method) => {
    if (!method) return null;
    const lower = String(method).toLowerCase();
    const paymentMethods = {
      'debito': 'Débito',
      'credito': 'Crédito',
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'ted': 'TED',
      'cheque': 'Cheque',
      'cartao': 'Cartão',
      'cartão': 'Cartão',
      'transferencia': 'Transferência',
      'transferência': 'Transferência',
      'vale': 'Vale',
      'outro': 'Outro',
      'deposito': 'Depósito',
      'depósito': 'Depósito',
      'boleto': 'Boleto',
      'doc': 'DOC',
    };
    return paymentMethods[lower] || method;
  };

  // 🔗 Enriquecer dados com nomes de relacionamentos
  useEffect(() => {
    if (!rows.length) {
      console.log('⚠️ [ENRICH] rows array está vazio, pulando...');
      return;
    }
    
    console.log('🔄 [ENRICH] Iniciando enriquecimento de', rows.length, 'linhas');
    
    const enrichRows = async () => {
      try {
        // Buscar pacientes por paciente_id
        const patientIds = [...new Set(rows.map(r => r.paciente_id).filter(Boolean))];
        console.log('👥 [ENRICH] Pacientes a buscar:', patientIds.length);
        const patientMap = {};
        if (patientIds.length) {
          try {
            const { data: patients } = await supabase
              .from('patients')
              .select('id, name')
              .in('id', patientIds);
            console.log('   ✅ Pacientes encontrados:', patients?.length);
            patients?.forEach(p => { patientMap[p.id] = p.name; });
          } catch (err) {
            console.warn('❌ Erro ao buscar patients:', err?.message);
          }
        }

        // Buscar dados do appointment (incluindo paciente via patient_id)
        const appointmentIds = [...new Set(rows.map(r => r.appointment_id).filter(Boolean))];
        console.log('📅 [ENRICH] Agendamentos a buscar:', appointmentIds.length);
        const appointmentMap = {};
        const appointmentPatientMap = {}; // Mapear appointment_id => patient_name
        if (appointmentIds.length) {
          try {
            const { data: appointments } = await supabase
              .from('appointments')
              .select('id, patient_id, patients(name), convenio_id, plano_contas_id, payment_method')
              .in('id', appointmentIds);
            console.log('   ✅ Agendamentos encontrados:', appointments?.length);
            appointments?.forEach(apt => {
              console.log(`      - apt ${apt.id}: convenio_id=${apt.convenio_id}, plano=${apt.plano_contas_id}, payment=${apt.payment_method}, patient=${apt.patients?.name}`);
              appointmentMap[apt.id] = {
                convenio_id: apt.convenio_id,
                plano_contas_id: apt.plano_contas_id,
                payment_method: apt.payment_method,
              };
              // 🆕 Guardar o nome do paciente do appointment
              if (apt.patients?.name) {
                appointmentPatientMap[apt.id] = apt.patients.name;
              }
            });
          } catch (err) {
            console.warn('❌ Erro ao buscar appointments:', err?.message);
          }
        }

        // Buscar convênios - de convenio_id direto ou do appointment
        const convenioIds = [...new Set(
          rows.map(r => r.convenio_id || appointmentMap[r.appointment_id]?.convenio_id).filter(Boolean)
        )];
        console.log('🏥 [ENRICH] Convênios a buscar:', convenioIds.length);
        if (convenioIds.length) {
          console.log('   IDs:', convenioIds);
        }
        const convenioMap = {};
        if (convenioIds.length) {
          try {
            const { data: convenios } = await supabase
              .from('convenios')
              .select('id, name')
              .in('id', convenioIds);
            console.log('   ✅ Convênios encontrados:', convenios?.length);
            convenios?.forEach(c => { 
              console.log(`      - ${c.id}: ${c.name}`);
              convenioMap[c.id] = c.name; 
            });
          } catch (err) {
            console.warn('❌ Tabela convenios não encontrada ou erro ao buscar:', err?.message);
            // Continuar mesmo se a tabela não existir
          }
        }

        // Buscar planos de contas - de plano_contas_id direto ou do appointment
        const planoIds = [...new Set(
          rows.map(r => r.plano_contas_id || appointmentMap[r.appointment_id]?.plano_contas_id).filter(Boolean)
        )];
        console.log('📊 [ENRICH] Planos de Contas a buscar:', planoIds.length);
        if (planoIds.length) {
          console.log('   IDs:', planoIds);
        }
        const planoMap = {};
        if (planoIds.length) {
          try {
            const { data: planos } = await supabase
              .from('account_plans')
              .select('id, name')
              .in('id', planoIds);
            console.log('   ✅ Planos encontrados:', planos?.length);
            planos?.forEach(p => { 
              console.log(`      - ${p.id}: ${p.name}`);
              planoMap[p.id] = p.name; 
            });
          } catch (err) {
            console.warn('❌ Erro ao buscar account_plans:', err?.message);
          }
        }

        console.log('📝 [ENRICH] Atualizando rows com dados enriquecidos...');
        // Atualizar rows com nomes
        setRows(prev => {
          const updated = prev.map(r => {
            const convenio_value = convenioMap[r.convenio_id || appointmentMap[r.appointment_id]?.convenio_id];
            const plano_value = planoMap[r.plano_contas_id || appointmentMap[r.appointment_id]?.plano_contas_id];
            const forma_value = r.forma_prevista || appointmentMap[r.appointment_id]?.payment_method;
            
            // 🆕 Para origem "Agenda", priorizar nome do paciente do appointment
            let payer_display = r.payer_name;
            if (r.origem === 'Agenda' && appointmentPatientMap[r.appointment_id]) {
              payer_display = appointmentPatientMap[r.appointment_id];
              console.log(`   [Agenda] Usando patient do appointment: ${payer_display}`);
            }
            
            console.log(`   Linha: ${payer_display || '?'}`);
            console.log(`      convenio: id=${r.convenio_id || appointmentMap[r.appointment_id]?.convenio_id} => nome=${convenio_value || '(vazio)'}`);
            console.log(`      plano: id=${r.plano_contas_id || appointmentMap[r.appointment_id]?.plano_contas_id} => nome=${plano_value || '(vazio)'}`);
            console.log(`      forma: ${forma_value || '(vazio)'}`);
            
            return {
              ...r,
              patient_name: patientMap[r.paciente_id] || appointmentPatientMap[r.appointment_id] || r.patient_name || r.payer_name,
              payer_display: payer_display, // Campo para renderização (paciente se Agenda, senão payer_name)
              convenio_name: convenio_value || extractConvenioFromDescription(r.descricao) || null,
              plano_contas_name: plano_value || null,
              forma_prevista: forma_value || null,
            };
          });
          console.log('✅ [ENRICH] Rows atualizadas:', updated.length, 'linhas');
          return updated;
        });
      } catch (err) {
        console.error('❌ Erro ao enriquecer dados:', err);
      }
    };

    enrichRows();
  }, [rows]);

  const markReceived = async (row) => {
    try {
      const updated = await updateReceivable(row.id, { status: 'received', data_recebimento: new Date().toISOString().slice(0,10) });
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'received', data_recebimento: updated.data_recebimento || r.data_recebimento } : r));
      setConfirmReceived(null);
      // Dispara cálculo de repasse para mês/ano do recebimento
      const d = updated.data_recebimento ? new Date(updated.data_recebimento) : new Date();
      const m = d.getMonth()+1; const y = d.getFullYear();
      await supabase.rpc('generate_doctor_commissions_v2', { p_clinic_id: clinicId, p_month: m, p_year: y, p_mode: 'standard' }).catch(()=>{});
    } catch (e) { console.warn('markReceived error', e?.message||e); }
  };

  // 🔗 Função para acessar a origem do pagamento
  const handleOriginClick = async (row) => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔗 [ContasReceber] handleOriginClick INICIADO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 LINHA COMPLETA DA TABELA:', JSON.stringify(row, null, 2));
    console.log('Origem:', row.origem);
    console.log('appointment_id:', row.appointment_id, '(tipo:', typeof row.appointment_id, ', vazio?:', !row.appointment_id, ')');
    console.log('data_emissao:', row.data_emissao, '(type:', typeof row.data_emissao + ')');
    console.log('data_vencimento:', row.data_vencimento, '(type:', typeof row.data_vencimento + ')');

    if (row.origem !== 'Agenda') {
      console.log('❌ Não é Agenda, ignorando');
      return;
    }

    console.log('✅ É Agenda, processando...');

    // Se tem appointmentId, buscar DATA do agendamento no banco
    if (row.appointment_id) {
      console.log('✅ Priori 1: Tem appointmentId =', row.appointment_id);
      console.log('🔍 Buscando dados do agendamento na tabela "appointments"...');
      
      let appointmentDate = null;
      
      try {
        // Buscar o agendamento para pegar a data - buscando TODOS os campos
        console.log('📡 Enviando query:', { table: 'appointments', id: row.appointment_id });
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', row.appointment_id)
          .single();
        
        console.log('📨 Resposta Supabase - data:', appointmentData);
        console.log('📨 Resposta Supabase - error:', appointmentError);
        
        if (appointmentData) {
          console.log('✅ Agendamento encontrado - TODOS OS CAMPOS:', appointmentData);
          
          // Log de cada campo de data potencial
          console.log('   - appointment_date:', appointmentData.appointment_date);
          console.log('   - date:', appointmentData.date);
          console.log('   - data:', appointmentData.data);
          console.log('   - data_atendimento:', appointmentData.data_atendimento);
          console.log('   - scheduled_date:', appointmentData.scheduled_date);
          console.log('   - service_date:', appointmentData.service_date);
          
          // Procurar a data em qualquer campo que pareça ter data
          const dateCandidates = [
            appointmentData.appointment_date,
            appointmentData.date,
            appointmentData.data,
            appointmentData.data_atendimento,
            appointmentData.scheduled_date,
            appointmentData.service_date
          ];
          
          for (const candidate of dateCandidates) {
            if (candidate) {
              let extracted = candidate;
              if (typeof extracted === 'string' && extracted.includes('T')) {
                extracted = extracted.split('T')[0];
              }
              if (/^\d{4}-\d{2}-\d{2}/.test(extracted)) {
                appointmentDate = extracted;
                console.log('✅ Data extraída do agendamento:', appointmentDate);
                break;
              }
            }
          }
        } else if (appointmentError) {
          console.warn('❌ Erro ao buscar agendamento:', appointmentError);
        } else {
          console.warn('⚠️  Agendamento não encontrado (null)');
        }
      } catch (e) {
        console.warn('❌ Erro try/catch ao buscar agendamento:', e?.message || e);
      }
      
      // 🔄 FALLBACK: Se não encontrou data do agendamento, usar data_emissao
      if (!appointmentDate) {
        console.log('⚠️  appointmentDate ainda está vazio, tentando data_emissao...');
        if (row.data_emissao) {
          let extracted = row.data_emissao;
          if (typeof extracted === 'string' && extracted.includes('T')) {
            extracted = extracted.split('T')[0];
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(extracted)) {
            appointmentDate = extracted;
            console.log('✅ Usando fallback data_emissao:', appointmentDate);
          }
        } else {
          console.log('⚠️  data_emissao também está vazia');
        }
      }
      
      // 🔄 FALLBACK: Se ainda não tem, usar data_vencimento (ÚLTIMO RECURSO)
      if (!appointmentDate) {
        console.log('❌ appointmentDate AINDA está vazio! Caindo para ÚLTIMO RECURSO data_vencimento...');
        if (row.data_vencimento) {
          let extracted = row.data_vencimento;
          if (typeof extracted === 'string' && extracted.includes('T')) {
            extracted = extracted.split('T')[0];
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(extracted)) {
            appointmentDate = extracted;
            console.log('⚠️  ⚠️  ⚠️  ÚLTIMO RECURSO: Using fallback data_vencimento:', appointmentDate);
          }
        } else {
          console.log('⚠️  data_vencimento também está vazia!');
        }
      }
      
      const navUrl = appointmentDate 
        ? `/clinica/agenda?appointmentDate=${appointmentDate}&appointmentId=${row.appointment_id}&mode=edit` 
        : `/clinica/agenda?appointmentId=${row.appointment_id}&mode=edit`;
      const navState = { 
        fromFinancial: true, 
        appointmentId: row.appointment_id,
        mode: 'edit',
        ...(appointmentDate && { appointmentDate })
      };
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 RESUMO FINAL - Prioridade 1 (com appointment_id):');
      console.log('   appointmentDate encontrada:', appointmentDate);
      console.log('   Navegando para:', navUrl);
      console.log('   State:', navState);
      console.log('═══════════════════════════════════════════════════════');
      
      // 💾 BACKUP: Guardar no localStorage
      localStorage.setItem('agendaFromFinancialAppointmentId', row.appointment_id);
      if (appointmentDate) {
        localStorage.setItem('agendaFromFinancialDate', appointmentDate);
      }
      console.log('💾 Guardado em localStorage:', { appointmentId: row.appointment_id, appointmentDate });
      
      navigate(navUrl, { state: navState });
      return;
    }

    // Se tem data_emissao, usar ela (garantir que é apenas data YYYY-MM-DD)
    if (row.data_emissao) {
      let extractedDate = row.data_emissao;
      
      // Se tiver 'T' (timestamp), extrair só a parte da data
      if (typeof extractedDate === 'string' && extractedDate.includes('T')) {
        extractedDate = extractedDate.split('T')[0];
      }
      
      // Garantir formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(extractedDate)) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ Priori 2: SEM appointment_id, Usando data_emissao =', extractedDate);
        console.log('═══════════════════════════════════════════════════════');
        const navUrl = `/clinica/agenda?appointmentDate=${extractedDate}`;
        const navState = { fromFinancial: true, appointmentDate: extractedDate };
        
        // 💾 BACKUP: Guardar no localStorage
        localStorage.setItem('agendaFromFinancialDate', extractedDate);
        console.log('💾 Guardado em localStorage: agendaFromFinancialDate =', extractedDate);
        
        navigate(navUrl, { state: navState });
        return;
      } else {
        console.log('⚠️  data_emissao não está em formato YYYY-MM-DD:', extractedDate);
      }
    } else {
      console.log('⚠️  row.data_emissao está vazio/null');
    }

    // Se tem data_vencimento (fallback)
    if (row.data_vencimento) {
      let extractedDate = row.data_vencimento;
      
      if (typeof extractedDate === 'string' && extractedDate.includes('T')) {
        extractedDate = extractedDate.split('T')[0];
      }
      
      if (/^\d{4}-\d{2}-\d{2}/.test(extractedDate)) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('⚠️  ⚠️  ⚠️  Priori 3: ÚLTIMO RECURSO - Usando data_vencimento =', extractedDate);
        console.log('⚠️  ISSO SIGNIFICA QUE O APPOINTMENT_ID ESTÁ VAZIO OU NÃO ENCONTRADO!');
        console.log('═══════════════════════════════════════════════════════');
        const navUrl = `/clinica/agenda?appointmentDate=${extractedDate}`;
        const navState = { fromFinancial: true, appointmentDate: extractedDate };
        
        // 💾 BACKUP: Guardar no localStorage
        localStorage.setItem('agendaFromFinancialDate', extractedDate);
        console.log('💾 Guardado em localStorage: agendaFromFinancialDate =', extractedDate);
        
        navigate(navUrl, { state: navState });
        return;
      }
    }

    console.log('❌ Sem dados válidos, indo para agenda vazio');
    navigate('/clinica/agenda');
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Contas a Receber"
      subtitle="Gerencie valores pendentes de pacientes, convênios ou empresas."
      actions={
        <Button className="bg-blue-600 text-white" onClick={() => navigate("/clinica/financeiro/receber/nova")}> 
          <Plus className="mr-2 w-4 h-4" /> Novo Recebimento
        </Button>
      }
    >
      {/* 📊 RESUMO FINANCEIRO */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total a Receber</p>
              <p className="text-2xl font-bold text-blue-600">{summary.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
              <p className="text-xs text-gray-500 mt-1">{rows.length} contas</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recebido</p>
              <p className="text-2xl font-bold text-green-600">{summary.received.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
              <p className="text-xs text-gray-500 mt-1">{rows.filter(r => r.status === 'received').length} contas</p>
            </div>
            <Check className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendente</p>
              <p className="text-2xl font-bold text-orange-600">{summary.pending.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
              <p className="text-xs text-gray-500 mt-1">{rows.filter(r => r.status !== 'received').length} contas</p>
            </div>
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Atrasado</p>
              <p className="text-2xl font-bold text-red-600">{summary.overdue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
              <p className="text-xs text-gray-500 mt-1">{rows.filter(r => r.status !== 'received' && new Date(r.data_vencimento) < new Date()).length} contas</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* � FINANCIAL INTEGRATION STATUS (PHASE 3B) */}
      <div className="mb-6">
        <FinancialIntegrationStatus />
      </div>

      {/* �🔍 FILTROS */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros avançados
          </h3>
          <button onClick={() => setShowFilters(!showFilters)} className="text-sm text-blue-600 hover:text-blue-700">
            {showFilters ? '▼ Ocultar' : '▶ Mostrar'}
          </button>
        </div>

        {showFilters && (
          <div>
            <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
              <Input placeholder="Paciente / Pagador" value={filters.payer} onChange={(e)=>setFilters(f=>({...f,payer:e.target.value}))} />
              <select className="border rounded px-3 py-2 text-sm" value={filters.status} onChange={(e)=>setFilters(f=>({...f,status:e.target.value}))}>
                <option value="">Status (todos)</option>
                {arStatusOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <select className="border rounded px-3 py-2 text-sm" value={filters.origin} onChange={(e)=>setFilters(f=>({...f,origin:e.target.value}))}>
                <option value="">Origem (todas)</option>
                <option value="Agenda">Agenda</option>
                <option value="Faturamento">Faturamento</option>
                <option value="Contrato">Contrato</option>
                <option value="Manual">Manual</option>
              </select>
              <select className="border rounded px-3 py-2 text-sm" value={filters.payerType} onChange={(e)=>setFilters(f=>({...f,payerType:e.target.value}))}>
                <option value="">Pagador (todos)</option>
                <option value="paciente">Paciente</option>
                <option value="convenio">Convênio</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
              <div>
                <label className="text-xs text-gray-600">Vencimento de</label>
                <Input type="date" value={filters.dueStart} onChange={(e)=>setFilters(f=>({...f,dueStart:e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Vencimento até</label>
                <Input type="date" value={filters.dueEnd} onChange={(e)=>setFilters(f=>({...f,dueEnd:e.target.value}))} />
              </div>
              <select className="border rounded px-3 py-2 text-sm" value={filters.professionalId} onChange={(e)=>setFilters(f=>({...f,professionalId:e.target.value}))}>
                <option value="">Profissional</option>
                {professionals.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <select className="border rounded px-3 py-2 text-sm" value={filters.planId} onChange={(e)=>setFilters(f=>({...f,planId:e.target.value}))}>
                <option value="">Plano de Contas</option>
                {plans.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button className="bg-blue-600" onClick={load} disabled={loading}>{loading?"Filtrando...":"Aplicar filtros"}</Button>
              <Button variant="outline" onClick={()=>{setFilters({ payer:"", status:"", origin:"", emissionStart:"", emissionEnd:"", dueStart:"", dueEnd:"", search:"", payerType:"", professionalId:"", ccId:"", planId:"", receivedStart:"", receivedEnd:""}); load();}}>Limpar</Button>
              <Button variant="ghost" className="ml-auto"><Download className="w-4 h-4 mr-2" />Exportar</Button>
            </div>
          </div>
        )}

        {!showFilters && (
          <div className="flex gap-2 items-center">
            <Input placeholder="Buscar por descrição..." className="flex-1" value={filters.search} onChange={(e)=>setFilters(f=>({...f,search:e.target.value}))} />
            <Button variant="outline" onClick={load} disabled={loading}>Buscar</Button>
          </div>
        )}
      </Card>

      {/* 📋 TABELA */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {/* 🔍 DEBUG: Log dos dados antes de renderizar */}
          {rows.length > 0 && (
            <>
              <div style={{display: 'none'}}>
                {console.log('🎨 [RENDER TABLE] Dados antes de renderizar:', rows.map(r => ({
                  id: r.id,
                  payer_name: r.payer_name,
                  patient_name: r.patient_name,
                  convenio_name: r.convenio_name,
                  forma_prevista: r.forma_prevista,
                  plano_contas_name: r.plano_contas_name,
                  paciente_id: r.paciente_id,
                  appointment_id: r.appointment_id,
                })))}
              </div>
            </>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Pagador</th>
                <th className="text-left px-4 py-3 font-semibold">Descrição</th>
                <th className="text-left px-4 py-3 font-semibold">Convênio</th>
                <th className="text-left px-4 py-3 font-semibold">Forma de Pagamento</th>
                <th className="text-center px-4 py-3 font-semibold">Vencimento</th>
                <th className="text-left px-4 py-3 font-semibold">Plano de Contas</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Valor</th>
                <th className="text-center px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        Carregando...
                      </div>
                    ) : (
                      "Nenhum registro encontrado"
                    )}
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const isOverdue = r.status !== 'received' && new Date(r.data_vencimento) < new Date();
                const statusColor = r.status === 'received' ? 'bg-green-100 text-green-800' : isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
                
                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-700">{r.payer_display || r.payer_name || r.patient_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{(r.descricao || '').split(' - ')[0] || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.convenio_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-700 capitalize">{formatPaymentMethod(r.forma_prevista) || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        let displayDate = null;
                        
                        // Lógica: Particular com Agenda
                        const isParticular = !!r.paciente_id;
                        const isAgenda = r.origem === 'Agenda';
                        const isMoneyPayment = ['dinheiro', 'pix', 'ted'].includes(String(r.forma_prevista || '').toLowerCase());
                        const isCreditCard = String(r.forma_prevista || '').toLowerCase() === 'cartão';
                        
                        if (isAgenda && isParticular) {
                          // Particular com dinheiro/pix/ted: usar data_emissao (dia do atendimento)
                          if (isMoneyPayment && r.data_emissao) {
                            const parts = r.data_emissao.split('-');
                            displayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                          }
                          // Particular com cartão: calcular vencimento com parcelas
                          else if (isCreditCard && r.data_emissao && r.total_parcelas) {
                            const parcels = Math.max(1, Number(r.total_parcelas || 1));
                            const parts = r.data_emissao.split('-');
                            const baseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            // Primeira parcela: dia do atendimento + 30 dias
                            baseDate.setDate(baseDate.getDate() + 30);
                            displayDate = baseDate;
                          }
                          // Outros particular com agenda: usar data_emissao
                          else if (r.data_emissao) {
                            const parts = r.data_emissao.split('-');
                            displayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                          }
                        }
                        
                        // Fallback: usar data_vencimento para outras origens
                        if (!displayDate && r.data_vencimento) {
                          const parts = r.data_vencimento.split('-');
                          displayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        }
                        
                        return displayDate ? displayDate.toLocaleDateString('pt-BR') : '—';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.plano_contas_name || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                        {r.status === 'received' ? '✓ Recebido' : isOverdue ? '⚠ Atrasado' : '⏳ Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{Number(r.valor_bruto||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center flex-wrap">
                        {r.appointment_id && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleOriginClick(r)}>
                            📋 Agendamento
                          </Button>
                        )}
                        {r.status !== 'received' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setConfirmReceived(r)}>Receber</Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/clinica/financeiro/receber/${r.id}/editar`)}>Editar</Button>
                          </>
                        )}
                        {r.status === 'received' && (
                          <span className="text-xs text-gray-500">Finalizado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ✅ MODAL CONFIRMAÇÃO RECEBIMENTO */}
      {confirmReceived && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Confirmar Recebimento?</h3>
            <p className="text-gray-700 mb-6">
              <strong>{confirmReceived.descricao}</strong><br/>
              de <strong>{confirmReceived.payer_name || confirmReceived.paciente_id || "—"}</strong><br/>
              Valor: <span className="font-bold text-green-600">{Number(confirmReceived.valor_bruto||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmReceived(null)} className="flex-1">Cancelar</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white flex-1" onClick={() => markReceived(confirmReceived)}>Confirmar Recebimento</Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

