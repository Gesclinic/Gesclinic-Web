/**
 * ============================================
 * HistoricoClinicoTab - Aba de Histórico Clínico
 * ============================================
 * 
 * Timeline de consultas, diagnósticos e procedimentos com design moderno
 * Inclui resumo, filtros avançados e agrupamento por período
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Plus, Eye, Edit, FileText, Calendar, User, Stethoscope, TrendingDown, Filter as FilterIcon, X, Clock, Download, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AudioTranscriber from "@/components/AudioTranscriber";
import { createPatientRecord, listPatientRecords, syncLocalPatientRecords, updatePatientRecord } from "@/lib/patientRecordsApi";
import { buildPatientRecordPrescription, parsePatientRecordPrescription } from "@/lib/patientRecordMetadata";
import { uploadPacienteMedia } from "@/lib/pacientesService";

const RECORD_TYPES = {
  consulta: { label: "Consulta", color: "blue", icon: Stethoscope },
  evolucao: { label: "Evolução", color: "green", icon: TrendingDown },
  procedimento: { label: "Procedimento", color: "purple", icon: FileText },
  exame: { label: "Exame", color: "cyan", icon: FileText },
};

const RECORD_TYPE_ORDER = ["consulta", "evolucao", "procedimento", "exame"];

const RECORD_TYPE_FORM_CONFIG = {
  consulta: {
    mainLabel: "Descrição da consulta",
    mainPlaceholder: "Queixa principal, avaliação clínica, hipótese diagnóstica e achados relevantes.",
    mainHelp: "Use este campo para documentar anamnese, exame clínico e conclusão da consulta.",
    secondaryLabel: "Conduta / Prescrição",
    secondaryPlaceholder: "Medicamentos, solicitações, orientações de retorno e plano terapêutico.",
    secondaryHelp: "Registre a conduta adotada ao final da consulta.",
    previewMainLabel: "Resumo clínico",
    previewSecondaryLabel: "Conduta",
    extraFields: [
      {
        key: "chiefComplaint",
        label: "Queixa principal",
        placeholder: "Motivo principal da consulta.",
        inputType: "textarea",
      },
      {
        key: "physicalExam",
        label: "Exame físico",
        placeholder: "Achados do exame físico relevante.",
        inputType: "textarea",
      },
    ],
  },
  evolucao: {
    mainLabel: "Evolução do atendimento",
    mainPlaceholder: "Descreva a evolução clínica do paciente, resposta ao tratamento, intercorrências e situação atual.",
    mainHelp: "Este campo deve registrar a evolução do quadro ao longo do atendimento ou acompanhamento.",
    secondaryLabel: "Plano / Próximos passos",
    secondaryPlaceholder: "Ajustes terapêuticos, observação, monitoramento, retorno e orientações.",
    secondaryHelp: "Use para documentar a próxima conduta após avaliar a evolução.",
    previewMainLabel: "Evolução",
    previewSecondaryLabel: "Plano",
    extraFields: [
      {
        key: "bloodPressure",
        label: "Pressão arterial",
        placeholder: "Ex: 120/80 mmHg",
        inputType: "text",
      },
      {
        key: "heartRate",
        label: "Frequência cardíaca",
        placeholder: "Ex: 78 bpm",
        inputType: "text",
      },
      {
        key: "temperature",
        label: "Temperatura",
        placeholder: "Ex: 36.7 °C",
        inputType: "text",
      },
      {
        key: "oxygenSaturation",
        label: "Saturação O2",
        placeholder: "Ex: 98%",
        inputType: "text",
      },
      {
        key: "treatmentResponse",
        label: "Resposta ao tratamento",
        placeholder: "Melhora, estabilidade ou piora após a conduta anterior.",
        inputType: "textarea",
      },
      {
        key: "intercurrences",
        label: "Intercorrências",
        placeholder: "Eventos intercorrentes, sintomas novos ou complicações.",
        inputType: "textarea",
      },
    ],
  },
  procedimento: {
    mainLabel: "Descrição do procedimento",
    mainPlaceholder: "Procedimento realizado, técnica utilizada, região abordada, achados e intercorrências.",
    mainHelp: "Documente a execução do procedimento de forma objetiva e auditável.",
    secondaryLabel: "Materiais / Orientações pós-procedimento",
    secondaryPlaceholder: "Materiais utilizados, medicamentos administrados e recomendações pós-procedimento.",
    secondaryHelp: "Inclua orientações de cuidado, observação e retorno do paciente.",
    previewMainLabel: "Procedimento",
    previewSecondaryLabel: "Pós-procedimento",
    extraFields: [
      {
        key: "technique",
        label: "Técnica realizada",
        placeholder: "Descrição objetiva da técnica executada.",
        inputType: "textarea",
      },
      {
        key: "materials",
        label: "Materiais / medicações",
        placeholder: "Materiais, insumos ou medicações utilizadas.",
        inputType: "textarea",
      },
      {
        key: "anesthesia",
        label: "Anestesia",
        placeholder: "Ex: Lidocaína 2% sem vasoconstrictor",
        inputType: "text",
      },
      {
        key: "hadComplications",
        label: "Houve complicações",
        inputType: "checkbox",
      },
      {
        key: "complicationDescription",
        label: "Descrição das complicações",
        placeholder: "Descreva intercorrências e conduta adotada.",
        inputType: "textarea",
        showWhen: (data) => Boolean(data?.hadComplications),
      },
    ],
  },
  exame: {
    mainLabel: "Solicitação / Resultado do exame",
    mainPlaceholder: "Motivo do exame, achados, interpretação clínica ou resultado relevante.",
    mainHelp: "Registre a solicitação, o resultado recebido ou a interpretação clínica do exame.",
    secondaryLabel: "Conclusão / Encaminhamento",
    secondaryPlaceholder: "Conclusão diagnóstica, necessidade de repetição, encaminhamento ou conduta.",
    secondaryHelp: "Use para consolidar a conclusão e a conduta decorrente do exame.",
    previewMainLabel: "Achados",
    previewSecondaryLabel: "Conclusão",
    extraFields: [
      {
        key: "examRequested",
        label: "Exame solicitado",
        placeholder: "Nome do exame, painel ou método solicitado.",
        inputType: "text",
      },
      {
        key: "examResult",
        label: "Resultado / interpretação",
        placeholder: "Resultado relevante ou interpretação clínica.",
        inputType: "textarea",
      },
      {
        key: "attachmentName",
        label: "Anexo do exame",
        inputType: "file",
      },
    ],
  },
};

function buildStructuredData(type) {
  const config = RECORD_TYPE_FORM_CONFIG[type] || RECORD_TYPE_FORM_CONFIG.consulta;
  return Object.fromEntries((config.extraFields || []).map((field) => [field.key, field.inputType === "checkbox" ? false : ""]));
}

function normalizeStructuredData(type, data = {}) {
  const template = buildStructuredData(type);
  return {
    ...template,
    ...data,
  };
}

function createEmptyDrafts() {
  return Object.fromEntries(
    Object.keys(RECORD_TYPES).map((type) => [
      type,
      {
        diagnostico: "",
        prescricao: "",
        structuredData: buildStructuredData(type),
      },
    ])
  );
}

function normalizeDrafts(drafts = {}) {
  const emptyDrafts = createEmptyDrafts();

  return Object.fromEntries(
    Object.keys(emptyDrafts).map((type) => [
      type,
      {
        diagnostico: drafts?.[type]?.diagnostico || "",
        prescricao: drafts?.[type]?.prescricao || "",
        structuredData: normalizeStructuredData(type, drafts?.[type]?.structuredData || {}),
      },
    ])
  );
}

function hasMeaningfulStructuredData(type, structuredData = {}) {
  const normalized = normalizeStructuredData(type, structuredData);

  return Object.values(normalized).some((value) => {
    if (typeof value === "boolean") return value;
    return Boolean(String(value || "").trim());
  });
}

function hasMeaningfulDraftContent(type, draft = {}) {
  return Boolean(
    String(draft?.diagnostico || "").trim() ||
    String(draft?.prescricao || "").trim() ||
    hasMeaningfulStructuredData(type, draft?.structuredData || {})
  );
}

function buildFilledDraftMap(drafts = {}) {
  const normalized = normalizeDrafts(drafts);

  return Object.fromEntries(
    Object.entries(normalized)
      .filter(([type, draft]) => hasMeaningfulDraftContent(type, draft))
      .map(([type, draft]) => [
        type,
        {
          diagnostico: String(draft.diagnostico || "").trim(),
          prescricao: String(draft.prescricao || "").trim(),
          structuredData: normalizeStructuredData(type, draft.structuredData || {}),
        },
      ])
  );
}

function getFilledSectionsFromRecord(record) {
  const drafts = buildFilledDraftMap(record?.sectionDrafts || {});

  if (Object.keys(drafts).length) {
    return drafts;
  }

  if (!record?.type) {
    return {};
  }

  return buildFilledDraftMap({
    [record.type]: {
      diagnostico: record.diagnosis || "",
      prescricao: record.prescription || "",
      structuredData: record.structuredData || {},
    },
  });
}

function getOrderedSectionEntries(record) {
  const sections = getFilledSectionsFromRecord(record);

  return Object.entries(sections).sort(([leftType], [rightType]) => {
    const leftIndex = RECORD_TYPE_ORDER.indexOf(leftType);
    const rightIndex = RECORD_TYPE_ORDER.indexOf(rightType);

    if (leftIndex === -1 && rightIndex === -1) return leftType.localeCompare(rightType);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;

    return leftIndex - rightIndex;
  });
}

function getPrimarySection(record) {
  const sections = Object.fromEntries(getOrderedSectionEntries(record));
  const preferredType = record?.activeType || record?.type;

  if (preferredType && sections[preferredType]) {
    return { type: preferredType, draft: sections[preferredType] };
  }

  const firstEntry = Object.entries(sections)[0];
  return firstEntry ? { type: firstEntry[0], draft: firstEntry[1] } : null;
}

function validateStructuredData(type, structuredData) {
  const data = normalizeStructuredData(type, structuredData);

  if (type === "evolucao") {
    const hasVitals = data.bloodPressure || data.heartRate || data.temperature || data.oxygenSaturation;
    const hasClinicalFollowUp = data.treatmentResponse || data.intercurrences;

    if (!hasVitals && !hasClinicalFollowUp) {
      return "Na evolução, informe ao menos sinais vitais ou resposta/intercorrências do atendimento.";
    }
  }

  if (type === "procedimento") {
    if (!data.technique && !data.materials) {
      return "No procedimento, informe ao menos a técnica realizada ou os materiais/medicações.";
    }

    if (data.hadComplications && !data.complicationDescription) {
      return "Descreva as complicações antes de salvar o procedimento.";
    }
  }

  if (type === "exame") {
    if (!data.examRequested && !data.examResult && !data.attachmentName) {
      return "No exame, informe o exame solicitado, o resultado/interpretação ou anexe um arquivo.";
    }
  }

  return null;
}

function buildRecordSummary(record) {
  const primarySection = getPrimarySection(record);
  const effectiveType = primarySection?.type || record.type;
  const structuredData = normalizeStructuredData(effectiveType, primarySection?.draft?.structuredData || record.structuredData || {});

  if (effectiveType === "consulta") {
    return [structuredData.chiefComplaint, structuredData.physicalExam].filter(Boolean);
  }

  if (effectiveType === "evolucao") {
    return [
      structuredData.bloodPressure ? `PA: ${structuredData.bloodPressure}` : null,
      structuredData.heartRate ? `FC: ${structuredData.heartRate}` : null,
      structuredData.temperature ? `Temp: ${structuredData.temperature}` : null,
      structuredData.oxygenSaturation ? `SpO2: ${structuredData.oxygenSaturation}` : null,
      structuredData.treatmentResponse,
      structuredData.intercurrences,
    ].filter(Boolean);
  }

  if (effectiveType === "procedimento") {
    return [
      structuredData.technique,
      structuredData.materials,
      structuredData.anesthesia ? `Anestesia: ${structuredData.anesthesia}` : null,
      structuredData.hadComplications ? `Complicações: ${structuredData.complicationDescription || "Sim"}` : null,
    ].filter(Boolean);
  }

  if (effectiveType === "exame") {
    return [
      structuredData.examRequested,
      structuredData.examResult,
      structuredData.attachmentName ? `Anexo: ${structuredData.attachmentName}` : null,
    ].filter(Boolean);
  }

  return [];
}

function buildRecordHighlights(record) {
  const primarySection = getPrimarySection(record);
  const effectiveType = primarySection?.type || record.type;
  const data = normalizeStructuredData(effectiveType, primarySection?.draft?.structuredData || record.structuredData || {});

  if (effectiveType === "consulta") {
    return [
      data.chiefComplaint ? { label: "Queixa", value: data.chiefComplaint } : null,
      data.physicalExam ? { label: "Exame Físico", value: data.physicalExam } : null,
    ].filter(Boolean);
  }

  if (effectiveType === "evolucao") {
    return [
      data.bloodPressure ? { label: "PA", value: data.bloodPressure } : null,
      data.heartRate ? { label: "FC", value: data.heartRate } : null,
      data.temperature ? { label: "Temp", value: data.temperature } : null,
      data.oxygenSaturation ? { label: "SpO2", value: data.oxygenSaturation } : null,
    ].filter(Boolean);
  }

  if (effectiveType === "procedimento") {
    return [
      data.technique ? { label: "Técnica", value: data.technique } : null,
      data.anesthesia ? { label: "Anestesia", value: data.anesthesia } : null,
      data.hadComplications ? { label: "Complicações", value: data.complicationDescription || "Sim" } : null,
    ].filter(Boolean);
  }

  if (effectiveType === "exame") {
    return [
      data.examRequested ? { label: "Exame", value: data.examRequested } : null,
      data.examResult ? { label: "Resultado", value: data.examResult } : null,
      data.attachmentName ? { label: "Anexo", value: data.attachmentName } : null,
    ].filter(Boolean);
  }

  return [];
}

function buildCompactSectionText(sectionType, sectionDraft = {}) {
  const summaryItems = buildRecordSummary({
    type: sectionType,
    structuredData: sectionDraft.structuredData || {},
  }).filter(Boolean);

  const primaryText = summaryItems[0] || sectionDraft.diagnostico || sectionDraft.prescricao || "Sem resumo adicional.";
  return String(primaryText).trim();
}

export default function HistoricoClinicoTab({ patientId, patientData, updatePatientData, defaultProfessional = "" }) {
  console.log("🔍 HistoricoClinicoTab recebeu defaultProfessional:", defaultProfessional);
  const { clinicId, user } = useAuth();
  const { toast } = useToast();
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConsultaDialog, setShowConsultaDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProfessional, setFilterProfessional] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeDetailSection, setActiveDetailSection] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [examAttachmentFile, setExamAttachmentFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [consultaData, setConsultaData] = useState({
    data: new Date().toISOString().split('T')[0],
    tipo: "consulta",
    profissional: defaultProfessional,
    status: "rascunho",
    drafts: createEmptyDrafts(),
  });

  const resetConsultaData = () => ({
    data: new Date().toISOString().split('T')[0],
    tipo: "consulta",
    profissional: defaultProfessional,
    status: "rascunho",
    drafts: createEmptyDrafts(),
  });

  const mapRecordToTimeline = (record) => ({
    ...(function () {
      const parsedPrescription = parsePatientRecordPrescription(record.prescription || "");
      const metadata = parsedPrescription.metadata || {};
      const normalizedSectionDrafts = buildFilledDraftMap(
        metadata.sectionDrafts || {
          [record.record_type]: {
            diagnostico: record.diagnosis || "",
            prescricao: parsedPrescription.notes || "",
            structuredData: metadata.structuredData || {},
          },
        }
      );
      const primaryType = metadata.activeType || record.record_type;
      const primaryDraft = normalizedSectionDrafts[primaryType] || Object.values(normalizedSectionDrafts)[0] || null;

      return {
        prescription: primaryDraft?.prescricao || parsedPrescription.notes || "",
        structuredData: normalizeStructuredData(primaryType, primaryDraft?.structuredData || metadata.structuredData || {}),
        sectionDrafts: normalizedSectionDrafts,
        activeType: primaryType,
      };
    })(),
    id: record.id,
    type: record.record_type,
    date: record.record_date,
    time: record.record_time || "00:00",
    professional: record.professional_name,
    diagnosis: record.diagnosis,
    status: record.status || "rascunho",
    finalizedAt: record.finalized_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    storageMode: record._storage_mode || "supabase",
  });

  const drafts = normalizeDrafts(consultaData.drafts);
  const currentDraft = drafts[consultaData.tipo] || createEmptyDrafts().consulta;
  const currentTypeConfig = RECORD_TYPE_FORM_CONFIG[consultaData.tipo] || RECORD_TYPE_FORM_CONFIG.consulta;
  const filledDraftEntries = Object.entries(drafts).filter(([type, draft]) => hasMeaningfulDraftContent(type, draft));
  const filledDraftLabels = filledDraftEntries.map(([type]) => RECORD_TYPES[type]?.label || type);

  const updateCurrentDraft = (updater) => {
    setConsultaData((prev) => {
      const normalizedDrafts = normalizeDrafts(prev.drafts);
      const previousDraft = normalizedDrafts[prev.tipo];
      const nextDraft = typeof updater === "function" ? updater(previousDraft) : { ...previousDraft, ...updater };

      return {
        ...prev,
        drafts: {
          ...normalizedDrafts,
          [prev.tipo]: {
            ...previousDraft,
            ...nextDraft,
          },
        },
      };
    });
  };

  const renderStructuredField = (field) => {
    if (field.showWhen && !field.showWhen(currentDraft.structuredData || {})) {
      return null;
    }

    const value = currentDraft.structuredData?.[field.key] ?? "";

    if (field.inputType === "checkbox") {
      return (
        <label key={field.key} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateCurrentDraft((draft) => ({
              ...draft,
              structuredData: {
                ...normalizeStructuredData(consultaData.tipo, draft.structuredData),
                [field.key]: e.target.checked,
                ...(field.key === "hadComplications" && !e.target.checked ? { complicationDescription: "" } : {}),
              },
            }))}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium text-gray-700">{field.label}</span>
        </label>
      );
    }

    if (field.inputType === "file") {
      const existingName = currentDraft.structuredData?.attachmentName;
      return (
        <div key={field.key}>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">{field.label}</Label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setExamAttachmentFile(file);
              updateCurrentDraft((draft) => ({
                ...draft,
                structuredData: {
                  ...normalizeStructuredData(consultaData.tipo, draft.structuredData),
                  attachmentName: file?.name || draft.structuredData?.attachmentName || "",
                },
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
          />
          {existingName ? (
            <p className="mt-2 text-xs text-gray-600">Arquivo atual: {existingName}</p>
          ) : null}
        </div>
      );
    }

    if (field.inputType === "text") {
      return (
        <div key={field.key}>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">{field.label}</Label>
          <Input
            value={value}
            onChange={(e) => updateCurrentDraft((draft) => ({
              ...draft,
              structuredData: {
                ...normalizeStructuredData(consultaData.tipo, draft.structuredData),
                [field.key]: e.target.value,
              },
            }))}
            placeholder={field.placeholder}
            className="border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          />
        </div>
      );
    }

    return (
      <div key={field.key}>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">{field.label}</Label>
        <Textarea
          value={value}
          onChange={(e) => updateCurrentDraft((draft) => ({
            ...draft,
            structuredData: {
              ...normalizeStructuredData(consultaData.tipo, draft.structuredData),
              [field.key]: e.target.value,
            },
          }))}
          placeholder={field.placeholder}
          className="border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 min-h-[90px] resize-none"
        />
      </div>
    );
  };

  useEffect(() => {
    loadHistorico();
  }, [patientId]);

  // Atualizar profissional padrão quando a prop mudar
  useEffect(() => {
    if (defaultProfessional) {
      setConsultaData(prev => ({
        ...prev,
        profissional: defaultProfessional
      }));
    }
  }, [defaultProfessional]);

  async function loadHistorico() {
    setLoading(true);
    try {
      const data = await listPatientRecords(patientId);
      setHistorico((data || []).map(mapRecordToTimeline));
    } catch (error) {
      console.error("Erro ao carregar histórico clínico:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar histórico clínico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleSyncLocalRecords = async () => {
    setSyncingLocal(true);

    try {
      const result = await syncLocalPatientRecords(patientId);

      await loadHistorico();

      if (result.blockedByPolicy) {
        toast({
          title: "Sincronização bloqueada",
          description: "O Supabase ainda está rejeitando gravações do histórico. Aplique a migration/policy e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      if (result.syncedRows.length > 0) {
        toast({
          title: "Histórico sincronizado",
          description: `${result.syncedRows.length} registro(s) foram enviados ao Supabase.`,
        });
        return;
      }

      toast({
        title: "Nada para sincronizar",
        description: "Não há registros locais pendentes neste paciente.",
      });
    } catch (error) {
      console.error("Erro ao sincronizar histórico local:", error);
      toast({
        title: "Erro",
        description: "Falha ao sincronizar registros locais com o Supabase.",
        variant: "destructive",
      });
    } finally {
      setSyncingLocal(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRecordId(null);
    setConsultaData(resetConsultaData());
    setExamAttachmentFile(null);
    setShowConsultaDialog(true);
  };

  const openDetailsDialog = (record) => {
    setSelectedRecord(record);
    setActiveDetailSection(getOrderedSectionEntries(record)[0]?.[0] || record.type || null);
    setShowDetailsDialog(true);
  };

  const openEditDialog = (record) => {
    if (record.status === "finalizado") {
      toast({
        title: "Registro finalizado",
        description: "Este registro é definitivo e não pode mais ser editado.",
        variant: "destructive",
      });
      return;
    }

    setEditingRecordId(record.id);
    const filledSections = getFilledSectionsFromRecord(record);
    setConsultaData({
      data: record.date,
      tipo: record.activeType || record.type,
      profissional: record.professional,
      status: record.status || "rascunho",
      drafts: {
        ...createEmptyDrafts(),
        ...normalizeDrafts(filledSections),
      },
    });
    setExamAttachmentFile(null);
    setShowConsultaDialog(true);
  };

  const handleSaveConsulta = async (targetStatus = "rascunho") => {
    if (!consultaData.data || !consultaData.profissional) {
      toast({
        title: "Erro",
        description: "Preencha data e profissional antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const recordsToSave = filledDraftEntries.map(([type, draft]) => ({ type, draft }));

      if (!recordsToSave.length) {
        toast({
          title: "Nenhum conteúdo para salvar",
          description: "Preencha pelo menos uma aba clínica antes de salvar.",
          variant: "destructive",
        });
        return;
      }

      for (const { type, draft } of recordsToSave) {
        if (!String(draft.diagnostico || "").trim()) {
          toast({
            title: "Descrição obrigatória",
            description: `Preencha a descrição da aba ${RECORD_TYPES[type]?.label || type} antes de salvar.`,
            variant: "destructive",
          });
          return;
        }

        const structuredValidationError = validateStructuredData(type, draft.structuredData);
        if (structuredValidationError) {
          toast({
            title: "Validação clínica",
            description: `${RECORD_TYPES[type]?.label || type}: ${structuredValidationError}`,
            variant: "destructive",
          });
          return;
        }
      }

      const sectionDrafts = buildFilledDraftMap(Object.fromEntries(recordsToSave.map(({ type, draft }) => [type, draft])));

      if (sectionDrafts.exame && examAttachmentFile) {
        setUploadingAttachment(true);
        const uploadedFile = await uploadPacienteMedia(patientId, examAttachmentFile, user?.id || null);
        sectionDrafts.exame = {
          ...sectionDrafts.exame,
          structuredData: {
            ...normalizeStructuredData("exame", sectionDrafts.exame.structuredData),
            attachmentName: uploadedFile.name,
            attachmentUrl: uploadedFile.url,
          },
        };
      }

      const primarySection = sectionDrafts[consultaData.tipo] || Object.values(sectionDrafts)[0];
      const recordTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const payload = {
        patient_id: patientId,
        clinic_id: clinicId || null,
        professional_name: consultaData.profissional,
        record_type: consultaData.tipo,
        record_date: consultaData.data,
        record_time: recordTime,
        diagnosis: primarySection?.diagnostico || "Registro clínico integrado",
        prescription: buildPatientRecordPrescription(primarySection?.prescricao || "", {
          structuredData: primarySection?.structuredData || {},
          sectionDrafts,
          activeType: consultaData.tipo,
        }),
        status: targetStatus,
        finalized_at: targetStatus === "finalizado" ? new Date().toISOString() : null,
      };

      const savedRecord = editingRecordId
        ? await updatePatientRecord(editingRecordId, payload)
        : await createPatientRecord(payload);

      const mappedRecord = mapRecordToTimeline(savedRecord);

      setHistorico((prev) => {
        if (editingRecordId) {
          return prev.map((item) => item.id === editingRecordId ? mappedRecord : item);
        }
        return [mappedRecord, ...prev];
      });

      setShowConsultaDialog(false);
      setEditingRecordId(null);
      setConsultaData(resetConsultaData());
      setExamAttachmentFile(null);

      toast({
        title: targetStatus === "finalizado" ? "Registro finalizado" : "Rascunho salvo",
        description: `${Object.keys(sectionDrafts).length} aba(s) foram salvas dentro do mesmo registro clínico.`,
      });
    } catch (error) {
      console.error("Erro ao salvar registro clínico:", error);
      toast({
        title: "Erro",
        description: "Falha ao salvar o registro clínico.",
        variant: "destructive",
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleAudioTranscribe = (transcribedText) => {
    console.log("🎤 Texto transcrito:", transcribedText);
    
    // Adicionar o texto transcrito ao campo de diagnóstico
    updateCurrentDraft((draft) => ({
      ...draft,
      diagnostico: draft.diagnostico ? draft.diagnostico + " " + transcribedText : transcribedText,
    }));

    toast({
      title: "Sucesso",
      description: "Áudio transcrito e adicionado à descrição",
    });
  };

  const handleScrollToDetailSection = (recordId, sectionType) => {
    const element = document.getElementById(`patient-record-section-${recordId}-${sectionType}`);
    if (!element) return;

    setActiveDetailSection(sectionType);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDetailsContentScroll = (event, record) => {
    const sectionEntries = getOrderedSectionEntries(record);
    if (!sectionEntries.length) return;

    const containerTop = event.currentTarget.getBoundingClientRect().top;
    let currentSection = sectionEntries[0][0];

    for (const [sectionType] of sectionEntries) {
      const element = document.getElementById(`patient-record-section-${record.id}-${sectionType}`);
      if (!element) continue;

      const offset = element.getBoundingClientRect().top - containerTop;
      if (offset <= 140) {
        currentSection = sectionType;
      }
    }

    setActiveDetailSection((prev) => (prev === currentSection ? prev : currentSection));
  };

  useEffect(() => {
    if (!showDetailsDialog || !selectedRecord) {
      setActiveDetailSection(null);
      return;
    }

    setActiveDetailSection(getOrderedSectionEntries(selectedRecord)[0]?.[0] || selectedRecord.type || null);
  }, [showDetailsDialog, selectedRecord]);

  const handleExportHistorico = () => {
    if (!filteredHistorico.length) {
      toast({
        title: "Sem registros",
        description: "Não há registros filtrados para exportar.",
        variant: "destructive",
      });
      return;
    }

    const sectionsHtml = Object.entries(groupedByPeriod).map(([period, items]) => `
      <section style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px;">${period}</h2>
        ${items.map((evento) => {
          const typeLabel = RECORD_TYPES[evento.type]?.label || evento.type;
          const summary = buildRecordSummary(evento).slice(0, 4);
          return `
            <article style="border: 1px solid #ddd; border-radius: 10px; padding: 14px; margin-bottom: 12px; background: #fff;">
              <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:8px;">
                <div>
                  <strong>${typeLabel}</strong> · ${evento.status === "finalizado" ? "Definitivo" : "Rascunho"}
                </div>
                <div>${new Date(evento.date).toLocaleDateString("pt-BR")} às ${evento.time}</div>
              </div>
              <div style="margin-bottom: 8px;"><strong>Profissional:</strong> ${evento.professional || "—"}</div>
              <div style="margin-bottom: 8px;"><strong>Descrição:</strong><br/>${evento.diagnosis || "—"}</div>
              ${evento.prescription ? `<div style="margin-bottom: 8px;"><strong>Orientações:</strong><br/>${evento.prescription}</div>` : ""}
              ${summary.length ? `<div><strong>Resumo estruturado:</strong> ${summary.join(" | ")}</div>` : ""}
            </article>
          `;
        }).join("")}
      </section>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Histórico Clínico - ${patientData?.name || "Paciente"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin-bottom: 4px; }
            .meta { color: #6b7280; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <h1>Histórico Clínico</h1>
          <div class="meta">Paciente: ${patientData?.name || "Paciente"} · Exportado em ${new Date().toLocaleString("pt-BR")}</div>
          ${sectionsHtml}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-clinico-${patientData?.name || "paciente"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Filtrar histórico
  const filteredHistorico = historico.filter(item => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterProfessional && !String(item.professional || "").toLowerCase().includes(filterProfessional.toLowerCase())) return false;
    if (filterMonth && !item.date.startsWith(filterMonth)) return false;
    return true;
  });

  // Agrupar por período
  const groupedByPeriod = {};
  filteredHistorico.forEach(item => {
    const itemDate = new Date(item.date);
    const key = itemDate.toLocaleString('pt-BR', { year: 'numeric', month: 'long' });
    if (!groupedByPeriod[key]) groupedByPeriod[key] = [];
    groupedByPeriod[key].push(item);
  });

  const ultimaConsulta = historico.find(h => h.type === "consulta");
  const totalRegistros = historico.length;
  const totalRascunhos = historico.filter((item) => item.status === "rascunho").length;
  const totalDefinitivos = historico.filter((item) => item.status === "finalizado").length;
  const localRecordsCount = historico.filter((item) => item.storageMode === "local").length;

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Resumo Rápido */}
      {historico.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Última Consulta */}
          <Card className="border-l-4 border-blue-500 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Última Consulta</p>
                  {ultimaConsulta ? (
                    <>
                      <p className="text-lg font-bold text-blue-900 mt-2">
                        {new Date(ultimaConsulta.date).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{ultimaConsulta.professional}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 mt-2">Nenhuma consulta registrada</p>
                  )}
                </div>
                <Stethoscope className="w-5 h-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          {/* Total de Registros */}
          <Card className="border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total de Registros</p>
                  <p className="text-3xl font-bold text-purple-900 mt-2">{totalRegistros}</p>
                  <p className="text-xs text-gray-600 mt-1">Consultas, exames e procedimentos</p>
                </div>
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          {/* Próximo Agendamento */}
          <Card className="border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status do Histórico</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1">
                      {totalRascunhos} rascunho(s)
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1">
                      {totalDefinitivos} definitivo(s)
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Controle de edição e fechamento do prontuário</p>
                </div>
                <Clock className="w-5 h-5 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cabeçalho com Botões */}
      <motion.div 
        className="flex justify-between items-center gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Timeline Clínica</h3>
          <p className="text-sm text-gray-500 mt-1">Histórico de consultas, exames e procedimentos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportHistorico}
            className="gap-2"
          >
            <Download size={16} />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <FilterIcon size={16} />
            {showFilters ? "Ocultar" : "Filtros"}
          </Button>
          <Button
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm"
            onClick={openCreateDialog}
          >
            <Plus size={16} className="mr-2" />
            Novo Registro
          </Button>
        </div>
      </motion.div>

      {localRecordsCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-amber-950">Salvamento local ativo</p>
                  <p className="mt-1 text-sm text-amber-900">
                    {localRecordsCount} registro(s) do histórico foram salvos apenas neste navegador porque o Supabase ainda não aceitou a gravação.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-900 border border-amber-300">
                    Local
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                    onClick={handleSyncLocalRecords}
                    disabled={syncingLocal}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncingLocal ? "animate-spin" : ""}`} />
                    Sincronizar agora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* Filtros */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Tipo de Registro */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Registro</Label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos os tipos</option>
                    {Object.entries(RECORD_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                {/* Período */}

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Status</Label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="finalizado">Definitivo</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Profissional</Label>
                  <Input
                    value={filterProfessional}
                    onChange={(e) => setFilterProfessional(e.target.value)}
                    placeholder="Filtrar por profissional"
                    className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Período</Label>
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Botão Limpar */}
              {(filterType !== "all" || filterStatus !== "all" || filterProfessional || filterMonth) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType("all");
                    setFilterStatus("all");
                    setFilterProfessional("");
                    setFilterMonth("");
                  }}
                  className="mt-4 w-full text-gray-600 hover:text-gray-900"
                >
                  <X size={16} className="mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Timeline */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-500">Carregando histórico...</p>
          </CardContent>
        </Card>
      ) : filteredHistorico.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-sm border-l-4 border-blue-500 bg-blue-50">
            <CardContent className="pt-12 pb-12 text-center">
              <Stethoscope className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <p className="text-gray-700 mb-4 font-medium">
                {historico.length === 0 ? "Nenhum registro clínico adicionado" : "Nenhum resultado para os filtros aplicados"}
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Comece a adicionar consultas, exames e procedimentos do paciente
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  onClick={openCreateDialog}
                >
                  <Plus size={16} className="mr-2" />
                  Novo Registro
                </Button>
                {historico.length > 0 && filterType !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterType("all");
                      setFilterStatus("all");
                      setFilterProfessional("");
                      setFilterMonth("");
                    }}
                  >
                    Ver Todos
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div 
          className="space-y-6"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
          initial="hidden"
          animate="visible"
        >
          {Object.entries(groupedByPeriod).map(([period, items]) => (
            <motion.div
              key={period}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Divisor de Período */}
              <div className="sticky top-0 bg-white z-10 py-3 mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">{period}</h4>
                  <Badge variant="outline" className="text-xs">{items.length} registros</Badge>
                </div>
              </div>

              {/* Registros do período */}
              <div className="space-y-3 ml-4 border-l-2 border-gray-200 pl-6">
                {items.map((evento, idx) => {
                  const tipoConfig = RECORD_TYPES[evento.type] || {};
                  const structuredSummary = buildRecordSummary(evento).slice(0, 3);
                  const structuredHighlights = buildRecordHighlights(evento).slice(0, 4);
                  const sectionEntries = getOrderedSectionEntries(evento);
                  const sectionTitle = sectionEntries
                    .map(([sectionType]) => RECORD_TYPES[sectionType]?.label || sectionType)
                    .join(" + ");
                  const compactMeta = [
                    `${sectionEntries.length} ${sectionEntries.length === 1 ? "seção" : "seções"}`,
                    evento.status === "finalizado" ? "Definitivo" : "Rascunho",
                    evento.storageMode === "local" ? "Local" : "Supabase",
                  ].join(" • ");
                  const TypeIcon = tipoConfig.icon || FileText;
                  const colorClasses = {
                    blue: "border-l-blue-500 bg-blue-50 hover:bg-blue-100",
                    green: "border-l-green-500 bg-green-50 hover:bg-green-100",
                    purple: "border-l-purple-500 bg-purple-50 hover:bg-purple-100",
                    cyan: "border-l-cyan-500 bg-cyan-50 hover:bg-cyan-100",
                  };
                  const toneClasses = {
                    blue: {
                      icon: "bg-blue-100 text-blue-700",
                      panel: "border-blue-200 bg-white/80",
                    },
                    green: {
                      icon: "bg-green-100 text-green-700",
                      panel: "border-green-200 bg-white/80",
                    },
                    purple: {
                      icon: "bg-purple-100 text-purple-700",
                      panel: "border-purple-200 bg-white/80",
                    },
                    cyan: {
                      icon: "bg-cyan-100 text-cyan-700",
                      panel: "border-cyan-200 bg-white/80",
                    },
                  };
                  const tone = toneClasses[tipoConfig.color] || { icon: "bg-gray-100 text-gray-700", panel: "border-gray-200 bg-white/80" };

                  return (
                    <motion.div
                      key={evento.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className={`border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-l-4 ${colorClasses[tipoConfig.color] || 'border-l-gray-300'}`}>
                        <CardContent className="pt-5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.icon}`}>
                                  <TypeIcon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                    {sectionTitle || tipoConfig.label}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">{compactMeta}</p>
                                </div>
                                <span className="ml-auto text-xs text-gray-500 font-medium whitespace-nowrap">
                                  {new Date(evento.date).toLocaleDateString('pt-BR')} às {evento.time}
                                </span>
                              </div>

                              {sectionEntries.length <= 1 ? (
                                <div className="mb-3 flex flex-wrap gap-2">
                                  <Badge className={`bg-${tipoConfig.color}-100 text-${tipoConfig.color}-800 text-xs font-semibold`}>
                                    {tipoConfig.label}
                                  </Badge>
                                </div>
                              ) : null}

                              {structuredHighlights.length > 0 && sectionEntries.length <= 1 ? (
                                <div className={`mb-3 grid gap-2 md:grid-cols-2 rounded-xl border p-3 ${tone.panel}`}>
                                  {structuredHighlights.map((item) => (
                                    <div key={`${item.label}-${item.value}`} className="min-w-0">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                                      <p className="truncate text-sm font-medium text-gray-800">{item.value}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {sectionEntries.length > 1 ? (
                                <div className="mb-3 grid gap-2 md:grid-cols-2">
                                  {sectionEntries.map(([sectionType, sectionDraft]) => {
                                    const sectionConfig = RECORD_TYPES[sectionType] || {};
                                    const compactText = buildCompactSectionText(sectionType, sectionDraft);
                                    return (
                                      <div key={sectionType} className="rounded-xl border border-gray-200 bg-white/80 p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                          <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                                            {sectionConfig.label || sectionType}
                                          </Badge>
                                          {sectionType === "exame" && sectionDraft.structuredData?.attachmentName ? (
                                            <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-800">
                                              Com anexo
                                            </Badge>
                                          ) : null}
                                        </div>
                                        <p className="line-clamp-2 text-sm text-gray-800">{compactText}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}

                              <div className="space-y-2">
                                {evento.professional && sectionEntries.length <= 1 && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-medium">{evento.professional}</span>
                                  </div>
                                )}

                                {evento.diagnosis && sectionEntries.length <= 1 && (
                                  <div className="flex items-start gap-2 text-gray-700 pt-2 border-t border-gray-200">
                                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Descrição</p>
                                      <p className="text-sm text-gray-800 mt-1">{evento.diagnosis}</p>
                                    </div>
                                  </div>
                                )}

                                {evento.prescription && sectionEntries.length <= 1 && (
                                  <div className="flex items-start gap-2 text-gray-700 pt-2">
                                    <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Orientações</p>
                                      <p className="text-sm text-gray-800 mt-1">{evento.prescription}</p>
                                    </div>
                                  </div>
                                )}

                                {structuredSummary.length > 0 && sectionEntries.length <= 1 ? (
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Resumo estruturado</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {structuredSummary.map((item) => (
                                        <Badge key={item} variant="outline" className="border-slate-300 bg-white text-slate-700 max-w-full">
                                          <span className="truncate">{item}</span>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-200 hover:bg-gray-100 text-gray-600 h-9 w-9 p-0"
                                title="Ver detalhes"
                                onClick={() => openDetailsDialog(evento)}
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-200 hover:bg-gray-100 text-gray-600 h-9 w-9 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={evento.status === "finalizado" ? "Registro definitivo não pode ser editado" : "Editar registro"}
                                onClick={() => openEditDialog(evento)}
                                disabled={evento.status === "finalizado"}
                              >
                                <Edit size={16} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Dialog Novo Registro - MELHORADO */}
      <Dialog open={showConsultaDialog} onOpenChange={(open) => {
        setShowConsultaDialog(open);
        if (!open) {
          setEditingRecordId(null);
          setConsultaData(resetConsultaData());
        }
      }}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content">
          <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              {editingRecordId ? "Editar Registro Clínico" : "Novo Registro Clínico"}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">Salve como rascunho para continuar depois ou finalize para bloquear novas edições.</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
            {/* SEÇÃO 1: Tipo de Registro */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <div>
                <Label className="text-base font-semibold text-gray-900 mb-3 block">
                  Tipo de Registro <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-gray-600 mb-3">Selecione o tipo de evento clínico a registrar</p>
                {!editingRecordId ? (
                  <p className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                    Cada aba preenchida será salva como um registro separado na timeline.
                  </p>
                ) : null}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(RECORD_TYPES).map(([key, typeInfo]) => {
                    const Icon = typeInfo.icon;
                    const isSelected = consultaData.tipo === key;
                    const colorMap = {
                      blue: "border-blue-500 bg-blue-50",
                      green: "border-green-500 bg-green-50",
                      purple: "border-purple-500 bg-purple-50",
                      cyan: "border-cyan-500 bg-cyan-50",
                    };

                    return (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setConsultaData((prev) => ({
                          ...prev,
                          tipo: key,
                        }))}
                        className={`
                          p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2
                          ${
                            isSelected
                              ? `border-${typeInfo.color}-500 bg-${typeInfo.color}-50 ring-2 ring-${typeInfo.color}-300`
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }
                        `}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? `text-${typeInfo.color}-600` : "text-gray-500"}`} />
                        <span className={`text-xs font-medium text-center ${isSelected ? `text-${typeInfo.color}-900` : "text-gray-700"}`}>
                          {typeInfo.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* SEÇÃO 2: Informações Básicas */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-4"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data" className="text-sm font-medium text-gray-700 mb-2 block">
                    Data <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="data"
                    type="date"
                    value={consultaData.data}
                    onChange={(e) => setConsultaData({ ...consultaData, data: e.target.value })}
                    className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">
                    {consultaData.data && new Date(consultaData.data).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                <div>
                  <Label htmlFor="profissional" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Profissional Responsável <span className="text-red-500">*</span>
                    {defaultProfessional && (
                      <Badge variant="secondary" className="text-xs font-normal bg-green-100 text-green-800 border-green-300">
                        ✓ Agenda
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="profissional"
                    placeholder="Ex: Dr. João Silva"
                    value={consultaData.profissional}
                    onChange={(e) => setConsultaData({ ...consultaData, profissional: e.target.value })}
                    className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">
                    {defaultProfessional ? "Preenchido automaticamente da agenda. Edite se necessário." : "Nome do médico/profissional que realizou o atendimento"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* SEÇÃO 3: Informações Clínicas */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-purple-50 rounded-lg p-4 border border-purple-200 space-y-4"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                {currentTypeConfig.mainLabel}
              </h3>

              <div>
                <Label htmlFor="diagnostico" className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  {currentTypeConfig.mainLabel} <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 font-normal">Obrigatório</span>
                </Label>
                <div className="flex gap-2 mb-2">
                  <AudioTranscriber 
                    onTranscribe={handleAudioTranscribe}
                    disabled={false}
                  />
                </div>
                <Textarea
                  id="diagnostico"
                  placeholder={currentTypeConfig.mainPlaceholder}
                  value={currentDraft.diagnostico}
                  onChange={(e) => updateCurrentDraft({ diagnostico: e.target.value })}
                  className="border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 min-h-[120px] resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-600">
                    {currentTypeConfig.mainHelp}
                  </p>
                  <span className={`text-xs font-medium ${currentDraft.diagnostico.length > 10000 ? "text-red-600" : "text-gray-500"}`}>
                    {currentDraft.diagnostico.length}/10000
                  </span>
                </div>
              </div>

              {(currentTypeConfig.extraFields || []).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentTypeConfig.extraFields.map(renderStructuredField)}
                </div>
              ) : null}
            </motion.div>

            {/* SEÇÃO 4: Orientações (Opcional) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-green-50 rounded-lg p-4 border border-green-200 space-y-4"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-green-600" />
                {currentTypeConfig.secondaryLabel} <span className="text-xs font-normal text-gray-600">(Opcional)</span>
              </h3>

              <Textarea
                id="prescricao"
                placeholder={currentTypeConfig.secondaryPlaceholder}
                value={currentDraft.prescricao}
                onChange={(e) => updateCurrentDraft({ prescricao: e.target.value })}
                className="border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 min-h-[100px] resize-none"
              />
              <p className="text-xs text-gray-600">
                {currentTypeConfig.secondaryHelp}
              </p>
            </motion.div>

            {/* SEÇÃO 5: Preview dos dados */}
            {(consultaData.data || consultaData.profissional || currentDraft.diagnostico) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4"
              >
                <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview do Registro
                </h4>
                <Card className="bg-white border border-gray-200">
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Data:</span>
                        <span className="font-medium text-gray-900">
                          {consultaData.data && new Date(consultaData.data).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <Badge className="bg-blue-100 text-blue-800">
                          {RECORD_TYPES[consultaData.tipo]?.label}
                        </Badge>
                      </div>
                      {!editingRecordId && filledDraftLabels.length > 0 ? (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-gray-600 text-xs mb-2">Abas prontas para salvar:</p>
                          <div className="flex flex-wrap gap-2">
                            {filledDraftLabels.map((label) => (
                              <Badge key={`preview-tab-${label}`} variant="outline" className="border-violet-200 bg-violet-50 text-violet-900">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant="outline" className={consultaData.status === "finalizado" ? "border-emerald-300 text-emerald-800" : "border-amber-300 text-amber-800"}>
                          {consultaData.status === "finalizado" ? "Definitivo" : "Rascunho"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profissional:</span>
                        <span className="font-medium text-gray-900">{consultaData.profissional || "—"}</span>
                      </div>
                      {currentDraft.diagnostico && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-gray-600 text-xs mb-1">{currentTypeConfig.previewMainLabel}:</p>
                          <p className="text-gray-800 text-xs line-clamp-2">{currentDraft.diagnostico}</p>
                        </div>
                      )}
                      {(currentTypeConfig.extraFields || []).map((field) => (
                        field.inputType !== "file" && currentDraft.structuredData?.[field.key] ? (
                          <div key={field.key} className="pt-2 border-t border-gray-200">
                            <p className="text-gray-600 text-xs mb-1">{field.label}:</p>
                            <p className="text-gray-800 text-xs line-clamp-2">{String(currentDraft.structuredData[field.key])}</p>
                          </div>
                        ) : null
                      ))}
                      {currentDraft.structuredData?.attachmentName ? (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-gray-600 text-xs mb-1">Anexo do exame:</p>
                          <p className="text-gray-800 text-xs line-clamp-2">{currentDraft.structuredData.attachmentName}</p>
                        </div>
                      ) : null}
                      {currentDraft.prescricao && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-gray-600 text-xs mb-1">{currentTypeConfig.previewSecondaryLabel}:</p>
                          <p className="text-gray-800 text-xs line-clamp-2">{currentDraft.prescricao}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* SEÇÃO 6: Status de Validação */}
            {showConsultaDialog && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 text-xs"
              >
                <Badge variant={consultaData.data ? "default" : "secondary"} className="flex items-center gap-1">
                  <span>{consultaData.data ? "✓" : "○"}</span> Data
                </Badge>
                <Badge variant={consultaData.profissional ? "default" : "secondary"} className="flex items-center gap-1">
                  <span>{consultaData.profissional ? "✓" : "○"}</span> Profissional
                </Badge>
                <Badge variant={currentDraft.diagnostico ? "default" : "secondary"} className="flex items-center gap-1">
                  <span>{currentDraft.diagnostico ? "✓" : "○"}</span> Descrição da aba ativa
                </Badge>
                {!editingRecordId ? (
                  <Badge variant={filledDraftEntries.length ? "default" : "secondary"} className="flex items-center gap-1">
                    <span>{filledDraftEntries.length ? "✓" : "○"}</span> {filledDraftEntries.length} aba(s) pronta(s)
                  </Badge>
                ) : null}
              </motion.div>
            )}
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 px-6 pb-6 pt-6 flex gap-3 justify-end bg-white">
            <Button
              variant="outline"
              onClick={() => setShowConsultaDialog(false)}
              className="border-gray-300 hover:bg-gray-50 text-gray-700"
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConsultaData((prev) => ({ ...prev, status: "rascunho" }));
                handleSaveConsulta("rascunho");
              }}
              disabled={!consultaData.data || !consultaData.profissional || (editingRecordId ? !currentDraft.diagnostico : !filledDraftEntries.length)}
              className="border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              Salvar como Rascunho
            </Button>
            <Button
              className={`
                font-semibold flex items-center gap-2 transition-all duration-200
                ${
                  consultaData.data && consultaData.profissional && (editingRecordId ? currentDraft.diagnostico : filledDraftEntries.length)
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              `}
              onClick={() => {
                setConsultaData((prev) => ({ ...prev, status: "finalizado" }));
                handleSaveConsulta("finalizado");
              }}
              disabled={!consultaData.data || !consultaData.profissional || (editingRecordId ? !currentDraft.diagnostico : !filledDraftEntries.length) || uploadingAttachment}
            >
              <Plus size={16} />
              {uploadingAttachment ? "Enviando anexo..." : "Salvar Definitivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content max-h-[90vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6 sticky top-0 bg-white z-10">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" />
              Detalhes do Registro
            </DialogTitle>
          </DialogHeader>

          {selectedRecord ? (() => {
            const sectionEntries = getOrderedSectionEntries(selectedRecord);
            const sectionTitle = sectionEntries
              .map(([sectionType]) => RECORD_TYPES[sectionType]?.label || sectionType)
              .join(" + ");

            return (
              <>
                <div className="border-b border-slate-200 bg-white px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{sectionTitle || RECORD_TYPES[selectedRecord.type]?.label || selectedRecord.type}</p>
                      <p className="text-xs text-slate-500">{sectionEntries.length} seção(ões) no registro clínico</p>
                    </div>
                    <Badge variant="outline" className={selectedRecord.status === "finalizado" ? "border-emerald-300 text-emerald-800 bg-emerald-50" : "border-amber-300 text-amber-800 bg-amber-50"}>
                      {selectedRecord.status === "finalizado" ? "Definitivo" : "Rascunho"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">Paciente</p>
                      <p className="text-gray-900">{patientData?.name || "Paciente"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Profissional</p>
                      <p className="text-gray-900">{selectedRecord.professional}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Data</p>
                      <p className="text-gray-900">{new Date(selectedRecord.date).toLocaleDateString('pt-BR')} às {selectedRecord.time}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Origem</p>
                      <p className="text-gray-900">{selectedRecord.storageMode === "local" ? "Salvo localmente" : "Salvo no Supabase"}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 bg-white px-6 py-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-3 px-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navegação do registro</p>
                      {activeDetailSection ? (
                        <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                          Em foco: {RECORD_TYPES[activeDetailSection]?.label || activeDetailSection}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sectionEntries.map(([sectionType]) => (
                        <Button
                          key={`detail-nav-${selectedRecord.id}-${sectionType}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={activeDetailSection === sectionType
                            ? "border-blue-500 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}
                          onClick={() => handleScrollToDetailSection(selectedRecord.id, sectionType)}
                        >
                          {RECORD_TYPES[sectionType]?.label || sectionType}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className="max-h-[calc(90vh-380px)] overflow-y-auto bg-white px-6 pb-6 pt-4"
                  onScroll={(event) => handleDetailsContentScroll(event, selectedRecord)}
                >
              <div>
              {sectionEntries.length > 1 ? (
                <div className="space-y-4">
                  {sectionEntries.map(([sectionType, sectionDraft]) => (
                    <div
                      key={sectionType}
                      id={`patient-record-section-${selectedRecord.id}-${sectionType}`}
                      className={activeDetailSection === sectionType
                        ? "rounded-xl border-2 border-blue-300 bg-blue-50/60 p-4 shadow-sm ring-1 ring-blue-100 scroll-mt-6 transition-all duration-200"
                        : "rounded-xl border border-gray-200 bg-gray-50 p-4 scroll-mt-6 transition-all duration-200"}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge className={activeDetailSection === sectionType ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800"}>
                          {RECORD_TYPES[sectionType]?.label || sectionType}
                        </Badge>
                        {activeDetailSection === sectionType ? (
                          <Badge variant="outline" className="border-blue-300 bg-white text-blue-800">
                            Em evidência
                          </Badge>
                        ) : null}
                        {sectionType === selectedRecord.activeType ? (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                            Aba principal
                          </Badge>
                        ) : null}
                        {sectionType === "exame" && sectionDraft.structuredData?.attachmentName ? (
                          <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-800">
                            Com anexo
                          </Badge>
                        ) : null}
                      </div>
                      {sectionDraft.diagnostico ? (
                        <div className="mb-3">
                          <p className="font-semibold text-gray-700 mb-2">Descrição</p>
                          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 whitespace-pre-wrap">
                            {sectionDraft.diagnostico}
                          </div>
                        </div>
                      ) : null}

                      {(RECORD_TYPE_FORM_CONFIG[sectionType]?.extraFields || []).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          {RECORD_TYPE_FORM_CONFIG[sectionType].extraFields.map((field) => (
                            field.inputType !== "file" && sectionDraft.structuredData?.[field.key] ? (
                              <div key={`${sectionType}-${field.key}`}>
                                <p className="font-semibold text-gray-700 mb-2">{field.label}</p>
                                <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 whitespace-pre-wrap">
                                  {String(sectionDraft.structuredData[field.key])}
                                </div>
                              </div>
                            ) : null
                          ))}
                        </div>
                      ) : null}

                      {sectionDraft.structuredData?.attachmentUrl ? (
                        <div className="mb-3">
                          <p className="font-semibold text-gray-700 mb-2">Anexo do exame</p>
                          <a
                            href={sectionDraft.structuredData.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
                          >
                            Abrir {sectionDraft.structuredData.attachmentName || "anexo"}
                          </a>
                        </div>
                      ) : null}

                      {sectionDraft.prescricao ? (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Orientações</p>
                          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 whitespace-pre-wrap">
                            {sectionDraft.prescricao}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {(RECORD_TYPE_FORM_CONFIG[selectedRecord.type]?.extraFields || []).length > 0 && sectionEntries.length <= 1 ? (
                <div
                  id={`patient-record-section-${selectedRecord.id}-${selectedRecord.type}`}
                  className={activeDetailSection === selectedRecord.type
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border-2 border-blue-300 bg-blue-50/60 p-4 shadow-sm ring-1 ring-blue-100 scroll-mt-6 transition-all duration-200"
                    : "grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 scroll-mt-6 transition-all duration-200"}
                >
                  {RECORD_TYPE_FORM_CONFIG[selectedRecord.type].extraFields.map((field) => (
                    field.inputType !== "file" && selectedRecord.structuredData?.[field.key] ? (
                      <div key={field.key}>
                        <p className="font-semibold text-gray-700 mb-2">{field.label}</p>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap">
                          {String(selectedRecord.structuredData[field.key])}
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>
              ) : null}

              {selectedRecord.structuredData?.attachmentUrl && sectionEntries.length <= 1 ? (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Anexo do exame</p>
                  <a
                    href={selectedRecord.structuredData.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Abrir {selectedRecord.structuredData.attachmentName || "anexo"}
                  </a>
                </div>
              ) : selectedRecord.structuredData?.attachmentName && sectionEntries.length <= 1 ? (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Anexo do exame</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
                    {selectedRecord.structuredData.attachmentName}
                  </div>
                </div>
              ) : null}

              {sectionEntries.length <= 1 ? (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Descrição</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedRecord.diagnosis}
                  </div>
                </div>
              ) : null}

              {selectedRecord.prescription && sectionEntries.length <= 1 ? (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Orientações</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedRecord.prescription}
                  </div>
                </div>
              ) : null}
              </div>
                </div>
              </>
            );
          })() : null}

          <DialogFooter className="border-t border-gray-200 px-6 pb-6 pt-6 bg-white sticky bottom-0 z-10">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
