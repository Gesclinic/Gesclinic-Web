/**
 * NobleHoursSettings.jsx
 * 
 * ⏰ CONFIGURAÇÃO DE HORÁRIOS NOBRES
 * 
 * Permite que o gestor configure quais horários são considerados
 * "nobres" para sugestões (prime time slots)
 */

import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, Clock } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
export default function NobleHoursSettings({
  clinicId,
  onSave
}) {
  const [nobleHours, setNobleHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Carregar configurações
  useEffect(() => {
    loadNobleHours();
  }, [clinicId]);
  async function loadNobleHours() {
    try {
      const {
        data,
        error
      } = await supabase.from("clinic_settings").select("noble_hours_config").eq("clinic_id", clinicId).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      if (data?.noble_hours_config?.slots) {
        setNobleHours(data.noble_hours_config.slots);
      } else {
        // Valores padrão
        setNobleHours([{
          start: "07:00",
          end: "09:00"
        }, {
          start: "12:00",
          end: "13:00"
        }, {
          start: "17:00",
          end: "18:00"
        }]);
      }
    } catch (err) {
      console.error("Erro ao carregar horários nobres:", err);
      setMessage({
        type: "error",
        text: "Erro ao carregar configurações"
      });
    } finally {
      setLoading(false);
    }
  }
  async function handleSave() {
    setSaving(true);
    try {
      // Validar horários
      if (!validateHours(nobleHours)) {
        setMessage({
          type: "error",
          text: "Verifique se os horários estão corretos"
        });
        return;
      }
      const {
        error
      } = await supabase.from("clinic_settings").upsert({
        clinic_id: clinicId,
        noble_hours_config: {
          slots: nobleHours
        }
      }, {
        onConflict: "clinic_id"
      });
      if (error) throw error;
      setMessage({
        type: "success",
        text: "Horários nobres salvos com sucesso"
      });
      if (onSave) onSave(nobleHours);
    } catch (err) {
      console.error("Erro ao salvar horários nobres:", err);
      setMessage({
        type: "error",
        text: "Erro ao salvar configurações"
      });
    } finally {
      setSaving(false);
    }
  }
  function handleAddSlot() {
    setNobleHours([...nobleHours, {
      start: "09:00",
      end: "10:00"
    }]);
  }
  function handleRemoveSlot(idx) {
    setNobleHours(nobleHours.filter((_, i) => i !== idx));
  }
  function handleUpdateSlot(idx, field, value) {
    const updated = [...nobleHours];
    updated[idx][field] = value;
    setNobleHours(updated);
  }
  if (loading) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-4 animate-pulse bg-gray-100 rounded-lg h-32"
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-gray-200 p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-6"
  }, /*#__PURE__*/React.createElement(Clock, {
    className: "w-5 h-5 text-blue-500"
  }), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-900"
  }, "Hor\xE1rios Nobres"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 ml-auto"
  }, "Per\xEDodos de alta demanda para sugest\xF5es de encaixe")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 mb-6"
  }, nobleHours.map((slot, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-center gap-3 bg-gray-50 p-3 rounded-lg"
  }, /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: slot.start,
    onChange: e => handleUpdateSlot(idx, "start", e.target.value),
    className: "px-3 py-2 border border-gray-300 rounded-lg text-sm"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "\u2014"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: slot.end,
    onChange: e => handleUpdateSlot(idx, "end", e.target.value),
    className: "px-3 py-2 border border-gray-300 rounded-lg text-sm"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveSlot(idx),
    className: "ml-auto p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
  }, /*#__PURE__*/React.createElement(Trash2, {
    className: "w-4 h-4"
  }))))), /*#__PURE__*/React.createElement("button", {
    onClick: handleAddSlot,
    className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mb-6"
  }, /*#__PURE__*/React.createElement(Plus, {
    className: "w-4 h-4"
  }), "Adicionar Hor\xE1rio"), message && /*#__PURE__*/React.createElement("div", {
    className: `
            p-3 rounded-lg text-sm mb-4
            ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}
          `
  }, message.text), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    disabled: saving,
    className: "flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
  }, /*#__PURE__*/React.createElement(Save, {
    className: "w-4 h-4"
  }), saving ? "Salvando..." : "Salvar Configurações"));
}

/**
 * Validar horários
 */
function validateHours(slots) {
  return slots.every(slot => {
    const [startH, startM] = slot.start.split(":").map(Number);
    const [endH, endM] = slot.end.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return startMinutes < endMinutes;
  });
}