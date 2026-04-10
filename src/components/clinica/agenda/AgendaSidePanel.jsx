import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  Users,
  UserCheck,
  AlertCircle,
  Search,
  Calendar,
  Phone,
  MapPin,
  User,
  Activity,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AgendaSidePanel = ({ 
  clinicId, 
  selectedDate, 
  onPatientSelect,
  onSearchResult,
  appointments = []
}) => {
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Carregar fila de espera
  useEffect(() => {
    if (!clinicId) return;
    
    const loadWaitingQueue = async () => {
      try {
        console.log("🏥 === LOADWAITINGQUEUE INICIADO ===");
        console.log("🏥 ClinicId:", clinicId);
        console.log("🏥 SelectedDate:", selectedDate);
        
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            status,
            created_at,
            patient_name:patients!inner(full_name),
            service_name:services(name),
            professional_name:professionals(name)
          `)
          .eq('clinic_id', clinicId)
          .in('status', ['na_recepcao', 'aguardando_atendimento', 'em_consultorio'])
          .gte('start_time', format(selectedDate, 'yyyy-MM-dd'))
          .lt('start_time', format(new Date(selectedDate.getTime() + 24*60*60*1000), 'yyyy-MM-dd'))
          .order('start_time');
          
        console.log("🏥 WaitingQueue - Data:", data, "Error:", error);
        
        if (error) {
          console.error("❌ Erro na query waiting queue:", error);
          setWaitingQueue([]);
          return;
        }
          
        // Processar dados para achatar estrutura
        const processedData = (data || []).map(item => ({
          ...item,
          patient_name: item.patients?.full_name,
          service_name: item.services?.name,
          professional_name: item.professionals?.name,
          patients: undefined,
          services: undefined,
          professionals: undefined,
        }));
        
        console.log("✅ ProcessedData:", processedData);
        setWaitingQueue(processedData);
      } catch (error) {
        console.error('Erro ao carregar fila:', error);
        
        setWaitingQueue([]);
      }
    };

    loadWaitingQueue();
    const interval = setInterval(loadWaitingQueue, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, [clinicId, selectedDate]);

  // Buscar pacientes
  const handleSearch = async () => {
    if (!searchTerm.trim() || !clinicId) return;
    
    setLoading(true);
    try {
      console.log("🔍 === HANDLESEARCH INICIADO ===");
      console.log("🔍 SearchTerm:", searchTerm);
      console.log("🔍 ClinicId:", clinicId);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      // Buscar por nome
      const { data: dataNome, error: errorNome } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          created_at,
          patient_id,
          patient_name:patients!inner(full_name),
          service:services(id,name),
          professional:professionals(id,name),
          patient_phone:patients!inner(telefone_celular),
          payer:payers(id,name)
        `)
        .eq('clinic_id', clinicId)
        .gte('start_time', today.toISOString())
        .ilike('patients.full_name', `%${searchTerm}%`)
        .order('start_time', { ascending: true })
        .limit(20);

      // Buscar por telefone
      const { data: dataTelefone, error: errorTelefone } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          created_at,
          patient_id,
          patient_name:patients!inner(full_name),
          service:services(id,name),
          professional:professionals(id,name),
          patient_phone:patients!inner(telefone_celular),
          payer:payers(id,name)
        `)
        .eq('clinic_id', clinicId)
        .gte('start_time', today.toISOString())
        .ilike('patients.telefone_celular', `%${searchTerm}%`)
        .order('start_time', { ascending: true })
        .limit(20);

      // Combinar resultados e remover duplicados
      const combined = [...(dataNome || []), ...(dataTelefone || [])];
      const uniquePatients = {};
      combined.forEach(item => {
        if (!uniquePatients[item.patient_id] || new Date(item.start_time) < new Date(uniquePatients[item.patient_id].start_time)) {
          uniquePatients[item.patient_id] = item;
        }
      });

      // ...existing code...
      const processedData = Object.values(uniquePatients).map(item => ({
  ...item,
  patient_name: item.patients?.full_name,
  service_name: item.service?.name,
  professional_name: item.professional?.name,
  patient_phone: item.patients?.telefone_celular,
  plan_name: item.plan?.name,
  payer_name: item.payer?.name,
  patients: undefined,
  service: undefined,
  professional: undefined,
  plan: undefined,
  payer: undefined,
      }));
        
      console.log("🔍 Search - Data:", combined, "ErrorNome:", errorNome, "ErrorTelefone:", errorTelefone);
      if (errorNome || errorTelefone) {
        console.error("❌ Erro na busca:", errorNome || errorTelefone);
        setSearchResults([]);
        return;
      }
        
      
      console.log("✅ SearchResults processados:", processedData);
      setSearchResults(processedData);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'na_recepcao': { label: 'Na Recepção', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      'aguardando_atendimento': { label: 'Aguardando', color: 'bg-blue-100 text-blue-800', icon: Clock },
      'em_consultorio': { label: 'Em Consultório', color: 'bg-green-100 text-green-800', icon: UserCheck },
      'confirmado': { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: UserCheck },
      'agendado': { label: 'Agendado', color: 'bg-purple-100 text-purple-800', icon: Calendar },
      'faltou': { label: 'Faltou', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    };
    
    return statusMap[status] || { 
      label: status || 'Agendado', 
      color: 'bg-gray-100 text-gray-800', 
      icon: Calendar 
    };
  };

  const formatTime = (dateTime) => {
    return format(new Date(dateTime), 'HH:mm', { locale: ptBR });
  };

  const formatDate = (dateTime) => {
    return format(new Date(dateTime), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">Painel da Agenda</h3>
        <p className="text-sm text-gray-600">
          {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          
          {/* Fila de Espera */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Fila de Espera
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {waitingQueue.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {waitingQueue.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum paciente na fila
                </p>
              ) : (
                waitingQueue.map((patient) => {
                  const statusInfo = getStatusInfo(patient.status);
                  const Icon = statusInfo.icon;
                  
                  return (
                    <Card 
                      key={patient.id} 
                      className="p-3 hover:shadow-sm cursor-pointer transition-shadow border-l-4 border-l-blue-500"
                      onClick={() => onPatientSelect?.(patient)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {patient.patient_name}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {patient.professional_name}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatTime(patient.start_time)}
                          </span>
                          <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Busca Rápida */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-green-600" />
                Busca Rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-sm h-10 flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="h-10 w-10 p-0 rounded-md bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((result) => (
                    <Card 
                      key={result.id}
                      className="p-2 hover:shadow-sm cursor-pointer transition-shadow"
                      onClick={() => {
                        onSearchResult?.(result);
                        setSearchResults([]);
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">
                            {result.patient_name}
                          </p>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{formatDate(result.start_time)}</span>
                          <span>{formatTime(result.start_time)}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          <b>Serviço:</b> {result.service_name || '-'}<br />
                          <b>Convênio:</b> {result.payer_name || 'Particular'}<br />
                          <b>Profissional:</b> {result.professional_name || '-'}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Secretária */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                Secretária
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => window.dispatchEvent(new CustomEvent('openNewAppointment'))}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {
                  const phone = window.prompt('Digite o telefone do paciente para ligar:');
                  if (phone) window.open(`tel:${phone}`);
                }}
              >
                <Phone className="w-4 h-4 mr-2" />
                Ligar para Paciente
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowAddressModal(true)}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Endereço da Clínica
              </Button>
              <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
                <DialogContent className="app-dialog-shell app-dialog-shell--compact">
                  <DialogHeader>
                    <DialogTitle>Endereço da Clínica</DialogTitle>
                  </DialogHeader>
                  <div className="text-base text-gray-700">
                    Rua Exemplo, 123 - Centro, Cidade/UF
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Disponibilidade */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Horários Livres</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {appointments.filter(a => a.status === 'disponivel').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Agendados</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {appointments.filter(a => {
                      const s = String(a.status).toLowerCase();
                      return s === 'agendado' || s === 'confirmado' || s === 'scheduled';
                    }).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Encaixes</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    {appointments.filter(a => a.status === 'encaixe').length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
        </div>
      </ScrollArea>
    </div>
  );
};

export default AgendaSidePanel;