/**
 * ============================================
 * PatientHubPage - HUB CENTRAL DO PACIENTE
 * ============================================
 * /clinica/pacientes/:patientId
 * Dashboard central com resumo, alertas e ações rápidas
 */

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientContext } from "@/contexts/PatientContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import PageLayout from "@/components/ui/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import {
  AlertCircle,
  Calendar,
  FileText,
  Heart,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

const ALERT_CONFIGS = {
  documentsIncomplete: {
    icon: FileText,
    title: "Documentos Incompletos",
    description: "Faltam documentos importantes",
    color: "orange",
    severity: "warning",
  },
  expiredInsurance: {
    icon: AlertTriangle,
    title: "Convênio Vencido",
    description: "O convênio principal está vencido",
    color: "red",
    severity: "error",
  },
  incompleteRegistration: {
    icon: AlertCircle,
    title: "Cadastro Incompleto",
    description: "Dados do paciente incompletos",
    color: "yellow",
    severity: "warning",
  },
  overdue: {
    icon: Clock,
    title: "Inadimplência",
    description: "Paciente com contas pendentes",
    color: "red",
    severity: "error",
  },
};

export default function PatientHubPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const { loadPatient, patientData, loading, alerts, activePatientId } =
    usePatientContext();

  // ⚠️ GUARD: Validar patientId
  useEffect(() => {
    if (!patientId || patientId.trim() === "") {
      console.warn("❌ PatientHubPage: patientId inválido ou vazio");
      navigate("/clinica/pacientes");
      return;
    }

    // ✅ Carregar paciente se não estiver em cache ou for diferente
    if (activePatientId !== patientId) {
      loadPatient(patientId);
    }
  }, [patientId, activePatientId, loadPatient, navigate]);

  // Calcular idade
  function calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  const age = patientData ? calculateAge(patientData.birthdate || patientData.birth_date) : null;

  // Filtrar alertas ativos
  const activeAlerts = Object.entries(alerts)
    .filter(([_, value]) => value)
    .map(([key, _]) => ALERT_CONFIGS[key])
    .filter(Boolean);

  if (loading) {
    return (
      <PageLayout title="Carregando...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  if (!patientData) {
    return (
      <PageLayout title="Paciente não encontrado">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">
                O paciente solicitado não foi encontrado.
              </p>
              <Button onClick={() => navigate("/clinica/pacientes")}>
                Voltar para Lista
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{patientData.name} - Gesclinic</title>
      </Helmet>

      <PageLayout
        title={patientData.name}
        breadcrumbs={[
          { label: "Pacientes", href: "/clinica/pacientes" },
          { label: patientData.name },
        ]}
      >
        <div className="space-y-6">
          {/* Card Principal com Dados do Paciente */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Avatar + Info Principal */}
                  <div className="flex gap-4 items-start flex-1">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                      {patientData.name?.charAt(0).toUpperCase() || "P"}
                    </div>

                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {patientData.name}
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {/* CPF */}
                        {(patientData.cpf || patientData.document_id) && (
                          <div>
                            <p className="text-xs text-gray-600 font-medium">
                              CPF
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {patientData.cpf || patientData.document_id}
                            </p>
                          </div>
                        )}

                        {/* Idade */}
                        {age !== null && (
                          <div>
                            <p className="text-xs text-gray-600 font-medium">
                              IDADE
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {age} anos
                            </p>
                          </div>
                        )}

                        {/* Sexo */}
                        {patientData.gender && (
                          <div>
                            <p className="text-xs text-gray-600 font-medium">
                              SEXO
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {patientData.gender === "M" ? "Masculino" : "Feminino"}
                            </p>
                          </div>
                        )}

                        {/* Status */}
                        <div>
                          <p className="text-xs text-gray-600 font-medium">
                            STATUS
                          </p>
                          <Badge
                            className={
                              patientData.address
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {patientData.address ? "Completo" : "Incompleto"}
                          </Badge>
                        </div>
                      </div>

                      {/* Telefone e Email */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {patientData.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={16} className="text-gray-400" />
                            <span className="text-gray-700">
                              {patientData.phone}
                            </span>
                          </div>
                        )}
                        {patientData.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={16} className="text-gray-400" />
                            <span className="text-gray-700 truncate">
                              {patientData.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão Editar */}
                  <Button
                    onClick={() =>
                      navigate(
                        `/clinica/pacientes/${patientId}`
                      )
                    }
                    className="gap-2"
                  >
                    <Edit2 size={18} />
                    Editar Cadastro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Alertas Visuais */}
          {activeAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {activeAlerts.map((alert, idx) => {
                const AlertIcon = alert.icon;
                const bgColor =
                  alert.severity === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-yellow-50 border-yellow-200";
                const textColor =
                  alert.severity === "error"
                    ? "text-red-800"
                    : "text-yellow-800";

                return (
                  <Card key={idx} className={`border-2 ${bgColor}`}>
                    <CardContent className="pt-6 flex items-start gap-3">
                      <AlertIcon size={20} className={textColor} />
                      <div className="flex-1">
                        <h4 className={`font-semibold ${textColor}`}>
                          {alert.title}
                        </h4>
                        <p className="text-sm text-gray-700 mt-1">
                          {alert.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          )}

          {/* Ações Rápidas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ações Rápidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all">
                <CardContent className="pt-6">
                  <button
                    onClick={() => navigate(`/clinica/agenda`)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Calendar className="text-blue-600" size={24} />
                      <ArrowRight
                        size={18}
                        className="text-gray-400 group-hover:text-blue-600"
                      />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Agendar Atendimento
                    </h4>
                    <p className="text-sm text-gray-600">
                      Criar novo agendamento
                    </p>
                  </button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all">
                <CardContent className="pt-6">
                  <button
                    onClick={() =>
                      navigate(
                        `/clinica/pacientes/${patientId}/prontuario`
                      )
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="text-green-600" size={24} />
                      <ArrowRight
                        size={18}
                        className="text-gray-400 group-hover:text-blue-600"
                      />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Prontuário Médico
                    </h4>
                    <p className="text-sm text-gray-600">
                      Ver histórico e registros
                    </p>
                  </button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all">
                <CardContent className="pt-6">
                  <button
                    onClick={() =>
                      navigate(
                        `/clinica/pacientes/${patientId}/documentos`
                      )
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="text-purple-600" size={24} />
                      <ArrowRight
                        size={18}
                        className="text-gray-400 group-hover:text-blue-600"
                      />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Documentos
                    </h4>
                    <p className="text-sm text-gray-600">
                      Gerenciar arquivos e anexos
                    </p>
                  </button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all">
                <CardContent className="pt-6">
                  <button
                    onClick={() =>
                      navigate(
                        `/clinica/pacientes/${patientId}/convenios`
                      )
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Heart className="text-red-600" size={24} />
                      <ArrowRight
                        size={18}
                        className="text-gray-400 group-hover:text-blue-600"
                      />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Convênios
                    </h4>
                    <p className="text-sm text-gray-600">
                      Gerenciar planos de saúde
                    </p>
                  </button>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Info Adicionais */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {patientData.address && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin size={16} />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">
                    {patientData.address}
                    {patientData.city && `, ${patientData.city}`}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contatos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {patientData.phone && <p>{patientData.phone}</p>}
                {patientData.email && (
                  <p className="truncate">{patientData.email}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Próximas Ações</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => navigate(`/clinica/pacientes/${patientId}`)}
                >
                  Completar Cadastro
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageLayout>
    </>
  );
}

