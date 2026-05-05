import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableHeader,
} from '@/components/ui/table';
import { BarChart2, FileText, Activity, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MedicoDashboard() {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      const professionalId = user.id;

      const { data: apptData, error: apptError } = await supabase
        .from('appointments_with_fit')
        .select('id, start_time, patient_name, service_name, price, status')
        .eq('professional_id', professionalId)
        .order('start_time', { ascending: false })
        .limit(10);

      if (apptError) {
        console.error('Error loading appointments:', apptError);
      } else {
        setAppointments(apptData || []);
      }

      const { data: commData, error: commError } = await supabase
        .from('doctor_commissions')
        .select('reference_month, reference_year, net_amount, status')
        .eq('professional_id', professionalId)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false });

      if (commError) {
        console.error('Error loading commissions:', commError);
      } else {
        setCommissions(commData || []);
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Portal do Médico</h1>
        <div className="text-right">
          <p className="font-semibold text-lg">{profile?.full_name}</p>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Activity /> Meus Atendimentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.start_time).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{a.patient_name}</TableCell>
                      <TableCell>{a.service_name}</TableCell>
                      <TableCell className="text-right">{a.price?.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge>{a.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <FileText /> Meus Repasses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead className="text-right">Valor Líquido (R$)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {String(c.reference_month).padStart(2, '0')}/{c.reference_year}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {c.net_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.status === 'pago' ? 'success' : 'outline'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
