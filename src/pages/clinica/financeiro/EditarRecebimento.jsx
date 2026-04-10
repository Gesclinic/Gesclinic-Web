import React, { useEffect, useState } from "react";
import PageLayout from "@/components/ui/PageLayout";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { getReceivableById, updateReceivable } from "@/lib/receivablesApi";
import { listAccountPlans, listCostCenters } from "@/lib/financeApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EditarRecebimento() {
  const { clinicId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [costCenters, setCostCenters] = useState([]);

  useEffect(() => {
    if (!clinicId || !id) return;
    setLoading(true);
    (async () => {
      try {
        const rec = await getReceivableById(id);
        setData(rec);
        const ps = await listAccountPlans(clinicId);
        setPlans(ps || []);
        const cs = await listCostCenters(clinicId);
        setCostCenters(cs || []);
      } catch (e) {
        setError(e?.message || "Erro ao carregar recebível");
      } finally {
        setLoading(false);
      }
    })();
  }, [clinicId, id]);

  const handleChange = (field, value) => {
    setData(d => ({ ...d, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateReceivable(id, {
        descricao: data.descricao,
        valor_bruto: Number(data.valor_bruto),
        descontos: Number(data.descontos),
        plano_contas_id: data.plano_contas_id || null,
        centro_custo_id: data.centro_custo_id || null,
        data_vencimento: data.data_vencimento,
      });
      navigate(-1);
    } catch (e) {
      setError(e?.message || "Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLayout title="Editar Recebimento"><div>Carregando...</div></PageLayout>;
  if (error) return <PageLayout title="Editar Recebimento"><div className="text-red-500">{error}</div></PageLayout>;
  if (!data) return null;

  return (
    <PageLayout title="Editar Recebimento">
      <div className="w-full mx-auto bg-white p-6 rounded shadow">
        <div className="mb-4">
          <label className="block mb-1">Descrição</label>
          <Input value={data.descricao || ""} onChange={e => handleChange("descricao", e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Valor Bruto</label>
          <Input type="number" value={data.valor_bruto || ""} onChange={e => handleChange("valor_bruto", e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Descontos</label>
          <Input type="number" value={data.descontos || ""} onChange={e => handleChange("descontos", e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Plano de Contas</label>
          <select className="border rounded h-9 px-2 w-full" value={data.plano_contas_id || ""} onChange={e => handleChange("plano_contas_id", e.target.value)}>
            <option value="">Selecione</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block mb-1">Centro de Custo</label>
          <select className="border rounded h-9 px-2 w-full" value={data.centro_custo_id || ""} onChange={e => handleChange("centro_custo_id", e.target.value)}>
            <option value="">Selecione</option>
            {costCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block mb-1">Data de Vencimento</label>
          <Input type="date" value={data.data_vencimento ? data.data_vencimento.slice(0,10) : ""} onChange={e => handleChange("data_vencimento", e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
        </div>
      </div>
    </PageLayout>
  );
}

