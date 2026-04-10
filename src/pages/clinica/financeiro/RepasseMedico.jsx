import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  calculateAutomaticRepasse,
  generateRepasseReport,
  getProfessionalRepasseRules,
  formatCurrency,
} from "@/lib/financeIntegrationApi";
import { RulesAlert, RulesSummaryCard } from "@/components/RulesAlert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Settings,
  DollarSign,
  FileDown,
  BarChart3,
  TrendingUp,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

export default function RepasseMedico() {
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const { toast } = useToast();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState("atendido");
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCommissions = useCallback(async () => {
    if (!clinicId || !month || !year) return;
    
    console.log("🔍 [REPASSE] Buscando comissões com filtros:", {
      clinicId,
      reference_month: month,
      reference_year: year,
      calc_mode: mode,
    });
    
    setLoading(true);
    const { data, error } = await supabase
      .from("doctor_commissions")
      .select("*, professional:professionals(name)")
      .eq("clinic_id", clinicId)
      .eq("reference_month", month)
      .eq("reference_year", year)
      .eq("calc_mode", mode)
      .order("professional(name)");

    setLoading(false);
    
    if (error) {
      console.error("❌ [REPASSE] Erro ao buscar comissões:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log("✅ [REPASSE] Comissões recuperadas:", {
        count: data?.length || 0,
        dados: data || [],
      });
      setCommissions(data || []);
    }
  }, [clinicId, month, year, mode, toast]);

  // Calculate total amounts for summary cards
  const summaryRepasse = useMemo(() => {
    const totalBruto = commissions.reduce((sum, c) => sum + (Number(c.total_bruto) || 0), 0);
    const totalRepasse = commissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalLiquido = commissions.reduce((sum, c) => sum + (Number(c.net_amount) || 0), 0);
    const paidCount = commissions.filter(c => (c.status || '').toLowerCase() === 'paid').length;
    const pendingCount = commissions.filter(c => (c.status || '').toLowerCase() !== 'paid').length;
    return { totalBruto, totalRepasse, totalLiquido, paidCount, pendingCount, count: commissions.length };
  }, [commissions]);

  const handleGenerate = async () => {
    console.log("🚀 [REPASSE] Iniciando geração com parâmetros:", {
      clinicId,
      p_month: month,
      p_year: year,
      p_mode: mode,
    });
    
    setLoading(true);
    const { error: rpcError } = await supabase.rpc(
      "generate_doctor_commissions_v2",
      {
        p_clinic_id: clinicId,
        p_month: month,
        p_year: year,
        p_mode: mode,
      }
    );
    setLoading(false);

    if (rpcError) {
      console.error("❌ [REPASSE] Erro na RPC generate_doctor_commissions_v2:", {
        error: rpcError.message,
        details: rpcError,
      });
      toast({
        title: "Erro ao gerar",
        description: rpcError.message,
        variant: "destructive",
      });
    } else {
      console.log("✅ [REPASSE] RPC executada com sucesso. Refreshing comissões...");
      toast({
        title: "Sucesso",
        description: `Repasse (${mode}) gerado/atualizado.`,
      });
      fetchCommissions();
    }
  };

  const handlePay = async (commissionId) => {
    setLoading(true);
    const { error } = await supabase.rpc("record_commission_payment", {
      p_commission_id: commissionId,
      p_payment_method: "PIX",
      p_notes: "Pagamento via painel",
    });
    setLoading(false);
    if (error) {
      toast({
        title: "Erro ao pagar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso.",
      });
      fetchCommissions();
    }
  };

  // ETAPA 5.2: Gerar relatório de repasse usando integração
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os profissionais da clínica
      const { data: professionals } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("clinic_id", clinicId)
        .eq("active", true);

      if (!professionals || professionals.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum profissional ativo encontrado",
          variant: "destructive",
        });
        return;
      }

      // Gerar relatório para cada profissional
      const reports = await Promise.all(
        professionals.map((prof) =>
          generateRepasseReport(clinicId, prof.id, {
            startDate: `${year}-${String(month).padStart(2, "0")}-01`,
            endDate: `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`,
          })
        )
      );

      // Consolidar relatórios
      const totalRepasse = reports.reduce((sum, r) => sum + r.totalRepasse, 0);
      const totalAppointments = reports.reduce((sum, r) => sum + r.totalAppointments, 0);

      toast({
        title: "Relatório Gerado",
        description: `${totalAppointments} atendimentos | Repasse: ${formatCurrency(totalRepasse)}`,
      });

      console.log("📊 Relatório de Repasses:", {
        period: `${month}/${year}`,
        totalAppointments,
        totalRepasse,
        byProfessional: reports,
      });

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar relatório",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("📍 [REPASSE] useEffect acionado. Fetching commissions...");
    fetchCommissions();
    
    // Debug: Check all doctor_commissions for this clinic
    (async () => {
      const { data: allComms } = await supabase
        .from("doctor_commissions")
        .select("*")
        .eq("clinic_id", clinicId);
      
      console.log("📊 [REPASSE] DEBUG - Todas as comissões na clínica:", {
        totalCount: allComms?.length || 0,
        registros: allComms || [],
      });
    })();
  }, [fetchCommissions, clinicId]);

  const exportExcel = () => {
    const dataToExport = commissions.map((r) => ({
      Profissional: r.professional?.name,
      "Mês/Ano": `${r.reference_month}/${r.reference_year}`,
      "Modo Cálculo": r.calc_mode,
      Serviços: r.total_services,
      "Valor Bruto (R$)": r.gross_amount,
      "Recebido (R$)": r.total_paid,
      "Pendente (R$)": r.total_pending,
      "% Repasse": r.commission_percent,
      "Valor Líquido (R$)": r.net_amount,
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Repasse Médico");
    XLSX.writeFile(wb, `repasse_medico_${month}_${year}.xlsx`);
  };

  const totalGross = commissions.reduce(
    (acc, r) => acc + (r.gross_amount || 0),
    0
  );
  const totalNet = commissions.reduce(
    (acc, r) => acc + (r.net_amount || 0),
    0
  );

  return (
    <div className="p-6 space-y-4">
      {/* 🏥 ETAPA 6: Alerta de Regras Incompletas */}
      <RulesAlert />

      {/* 📊 RESUMO VISUAL */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bruto</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summaryRepasse.totalBruto)}</p>
              <p className="text-xs text-gray-500 mt-1">{summaryRepasse.count} profissionais</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Repasse Médico</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(summaryRepasse.totalRepasse)}</p>
              <p className="text-xs text-gray-500 mt-1">70% para prof.</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pagos</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{summaryRepasse.paidCount}</p>
              <p className="text-xs text-gray-500 mt-1">de {summaryRepasse.count}</p>
            </div>
            <Check className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{summaryRepasse.pendingCount}</p>
              <p className="text-xs text-gray-500 mt-1">a pagar</p>
            </div>
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-blue-700 flex items-center gap-2">
            <DollarSign /> Repasse Médico
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/clinica/financeiro/repasse-dashboard")}
              className="text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              <BarChart3 className="w-4 h-4 mr-1" /> Ver Dashboard
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4 items-end">
            <Input
              className="max-w-[150px]"
              type="number"
              placeholder="Mês"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <Input
              className="max-w-[150px]"
              type="number"
              placeholder="Ano"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <Select onValueChange={setMode} value={mode}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Modo de cálculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atendido">
                  Por Atendimentos Realizados (Produção)
                </SelectItem>
                <SelectItem value="recebido">
                  Por Pagamentos Recebidos (Caixa)
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 text-white"
            >
              {loading ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Settings size={16} className="mr-2" />
              )}
              {loading ? "Gerando..." : `Gerar Repasse`}
            </Button>
            <Button variant="outline" onClick={fetchCommissions} disabled={loading}>
              <Search size={16} className="mr-2" /> Buscar
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateReport}
              disabled={loading}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              <BarChart3 size={16} className="mr-2" /> Relatório Inteligente
            </Button>
            <Button
              variant="outline"
              onClick={exportExcel}
              disabled={commissions.length === 0}
            >
              <FileDown size={16} className="mr-2" /> Exportar Excel
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-center">Serviços</TableHead>
                <TableHead className="text-right">Bruto (R$)</TableHead>
                <TableHead className="text-right">Recebido (R$)</TableHead>
                <TableHead className="text-right">Pendente (R$)</TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead className="text-right">Líquido (R$)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24">
                    <Loader2 className="mx-auto my-4 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && commissions.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                    Nenhum dado encontrado. Tente gerar o repasse.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                commissions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.professional?.name || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.total_services}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {Number(r.gross_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {Number(r.total_paid).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {Number(r.total_pending).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.commission_percent}%
                    </TableCell>
                    <TableCell className="font-bold text-right">
                      R$ {Number(r.net_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "pago" ? "success" : "outline"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status !== "pago" && (
                        <Button
                          size="sm"
                          onClick={() => handlePay(r.id)}
                          disabled={loading}
                        >
                          Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2}>Totais</TableCell>
                <TableCell className="text-right">
                  R$ {totalGross.toFixed(2)}
                </TableCell>
                <TableCell colSpan={3}></TableCell>
                <TableCell className="text-right">
                  R$ {totalNet.toFixed(2)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

