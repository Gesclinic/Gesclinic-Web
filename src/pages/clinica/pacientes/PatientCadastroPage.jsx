/**
 * ============================================
 * PatientCadastroPage - CADASTRO EM 2 ETAPAS
 * ============================================
 * /clinica/pacientes/novo
 * Etapa 1: Dados Essenciais com design moderno
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { checkPatientExists, createPatientWithPhoto } from '@/lib/patientsApi';
import { useToast } from '@/components/ui/use-toast';
import PageLayout from '@/components/ui/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, Check, User, Phone, MapPin, FileText } from 'lucide-react';
import PhotoCapture from '@/components/PhotoCapture';

export default function PatientCadastroPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Obrigatórios
    name: '',
    document_id: '',
    birthdate: '',
    gender: '',
    cell_phone: '',
    phone: '',
    photo: null,
    // TISS - Acessórios
    mother_name: '',
    rg_number: '',
    nationality: 'BR',
    state_birth: '',
    marital_status: '',
    profession: '',
    ethnicity: '',
    email: '',
    // Endereço - Acessórios
    street: '',
    street_number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    postal_code: '',
  });

  const [errors, setErrors] = useState({});

  // Formatador de CPF: xxx.xxx.xxx-xx
  function formatCPF(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    }
    if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    }
    if (cleaned.length <= 9) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  }

  // Formatador de Telefone/Celular: (xx) xxxxx-xxxx ou (xx) xxxx-xxxx
  function formatPhone(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      return cleaned.length > 0 ? `(${cleaned}` : '';
    }
    if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    }
    if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }

  // Formatador de CEP: xxxxx-xxx
  function formatCEP(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) {
      return cleaned;
    }
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  }

  function validateForm() {
    const newErrors = {};
    const cpfDigits = formData.document_id.replace(/\D/g, '');

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!formData.document_id?.trim()) {
      newErrors.document_id = 'CPF é obrigatório';
    } else if (cpfDigits.length !== 11) {
      newErrors.document_id = 'CPF deve ter 11 dígitos';
    }
    if (!formData.birthdate) {
      newErrors.birthdate = 'Data de nascimento é obrigatória';
    }
    if (!formData.gender) {
      newErrors.gender = 'Sexo é obrigatório';
    }
    if (!formData.cell_phone?.trim() && !formData.phone?.trim()) {
      newErrors.cell_phone = 'Informe ao menos um telefone de contato';
    }
    if (!formData.mother_name?.trim()) {
      newErrors.mother_name = 'Nome da mãe é obrigatório para faturamento XML';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(goToComplete = false) {
    if (!validateForm()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const exists = await checkPatientExists({ clinicId, documentId: formData.document_id });
      if (exists) {
        setErrors((prev) => ({ ...prev, document_id: 'CPF já cadastrado nesta clínica' }));
        toast({
          title: 'CPF já cadastrado',
          description: 'Localize o paciente existente pela lista antes de criar um novo cadastro.',
          variant: 'destructive',
        });
        return;
      }

      const patient = await createPatientWithPhoto(
        clinicId,
        {
          name: formData.name,
          document_id: formData.document_id,
          birthdate: formData.birthdate,
          gender: formData.gender,
          cell_phone: formData.cell_phone,
          phone: formData.phone,
          // TISS Fields
          mother_name: formData.mother_name || null,
          rg_number: formData.rg_number || null,
          nationality: formData.nationality || 'BR',
          state_birth: formData.state_birth || null,
          marital_status: formData.marital_status || null,
          professional_occupation: formData.profession || null,
          ethnicity: formData.ethnicity || null,
          email: formData.email || null,
          // Address Fields
          street: formData.street || null,
          number: formData.street_number || null,
          complement: formData.complement || null,
          neighborhood: formData.neighborhood || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.postal_code || null,
        },
        formData.photo,
      );

      toast({
        title: 'Sucesso',
        description: 'Paciente criado com sucesso!',
      });

      navigate(goToComplete && patient?.id ? `/clinica/pacientes/${patient.id}` : '/clinica/pacientes');
      return;
    } catch (error) {
      console.error('Erro ao criar paciente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o paciente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  return (
    <>
      <Helmet>
        <title>Novo Paciente - Gesclinic</title>
      </Helmet>

      <PageLayout
        title="Novo Paciente"
        breadcrumbs={[{ label: 'Pacientes', href: '/clinica/pacientes' }, { label: 'Novo' }]}
      >
        <motion.div
          className="w-full mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Indicador de Etapa - Melhorado */}
          <motion.div className="mb-8" variants={itemVariants}>
            <div className="flex items-center justify-center gap-4 mb-6">
              <motion.div
                className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold shadow-lg"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                1
              </motion.div>
              <motion.div
                className="flex-1 h-1 bg-gradient-to-r from-blue-300 to-gray-300"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              />
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 text-gray-600 font-bold">
                2
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <div className="text-center flex-1">
                <p className="font-bold text-blue-600 text-base">Dados Essenciais</p>
                <p className="text-xs text-gray-500 mt-1">Informações principais</p>
              </div>
              <div className="text-center flex-1">
                <p className="font-semibold text-gray-500">Dados Completos</p>
                <p className="text-xs text-gray-500 mt-1">(opcional)</p>
              </div>
            </div>
          </motion.div>

          {/* Formulário - Seção Dados Pessoais */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden mb-6">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-25">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Dados Pessoais
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Informações essenciais do paciente
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Nome */}
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex: João da Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5 ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                      ⚠️ {errors.name}
                    </p>
                  )}
                </div>

                {/* CPF */}
                <div>
                  <Label htmlFor="document_id" className="text-sm font-medium text-gray-700">
                    CPF <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="document_id"
                    placeholder="Ex: 123.456.789-00"
                    maxLength="14"
                    value={formData.document_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        document_id: formatCPF(e.target.value),
                      })
                    }
                    className={`border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5 ${errors.document_id ? 'border-red-500' : ''}`}
                  />
                  {errors.document_id && (
                    <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                      ⚠️ {errors.document_id}
                    </p>
                  )}
                </div>

                {/* Data de Nascimento e Sexo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthdate" className="text-sm font-medium text-gray-700">
                      Data de Nascimento <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                      className={`border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5 ${errors.birthdate ? 'border-red-500' : ''}`}
                    />
                    {errors.birthdate && (
                      <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                        ⚠️ {errors.birthdate}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="gender" className="text-sm font-medium text-gray-700">
                      Sexo <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700 mt-1.5 ${
                        errors.gender ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                    {errors.gender && (
                      <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                        ⚠️ {errors.gender}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Formulário - Seção Contato */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden mb-6">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-emerald-25">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-lg">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Contato</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Telefones para contato</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Celular e Telefone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cell_phone" className="text-sm font-medium text-gray-700">
                      Celular <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cell_phone"
                      placeholder="Ex: (11) 99999-9999"
                      maxLength="15"
                      value={formData.cell_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cell_phone: formatPhone(e.target.value),
                        })
                      }
                      className={`border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white mt-1.5 ${errors.cell_phone ? 'border-red-500' : ''}`}
                    />
                    {errors.cell_phone && (
                      <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                        ⚠️ {errors.cell_phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Telefone <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="Ex: (11) 3333-4444"
                      maxLength="14"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone: formatPhone(e.target.value),
                        })
                      }
                      className={`border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white mt-1.5 ${errors.phone ? 'border-red-500' : ''}`}
                    />
                    {errors.phone && (
                      <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                        ⚠️ {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email (Acessório) */}
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email <span className="text-gray-400 text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ex: paciente@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Formulário - Seção Dados TISS */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden mb-6">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-amber-25">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-lg">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Dados Complementares (TISS)
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Informações para guias e faturamento XML
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Nome da Mãe e RG */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mother_name" className="text-sm font-medium text-gray-700">
                      Nome da Mãe <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="mother_name"
                      placeholder="Ex: Maria da Silva"
                      value={formData.mother_name}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                      className={`border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white mt-1.5 ${errors.mother_name ? 'border-red-500' : ''}`}
                    />
                    {errors.mother_name && (
                      <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                        ⚠️ {errors.mother_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="rg_number" className="text-sm font-medium text-gray-700">
                      RG / Registro de Identidade{' '}
                      <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="rg_number"
                      placeholder="Ex: 12345678-9"
                      value={formData.rg_number}
                      onChange={(e) => setFormData({ ...formData, rg_number: e.target.value })}
                      className="border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white mt-1.5"
                    />
                  </div>
                </div>

                {/* Naturalidade, Estado Civil, Raça/Etnia */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="state_birth" className="text-sm font-medium text-gray-700">
                      Naturalidade (UF) <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="state_birth"
                      placeholder="Ex: SP, RJ, MG..."
                      maxLength="2"
                      value={formData.state_birth}
                      onChange={(e) =>
                        setFormData({ ...formData, state_birth: e.target.value.toUpperCase() })
                      }
                      className="border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white mt-1.5 uppercase"
                    />
                  </div>

                  <div>
                    <Label htmlFor="marital_status" className="text-sm font-medium text-gray-700">
                      Estado Civil <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <select
                      id="marital_status"
                      value={formData.marital_status}
                      onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700 mt-1.5"
                    >
                      <option value="">Selecione...</option>
                      <option value="single">Solteiro(a)</option>
                      <option value="married">Casado(a)</option>
                      <option value="divorced">Divorciado(a)</option>
                      <option value="widowed">Viúvo(a)</option>
                      <option value="stable_union">União Estável</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="ethnicity" className="text-sm font-medium text-gray-700">
                      Raça/Etnia <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <select
                      id="ethnicity"
                      value={formData.ethnicity}
                      onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700 mt-1.5"
                    >
                      <option value="">Selecione...</option>
                      <option value="brown">Pardo</option>
                      <option value="white">Branco</option>
                      <option value="black">Preto</option>
                      <option value="asian">Asiático</option>
                      <option value="indigenous">Indígena</option>
                    </select>
                  </div>
                </div>

                {/* Profissão e Nacionalidade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="profession" className="text-sm font-medium text-gray-700">
                      Profissão <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="profession"
                      placeholder="Ex: Engenheiro, Professor..."
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      className="border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nationality" className="text-sm font-medium text-gray-700">
                      Nacionalidade <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <select
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700 mt-1.5"
                    >
                      <option value="BR">Brasileiro(a)</option>
                      <option value="other">Estrangeiro(a)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Formulário - Seção Endereço */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden mb-6">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-25">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Endereço</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Informações de localização - todos os campos são opcionais
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* CEP */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street" className="text-sm font-medium text-gray-700">
                      Rua / Logradouro <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="street"
                      placeholder="Ex: Rua das Flores"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="street_number" className="text-sm font-medium text-gray-700">
                      Número <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="street_number"
                      placeholder="Ex: 123"
                      value={formData.street_number}
                      onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                      className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5"
                    />
                  </div>
                </div>

                {/* Complemento, Bairro, Cidade, Estado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="complement" className="text-sm font-medium text-gray-700">
                      Complemento <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="complement"
                      placeholder="Ex: Apto 42"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="neighborhood" className="text-sm font-medium text-gray-700">
                      Bairro <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="neighborhood"
                      placeholder="Ex: Centro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5"
                    />
                  </div>
                </div>

                {/* Cidade, Estado, CEP */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                      Cidade <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="Ex: São Paulo"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                      Estado (UF) <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="state"
                      placeholder="Ex: SP"
                      maxLength="2"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value.toUpperCase() })
                      }
                      className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5 uppercase"
                    />
                  </div>

                  <div>
                    <Label htmlFor="postal_code" className="text-sm font-medium text-gray-700">
                      CEP <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="postal_code"
                      placeholder="Ex: 01310-100"
                      maxLength="9"
                      value={formData.postal_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          postal_code: formatCEP(e.target.value),
                        })
                      }
                      className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white mt-1.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Foto do Paciente */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden mb-6">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-purple-25">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 rounded-lg">
                    <span className="text-lg">📸</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Foto do Paciente
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Capturar ou fazer upload de foto</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <PhotoCapture
                  onPhotoCapture={(photo) => setFormData({ ...formData, photo })}
                  currentPhoto={formData.photo}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Botões de Ação */}
          <motion.div variants={itemVariants} className="flex gap-3 pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => navigate('/clinica/pacientes')}
              disabled={loading}
              className="px-6 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
            >
              <Check size={16} />
              {loading ? 'Salvando...' : 'Salvar Apenas'}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
            >
              <ArrowRight size={16} />
              {loading ? 'Salvando...' : 'Continuar Cadastro'}
            </Button>
          </motion.div>
        </motion.div>
      </PageLayout>
    </>
  );
}
