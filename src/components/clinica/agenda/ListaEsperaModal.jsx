import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";

export default function ListaEsperaModal({ open, onClose, profissionalId, onAgendar }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!profissionalId || !open) return;
      setLoading(true);
      const { data, error } = await supabase.rpc("get_waiting_list_by_professional", {
        p_professional_id: profissionalId,
      });

      if (error) {
        toast({ title: "Erro ao carregar lista de espera", description: error.message, variant: "destructive" });
      } else {
        setLista(data || []);
      }
      setLoading(false);
    };
    load();
  }, [profissionalId, open, toast]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Lista de Espera</DialogTitle>
        </DialogHeader>

        <div className="border rounded-md overflow-y-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Paciente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Convênio</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan="5" className="text-center py-4">Carregando...</TableCell></TableRow>
              ) : lista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="5" className="text-center text-gray-500 py-4">
                    Nenhum paciente na lista de espera para este profissional.
                  </TableCell>
                </TableRow>
              ) : (
                lista.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.patient_name}</TableCell>
                    <TableCell>{item.phone}</TableCell>
                    <TableCell>{item.payer_name}</TableCell>
                    <TableCell>{item.service_name}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAgendar(item)}
                      >
                        <Clock size={14} className="mr-1" /> Agendar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}