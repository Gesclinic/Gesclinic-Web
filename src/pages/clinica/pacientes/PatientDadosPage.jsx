/**
 * ============================================
 * PatientDadosPage - DADOS COMPLETOS
 * ============================================
 * /clinica/pacientes/:patientId/dados
 * Etapa 2: Dados cadastrais completos
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatientContext } from '@/contexts/PatientContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { updatePatient, updatePatientPhoto, uploadPatientPhoto } from '@/lib/patientsApi';
import { useToast } from '@/components/ui/use-toast';
import PageLayout from '@/components/ui/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Helmet } from 'react-helmet-async';
import { Save, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import PhotoCapture from '@/components/PhotoCapture';

export default function PatientDadosPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const {
    patientData,
    loading: contextLoading,
    updatePatientData,
    loadPatient,
  } = usePatientContext();

  const [loading, setLoading] = useState(false);

  // Validação de campos TISS (obrigatórios)
  const [cadastralStatus, setCadastralStatus] = useState({
    complete: false,
    missing: [],
  });

  // ⚠️ GUARD: Validar e carregar patientId
  useEffect(() => {
    if (!patientId || patientId.trim() === '') {
      console.warn('❌ PatientDadosPage: patientId inválido ou vazio');
      navigate('/clinica/pacientes');
      return;
    }

    // Carregar dados do paciente quando o ID muda
    loadPatient(patientId);
  }, [patientId, navigate, loadPatient]);

  const [formData, setFormData] = useState({
    name: '',
    document_id: '',
    birthdate: '',
    gender: '',
    phone: '',
    email: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    cell_phone: '',
  });

  // Carregar dados iniciais
  useEffect(() => {
    if (patientData) {
      setFormData({
        name: patientData.name || patientData.full_name || '',
        document_id: patientData.document_id || patientData.cpf || '',
        birthdate: patientData.birthdate || patientData.birth_date || '',
        gender: patientData.gender || '',
        phone: patientData.phone || '',
        email: patientData.email || '',
        street: patientData.street || patientData.address || '',
        number: patientData.number || '',
        neighborhood: patientData.neighborhood || '',
        city: patientData.city || '',
        state: patientData.state || '',
        zip_code: patientData.zip_code || '',
        cell_phone: patientData.cell_phone || '',
      });
    }
  }, [patientData]);

  // 🔄 Monitorar mudanças em formData e atualizar status de validação (TISS)
  useEffect(() => {
    const requiredFields = [
      ['name', 'Nome Completo'],
      ['document_id', 'CPF'],
      ['birthdate', 'Data de Nascimento'],
      ['gender', 'Sexo'],
      ['email', 'Email'],
      ['phone', 'Telefone'],
      ['street', 'Rua'],
      ['number', 'Número'],
      ['neighborhood', 'Bairro'],
      ['city', 'Cidade'],
      ['state', 'Estado'],
      ['zip_code', 'CEP'],
    ];

    const missing = requiredFields
      .filter(([field, label]) => !formData[field] || formData[field].toString().trim() === '')
      .map(([field, label]) => label);

    setCadastralStatus({
      complete: missing.length === 0,
      missing: missing,
    });
  }, [formData]);

  async function handleSave() {
    // ⚠️ GUARD: patientId obrigatório para salvar
    if (!patientId || patientId.trim() === '') {
      toast({
        title: 'Erro',
        description: 'ID do paciente inválido',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await updatePatient(patientId, formData);
      updatePatientData(formData);

      toast({
        title: 'Sucesso',
        description: 'Dados atualizados com sucesso!',
      });

      navigate(`/clinica/pacientes/${patientId}`);
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (contextLoading) {
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
        <title>Editar Paciente - Gesclinic</title>
      </Helmet>

      <PageLayout
        title="Editar Paciente"
        breadcrumbs={[
          { label: 'Pacientes', href: '/clinica/pacientes' },
          { label: patientData?.name || 'Paciente' },
          { label: 'Dados Cadastrais' },
        ]}
      >
        {/* DEBUG */}
        {!patientData && (
          <div className="w-full mx-auto mb-4 p-4 bg-red-100 border border-red-500 rounded-lg">
            <p className="text-red-800">⚠️ Carregando dados do paciente...</p>
          </div>
        )}

        {/* SEÇÃO CABEÇALHO COM FOTO 3x4 + CAPTURA */}
        {patientData && (
          <div className="w-full mx-auto mb-6">
            <div className="bg-white rounded-lg border border-gray-300 shadow-md p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* COLUNA 1: Foto 3x4 */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Foto</p>
                  {patientData?.photo_url ? (
                    <div
                      className="w-full bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 shadow-md"
                      style={{ aspectRatio: '3/4' }}
                    >
                      <img
                        src={patientData.photo_url}
                        alt={patientData?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full bg-gray-50 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center flex-col"
                      style={{ aspectRatio: '3/4' }}
                    >
                      <p className="text-6xl">📸</p>
                      <p className="text-xs text-gray-400 mt-2 text-center">Sem foto</p>
                    </div>
                  )}
                </div>

                {/* COLUNA 2: PhotoCapture */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Capturar Foto</p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <PhotoCapture
                      onPhotoCapture={async (photoDataUrl) => {
                        try {
                          const photoUrl = await uploadPatientPhoto(
                            clinicId,
                            patientId,
                            photoDataUrl,
                          );
                          await updatePatientPhoto(patientId, photoUrl);
                          updatePatientData({ ...patientData, photo_url: photoUrl });
                          toast({
                            title: 'Sucesso',
                            description: 'Foto atualizada com sucesso!',
                          });
                        } catch (error) {
                          console.error('Erro ao atualizar foto:', error);
                          toast({
                            title: 'Erro',
                            description: 'Não foi possível atualizar a foto',
                            variant: 'destructive',
                          });
                        }
                      }}
                      currentPhoto={patientData?.photo_url}
                    />
                  </div>
                </div>

                {/* COLUNA 3: Informações do Prontuário */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Informações</p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs font-medium">Prontuário</p>
                      <p className="text-gray-900 font-semibold">
                        {patientData?.record_number || patientData?.prontuario || 'CLU-1000'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-medium">CPF</p>
                      <p className="text-gray-900 font-semibold">
                        {patientData?.document_id || patientData?.cpf || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-medium">Data Nascimento</p>
                      <p className="text-gray-900 font-semibold">
                        {patientData?.birthdate || patientData?.birth_date || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-medium">Telefone</p>
                      <p className="text-gray-900 font-semibold">
                        {patientData?.phone || patientData?.cell_phone || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nome em destaque */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {patientData?.name || 'Paciente'}
                </h2>
              </div>
            </div>
          </div>
        )}

        <div className="w-full mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Informações Completas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Validação TISS - Status Visual */}
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-900">
                    📋 Validação Cadastral (Padrão TISS)
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Estes dados são obrigatórios para emissão de guia e operações clínicas
                  </p>
                </div>

                {!cadastralStatus.complete && cadastralStatus.missing.length > 0 && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-red-600 mt-0.5" size={20} />
                      <div>
                        <p className="text-sm text-red-800 font-semibold mb-2">
                          ❌ {cadastralStatus.missing.length} campos obrigatórios faltando:
                        </p>
                        <ul className="text-xs text-red-700 space-y-1">
                          {cadastralStatus.missing.map((field, idx) => (
                            <li key={idx}>• {field}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {cadastralStatus.complete && (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={20} />
                      <p className="text-sm text-green-800 font-semibold">
                        ✅ Todos os campos obrigatórios TISS estão preenchidos!
                      </p>
                    </div>
                  </div>
                )}

                {/* Seção 1: Dados Pessoais */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nome */}
                    <div className="md:col-span-2">
                      <Label htmlFor="name" className="block mb-2">
                        Nome Completo
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: João da Silva"
                      />
                    </div>

                    {/* CPF */}
                    <div>
                      <Label htmlFor="document_id" className="block mb-2">
                        CPF
                      </Label>
                      <Input
                        id="document_id"
                        value={formData.document_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            document_id: e.target.value,
                          })
                        }
                        placeholder="Ex: 123.456.789-00"
                      />
                    </div>

                    {/* Data de Nascimento */}
                    <div>
                      <Label htmlFor="birthdate" className="block mb-2">
                        Data de Nascimento
                      </Label>
                      <Input
                        id="birthdate"
                        type="date"
                        value={formData.birthdate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            birthdate: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* Sexo */}
                    <div>
                      <Label htmlFor="gender" className="block mb-2">
                        Sexo
                      </Label>
                      <select
                        id="gender"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>

                    {/* Estado Civil */}
                    <div>
                      <Label htmlFor="marital_status" className="block mb-2">
                        Estado Civil
                      </Label>
                      <select
                        id="marital_status"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione</option>
                        <option value="single">Solteiro(a)</option>
                        <option value="married">Casado(a)</option>
                        <option value="divorced">Divorciado(a)</option>
                        <option value="widowed">Viúvo(a)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Contato */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-green-600">
                    Contato
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Telefone */}
                    <div>
                      <Label htmlFor="phone" className="block mb-2">
                        Telefone
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Ex: (11) 3333-3333"
                      />
                    </div>

                    {/* Celular */}
                    <div>
                      <Label htmlFor="cell_phone" className="block mb-2">
                        Celular
                      </Label>
                      <Input
                        id="cell_phone"
                        value={formData.cell_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cell_phone: e.target.value,
                          })
                        }
                        placeholder="Ex: (11) 99999-9999"
                      />
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2">
                      <Label htmlFor="email" className="block mb-2">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Ex: email@exemplo.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Endereço */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-purple-600">
                    Endereço
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rua */}
                    <div className="md:col-span-2">
                      <Label htmlFor="street" className="block mb-2">
                        Rua
                      </Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="Ex: Rua das Flores"
                      />
                    </div>

                    {/* Número */}
                    <div>
                      <Label htmlFor="number" className="block mb-2">
                        Número
                      </Label>
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="Ex: 123"
                      />
                    </div>

                    {/* Bairro */}
                    <div>
                      <Label htmlFor="neighborhood" className="block mb-2">
                        Bairro
                      </Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            neighborhood: e.target.value,
                          })
                        }
                        placeholder="Ex: Centro"
                      />
                    </div>

                    {/* Cidade */}
                    <div>
                      <Label htmlFor="city" className="block mb-2">
                        Cidade
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Ex: São Paulo"
                      />
                    </div>

                    {/* Estado */}
                    <div>
                      <Label htmlFor="state" className="block mb-2">
                        Estado
                      </Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="Ex: SP"
                        maxLength="2"
                      />
                    </div>

                    {/* CEP */}
                    <div>
                      <Label htmlFor="zip_code" className="block mb-2">
                        CEP
                      </Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            zip_code: e.target.value,
                          })
                        }
                        placeholder="Ex: 01310-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/clinica/pacientes/${patientId}`)}
                    disabled={loading}
                    className="flex-1 gap-2"
                  >
                    <ArrowLeft size={18} />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={loading || !cadastralStatus.complete}
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    title={
                      !cadastralStatus.complete
                        ? 'Preencha todos os campos obrigatórios'
                        : 'Salvar alterações'
                    }
                  >
                    <Save size={18} />
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageLayout>
    </>
  );
}
