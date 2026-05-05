import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileDown, History, Loader2, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/components/ui/use-toast';

export default function RepasseHistorico() {
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const formatPaymentMethod = (method) => {
    if (!method) {
      return null;
    }
    const lower = String(method).toLowerCase();
    const paymentMethods = {
      debito: 'Débito',
      credito: 'Crédito',
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      ted: 'TED',
      cheque: 'Cheque',
      cartao: 'Cartão',
      cartão: 'Cartão',
      transferencia: 'Transferência',
      transferência: 'Transferência',
      vale: 'Vale',
      outro: 'Outro',
      deposito: 'Depósito',
      depósito: 'Depósito',
      boleto: 'Boleto',
      doc: 'DOC',
    };
    return paymentMethods[lower] || method;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('doctor_commission_history')
      .select('*, professional:professionals(name)')
      .eq('reference_month', month)
      .eq('reference_year', year)
      .order('paid_at', { ascending: false });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setRows(data || []);
      if (!data || data.length === 0) {
        toast({
          title: 'Nenhum resultado',
          description: 'Não há repasses pagos para este período.',
        });
      }
    }
  }, [month, year, toast]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Profissional: r.professional?.name,
        'Mês Referência': r.reference_month,
        'Ano Referência': r.reference_year,
        'Valor (R$)': r.amount,
        'Método Pagamento': formatPaymentMethod(r.payment_method),
        'Data Pagamento': new Date(r.paid_at).toLocaleDateString('pt-BR'),
        Observações: r.notes,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico de Repasses');
    XLSX.writeFile(wb, `historico_repasses_${month}_${year}.xlsx`);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-700 flex items-center gap-2">
            <History /> Histórico de Repasses Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              className="max-w-[150px]"
              placeholder="Mês (1–12)"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <Input
              className="max-w-[150px]"
              placeholder="Ano"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <Button onClick={loadData} className="bg-blue-600 text-white" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <Search size={16} className="mr-2" />
              )}
              Filtrar
            </Button>
            <Button variant="outline" onClick={exportExcel} disabled={rows.length === 0}>
              <FileDown size={16} className="mr-2" /> Exportar
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Mês/Ano</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead>Obs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.professional?.name}</TableCell>
                    <TableCell>
                      {r.reference_month}/{r.reference_year}
                    </TableCell>
                    <TableCell className="text-right">R$ {Number(r.amount).toFixed(2)}</TableCell>
                    <TableCell>{formatPaymentMethod(r.payment_method)}</TableCell>
                    <TableCell>{new Date(r.paid_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{r.notes}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
