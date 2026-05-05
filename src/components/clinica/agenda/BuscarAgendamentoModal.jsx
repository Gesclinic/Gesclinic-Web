import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function BuscarAgendamentoModal({ open, onClose, onSelect }) {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({ paciente: '', profissional: '', data: '' });
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBuscar = async () => {
    setLoading(true);
    let clinicId;
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('default_clinic_id')
        .eq('id', user.id)
        .single();
      clinicId = profileData?.default_clinic_id;
    }

    if (!clinicId) {
      toast({ title: 'Erro', description: 'Clínica não encontrada.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc('list_appointments_enhanced', {
      p_clinic_id: clinicId,
      p_start_date: filtros.data || new Date(0).toISOString(),
      p_end_date: filtros.data
        ? new Date(new Date(filtros.data).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : new Date().toISOString(),
      p_professional_id: null,
      p_status: null,
    });

    if (error) {
      toast({ title: 'Erro na busca', description: error.message, variant: 'destructive' });
    } else {
      setResultados(data || []);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Buscar Agendamento</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <Input
            placeholder="Nome do Paciente ou Profissional"
            value={filtros.paciente}
            onChange={(e) =>
              setFiltros({ ...filtros, paciente: e.target.value, profissional: e.target.value })
            }
            className="flex-grow"
          />
          <Input
            type="date"
            value={filtros.data}
            onChange={(e) => setFiltros({ ...filtros, data: e.target.value })}
            className="w-auto"
          />
          <Button onClick={handleBuscar} disabled={loading}>
            <Search size={16} className="mr-2" /> {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        <div className="border rounded-md overflow-y-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Data</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultados.map((r) => (
                <TableRow
                  key={r.id}
                  className="hover:bg-blue-50 cursor-pointer"
                  onClick={() => {
                    onSelect(r);
                    onClose();
                  }}
                >
                  <TableCell>{new Date(r.start_time).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    {new Date(r.start_time).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    h
                  </TableCell>
                  <TableCell>{r.patient_name}</TableCell>
                  <TableCell>{r.professional_name}</TableCell>
                  <TableCell>{r.service_name}</TableCell>
                  <TableCell>{r.status}</TableCell>
                </TableRow>
              ))}
              {resultados.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
