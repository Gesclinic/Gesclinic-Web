/**
 * ============================================
 * PatientConveniosPage - Convênios
 * ============================================
 * /clinica/pacientes/:patientId/convenios
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatientContext } from '@/contexts/PatientContext';
import PageLayout from '@/components/ui/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import { Plus, Heart, Trash2 } from 'lucide-react';

export default function PatientConveniosPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patientData, loading } = usePatientContext();

  // ⚠️ GUARD: Validar patientId
  useEffect(() => {
    if (!patientId || patientId.trim() === '') {
      console.warn('❌ PatientConveniosPage: patientId inválido ou vazio');
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
        <title>Convênios - {patientData?.name} - Gesclinic</title>
      </Helmet>

      <PageLayout
        title={patientData?.name}
        breadcrumbs={[
          { label: 'Pacientes', href: '/clinica/pacientes' },
          { label: patientData?.name || 'Paciente' },
          { label: 'Convênios' },
        ]}
      >
        <div className="w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Convênios / Planos de Saúde</h2>
            <Button className="gap-2">
              <Plus size={18} />
              Adicionar Convênio
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Heart size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum convênio cadastrado
                </h3>
                <p className="text-gray-600 mb-6">Adicione os planos de saúde do paciente</p>
                <Button>Adicionar Primeiro Convênio</Button>
              </div>
            </CardContent>
          </Card>

          {/* Exemplo de convênio */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exemplo de Layout</h3>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Unimed Brasil</h4>
                    <p className="text-sm text-gray-600">Plano: Nacional Premium</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Número da Matrícula</p>
                    <p className="font-semibold">123456789</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Validade</p>
                    <p className="font-semibold">31/12/2025</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Titular</p>
                    <p className="font-semibold">João Silva</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
