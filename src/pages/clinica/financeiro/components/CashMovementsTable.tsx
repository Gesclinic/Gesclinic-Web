import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CashMovement {
  id: string;
  type: 'entrada' | 'saida';
  amount: number;
  created_at: string;
  patient?: { name: string };
  professional?: { name: string };
  payment_method?: string;
  origin: 'manual' | 'agenda';
  status: string;
  payer?: { name: string };
}

interface CashMovementsTableProps {
  movements: CashMovement[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: string) => {
  if (!date) {
    return '—';
  }
  try {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export const CashMovementsTable: React.FC<CashMovementsTableProps> = ({
  movements,
  loading = false,
}) => {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">📝</span>
          Movimentos ({movements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Nenhum movimento encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100">
                  <TableHead className="font-semibold text-slate-700">Data</TableHead>
                  <TableHead className="font-semibold text-slate-700">Paciente</TableHead>
                  <TableHead className="font-semibold text-slate-700">Profissional</TableHead>
                  <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                  <TableHead className="font-semibold text-slate-700">Convênio</TableHead>
                  <TableHead className="font-semibold text-slate-700">Forma Pagamento</TableHead>
                  <TableHead className="font-semibold text-slate-700">Origem</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mov) => (
                  <TableRow
                    key={mov.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition"
                  >
                    <TableCell className="text-sm text-slate-600">
                      {formatDate(mov.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {mov.patient?.name || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {mov.professional?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={mov.type === 'entrada' ? 'default' : 'destructive'}
                        className={
                          mov.type === 'entrada'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }
                      >
                        {mov.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {mov.payer?.name || 'Particular'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {mov.payment_method || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={mov.origin === 'agenda' ? 'secondary' : 'outline'}
                        className={
                          mov.origin === 'agenda'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }
                      >
                        {mov.origin === 'agenda' ? '📅 Agenda' : '✏️ Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-right">
                      <span className={mov.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                        {mov.type === 'entrada' ? '+' : '-'}
                        {formatCurrency(mov.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
