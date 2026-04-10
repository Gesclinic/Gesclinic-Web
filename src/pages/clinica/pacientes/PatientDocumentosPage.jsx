/**
 * ============================================
 * PatientDocumentosPage - Arquivos e Documentos
 * ============================================
 * /clinica/pacientes/:patientId/documentos
 * Gerenciamento de documentos com tipos e validação
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientContext } from "@/contexts/PatientContext";
import { useToast } from "@/components/ui/use-toast";
import PageLayout from "@/components/ui/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import {
  Plus,
  Upload,
  Trash2,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
} from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "rg", label: "RG", icon: FileText },
  { value: "cpf", label: "CPF", icon: FileText },
  { value: "medical_order", label: "Pedido Médico", icon: FileText },
  { value: "exam", label: "Laudo/Exame", icon: FileText },
  { value: "authorization", label: "Autorização Convênio", icon: FileText },
  { value: "insurance_card", label: "Carteira Convênio", icon: FileText },
  { value: "other", label: "Outros", icon: FileText },
];

const DOCUMENT_STATUS = {
  pending: {
    label: "Pendente",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  validated: {
    label: "Validado",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  invalid: {
    label: "Inválido",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
};

export default function PatientDocumentosPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patientData, loading } = usePatientContext();

  const [documents, setDocuments] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // ⚠️ GUARD: Validar patientId
  useEffect(() => {
    if (!patientId || patientId.trim() === "") {
      console.warn("❌ PatientDocumentosPage: patientId inválido ou vazio");
      navigate("/clinica/pacientes");
    }
  }, [patientId, navigate]);

  if (loading) {
    return (
      <PageLayout title="Carregando...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Documentos - {patientData?.name} - Gesclinic</title>
      </Helmet>

      <PageLayout
        title={patientData?.name}
        breadcrumbs={[
          { label: "Pacientes", href: "/clinica/pacientes" },
          { label: patientData?.name || "Paciente" },
          { label: "Documentos" },
        ]}
      >
        <div className="w-full mx-auto">
          {/* Header com Ações */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Arquivos e Documentos
            </h2>
            <Button className="gap-2">
              <Upload size={18} />
              Enviar Documento
            </Button>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap items-center">
                <Filter size={18} className="text-gray-600" />

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todos os Tipos</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todos os Status</option>
                  {Object.entries(DOCUMENT_STATUS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Documentos */}
          {documents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum documento enviado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comece enviando os documentos importantes do paciente
                  </p>
                  <Button className="gap-2">
                    <Upload size={18} />
                    Enviar Primeiro Documento
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {documents.map((doc, idx) => {
                const statusInfo = DOCUMENT_STATUS[doc.status] || DOCUMENT_STATUS.pending;
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <FileText
                            size={24}
                            className="text-blue-600 mt-1"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {doc.name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {doc.type}
                            </p>
                            <div className="flex gap-2">
                              <Badge className={statusInfo.color}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Info sobre Documentos Recomendados */}
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">
              📋 Documentos Recomendados
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Cópia do RG e CPF</li>
              <li>• Carteiras dos convênios ativas</li>
              <li>• Pedidos médicos (se houver)</li>
              <li>• Autorizações de convênio</li>
              <li>• Laudos e exames anteriores</li>
            </ul>
          </div>
        </div>
      </PageLayout>
    </>
  );
}

