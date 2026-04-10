// === PACIENTEDETALHE.JSX — VERSÃO FINAL CORRIGIDA ===

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, CalendarDays, User, Mail, MapPin, Pencil } from "lucide-react";
import { getPatientById } from "@/lib/patientsApi";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PacienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carregar paciente
  useEffect(() => {
    async function load() {
      try {
        const data = await getPatientById(id);
        setPatient(data);
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar paciente",
          description: e.message,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, toast]);

  if (loading) {
    return <div className="p-6 text-gray-700">Carregando paciente...</div>;
  }

  if (!patient) {
    return <div className="p-6 text-red-600">Paciente não encontrado.</div>;
  }

  const formatDate = (v) => {
    if (!v) return "-";
    try {
      return format(new Date(v), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return v;
    }
  };

  const formatAddress = (p) => {
    const parts = [];
    if (p.street) parts.push(p.street);
    if (p.number) parts.push(p.number);
    if (p.neighborhood) parts.push(p.neighborhood);
    if (p.city) parts.push(p.city);
    if (p.state) parts.push(p.state);

    let line = parts.filter(Boolean).join(", ");
    if (p.zip_code) line += ` - CEP ${p.zip_code}`;

    return line || "Não informado";
  };

  return (
    <div className="p-6 space-y-6">

      {/* VOLTAR */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="flex items-center space-x-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </Button>

        <Button
          onClick={() => navigate(`/clinica/pacientes/editar/${patient.id}`)}
          className="bg-primary text-white hover:bg-primary/90 flex items-center space-x-2"
        >
          <Pencil className="w-4 h-4" />
          <span>Editar</span>
        </Button>
      </div>

      {/* CARD PRINCIPAL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center space-x-3">
            <User className="w-6 h-6 text-primary" />
            <span>{patient.full_name}</span>

            {patient.gender && (
              <Badge className="bg-primary text-white ml-2 px-3 py-1 rounded-full">
                {patient.gender}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* DADOS PRINCIPAIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">📌 Dados pessoais</h3>

              <div className="flex items-center space-x-2 text-gray-700">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span>Nascimento: {formatDate(patient.birth_date)}</span>
              </div>

              <div className="flex items-center space-x-2 text-gray-700">
                <User className="w-4 h-4 text-primary" />
                <span>CPF: {patient.cpf || "-"}</span>
              </div>

              {patient.record_number && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <User className="w-4 h-4 text-primary" />
                  <span>Prontuário: {patient.record_number}</span>
                </div>
              )}
            </div>

            {/* CONTATO */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">📞 Contato</h3>

              {patient.cell_phone && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{patient.cell_phone}</span>
                </div>
              )}

              {patient.email && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{patient.email}</span>
                </div>
              )}
            </div>

          </div>

          {/* ENDEREÇO */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-700 mb-2">📍 Endereço</h3>

            <div className="flex items-center space-x-2 text-gray-700">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{formatAddress(patient)}</span>
            </div>
          </div>

          {/* RESPONSÁVEL */}
          {(patient.responsible_name || patient.responsible_relationship) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-2">👤 Responsável</h3>

              <div className="text-gray-700">
                {patient.responsible_name || "-"} ({patient.responsible_relationship || "Não informado"})
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

