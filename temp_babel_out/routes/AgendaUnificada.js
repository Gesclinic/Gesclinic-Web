import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
export default function ModalCriarAgendamento({
  open,
  onOpenChange,
  data,
  onSubmit
}) {
  /**
   * 🧠 ESTADO INTERNO
   * evita erro quando data ainda não existe
   */
  const [form, setForm] = useState({
    date: "",
    time: "",
    paciente: "",
    telefone: "",
    profissional: null,
    servico: null,
    billingType: "PARTICULAR",
    plano: null,
    observacoes: ""
  });

  /**
   * 🔄 Sempre que abrir o modal com novos dados
   */
  useEffect(() => {
    if (data) {
      setForm({
        date: data.date || "",
        time: data.time || "",
        paciente: data.paciente || "",
        telefone: data.telefone || "",
        profissional: data.profissional || null,
        servico: data.servico || null,
        billingType: data.billingType || "PARTICULAR",
        plano: data.plano || null,
        observacoes: data.observacoes || ""
      });
    }
  }, [data]);
  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  }
  function handleSubmit() {
    onSubmit(form);
  }
  if (!data) return null; // 🛑 segurança total

  return /*#__PURE__*/React.createElement(Dialog, {
    open: open,
    onOpenChange: onOpenChange
  }, /*#__PURE__*/React.createElement(DialogContent, {
    className: "app-dialog-shell app-dialog-shell--content"
  }, /*#__PURE__*/React.createElement(DialogHeader, {
    className: "border-b border-gray-200 px-6 pb-4 pt-6 text-left"
  }, /*#__PURE__*/React.createElement(DialogTitle, null, "Novo Agendamento")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-6 py-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Data"), /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: form.date,
    onChange: e => updateField("date", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Hora"), /*#__PURE__*/React.createElement(Input, {
    type: "time",
    value: form.time,
    onChange: e => updateField("time", e.target.value)
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Paciente"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Nome do paciente",
    value: form.paciente,
    onChange: e => updateField("paciente", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Telefone"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "WhatsApp",
    value: form.telefone,
    onChange: e => updateField("telefone", e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Profissional"), /*#__PURE__*/React.createElement(Select, {
    value: form.profissional || "",
    onValueChange: v => updateField("profissional", v)
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: "Selecione"
  })), /*#__PURE__*/React.createElement(SelectContent, null, /*#__PURE__*/React.createElement(SelectItem, {
    value: "profissional_1"
  }, "Profissional Exemplo")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Servi\xE7o"), /*#__PURE__*/React.createElement(Select, {
    value: form.servico || "",
    onValueChange: v => updateField("servico", v)
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: "Consulta / Exame"
  })), /*#__PURE__*/React.createElement(SelectContent, null, /*#__PURE__*/React.createElement(SelectItem, {
    value: "consulta"
  }, "Consulta"))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Conv\xEAnio"), /*#__PURE__*/React.createElement(Select, {
    value: form.billingType,
    onValueChange: v => updateField("billingType", v)
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, /*#__PURE__*/React.createElement(SelectValue, null)), /*#__PURE__*/React.createElement(SelectContent, null, /*#__PURE__*/React.createElement(SelectItem, {
    value: "PARTICULAR"
  }, "Particular"), /*#__PURE__*/React.createElement(SelectItem, {
    value: "CONVENIO"
  }, "Conv\xEAnio")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Plano"), /*#__PURE__*/React.createElement(Select, {
    value: form.plano || "",
    onValueChange: v => updateField("plano", v)
  }, /*#__PURE__*/React.createElement(SelectTrigger, null, /*#__PURE__*/React.createElement(SelectValue, {
    placeholder: "Opcional"
  })), /*#__PURE__*/React.createElement(SelectContent, null, /*#__PURE__*/React.createElement(SelectItem, {
    value: "plano1"
  }, "Plano Exemplo"))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement(Textarea, {
    placeholder: "Observa\xE7\xF5es cl\xEDnicas ou administrativas",
    value: form.observacoes,
    onChange: e => updateField("observacoes", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-3 pt-4"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: () => onOpenChange(false)
  }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
    onClick: handleSubmit
  }, "Criar Agendamento"))));
}