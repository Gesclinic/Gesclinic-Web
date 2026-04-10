import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import {
  Clock,
  User,
  Phone,
  UserCheck,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import {
  APPOINTMENT_STATUS,
  getStatusColor,
  getStatusLabel
} from "@/constants/appointmentStatus";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Funções auxiliares
const getWaitingTime = (arrivalTime) => {
  if (!arrivalTime) return 'Recém chegou';
  
  try {
    return formatDistanceToNow(new Date(arrivalTime), {
      locale: ptBR,
      addSuffix: true
    });
  } catch {
    return 'Tempo indefinido';
  }
};

const getPriorityColor = (priority, arrivalTime) => {
  if (priority === 'urgent') return 'border-l-red-500 bg-red-50';
  
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (new Date(arrivalTime) < thirtyMinutesAgo) {
      return 'border-l-orange-500 bg-orange-50';
    }
  } catch {
    // ignore
  }
  
  return 'border-l-blue-500 bg-blue-50';
};

/**
 * Componente da Fila de Espera - mostra pacientes aguardando atendimento
 */
export default function WaitingQueue({ 
  clinicId, 
  onPatientCall,
  onStatusUpdate,
  refreshInterval = 30000 // 30 segundos
}) {
  const { toast } = useToast();
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  // Buscar pacientes na fila
  const fetchWaitingPatients = async () => {
    if (!clinicId) return;
    
    setLoading(true);
    try {
      // Buscar pacientes com status na_recepcao, no_guiche, presente
      const waitingStatuses = [
        APPOINTMENT_STATUS.NA_RECEPCAO,
        APPOINTMENT_STATUS.NO_GUICHE,
        APPOINTMENT_STATUS.PRESENTE
      ];

      // Simulação - substituir pela API real
      const mockPatients = [
        {
          id: '1',
          patient_name: 'Maria Silva Santos',
          professional_name: 'Dr. João Cardiologia',
          scheduled_time: '2025-10-30T14:30:00Z',
          arrival_time: '2025-10-30T14:25:00Z',
          status: APPOINTMENT_STATUS.NA_RECEPCAO,
          service_name: 'Consulta Cardiologia',
          has_insurance: true,
          priority: 'normal'
        },
        {
          id: '2',
          patient_name: 'Pedro Santos Lima',
          professional_name: 'Dra. Ana Pediatria',
          scheduled_time: '2025-10-30T15:00:00Z',
          arrival_time: '2025-10-30T14:55:00Z',
          status: APPOINTMENT_STATUS.NO_GUICHE,
          service_name: 'Consulta Pediatria',
          has_insurance: false,
          priority: 'urgent'
        }
      ];

      setWaitingPatients(mockPatients);
    } catch (error) {
      console.error('Erro ao buscar fila:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a fila de espera.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh automático
  useEffect(() => {
    fetchWaitingPatients();
    const interval = setInterval(fetchWaitingPatients, refreshInterval);
    return () => clearInterval(interval);
  }, [clinicId, refreshInterval]);

  // Chamar paciente
  const handleCallPatient = async (patient) => {
    try {
      await onPatientCall(patient.id);
      await onStatusUpdate(patient.id, APPOINTMENT_STATUS.EM_CONSULTORIO);
      toast({
        title: "Paciente chamado",
        description: `${patient.patient_name} foi chamado para o consultório.`
      });
      fetchWaitingPatients();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível chamar o paciente.",
        variant: "destructive"
      });
    }
  };



  const groupedPatients = {
    [APPOINTMENT_STATUS.NA_RECEPCAO]: waitingPatients.filter(p => p.status === APPOINTMENT_STATUS.NA_RECEPCAO),
    [APPOINTMENT_STATUS.NO_GUICHE]: waitingPatients.filter(p => p.status === APPOINTMENT_STATUS.NO_GUICHE),
    [APPOINTMENT_STATUS.PRESENTE]: waitingPatients.filter(p => p.status === APPOINTMENT_STATUS.PRESENTE)
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Fila de Espera</h2>
          <Badge variant="secondary">
            {waitingPatients.length} paciente(s)
          </Badge>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchWaitingPatients}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Na Recepção */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              {getStatusLabel(APPOINTMENT_STATUS.NA_RECEPCAO)}
              <Badge variant="secondary" className="ml-auto">
                {groupedPatients[APPOINTMENT_STATUS.NA_RECEPCAO].length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {groupedPatients[APPOINTMENT_STATUS.NA_RECEPCAO].map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onCall={handleCallPatient}
                    showCallButton={false}
                  />
                ))}
                {groupedPatients[APPOINTMENT_STATUS.NA_RECEPCAO].length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum paciente na recepção
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* No Guichê */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              {getStatusLabel(APPOINTMENT_STATUS.NO_GUICHE)}
              <Badge variant="secondary" className="ml-auto">
                {groupedPatients[APPOINTMENT_STATUS.NO_GUICHE].length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {groupedPatients[APPOINTMENT_STATUS.NO_GUICHE].map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onCall={handleCallPatient}
                    showCallButton={false}
                  />
                ))}
                {groupedPatients[APPOINTMENT_STATUS.NO_GUICHE].length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum paciente no guichê
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Presentes - Aguardando Chamada */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              {getStatusLabel(APPOINTMENT_STATUS.PRESENTE)}
              <Badge variant="secondary" className="ml-auto">
                {groupedPatients[APPOINTMENT_STATUS.PRESENTE].length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {groupedPatients[APPOINTMENT_STATUS.PRESENTE].map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onCall={handleCallPatient}
                    showCallButton={true}
                  />
                ))}
                {groupedPatients[APPOINTMENT_STATUS.PRESENTE].length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum paciente aguardando
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Card individual de paciente na fila
 */
function PatientCard({ patient, onCall, showCallButton }) {
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  return (
    <div className={`p-3 rounded-lg border-l-4 ${getPriorityColor(patient.priority, patient.arrival_time)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
              {getInitials(patient.patient_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-1">
            <p className="font-medium text-sm">{patient.patient_name}</p>
            <p className="text-xs text-muted-foreground">{patient.professional_name}</p>
            <p className="text-xs text-muted-foreground">{patient.service_name}</p>
            
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3 h-3" />
              <span>Aguarda: {getWaitingTime(patient.arrival_time)}</span>
            </div>

            {patient.has_insurance && (
              <Badge variant="outline" className="text-xs">
                Convênio
              </Badge>
            )}

            {patient.priority === 'urgent' && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">Urgente</span>
              </div>
            )}
          </div>
        </div>

        {showCallButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCall(patient)}
            className="h-8 w-8 p-0"
          >
            <Phone className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}