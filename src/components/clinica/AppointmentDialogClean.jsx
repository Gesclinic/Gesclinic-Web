import React, { useState, useEffect } from "react";
import { fetchPayersForSelect, fetchPlansForSelect, fetchServicesForSelect, fetchProfessionalsForSelect } from "@/lib/appointmentsApi";
import PatientDialog from "@/components/pacientes/PatientDialog";
import { getServicePrice } from "@/lib/getServicePrice";
import { useNavigate } from "react-router-dom";
import { NONE } from "@/lib/selectUtils";
import { toIsoUtcOrNull } from "@/lib/selectUtils";
import { statusToCanonical } from "@/lib/statusLabels";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/SupabaseAuthContext.jsx";
import { Label } from "@/components/ui/label";
import { attachDisplayNames } from "@/lib/appointmentsColumns";
import { getPatientById, listPatients } from "@/lib/patientsApi";
import { formatPhone } from "@/utils/formatPhone";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isValidUUID(uuid) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
}

export default function AppointmentDialog(props) {
  // Estado para código do plano
  const [planCode, setPlanCode] = useState("");
  // Estados principais
  const authContext = useAuth();
  const { clinicId } = authContext;
  const {
    open,
    onOpenChange,
    initialData,
    onSubmit,
    onDelete,
    loading,
    ...restProps
  } = props;
  const [plansList, setPlansList] = useState([]);
  const [professionalsList, setProfessionalsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [payersList, setPayersList] = useState([]);
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [patientDlgOpen, setPatientDlgOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [preReceptionOpen, setPreReceptionOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearchText, setPatientSearchText] = useState("");
  const [patientManualName, setPatientManualName] = useState("");
  const [professionalId, setProfessionalId] = useState(NONE);
  const [serviceId, setServiceId] = useState(NONE);
  const [payerId, setPayerId] = useState(NONE);
  const [planId, setPlanId] = useState(NONE);
  const [status, setStatus] = useState(statusToCanonical("agendado"));
  const [price, setPrice] = useState("0.00");
  const [discount, setDiscount] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [notes, setNotes] = useState("");
  const [appointmentsHistory, setAppointmentsHistory] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [phone, setPhone] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Função utilitária para arredondar para 5 minutos
  function roundTo5(date) {
    const ms = 1000 * 60 * 5;
    return new Date(Math.round(date.getTime() / ms) * ms);
  }
  // Função utilitária para formatar hora para input
  function toTimeInput(date) {
    return date.toISOString().slice(11, 16);
  }

  useEffect(() => {
    if (open && clinicId && isValidUUID(clinicId)) {
      fetchServicesForSelect(clinicId).then(data => {
        setServicesList(data || []);
      });
    } else if (open) {
      setServicesList([]);
    }
  }, [open, clinicId]);

  // Atualiza o código do plano sempre que planId ou plansList mudam
  // Atualiza o valor do serviço ao mudar serviço, profissional, convênio ou plano
  useEffect(() => {
    async function updateFields() {
      const noneToNull = v => (v === NONE ? null : v);
      console.log('[AppointmentDialog] Recalculando preço:', {
        clinicId,
        serviceId,
        professionalId,
        payerId,
        planId
      });
      // Atualiza preço
      if (serviceId && clinicId) {
        const priceValue = await getServicePrice({
          clinicId,
          serviceId: noneToNull(serviceId),
          professionalId: noneToNull(professionalId),
          payerId: noneToNull(payerId),
          planId: noneToNull(planId)
        });
        setPrice(priceValue != null ? String(priceValue) : "-");
      } else {
        setPrice("-");
      }
      // Atualiza plano e código do plano
      if (planId && plansList.length > 0) {
        const plan = plansList.find(p => p.id === planId);
        setPlanCode(plan?.code || "-");
      } else {
        setPlanCode("-");
      }
    }
    updateFields();
  }, [serviceId, professionalId, payerId, planId, clinicId, plansList]);

  useEffect(() => {
    if (open && clinicId && isValidUUID(clinicId)) {
      fetchProfessionalsForSelect(clinicId).then(data => {
        setProfessionalsList(data || []);
      });
    } else if (open) {
      setProfessionalsList([]);
    }
  }, [open, clinicId]);

  useEffect(() => {
    if (open && clinicId && isValidUUID(clinicId)) {
      fetchPayersForSelect(clinicId).then(data => {
        setPayersList(data || []);
      });
      fetchPlansForSelect(clinicId).then(data => {
        setPlansList(data || []);
      });
    }
  }, [open, clinicId]);

  useEffect(() => {
    if (patientSearchText.length >= 2 && clinicId && isValidUUID(clinicId)) {
      listPatients(clinicId, { q: patientSearchText }).then(results => {
        setPatientSearchResults(results || []);
      });
    } else {
      setPatientSearchResults([]);
    }
  }, [patientSearchText, clinicId]);

  useEffect(() => {
    if (!open) {
      // Resetar formulário ao fechar
      setDate(new Date().toISOString().slice(0, 10));
      setStartTime("09:00");
      setEndTime("09:30");
      setSelectedPatient(null);
      setPatientSearchText("");
      setPatientManualName("");
      setProfessionalId(NONE);
      setServiceId(NONE);
      setPayerId(NONE);
      setPlanId(NONE);
      setStatus(statusToCanonical("agendado"));
      setPrice("0.00");
      setIsBlocked(false);
      setNotes("");
      setAppointmentsHistory([]);
      setPhone("");
    } else if (open && initialData && Object.keys(initialData).length > 0) {
      console.log("[AppointmentDialog] initialData:", initialData);
      populateForm(initialData);
    }
  }, [open, initialData]);

  const populateForm = async (data) => {
    // Função para extrair hora local correta do ISO UTC
    function getLocalTimeString(dateIso) {
      if (!dateIso) return "";
      const local = new Date(new Date(dateIso).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      return local.toISOString().slice(11, 16);
    }
    console.log("[AppointmentDialog] populateForm data:", data);
    try {
      const attached = attachDisplayNames(data);
      let start = attached.start_time ? new Date(attached.start_time) : (startTime ? new Date(`${date}T${startTime}`) : roundTo5(new Date()));
      let end = attached.end_time ? new Date(attached.end_time) : (endTime ? new Date(`${date}T${endTime}`) : new Date(start.getTime() + 30 * 60000));
      setDate(start.toISOString().slice(0, 10));
      function getLocalTimeStringFromUTC(dateIso) {
        if (!dateIso) return "";
        let iso = dateIso.replace(' ', 'T');
        iso = iso.replace(/\+00$/, 'Z');
        const local = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        return local.toTimeString().slice(0, 5);
      }
      const startLocal = getLocalTimeStringFromUTC(attached.start_time);
      setStartTime(startLocal || "09:00");
      // Se já existe hora fim, não sobrescreva, senão calcula 30min após início
      if (attached.end_time) {
        setEndTime(getLocalTimeStringFromUTC(attached.end_time));
      } else if (startLocal) {
        const [h, m] = startLocal.split(':').map(Number);
        let endHour = h;
        let endMinute = m + 30;
        if (endMinute >= 60) {
          endHour += Math.floor(endMinute / 60);
          endMinute = endMinute % 60;
        }
        if (endHour >= 24) endHour = endHour % 24;
        const endStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        setEndTime(endStr);
      } else {
        setEndTime("09:30");
      }
      // Preenche telefone de confirmação
      let phoneValue = attached.phone || attached.cell_phone || attached.telefone || "";
      if (attached.patient_id && attached.patient_id !== "undefined" && attached.patient_id !== null) {
        try {
          const p = await getPatientById(attached.patient_id);
          setSelectedPatient(p);
          setPatientSearchText(p?.full_name|| "");
          setPatientManualName("");
          phoneValue = p?.cell_phone ?? p?.phone ?? p?.telefone ?? phoneValue;
        } catch (error) {
          setSelectedPatient(null);
          setPatientSearchText("");
          setPatientManualName(attached.patient_name || "");
        }
      } else if (attached.patient_name) {
        setSelectedPatient(null);
        setPatientSearchText(attached.patient_name);
        setPatientManualName(attached.patient_name);
      } else {
        setSelectedPatient(null);
        setPatientSearchText("");
        setPatientManualName("");
      }
      setPhone(phoneValue);
      setProfessionalId(attached.professional_id || NONE);
      setServiceId(attached.service_id || NONE);
      setPayerId(attached.payer_id || NONE);
      setPlanId(attached.plan_id || NONE);
      setStatus(statusToCanonical(attached.status || "agendado"));
      setPrice(attached.price == null ? "0.00" : String(attached.price));
      setIsBlocked(!!attached.is_blocked);
      setNotes(attached.notes || "");
    } catch (error) {
      setDate(new Date().toISOString().slice(0, 10));
      setStartTime("09:00");
      setEndTime("09:30");
    }
  };

  const handleCreateNewPatient = () => {
    setEditingPatient(null);
    setPatientDlgOpen(true);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    // Validações obrigatórias
    if (!selectedPatient?.id && !patientManualName.trim() && !isBlocked) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um paciente, digite um nome ou marque como bloqueio." });
      return;
    }
    if (!date || !startTime || !endTime) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha data, hora de início e fim." });
      return;
    }
    if (!isBlocked && (!professionalId || professionalId === NONE)) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um profissional na aba Convênio." });
      return;
    }
    const noneToNull = v => (v === NONE ? null : v);
    const payload = {
      patient_id: selectedPatient?.id || null,
      patient_name: patientSearchText.trim() || selectedPatient?.full_name || null,
      phone: phone || "",
      professional_id: noneToNull(professionalId),
      service_id: noneToNull(serviceId),
      payer_id: noneToNull(payerId),
      plan_id: noneToNull(planId),
      price: price ? parseFloat(String(price).replace(",", ".")) : 0,
      discount: discount ? parseFloat(String(discount).replace(",", ".")) : 0,
      start_time: `${date}T${startTime}:00`,
      end_time: `${date}T${endTime}:00`,
      status,
      notes,
      is_blocked: isBlocked
    };
    if (!payload.professional_id && !isBlocked) {
      toast({ variant: "destructive", title: "Erro", description: "Erro interno: professional_id inválido." });
      return;
    }
    try {
      console.log('[AppointmentDialog] Submit payload:', payload);
      if (typeof onSubmit === 'function') {
        await onSubmit(payload);
        console.log('[AppointmentDialog] onSubmit chamado com sucesso');
      } else if (clinicId && isValidUUID(clinicId)) {
        // Fallback: salvar direto
        const { createAppointment } = await import('@/lib/appointmentsApi');
        const result = await createAppointment(clinicId, payload);
        console.log('[AppointmentDialog] Resultado do createAppointment:', result);
        toast({ variant: "success", title: "Agendamento salvo!" });
        onOpenChange(false);
      } else {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o agendamento." });
        console.error('[AppointmentDialog] Erro: clinicId inválido ou onSubmit não definido');
      }
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar agendamento." });
    }
  };

  return (
    <>
      {/* ...existing code... */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide rounded-lg">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prontuário e Dados do Paciente */}
              <div className="md:col-span-2 flex gap-4">
                <div className="flex-1">
                  <Label>Prontuário</Label>
                  <Input type="text" value={selectedPatient?.record_number || selectedPatient?.prontuario ? (selectedPatient?.record_number || selectedPatient?.prontuario) : "Não existe"} readOnly disabled />
                </div>
                <div className="flex-1">
                  <Label>Paciente</Label>
                  <Input
                    type="text"
                    value={patientSearchText}
                    onChange={e => {
                      setPatientSearchText(e.target.value);
                      setSelectedPatient(null);
                    }}
                    onBlur={e => {
                      const found = patientSearchResults.find(p => p.full_name === e.target.value || p.full_name === e.target.value);
                      if (found) setSelectedPatient(found);
                    }}
                    placeholder="Nome do paciente ou busca"
                    list="paciente-list"
                  />
                  <datalist id="paciente-list">
                    {patientSearchResults.map(p => (
                      <option key={p.id} value={p.full_name || p.full_name || ""} />
                    ))}
                  </datalist>
                  <Button type="button" variant="outline" size="sm" style={{marginTop:4}} onClick={handleCreateNewPatient}>
                    Incluir paciente
                  </Button>
                </div>
                <div className="flex-1">
                  <Label>Telefone para confirmação</Label>
                  <Input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    placeholder="(XX) 9 XXXX-XXXX"
                  />
                </div>
              </div>
              {/* Serviço e Valor */}
              <div>
                <Label>Serviço</Label>
                <select className="w-full border rounded px-2 py-1" value={serviceId} onChange={e => setServiceId(e.target.value)} required>
                  <option value={NONE}>Selecione o serviço</option>
                  {servicesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Valor" />
              </div>
              <div>
                <Label>Convênio</Label>
                <select className="w-full border rounded px-2 py-1" value={payerId} onChange={e => setPayerId(e.target.value)} required>
                  <option value={NONE}>Selecione o convênio</option>
                  {payersList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Plano do convênio</Label>
                <select className="w-full border rounded px-2 py-1" value={planId} onChange={e => setPlanId(e.target.value)} required disabled={!payerId || payerId === NONE}>
                  <option value={NONE}>Selecione o plano</option>
                  {plansList.filter(p => p.payer_id === payerId).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Código do Plano</Label>
                <Input type="text" value={planCode} readOnly placeholder="Código do Plano" />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div>
                <Label>Hora Início</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div>
                <Label>Hora Fim</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
              <div>
                <Label>Profissional Responsável</Label>
                <select className="w-full border rounded px-2 py-1" value={professionalId} onChange={e => setProfessionalId(e.target.value)} required>
                  <option value={NONE}>Selecione o profissional</option>
                  {professionalsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select className="w-full border rounded px-2 py-1" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="scheduled">Agendado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="finalized">Finalizado</option>
                  <option value="present">Presente</option>
                  <option value="no_show">Faltou</option>
                  <option value="attended">Atendido</option>
                </select>
              </div>
              {/* Observação */}
              <div className="md:col-span-2">
                <Label>Observação</Label>
                <Input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" variant="default">Salvar</Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {patientDlgOpen && (
        <PatientDialog
          open={patientDlgOpen}
          onOpenChange={setPatientDlgOpen}
          clinicId={clinicId}
          onSubmit={async (newPatient) => {
            setSelectedPatient(newPatient);
            setPatientSearchText(newPatient?.full_name || newPatient?.full_name || "");
            setPatientDlgOpen(false);
            toast({ variant: "success", title: "Paciente incluído!" });
          }}
        />
      )}
    </>
  );
}