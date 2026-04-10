import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

function currency(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * RepasseCharts
 * Mostra visão resumida (KPIs) e um gráfico de barras por profissional.
 * Aceita dados já consolidados por getRepassesReport (com possíveis fallbacks).
 */
export default function RepasseCharts({ data = [] }) {
  const summary = useMemo(() => {
    const totalBruto = data.reduce((acc, r) => acc + Number(r.valor_bruto || r.revenue_total || 0), 0);
    const totalRepasse = data.reduce((acc, r) => acc + Number(r.valor_repasse || r.repasse_total || 0), 0);
    const margem = totalBruto - totalRepasse;
    const percRepasse = totalBruto > 0 ? (totalRepasse / totalBruto) * 100 : 0;
    return { totalBruto, totalRepasse, margem, percRepasse };
  }, [data]);

  // Agrupa por profissional
  const byDoctor = useMemo(() => {
    const map = new Map();
    data.forEach((r) => {
      const name = r.profissional_nome || r.doctor || "-";
      const bruto = Number(r.valor_bruto || r.revenue_total || 0);
      const repasse = Number(r.valor_repasse || r.repasse_total || 0);
      const margin = typeof r.margin === "number" ? r.margin : bruto - repasse;
      const cur = map.get(name) || { profissional: name, bruto: 0, repasse: 0, margem: 0 };
      cur.bruto += bruto;
      cur.repasse += repasse;
      cur.margem += margin;
      map.set(name, cur);
    });

    // Top 10 por repasse
    return Array.from(map.values())
      .sort((a, b) => b.repasse - a.repasse)
      .slice(0, 10);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-500">Nenhum dado para exibir. Gere ou atualize o relatório.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Receita Bruta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{currency(summary.totalBruto)}</div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Total Repasse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{currency(summary.totalRepasse)}</div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Margem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{currency(summary.margem)}</div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">% Repasse / Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{summary.percRepasse.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico por médico (Repasse) */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-blue-700">Repasse por Profissional (Top 10)</CardTitle>
        </CardHeader>
        <CardContent style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={byDoctor} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
              <XAxis dataKey="profissional" angle={-20} tickMargin={14} height={60} />
              <YAxis tickFormatter={(v) => currency(v)} width={100} />
              <Tooltip formatter={(value) => currency(value)} />
              <Legend />
              <Bar dataKey="repasse" name="Repasse (R$)" fill="#0B63F6" />
              <Bar dataKey="margem" name="Margem (R$)" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
