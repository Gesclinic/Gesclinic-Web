import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, User, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HistoricoAgendamentosModal({ open, onClose }) {
  const [historico, setHistorico] = useState([]);
  const [filtros, setFiltros] = useState({
    periodo: '30',
    status: 'todos',
    profissional: 'todos',
  });
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (open) {
      loadHistorico();
    }
  }, [open]);

  const loadHistorico = async () => {
    try {
      // Carregar histórico real da API
      // TODO: Implementar chamada para a API de agendamentos históricos
      setHistorico([]);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setHistorico([]);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      realizado: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
      reagendado: 'bg-orange-100 text-orange-800',
      faltou: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      realizado: 'Realizado',
      cancelado: 'Cancelado',
      reagendado: 'Reagendado',
      faltou: 'Faltou',
    };

    return (
      <Badge variant="secondary" className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const historicoFiltrado = historico.filter((item) => {
    const matchBusca =
      !busca ||
      item.paciente.toLowerCase().includes(busca.toLowerCase()) ||
      item.profissional.toLowerCase().includes(busca.toLowerCase()) ||
      item.procedimento.toLowerCase().includes(busca.toLowerCase());

    const matchStatus = filtros.status === 'todos' || item.status === filtros.status;
    const matchProfissional =
      filtros.profissional === 'todos' || item.profissional === filtros.profissional;

    return matchBusca && matchStatus && matchProfissional;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Agendamentos
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar por paciente, profissional ou procedimento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <Select
            value={filtros.periodo}
            onValueChange={(v) => setFiltros({ ...filtros, periodo: v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filtros.status}
            onValueChange={(v) => setFiltros({ ...filtros, status: v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="reagendado">Reagendado</SelectItem>
              <SelectItem value="faltou">Faltou</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filtros.profissional}
            onValueChange={(v) => setFiltros({ ...filtros, profissional: v })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos profissionais</SelectItem>
              <SelectItem value="Dr. João Santos">Dr. João Santos</SelectItem>
              <SelectItem value="Dra. Ana Costa">Dra. Ana Costa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Histórico */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {historicoFiltrado.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nenhum agendamento encontrado</p>
            </div>
          ) : (
            historicoFiltrado.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{item.paciente}</span>
                        {getStatusBadge(item.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(item.data, 'dd/MM/yyyy', { locale: ptBR })} às {item.hora}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{item.profissional}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{item.procedimento}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-600">{item.valor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary Footer */}
        <div className="border-t pt-4 flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Mostrando {historicoFiltrado.length} de {historico.length} registros
          </span>
          <div className="flex gap-4">
            <Button variant="outline" size="sm">
              Exportar Excel
            </Button>
            <Button variant="outline" size="sm">
              Imprimir Relatório
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
