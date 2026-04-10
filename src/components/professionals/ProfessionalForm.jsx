import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
// import { Loader2, PlusCircle, Trash2 } from "lucide-react";
const Loader2 = () => <span>Loading...</span>;
const PlusCircle = () => <span>+</span>;
const Trash2 = () => <span>Del</span>;
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ServiceManager from "./ServiceManager";
import {
  upsertProfessionalSchedules,
  upsertProfessionalPayers,
  getProfessionalDetails,
  createProfessional,
  updateProfessional,
} from "@/lib/professionalsApi";
import { useAuth } from "@/contexts/SupabaseAuthContext";

/* -------------------------------
 * DIAS DA SEMANA
 * ------------------------------- */
const weekDays = [
  { id: 1, name: "Segunda-feira" },
  { id: 2, name: "Terça-feira" },
  { id: 3, name: "Quarta-feira" },
  { id: 4, name: "Quinta-feira" },
  { id: 5, name: "Sexta-feira" },
  { id: 6, name: "Sábado" },
  { id: 7, name: "Domingo" },
];

/* -------------------------------
 * ABA DE HORÁRIOS
 * ------------------------------- */
function SchedulesTab({ schedules, setSchedules }) {
  const addSchedule = () => {
    setSchedules([
      ...schedules,
      { weekday: 1, start_time: "08:00", end_time: "18:00", appointment_duration: 30, active: true },
    ]);
  };

  const removeSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedules = [...schedules];
    newSchedules[index][field] = value;
    setSchedules(newSchedules);
  };

  return (
    <div className="space-y-4">
      {schedules.map((schedule, index) => (
        <div
          key={index}
          className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center p-2 border rounded-md"
        >
          <div className="sm:col-span-2">
            <Label>Dia da Semana</Label>
            <Select
              value={String(schedule.weekday)}
              onValueChange={(value) => handleScheduleChange(index, "weekday", parseInt(value, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((day) => (
                  <SelectItem key={day.id} value={String(day.id)}>
                    {day.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Início</Label>
            <Input
              type="time"
              value={schedule.start_time || ""}
              onChange={(e) => handleScheduleChange(index, "start_time", e.target.value)}
            />
          </div>
          <div>
            <Label>Fim</Label>
            <Input
              type="time"
              value={schedule.end_time || ""}
              onChange={(e) => handleScheduleChange(index, "end_time", e.target.value)}
            />
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input
              type="number"
              value={schedule.appointment_duration || 30}
              onChange={(e) =>
                handleScheduleChange(index, "appointment_duration", parseInt(e.target.value, 10))
              }
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeSchedule(index)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addSchedule}>
        <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Horário
      </Button>
    </div>
  );
}

/* -------------------------------
 * ABA DE CONVÊNIOS
 * ------------------------------- */
function PayersTab({ professionalPayers, setProfessionalPayers, allPayers }) {
  const handlePayerToggle = (payerId, checked) => {
    if (checked) {
      setProfessionalPayers([
        ...professionalPayers,
        { payer_id: payerId, accepted: true, restricted: false },
      ]);
    } else {
      setProfessionalPayers(professionalPayers.filter((p) => p.payer_id !== payerId));
    }
  };

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {allPayers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum convênio cadastrado.
        </p>
      ) : (
        allPayers.map((payer) => (
          <div key={payer.id} className="flex items-center space-x-2">
            <Checkbox
              id={`payer-${payer.id}`}
              checked={professionalPayers.some((pp) => pp.payer_id === payer.id)}
              onCheckedChange={(checked) => handlePayerToggle(payer.id, checked)}
            />
            <Label htmlFor={`payer-${payer.id}`}>{payer.name}</Label>
          </div>
        ))
      )}
    </div>
  );
}

/* -------------------------------
 * FORMULÁRIO PRINCIPAL
 * ------------------------------- */
export default function ProfessionalForm({ professionalId: propProfessionalId, onSave, onClose }) {
  console.log("🚀 === PROFESSIONAL FORM MONTADO ===");
  console.log("🚀 propProfessionalId:", propProfessionalId);
  console.log("🚀 Tipo propProfessionalId:", typeof propProfessionalId);

  const { clinicId } = useAuth();
  const [professionalId, setProfessionalId] = useState(propProfessionalId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detectar mudanças no propProfessionalId
  useEffect(() => {
    console.log("🔄 useEffect propProfessionalId mudou:", propProfessionalId);
    setProfessionalId(propProfessionalId);
  }, [propProfessionalId]);
  const [activeTab, setActiveTab] = useState("personal");
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    crm: "",
    uf: "",
    rqe: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    schedule_notes: "",
    active: true,
    color: "#d1d5db",
  });

  // CRM/UF HANDLERS
  const handleCrmChange = (idx, field, value) => {
    setFormData((prev) => {
      const crms = prev.crms.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      );
      return { ...prev, crms };
    });
  };

  const handleAddCrm = () => {
    setFormData((prev) => ({ ...prev, crms: [...prev.crms, { crm: "", uf: "" }] }));
  };

  const handleRemoveCrm = (idx) => {
    setFormData((prev) => ({ ...prev, crms: prev.crms.filter((_, i) => i !== idx) }));
  };

  // Forçar sempre abrir na aba "Dados Pessoais" quando for edição
  useEffect(() => {
    if (professionalId) {
      setActiveTab("personal");
    }
  }, [professionalId]);

  // Debug simplificado do formData
  useEffect(() => {
    if (formData.name) {
      console.log("✅ Dados carregados:", formData.name);
    }
  }, [formData.name]);
  const [schedules, setSchedules] = useState([]);
  const [professionalPayers, setProfessionalPayers] = useState([]);
  const [allPayers, setAllPayers] = useState([]);

  // Debug otimizado dos schedules e payers
  useEffect(() => {
    if (schedules.length > 0) {
      console.log("📅 Horários carregados:", schedules.length);
    }
  }, [schedules]);

  useEffect(() => {
    if (allPayers.length > 0) {
      console.log("💰 Convênios disponíveis:", allPayers.length);
    }
    if (professionalPayers.length > 0) {
      console.log("💰 Convênios selecionados:", professionalPayers.length);
    }
  }, [professionalPayers, allPayers]);
  const { toast } = useToast();

  /* -------------------------------
   * DEPENDÊNCIAS (CONVÊNIOS)
   * ------------------------------- */
  const loadDependencies = useCallback(async () => {
    if (!clinicId) {
      console.log("⚠️ ClinicId não disponível para carregar convênios");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("payers")
        .select("id, name")
        .eq("clinic_id", clinicId)
        .order("name");
        
      if (error) {
        console.warn("⚠️ Erro ao carregar convênios:", error.message);
        // Não mostrar toast para não interromper o fluxo
        setAllPayers([]);
      } else {
        setAllPayers(data || []);
        console.log("✅ Convênios disponíveis:", data?.length || 0);
      }
    } catch (err) {
      console.warn("⚠️ Falha ao carregar convênios:", err.message);
      setAllPayers([]);
      // Continuar sem convênios - não é crítico para o funcionamento do formulário
    }
  }, [clinicId, toast]);

  /* -------------------------------
   * CARREGAR PROFISSIONAL
   * ------------------------------- */
  const loadProfessional = useCallback(async () => {
    console.log("🎯 === LOAD PROFESSIONAL SUPER SIMPLES ===");
    console.log("🎯 ProfessionalId:", professionalId);
    
    if (!professionalId) {
      console.log("🎯 Sem ID, modo criação");
      return;
    }

    setLoading(true);
    
    // BUSCA DIRETA E SIMPLES NO SUPABASE
    try {
      console.log("🎯 Fazendo busca direta no Supabase...");
      
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("id", professionalId)
        .single();

      console.log("🎯 Resultado direto:", { data, error });

      if (error) {
        console.error("❌ Erro na busca:", error);
        throw error;
      }

      if (data) {
        console.log("✅ DADOS ENCONTRADOS:", data);
        console.log("✅ Nome:", data.name);
        console.log("✅ Email:", data.email);
        console.log("✅ CRM:", data.crm);
        
        // SETAR FORMDATA DIRETAMENTE
        const formDataToSet = {
          name: data.name || "",
          specialty: data.specialty || "",
          crm: data.crm || "",
          uf: data.uf || data.state || "",
          rqe: data.rqe || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          schedule_notes: data.schedule_notes || "",
          active: data.active !== undefined ? data.active : true,
          color: data.color || "#d1d5db",
        };
        setFormData(formDataToSet);
        
        // BUSCAR SCHEDULES E PAYERS EM PARALELO PARA MELHOR PERFORMANCE
        console.log("🎯 Buscando dados relacionados...");
        
        const [schedulesResult, payersResult] = await Promise.all([
          supabase
            .from("professional_schedules")
            .select("*")
            .eq("professional_id", professionalId)
            .order("weekday"),
          supabase
            .from("professional_payers")
            .select("*")
            .eq("professional_id", professionalId)
        ]);
        
        // Processar schedules
        if (!schedulesResult.error && schedulesResult.data) {
          setSchedules(schedulesResult.data);
          console.log("📅 Horários carregados:", schedulesResult.data.length);
        } else if (schedulesResult.error) {
          console.warn("⚠️ Erro ao carregar horários:", schedulesResult.error.message);
        }
        
        // Processar payers
        if (!payersResult.error && payersResult.data) {
          setProfessionalPayers(payersResult.data);
          console.log("💰 Convênios carregados:", payersResult.data.length);
        } else if (payersResult.error) {
          console.warn("⚠️ Erro ao carregar convênios:", payersResult.error.message);
        }
        
        console.log("✅ Profissional carregado com sucesso");
        
      } else {
        console.warn("⚠️ Nenhum dado encontrado para o profissional");
        toast({ 
          title: "Aviso", 
          description: "Profissional não encontrado ou dados incompletos.", 
          variant: "destructive" 
        });
        if (onClose) onClose();
      }
      
    } catch (error) {
      console.error("❌ Erro fatal:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      console.log("🎯 === LOAD FINALIZADO ===");
    }
  }, [professionalId, toast, onClose]);

  useEffect(() => {
    setProfessionalId(propProfessionalId);
  }, [propProfessionalId]);

  useEffect(() => {
    loadDependencies();
    // Só carregar profissional se o ID existir e não for null/undefined
    if (professionalId && professionalId !== "null" && professionalId !== "undefined") {
      loadProfessional();
    }
  }, [professionalId, loadDependencies, loadProfessional]);


  /* -------------------------------
   * EVENTOS DO FORM
   * ------------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked) => {
    setFormData((prev) => ({ ...prev, active: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
  
    console.log("🎯 === FORM SUBMIT INICIADO ===");
    console.log("🎯 ProfessionalId:", professionalId);
    console.log("🎯 ClinicId:", clinicId);
    console.log("🎯 FormData:", formData);
    console.log("🎯 É edição?", !!professionalId);
  
    try {
      let profData;
      if (professionalId) {
        console.log("🔄 Atualizando profissional existente...");
        profData = await updateProfessional(professionalId, { ...formData });
      } else {
        console.log("➕ Criando novo profissional...");
        profData = await createProfessional(clinicId, { ...formData });
      }
  
      console.log("✅ Dados do profissional salvos:", profData);
      const currentProfessionalId = profData?.id;
  
      if (!currentProfessionalId) {
        throw new Error("Não foi possível obter o ID do profissional após salvar.");
      }
  
      if (!professionalId) {
        setProfessionalId(currentProfessionalId);
      }
  
      console.log("🔄 === SALVANDO HORÁRIOS E CONVÊNIOS ===");
      console.log("🔄 CurrentProfessionalId:", currentProfessionalId);
      console.log("🔄 ClinicId:", clinicId);
      console.log("🔄 Schedules para salvar:", schedules);
      console.log("🔄 Quantidade schedules:", schedules?.length || 0);
      console.log("🔄 ProfessionalPayers para salvar:", professionalPayers);
      console.log("🔄 Quantidade payers:", professionalPayers?.length || 0);
      
      await Promise.all([
        upsertProfessionalSchedules(currentProfessionalId, clinicId, schedules),
        upsertProfessionalPayers(currentProfessionalId, clinicId, professionalPayers),
      ]);
      
      console.log("✅ Horários e convênios salvos com sucesso!");
  
      console.log("✅ Profissional salvo completamente!");
      toast({
        title: "Sucesso!",
        description: `Profissional ${professionalId ? "atualizado" : "cadastrado"} com sucesso.`,
      });
  
      if (onSave) onSave(profData);
  
    } catch (error) {
      console.error("❌ Erro ao salvar profissional:", error);
      toast({
        title: "Erro ao salvar profissional",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      console.log("🎯 === FORM SUBMIT FINALIZADO ===");
    }
  };

  /* -------------------------------
   * RENDERIZAÇÃO
   * ------------------------------- */
  console.log("🎨 Renderizando ProfessionalForm...");
  
  return (
    <Card className="w-full max-w-3xl mx-auto border-0 shadow-none">
      <CardHeader>
        <CardTitle>{professionalId ? "Editar Profissional" : "Novo Profissional"}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> 
            {professionalId ? "Carregando dados do profissional..." : "Preparando formulário..."}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="services">
                  Serviços {professionalId ? "" : "(Salve primeiro)"}
                </TabsTrigger>
                <TabsTrigger value="schedules">
                  Horários {schedules.length > 0 ? `(${schedules.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="payers">
                  Convênios {professionalPayers.length > 0 ? `(${professionalPayers.length})` : ""}
                </TabsTrigger>
              </TabsList>

              {/* DADOS PESSOAIS */}
              <TabsContent value="personal" className="space-y-6 pt-4">
                <div className="mb-6">
                  <div className="font-semibold text-lg flex items-center gap-2 mb-2">
                    <span>📄</span> Dados Profissionais
                  </div>
                  <div className="flex flex-col md:flex-row md:gap-4">
                    <div className="flex flex-row gap-2 items-end mb-2 md:mb-0">
                      <div>
                        <Label htmlFor="crm">Nº Conselho/CRM</Label>
                        <Input id="crm" name="crm" value={formData.crm || ""} onChange={handleChange} />
                      </div>
                      <div>
                        <Label htmlFor="uf">UF</Label>
                        <Input id="uf" name="uf" value={formData.uf || ""} onChange={e => setFormData(prev => ({ ...prev, uf: e.target.value.toUpperCase().slice(0,2) }))} maxLength={2} className="uppercase" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="rqe">RQE (Registro de Especialista)</Label>
                      <Input id="rqe" name="rqe" value={formData.rqe || ""} onChange={handleChange} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule_notes">Observações da Agenda</Label>
                  <Textarea id="schedule_notes" name="schedule_notes" value={formData.schedule_notes || ""} onChange={handleChange} placeholder="Ex: Atende somente com hora marcada..." />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="active" checked={formData.active} onCheckedChange={handleCheckboxChange} />
                  <Label htmlFor="active">Profissional ativo</Label>
                </div>
              </TabsContent>

              {/* SERVIÇOS */}
              <TabsContent value="services" className="pt-4">
                {professionalId && clinicId ? (
                  <ServiceManager professionalId={professionalId} clinicId={clinicId} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Salve o profissional para poder adicionar serviços.
                  </p>
                )}
              </TabsContent>

              {/* HORÁRIOS */}
              <TabsContent value="schedules" className="pt-4">
                <SchedulesTab schedules={schedules} setSchedules={setSchedules} />
              </TabsContent>

              {/* CONVÊNIOS */}
              <TabsContent value="payers" className="pt-4">
                <PayersTab
                  professionalPayers={professionalPayers}
                  setProfessionalPayers={setProfessionalPayers}
                  allPayers={allPayers}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-6">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}