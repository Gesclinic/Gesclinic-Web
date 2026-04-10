/**  🔥 PATIENT DIALOG COM CAMPO GÊNERO PADRONIZADO  */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchPayersForSelect, fetchPlansForSelect, checkPatientExists, uploadPatientPhoto } from "@/lib/patientsApi";
import { useToast } from "@/components/ui/use-toast";
import { NONE } from "@/lib/selectUtils";
import { supabase } from "@/lib/customSupabaseClient";
import PhotoUploadWebcam from "@/components/PhotoUploadWebcam";

// ----------------- HELPERS -----------------

const toDateInput = (v) => {
  if (!v) return "";
  if (typeof v === "string" && v.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [dd, mm, yyyy] = v.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const d = new Date(v);
  if (isNaN(+d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const onlyDigits = (v) => (typeof v === "string" ? v.replace(/\D+/g, "") : "");
const normalizeEmail = (v) =>
  typeof v === "string" && v.trim() ? v.trim().toLowerCase() : "";

const formatCpfView = (raw) => {
  const v = onlyDigits(raw).slice(0, 11);
  return v
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
};

// ----------------- COMPONENTE -----------------

export default function PatientDialog({
  open,
  onOpenChange,
  initialData = null,
  onSubmit,
  loading = false,
  clinicId,
}) {

  const isEdit = !!initialData?.id;
  const { toast } = useToast();

  // Campos principais
  const [fullName, setFullName] = useState("");
  const [cpfView, setCpfView] = useState("");
  const [birthdate, setBirthdate] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Foto
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  // Gênero (padronizado)
  const [gender, setGender] = useState("Outro");

  const [recordNumber, setRecordNumber] = useState("");

  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleRelationship, setResponsibleRelationship] = useState("");

  const [payerId, setPayerId] = useState(NONE);
  const [planId, setPlanId] = useState(NONE);
  const [insuranceIdNumber, setInsuranceIdNumber] = useState("");

  // Endereço
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [payers, setPayers] = useState([]);
  const [plans, setPlans] = useState([]);

  // ----------------- Próximo número de prontuário -----------------

  const fetchNextRecordNumber = useCallback(async () => {
    if (!clinicId) return "01";

    const { data } = await supabase
      .from("patients")
      .select("record_number")
      .eq("clinic_id", clinicId);

    const nums = (data || [])
      .map(p => parseInt(p.record_number, 10))
      .filter(n => !isNaN(n));

    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return String(next).padStart(2, "0");
  }, [clinicId]);

  // ----------------- Filtros de planos -----------------

  const filteredPlans = useMemo(() => {
    if (payerId === NONE) return [];
    return plans.filter((p) => String(p.payer_id) === String(payerId));
  }, [payerId, plans]);

  // ----------------- Carregar convênios -----------------

  const loadRefs = useCallback(async () => {
    if (!clinicId) return;

    try {
      const [payersData, plansData] = await Promise.all([
        fetchPayersForSelect(clinicId),
        fetchPlansForSelect(clinicId),
      ]);

      setPayers(payersData || []);
      setPlans(plansData || []);
    } catch {}
  }, [clinicId]);

  useEffect(() => {
    if (open) loadRefs();
  }, [open, loadRefs]);

  // ----------------- Load inicial -----------------

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setFullName(initialData?.full_name || initialData?.full_name || "");
      setCpfView(formatCpfView(initialData?.cpf || ""));
      setBirthdate(toDateInput(initialData?.birth_date));

      setEmail(initialData?.email ?? "");
      setPhone(initialData?.phone ?? "");
      setRecordNumber(initialData?.record_number ?? "");
      setPhotoUrl(initialData?.photo_url || "");
      setPhotoFile(null);

      // GÊNERO
      setGender(initialData?.gender || "Outro");

      setResponsibleName(initialData?.responsible_name ?? "");
      setResponsibleRelationship(initialData?.responsible_relationship ?? "");

      setPayerId(initialData?.payer_id ?? NONE);
      setPlanId(initialData?.plan_id ?? NONE);
      setInsuranceIdNumber(initialData?.insurance_id_number ?? "");

      setStreet(initialData?.street ?? "");
      setNumber(initialData?.number ?? "");
      setNeighborhood(initialData?.neighborhood ?? "");
      setZip(initialData?.zip_code ?? "");
      setCity(initialData?.city ?? "");
      setUf(initialData?.state ?? "");
    } else {
      setFullName("");
      setCpfView("");
      setBirthdate("");

      setEmail("");
      setPhone("");
      setPhotoUrl("");
      setPhotoFile(null);

      fetchNextRecordNumber().then(setRecordNumber);

      setGender("Outro");

      setResponsibleName("");
      setResponsibleRelationship("");

      setPayerId(NONE);
      setPlanId(NONE);
      setInsuranceIdNumber("");

      setStreet("");
      setNumber("");
      setNeighborhood("");
      setZip("");
      setCity("");
      setUf("");
    }

    setSubmitting(false);
  }, [open, initialData, fetchNextRecordNumber]);

  const disabled = loading || submitting;

  // ----------------- Helpers -----------------

  const sanitize = (v) => {
    if (typeof v === "string") {
      const t = v.trim();
      return t === "" ? null : t;
    }
    return v ?? null;
  };

  const validate = () => {
    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "O nome completo é obrigatório." });
      return false;
    }

    const cpf = onlyDigits(cpfView);
    if (!cpf || cpf.length !== 11) {
      toast({ variant: "destructive", title: "Informe um CPF válido" });
      return false;
    }

    if (!birthdate) {
      toast({ variant: "destructive", title: "Data de nascimento obrigatória." });
      return false;
    }

    return true;
  };

  // ----------------- SUBMIT -----------------

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate() || disabled) return;

    setSubmitting(true);

    try {
      const cpf = onlyDigits(cpfView);

      let finalPhotoUrl = photoUrl;

      // Se houver arquivo novo, faz upload
      if (photoFile) {
        try {
          finalPhotoUrl = await uploadPatientPhoto(photoFile);
        } catch (err) {
          console.error("Erro no upload da foto:", err);
          toast({ variant: "destructive", title: "Erro ao salvar foto", description: "A foto não pôde ser salva, mas tentaremos salvar os dados." });
          // Não impede o salvamento dos dados, apenas avisa
        }
      }

      if (!isEdit) {
        const exists = await checkPatientExists({ clinicId, cpf });
        if (exists) {
          toast({
            variant: "destructive",
            title: "CPF já cadastrado na clínica.",
          });
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        full_name: sanitize(fullName),
        cpf: sanitize(cpf),
        birth_date: birthdate,
        email: sanitize(normalizeEmail(email)),
        phone: sanitize(onlyDigits(phone)),
        cell_phone: phone ? `+55 ${phone}` : null,

        gender, // <--- PADRONIZADO

        responsible_name: sanitize(responsibleName),
        responsible_relationship: sanitize(responsibleRelationship),

        payer_id: payerId === NONE ? null : payerId,
        plan_id: planId === NONE ? null : planId,
        insurance_id_number: sanitize(insuranceIdNumber),

        street: sanitize(street),
        number: sanitize(number),
        neighborhood: sanitize(neighborhood),
        zip_code: sanitize(onlyDigits(zip)),
        city: sanitize(city),
        state: sanitize(uf ? uf.toUpperCase().slice(0, 2) : uf),

        record_number: recordNumber,
        clinic_id: clinicId,
        photo_url: finalPhotoUrl,
      };

      await onSubmit?.(payload);

    } finally {
      setSubmitting(false);
    }
  };

  // ----------------- RENDER -----------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Paciente" : "Novo Paciente"}</DialogTitle>
          <DialogDescription>
            Preencha os dados obrigatórios (*)
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 max-h-[70vh] overflow-y-auto p-1"
          onSubmit={handleSubmit}
        >

          {/* FOTO */}
          <div className="flex justify-center mb-4">
            <PhotoUploadWebcam
              value={photoUrl}
              onChange={(url, file) => {
                setPhotoUrl(url);
                setPhotoFile(file);
              }}
            />
          </div>

          {/* CELULAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Celular*</Label>
              <Input
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={disabled}
                placeholder="DDD + número"
              />
            </div>
          </div>

          {/* NOME + CPF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Nome Completo*</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={disabled}
              />
            </div>

            <div>
              <Label>CPF*</Label>
              <Input
                inputMode="numeric"
                value={cpfView}
                onChange={(e) => setCpfView(formatCpfView(e.target.value))}
                required
                disabled={disabled || isEdit}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          {/* NASCIMENTO + PRONTUÁRIO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Data de Nascimento*</Label>
              <Input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                disabled={disabled}
              />
            </div>

            <div>
              <Label>Nº Prontuário</Label>
              <Input
                value={recordNumber}
                readOnly
                disabled
                placeholder="Gerado automaticamente"
              />
            </div>
          </div>

          {/* GÊNERO */}
          <div>
            <Label>Gênero*</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Feminino">Feminino</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TELEFONE + EMAIL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={disabled}
              />
            </div>

            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* RESPONSÁVEL */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-semibold mb-2">Responsável (opcional)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome do Responsável</Label>
                <Input
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>Parentesco</Label>
                <Select
                  value={responsibleRelationship}
                  onValueChange={setResponsibleRelationship}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mãe">Mãe</SelectItem>
                    <SelectItem value="Pai">Pai</SelectItem>
                    <SelectItem value="Irmão(ã)">Irmão(ã)</SelectItem>
                    <SelectItem value="Avós">Avós</SelectItem>
                    <SelectItem value="Tio(a)">Tio(a)</SelectItem>
                    <SelectItem value="Cuidador(a)">Cuidador(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* CONVÊNIO */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-semibold mb-2">Convênio</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <Label>Convênio</Label>
                <Select
                  value={payerId}
                  onValueChange={(v) => {
                    setPayerId(v);
                    setPlanId(NONE);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Particular" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Particular</SelectItem>
                    {payers.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Plano</Label>
                <Select
                  value={planId}
                  onValueChange={setPlanId}
                  disabled={payerId === NONE}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {filteredPlans.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3">
              <Label>Número da Matrícula</Label>
              <Input
                value={insuranceIdNumber}
                onChange={(e) => setInsuranceIdNumber(e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* ENDEREÇO */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-semibold mb-2">Endereço</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label>Rua</Label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>Nº</Label>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">

              <div>
                <Label>Bairro</Label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>CEP</Label>
                <Input
                  inputMode="numeric"
                  value={zip}
                  onChange={(e) => setZip(onlyDigits(e.target.value).slice(0, 8))}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>UF</Label>
                <Input
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <Label>Cidade</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={disabled}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={disabled}>
              {isEdit ? "Salvar alterações" : "Criar paciente"}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}
