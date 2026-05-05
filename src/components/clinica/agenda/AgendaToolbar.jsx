import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  RefreshCcw,
  Users,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useClinic } from '@/contexts/useClinicContext';

export default function AgendaToolbar({
  date,
  setDate,
  viewMode,
  setViewMode,
  onFilterProfessional,
  onFilterStatus,
  reload,
}) {
  const { clinic } = useClinic();
  const [professionals, setProfessionals] = useState([]);

  useEffect(() => {
    const fetchProfessionals = async () => {
      if (!clinic?.id) {
        return;
      }
      const { data } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('clinic_id', clinic.id)
        .eq('active', true)
        .order('name');
      setProfessionals(data || []);
    };
    fetchProfessionals();
  }, [clinic]);

  const handleDateChange = (newDate) => {
    if (newDate) {
      setDate(newDate);
    }
  };

  const navigateDate = (amount) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + amount);
    setDate(newDate);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 border rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={() => setDate(new Date())}>
          Hoje
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select onValueChange={(value) => onFilterProfessional(value === 'all' ? null : value)}>
          <SelectTrigger className="w-[180px]">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Profissional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {professionals.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => onFilterStatus(value === 'all' ? null : value)}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="livre">Livre</SelectItem>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="atendido">Atendido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-md bg-gray-100 p-1">
          <Button
            size="sm"
            variant={viewMode === 'clinica' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('clinica')}
            className="h-8 px-3"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'profissional' ? 'secondary' : 'ghost'}
            onClick={() => setViewMode('profissional')}
            className="h-8 px-3"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" onClick={reload}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
