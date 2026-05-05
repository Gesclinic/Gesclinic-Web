import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Professional {
  professional_id: string;
  professional_name: string;
  total: number;
  count: number;
}

interface CashProfessionalsTableProps {
  professionals: Professional[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const CashProfessionalsTable: React.FC<CashProfessionalsTableProps> = ({
  professionals,
  loading = false,
}) => {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">👨‍⚕️</span>
          Profissionais ({professionals.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Nenhum profissional encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100">
                  <TableHead className="font-semibold text-slate-700">Profissional</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    Atendimentos
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    Total Faturado
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    Ticket Médio
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.map((prof, index) => (
                  <TableRow
                    key={prof.professional_id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium text-slate-900">{prof.professional_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                        {prof.count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {formatCurrency(prof.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-slate-600">
                        {formatCurrency(prof.count > 0 ? prof.total / prof.count : 0)}
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
