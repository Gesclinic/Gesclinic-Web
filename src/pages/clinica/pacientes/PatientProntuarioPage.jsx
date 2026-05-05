/**
 * ============================================
 * PatientProntuarioPage - Prontuário Médico
 * ============================================
 * /clinica/pacientes/:patientId/prontuario
 * Timeline cronológica com tipos de registro
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatientContext } from '@/contexts/PatientContext';
import PageLayout from '@/components/ui/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import {
  Plus,
  FileText,
  Stethoscope,
  Microscope,
  MessageSquare,
  Filter,
  ChevronDown,
} from 'lucide-react';

const RECORD_TYPES = {
  consultation: {
    label: 'Consulta',
    icon: Stethoscope,
    color: 'blue',
    bgColor: 'bg-blue-50',
  },
  evolution: {
    label: 'Evolução',
    icon: MessageSquare,
    color: 'green',
    bgColor: 'bg-green-50',
  },
  exam: {
    label: 'Exame',
    icon: Microscope,
    color: 'purple',
    bgColor: 'bg-purple-50',
  },
  note: {
    label: 'Anotação',
    icon: FileText,
    color: 'gray',
    bgColor: 'bg-gray-50',
  },
};

export default function PatientProntuarioPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patientData, loading } = usePatientContext();

  const [records, setRecords] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [expandedRecord, setExpandedRecord] = useState(null);

  // ⚠️ GUARD: Validar patientId
  useEffect(() => {
    if (!patientId || patientId.trim() === '') {
      console.warn('❌ PatientProntuarioPage: patientId inválido ou vazio');
      navigate('/clinica/pacientes');
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
        <title>Prontuário - {patientData?.name} - Gesclinic</title>
      </Helmet>

      <PageLayout
        title={patientData?.name}
        breadcrumbs={[
          { label: 'Pacientes', href: '/clinica/pacientes' },
          { label: patientData?.name || 'Paciente' },
          { label: 'Prontuário' },
        ]}
      >
        <div className="w-full mx-auto">
          {/* Header com Ações */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Prontuário Médico</h2>
            <Button className="gap-2">
              <Plus size={18} />
              Novo Registro
            </Button>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center flex-wrap">
                <Filter size={18} className="text-gray-600" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todos os Tipos</option>
                  {Object.entries(RECORD_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Data inicial"
                />

                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Data final"
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {records.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum registro no prontuário
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comece adicionando registros de consultas, evoluções ou exames
                  </p>
                  <Button className="gap-2">
                    <Plus size={18} />
                    Novo Registro
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {records.map((record, idx) => {
                const recordType = RECORD_TYPES[record.type] || RECORD_TYPES.note;
                const RecordIcon = recordType.icon;
                const isExpanded = expandedRecord === idx;

                return (
                  <Card key={idx} className={recordType.bgColor}>
                    <CardContent className="pt-6">
                      <button
                        onClick={() => setExpandedRecord(isExpanded ? null : idx)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <RecordIcon size={24} className={`text-${recordType.color}-600 mt-1`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{record.title}</h4>
                                <Badge
                                  className={`bg-${recordType.color}-100 text-${recordType.color}-800`}
                                >
                                  {recordType.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {record.date} • {record.professional}
                              </p>
                              {!isExpanded && (
                                <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                  {record.content}
                                </p>
                              )}
                            </div>
                          </div>

                          <ChevronDown
                            size={20}
                            className={`text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {record.content}
                            </p>
                            <div className="mt-4 flex gap-2">
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                Deletar
                              </Button>
                            </div>
                          </div>
                        )}
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Info sobre Prontuário */}
          <div className="mt-8 bg-green-50 border-l-4 border-green-600 p-4 rounded">
            <h4 className="font-semibold text-green-900 mb-2">🔒 Histórico Imutável</h4>
            <p className="text-sm text-green-800">
              O prontuário mantém um histórico completo e imutável de todos os registros clínicos.
              Novos registros devem ser adicionados, não modificados. Cada entrada inclui data,
              profissional e timestamp de criação.
            </p>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
