import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, FileDown, RefreshCw, ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import RepasseCharts from "@/components/financeiro/RepasseCharts";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { saveAs } from "file-saver";
function toCSV(rows, headers) {
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(",")];
  for (const row of rows) {
    csv.push(row.map(escape).join(","));
  }
  return csv.join("\r\n");
}
import { getRepassesReport } from "@/lib/repassesReports";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function RepasseDashboard() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState("__all__");
  const [service, setService] = useState("__all__");
  const [month, setMonth] = useState("__all__");

  /** 🔁 Carrega o relatório via Supabase */
  const loadReport = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const report = await getRepassesReport(clinicId, year);
      setData(report);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Falha ao carregar relatório de repasses.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId, year, toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Unique lists for filters
  const doctorOptions = useMemo(() => {
    const names = new Set();
    (data || []).forEach((r) => {
      const n = r.profissional_nome || r.doctor;
      if (n) names.add(n);
    });
    return Array.from(names).sort();
  }, [data]);

  const serviceOptions = useMemo(() => {
    const names = new Set();
    (data || []).forEach((r) => {
      const n = r.convenio_nome || r.service;
      if (n) names.add(n);
    });
    return Array.from(names).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return (data || []).filter((r) => {
      const d = r.profissional_nome || r.doctor || "";
      const s = r.convenio_nome || r.service || "";
      const m = r.mes || "";
      const okDoctor = doctor === "__all__" || d === doctor;
      const okService = service === "__all__" || s === service;
      const okMonth = month === "__all__" || (m && m === month);
      return okDoctor && okService && okMonth;
    });
  }, [data, doctor, service]);

  // Month options (only when report includes monthly data)
  const monthOptions = useMemo(() => {
    const set = new Set();
    (data || []).forEach((r) => {
      const m = r.mes;
      if (m && m !== "-") set.add(m);
    });
    const arr = Array.from(set);
    // sort by MM/YYYY if possible
    arr.sort((a, b) => {
      const pa = String(a).split("/");
      const pb = String(b).split("/");
      if (pa.length === 2 && pb.length === 2) {
        const ya = Number(pa[1]);
        const yb = Number(pb[1]);
        const ma = Number(pa[0]);
        const mb = Number(pb[0]);
        if (ya !== yb) return ya - yb;
        return ma - mb;
      }
      return String(a).localeCompare(String(b));
    });
    return arr;
  }, [data]);

  const hasMonthly = monthOptions.length > 0;
  const isFallbackDashboard = useMemo(() => {
    // Heuristic: fallback mapping sets mes='-' and includes margin
    if (!data || data.length === 0) return false;
    const allDash = data.every((r) => r.mes === '-' || !r.mes);
    const anyMargin = data.some((r) => typeof r.margin === 'number');
    return allDash && anyMargin;
  }, [data]);

  /** 📄 Exporta os dados em PDF */
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(12);
    const doctorLabel = doctor === "__all__" ? "Todos" : doctor;
    const serviceLabel = service === "__all__" ? "Todos" : service;
    doc.text(`Relatório de Repasses Médicos - ${year}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Filtros: Médico = ${doctorLabel} | Serviço = ${serviceLabel}`, 14, 22);

    const rows = filteredData.map((r) => [
      r.profissional_nome,
      r.convenio_nome || "Particular",
      r.mes,
      r.total_servicos || 1,
      (r.valor_bruto || 0).toFixed(2),
      (r.percentual_repasse || 0) + "%",
      (r.valor_repasse || 0).toFixed(2),
      r.status || "-",
    ]);

    doc.autoTable({
      head: [["Profissional", "Convênio", "Mês", "Serviços", "Bruto (R$)", "% Repasse", "Repasse (R$)", "Status"]],
      body: rows,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 99, 246] },
    });

    doc.save(`repasses_medicos_${year}.pdf`);
  };

  const exportCSV = () => {
    const headers = ["Profissional", "Convênio", "Mês", "Serviços", "Bruto (R$)", "% Repasse", "Repasse (R$)", "Status"];
    const rows = filteredData.map((r) => [
      r.profissional_nome,
      r.convenio_nome || "Particular",
      r.mes,
      r.total_servicos || 1,
      (r.valor_bruto || 0).toFixed(2),
      (r.percentual_repasse || 0) + "%",
      (r.valor_repasse || 0).toFixed(2),
      r.status || "-",
    ]);
    const csv = toCSV(rows, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `repasses_medicos_${year}.csv`);
  };

  return (
    <>
      <Helmet>
        <title>Dashboard de Repasses - Gesclinic Web</title>
      </Helmet>

      <div className="p-0 sm:p-6 space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-2xl font-bold text-[#0B63F6] flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Dashboard de Repasses
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/clinica/financeiro/repasse-medico")}
              className="text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Repasse
            </Button>

            <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Médico */}
            <Select value={doctor} onValueChange={(val) => setDoctor(val)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Médico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os médicos</SelectItem>
                {doctorOptions.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Serviço/Convênio */}
            <Select value={service} onValueChange={(val) => setService(val)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Serviço/Convênio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os serviços</SelectItem>
                {serviceOptions.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadReport} disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Atualizar
            </Button>

            <Button variant="outline" onClick={exportPDF} disabled={data.length === 0}>
              <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
            <Button variant="outline" onClick={exportCSV} disabled={data.length === 0}>
              <FileText className="w-4 h-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        {loading ? (
          <div className="flex justify-center py-10 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando relatório...
          </div>
        ) : (
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-blue-700 text-lg font-semibold">
                Resumo Analítico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters row below header */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {hasMonthly ? (
                  <Select value={month} onValueChange={(val) => setMonth(val)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os meses</SelectItem>
                      {monthOptions.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-xs text-gray-500">
                    Dados agregados por serviço/profissional (sem competência mensal).
                  </div>
                )}
                {isFallbackDashboard && (
                  <div className="text-xs text-amber-600">
                    Usando agregação de repasse vinculada à receita (view repasse_dashboard).
                  </div>
                )}
              </div>
              <RepasseCharts data={filteredData} />

              {/* Total por serviço/convênio (Top 10) */}
              <div className="mt-8">
                <div className="font-semibold text-blue-700 mb-2">Total de Repasse por Serviço/Convênio (Top 10)</div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={(() => {
                      // Agrupa por convenio_nome/service
                      const map = new Map();
                      filteredData.forEach((r) => {
                        const key = r.convenio_nome || r.service || "-";
                        const repasse = Number(r.valor_repasse || r.repasse_total || 0);
                        const bruto = Number(r.valor_bruto || r.revenue_total || 0);
                        const cur = map.get(key) || { servico: key, repasse: 0, bruto: 0 };
                        cur.repasse += repasse;
                        cur.bruto += bruto;
                        map.set(key, cur);
                      });
                      return Array.from(map.values())
                        .sort((a, b) => b.repasse - a.repasse)
                        .slice(0, 10);
                    })()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
                  >
                    <XAxis dataKey="servico" angle={-20} tickMargin={14} height={60} />
                    <YAxis tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} width={100} />
                    <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                    <Legend />
                    <Bar dataKey="repasse" name="Repasse (R$)" fill="#0B63F6" />
                    <Bar dataKey="bruto" name="Bruto (R$)" fill="#64748b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

