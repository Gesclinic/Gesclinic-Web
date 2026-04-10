import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, PlusCircle } from "lucide-react";

// 👇 Em um projeto real, isso vem do Supabase
// Mas aqui deixei estático para funcionar imediatamente
const MOCK_SERVICES = [
  { id: "srv1", name: "Consulta" },
  { id: "srv2", name: "Retorno" },
  { id: "srv3", name: "Avaliação" },
  { id: "srv4", name: "Terapia" },
];

export default function ServiceManager({ value = [], onChange }) {
  const [serviceList, setServiceList] = useState(value);

  // Atualiza quando vier do formulário externo
  useEffect(() => {
    setServiceList(value);
  }, [value]);

  // Atualiza o form pai
  const updateParent = (updated) => {
    setServiceList(updated);
    if (onChange) onChange(updated);
  };

  const addService = () => {
    const newItem = {
      serviceId: "",
      price: "",
      duration: "",
      active: true,
    };
    updateParent([...serviceList, newItem]);
  };

  const updateItem = (index, field, val) => {
    const updated = [...serviceList];
    updated[index][field] = val;
    updateParent(updated);
  };

  const removeItem = (index) => {
    const updated = serviceList.filter((_, i) => i !== index);
    updateParent(updated);
  };

  return (
    <div className="space-y-4">

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Serviços do Profissional</h3>

        <Button onClick={addService}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Adicionar Serviço
        </Button>
      </div>

      {/* LISTAGEM */}
      {serviceList.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum serviço adicionado.</p>
      )}

      {serviceList.map((item, index) => (
        <Card key={index} className="p-4 space-y-3 border rounded-lg shadow-sm">

          {/* Seleção do serviço */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <div>
              <label className="text-sm font-medium">Serviço</label>
              <Select
                value={item.serviceId}
                onValueChange={(v) => updateItem(index, "serviceId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_SERVICES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preço */}
            <div>
              <label className="text-sm font-medium">Preço (R$)</label>
              <Input
                type="number"
                value={item.price}
                onChange={(e) => updateItem(index, "price", e.target.value)}
                placeholder="0,00"
              />
            </div>

            {/* Duração */}
            <div>
              <label className="text-sm font-medium">Duração (min)</label>
              <Input
                type="number"
                value={item.duration}
                onChange={(e) => updateItem(index, "duration", e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          {/* Linha inferior */}
          <div className="flex justify-between items-center">

            {/* Status */}
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={item.active ? "1" : "0"}
                onValueChange={(v) => updateItem(index, "active", v === "1")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ativo</SelectItem>
                  <SelectItem value="0">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Remover */}
            <Button variant="destructive" onClick={() => removeItem(index)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          </div>

        </Card>
      ))}
    </div>
  );
}
