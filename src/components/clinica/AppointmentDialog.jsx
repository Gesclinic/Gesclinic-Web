import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

import { useAuth } from "@/contexts/SupabaseAuthContext.jsx";
import { supabase } from "@/lib/customSupabaseClient";

import {
  fetchProfessionalsForSelect,
  fetchServicesForSelect,
  fetchPayersForSelect,
  fetchPlansForSelect,
} from "@/lib/appointmentsApi";

import {
  getPatientById,
  listPatients,
  createPatient,
  updatePatient,
} from "@/lib/patientsApi";

import { useToast } from "@/components/ui/use-toast";
import { NONE, asUuidOrNull } from "@/lib/selectUtils";
import { statusToCanonical } from "@/lib/statusLabels";
import { toIsoUtcOrNull } from "@/utils/helpers/dateFnsTzHelper";
import { attachDisplayNames } from "@/lib/appointmentsColumns";
import PatientDialog from "@/components/pacientes/PatientDialog";
import { useNavigate } from "react-router-dom";

export default function AppointmentDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  onDelete,
}) {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // LISTAS
  const [professionalsList, setProfessionalsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [payersList, setPayersList] = useState([]);
  const [plansList, setPlansList] = useState([]);

  // CAMPOS
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");

  const [professionalId, setProfessionalId] = useState(NONE);
  const [serviceId, setServiceId] = useState(NONE);
  const [payerId, setPayerId] = useState(NONE);
  const [planId, setPlanId] = useState(NONE);

  const [price, setPrice] = useState("0.00");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState(statusToCanonical("agendado"));
  const [isBlocked, setIsBlocked] = useState(false);
  const [discount, setDiscount] = useState("0.00");
  const [phone, setPhone] = useState("");

  // PACIENTE
  const [patientSearchText, setPatientSearchText] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearchResults, setPatientSearchResults] = useState([]);

  // MODAL PACIENTE
  const [patientDlgOpen, setPatientDlgOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  // PRÉ-RECEPÇÃO
  const [preReceptionOpen, setPreReceptionOpen] = useState(false);

  // HISTÓRICO
  const [appointmentsHistory, setAppointmentsHistory] = useState([]);

  // ===========================================================
  // 🔄 CARREGAR LISTAS QUANDO ABRIR
  // ===========================================================
  useEffect(() => {
    async function loadLists() {
      if (!clinicId || !open) return;

      const [prof, serv, pay, pla] = await Promise.all([
        fetchProfessionalsForSelect(clinicId),
        fetchServicesForSelect(clinicId),
        fetchPayersForSelect(clinicId),
        fetchPlansForSelect(clinicId),
      ]);

      setProfessionalsList(prof || []);
      setServicesList(serv || []);
      setPayersList(pay || []);
      setPlansList(pla || []);
    }
    loadLists();
  }, [open, clinicId]);

  // ===========================================================
  // 📌 FUNÇÃO RESET
  // ===========================================================
  function resetForm() {
    setDate(new Date().toISOString().slice(0, 10));
    setStartTime("09:00");
    setEndTime("09:30");
    setProfessionalId(NONE);
    setServiceId(NONE);
    setPayerId(NONE);
    setPlanId(NONE);
    setPrice("0.00");
    setNotes("");
    setStatus("agendado");
    setIsBlocked(false);
    setDiscount("0.00");
    setPhone("");

    setSelectedPatient(null);
    setPatientSearchText("");
    setPatientSearchResults([]);
    setAppointmentsHistory([]);
  }

  // ===========================================================
  // 📌 POPULAR FORMULÁRIO (EDIÇÃO)
  // ===========================================================
  const populateForm = useCallback(async (data) => {
    const a = attachDisplayNames(data);

    // Corrigir horários para BR
    const toDateBR = (utc) => {
      if (!utc) return "";
      const d = new Date(utc);
      d.setHours(d.getHours() - 3);
      return d.toISOString().slice(0, 10);
    };

    const toTimeBR = (utc) => {
      if (!utc) return "";
      const d = new Date(utc);
      d.setHours(d.getHours() - 3);
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    };

    setDate(toDateBR(a.start_time));
    setStartTime(toTimeBR(a.start_time));
    setEndTime(toTimeBR(a.end_time));

    setProfessionalId(a.professional_id || NONE);
    setServiceId(a.service_id || NONE);
    setPayerId(a.payer_id || NONE);
    setPlanId(a.plan_id || NONE);

    setStatus(statusToCanonical(a.status || "agendado"));
    setPrice(a.price ? String(a.price) : "0.00");
    setIsBlocked(!!a.is_blocked);
    setNotes(a.notes || "");
    setPhone(a.phone || "");

    // PACIENTE
    if (a.patient_id) {
      try {
        const p = await getPatientById(a.patient_id);
        setSelectedPatient(p);
        setPatientSearchText(p?.full_name || "");
      } catch {
        setSelectedPatient(null);
        setPatientSearchText(a.patient_name || "");
      }
    }
  }, []);

  // ===========================================================
  // 📌 QUANDO ABRIR MODAL
  // ===========================================================
  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (initialData) {
      populateForm(initialData);
    } else {
      resetForm();
    }
  }, [open, initialData, populateForm]);

  // ===========================================================
  // 🔍 BUSCA DE PACIENTES
  // ===========================================================
  const handlePatientInputChange = async (value) => {
    setPatientSearchText(value);
    setSelectedPatient(null);

    if (value.length > 2 && clinicId) {
      const results = await listPatients(clinicId, { q: value });
      setPatientSearchResults(results || []);
    } else {
      setPatientSearchResults([]);
    }
  };

  const chooseExistingPatient = (p) => {
    setSelectedPatient(p);
    setPatientSearchText(p.full_name);
    setPhone(p.phone || "");
    setPatientSearchResults([]);
  };

  // ===========================================================
  // 📌 CRIAR/EDITAR PACIENTE
  // ===========================================================
  const handlePatientSubmit = async (payload) => {
    const isUpdating = !!editingPatient?.id;

    try {
      const result = isUpdating
        ? await updatePatient(editingPatient.id, payload)
        : await createPatient(clinicId, payload);

      chooseExistingPatient(result);
      setPatientDlgOpen(false);

      toast({
        title: "Sucesso",
        description: `Paciente ${isUpdating ? "atualizado" : "criado"}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  // ===========================================================
  // 📌 BUSCAR PREÇO VIA RPC
  // ===========================================================
  const fetchPrice = useCallback(async () => {
    if (!clinicId || serviceId === NONE) {
      setPrice("0.00");
      return;
    }

    const dateIso = `${date}T${startTime}:00`;

    try {
      const { data } = await supabase.rpc("get_service_price", {
        p_clinic_id: asUuidOrNull(clinicId),
        p_service_id: asUuidOrNull(serviceId),
        p_payer_id: asUuidOrNull(payerId),
        p_plan_id: asUuidOrNull(planId),
        p_professional_id: asUuidOrNull(professionalId),
        p_at: toIsoUtcOrNull(dateIso),
      });

      setPrice(data ?? "0.00");
    } catch {
      setPrice("0.00");
    }
  }, [
    clinicId,
    serviceId,
    payerId,
    planId,
    professionalId,
    date,
    startTime,
  ]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // ===========================================================
  // 📌 SUBMIT FINAL
  // ===========================================================
  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (!selectedPatient?.id && !patientSearchText.trim() && !isBlocked) {
      return toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um paciente ou digite o nome.",
      });
    }

    if (!date || !startTime || !endTime) {
      return toast({
        variant: "destructive",
        title: "Erro",
        description: "Informe data e horários.",
      });
    }

    if (!isBlocked && (!professionalId || professionalId === NONE)) {
      return toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um profissional.",
      });
    }

    const payload = {
      patient_id: selectedPatient?.id || null,
      patient_name:
        patientSearchText.trim() || selectedPatient?.full_name || null,
      phone,
      professional_id: asUuidOrNull(professionalId),
      service_id: asUuidOrNull(serviceId),
      payer_id: asUuidOrNull(payerId),
      plan_id: asUuidOrNull(planId),
      price: Number(price),
      discount: Number(discount),
      start_time: toIsoUtcOrNull(`${date}T${startTime}`),
      end_time: toIsoUtcOrNull(`${date}T${endTime}`),
      status,
      notes,
      is_blocked: isBlocked,
    };

    onSubmit?.(payload);
  };

  // ===========================================================
  // 📌 INICIAR ATENDIMENTO
  // ===========================================================
  const handleStartEncounter = () => {
    if (!selectedPatient?.id) {
      return toast({
        title: "Atenção",
        description: "Selecione um paciente.",
        variant: "destructive",
      });
    }

    navigate(`/clinica/Prontuario?patient_id=${selectedPatient.id}`);
    onOpenChange(false);
  };

  // ===========================================================
  // 📌 JSX – FORMULÁRIO COMPLETO
  // ===========================================================
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 sticky top-0 z-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📅</span>
              <div>
                <h2 className="text-lg font-bold">Novo Agendamento</h2>
                <p className="text-blue-100 text-sm">Preencha os dados para criar ou editar um agendamento</p>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-blue-700 rounded transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form id="appointment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Plano */}
              <div>
                <Label>Plano do convênio</Label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  disabled={!payerId}
                >
                  <option value={NONE}>Selecione o plano</option>
                  {plansList
                    .filter((p) => p.payer_id === payerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label>Código do plano</Label>
                <Input
                  type="text"
                  readOnly
                  value={plansList.find((p) => p.id === planId)?.code || ""}
                />
              </div>

              {/* Prontuário */}
              <div>
                <Label>Prontuário</Label>
                <Input
                  type="text"
                  disabled
                  readOnly
                  value={
                    selectedPatient?.record_number || "Não existe"
                  }
                />
              </div>

              {/* Data e Horas */}
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <Label>Hora início</Label>
                <Input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div>
                <Label>Hora fim</Label>
                <Input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              {/* PACIENTE */}
              <div className="md:col-span-2">
                <Label>Paciente</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Buscar ou digitar nome"
                    value={patientSearchText}
                    onChange={(e) =>
                      handlePatientInputChange(e.target.value)
                    }
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingPatient(null);
                      setPatientDlgOpen(true);
                    }}
                  >
                    Cadastrar novo
                  </Button>
                </div>

                {patientSearchResults.length > 0 && (
                  <div className="bg-white border rounded mt-2 max-h-40 overflow-auto shadow">
                    {patientSearchResults.map((p) => (
                      <div
                        key={p.id}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                        onClick={() => chooseExistingPatient(p)}
                      >
                        {p.full_name} {p.cpf ? `(${p.cpf})` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PROFISSIONAL */}
              <div>
                <Label>Profissional</Label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                >
                  <option value={NONE}>Selecione o profissional</option>
                  {professionalsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SERVIÇO */}
              <div>
                <Label>Serviço</Label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  <option value={NONE}>Selecione o serviço</option>
                  {servicesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* CONVÊNIO */}
              <div>
                <Label>Convênio</Label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                >
                  <option value={NONE}>Selecione o convênio</option>
                  {payersList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* STATUS / PREÇO / TELEFONE */}
              <div>
                <Label>Status</Label>
                <Input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </div>

              <div>
                <Label>Preço</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div>
                <Label>Telefone para confirmação</Label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* NOTAS */}
              <div className="md:col-span-2">
                <Label>Notas</Label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

          </form>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2"
          >
            ✕ Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleStartEncounter}
            className="px-4 py-2"
          >
            🩺 Iniciar Atendimento
          </Button>
          <Button
            form="appointment-form"
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            ✓ Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

      {/* PRÉ-RECEPÇÃO */}
      <Dialog open={preReceptionOpen} onOpenChange={setPreReceptionOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Pré-Recepção</DialogTitle>
            <DialogDescription>
              Confirme os dados antes do atendimento.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-gray-700">
            (Tela de pré-recepção será detalhada futuramente)
          </p>

          <DialogFooter className="gap-2 mt-4">
            <Button onClick={() => setPreReceptionOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CADASTRO PACIENTE */}
      {patientDlgOpen && (
        <PatientDialog
          open={patientDlgOpen}
          onOpenChange={setPatientDlgOpen}
          initialData={
            editingPatient ||
            (patientSearchText ? { full_name: patientSearchText } : null)
          }
          onSubmit={handlePatientSubmit}
        />
      )}
    </>
  );
}
