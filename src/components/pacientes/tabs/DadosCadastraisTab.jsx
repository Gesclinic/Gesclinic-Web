/**
 * ============================================
 * DadosCadastraisTab - Aba de Dados Cadastrais
 * ============================================
 *
 * Edição de dados básicos do paciente com design moderno
 * Sem rota própria - parte do PatientDetailPage
 */

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { updatePatient } from '@/lib/patientsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Save, User, Phone, MapPin, FileText } from 'lucide-react';

const toDateInputValue = (value) => {
  if (!value) return '';
  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return '';
};

export default function DadosCadastraisTab({ patientId, patientData, updatePatientData }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  function formatCEP(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) {
      return cleaned;
    }
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  }

  function validateForSave() {
    const nextErrors = {};
    const cpfDigits = formData.document_id.replace(/\D/g, '');

    if (!formData.name.trim()) {
      nextErrors.name = 'Nome completo é obrigatório';
    }
    if (!formData.document_id.trim()) {
      nextErrors.document_id = 'CPF é obrigatório';
    } else if (cpfDigits.length !== 11) {
      nextErrors.document_id = 'CPF deve ter 11 dígitos';
    }
    if (!formData.birthdate) {
      nextErrors.birthdate = 'Data de nascimento é obrigatória';
    }
    if (!formData.gender) {
      nextErrors.gender = 'Sexo é obrigatório';
    }
    if (!formData.cell_phone.trim() && !formData.phone.trim()) {
      nextErrors.cell_phone = 'Informe celular ou telefone';
    }
    if (!formData.mother_name.trim()) {
      nextErrors.mother_name = 'Nome da mãe é obrigatório para faturamento XML';
    }

    setErrors(nextErrors);
    return nextErrors;
  }

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
    mother_name: '',
    rg_number: '',
    nationality: 'BR',
    state_birth: '',
    marital_status: '',
    professional_occupation: '',
    ethnicity: '',
    complement: '',
  });

  // Inicializar form com dados do paciente
  useEffect(() => {
    if (patientData) {
      setFormData({
        name: patientData.name || patientData.full_name || '',
        document_id: patientData.document_id || patientData.cpf || '',
        birthdate: toDateInputValue(patientData.birthdate || patientData.birth_date),
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
        mother_name: patientData.mother_name || '',
        rg_number: patientData.rg_number || '',
        nationality: patientData.nationality || 'BR',
        state_birth: patientData.state_birth || '',
        marital_status: patientData.marital_status || '',
        professional_occupation: patientData.professional_occupation || '',
        ethnicity: patientData.ethnicity || '',
        complement: patientData.complement || '',
      });
    }
  }, [patientData]);

  async function handleSave() {
    if (!patientId) {
      toast({ title: 'Erro', description: 'ID do paciente inválido' });
      return;
    }

    const validationErrors = validateForSave();
    const errorMessages = Object.values(validationErrors);
    if (errorMessages.length > 0) {
      toast({
        title: 'Cadastro incompleto',
        description: errorMessages.slice(0, 3).join(' | '),
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
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.message,
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
        delayChildren: 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Seção: Dados Pessoais */}
      <motion.div variants={cardVariants}>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-25">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Dados Pessoais
                </CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Informações básicas do paciente</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Nome Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setErrors((current) => ({ ...current, name: null }));
                  }}
                  className={`border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Digite o nome completo"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

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
                    {
                      setFormData({ ...formData, document_id: formatCPF(e.target.value) });
                      setErrors((current) => ({ ...current, document_id: null }));
                    }
                  }
                  className={`border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${errors.document_id ? 'border-red-500' : ''}`}
                />
                {errors.document_id && <p className="mt-1 text-sm text-red-600">{errors.document_id}</p>}
              </div>

              <div>
                <Label htmlFor="birthdate" className="text-sm font-medium text-gray-700">
                  Data de Nascimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => {
                    setFormData({ ...formData, birthdate: e.target.value });
                    setErrors((current) => ({ ...current, birthdate: null }));
                  }}
                  className={`border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white ${errors.birthdate ? 'border-red-500' : ''}`}
                />
                {errors.birthdate && <p className="mt-1 text-sm text-red-600">{errors.birthdate}</p>}
              </div>

              <div>
                <Label htmlFor="gender" className="text-sm font-medium text-gray-700">
                  Sexo <span className="text-red-500">*</span>
                </Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => {
                    setFormData({ ...formData, gender: e.target.value });
                    setErrors((current) => ({ ...current, gender: null }));
                  }}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700 ${errors.gender ? 'border-red-500' : ''}`}
                >
                  <option value="">Selecionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="O">Outro</option>
                </select>
                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Seção: Contato */}
      <motion.div variants={cardVariants}>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-emerald-25">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-lg">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Contato</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Telefones e email para contato</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            {/* Celular e Telefone - Mesma linha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cell_phone" className="text-sm font-medium text-gray-700">
                  Celular <span className="text-gray-400 text-xs">(celular ou telefone)</span>
                </Label>
                <Input
                  id="cell_phone"
                  placeholder="Ex: (11) 99999-9999"
                  maxLength="15"
                  value={formData.cell_phone}
                  onChange={(e) =>
                    {
                      setFormData({
                        ...formData,
                        cell_phone: formatPhone(e.target.value),
                      });
                      setErrors((current) => ({ ...current, cell_phone: null }));
                    }
                  }
                  className={`border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white ${errors.cell_phone ? 'border-red-500' : ''}`}
                />
                {errors.cell_phone && <p className="mt-1 text-sm text-red-600">{errors.cell_phone}</p>}
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  placeholder="Ex: (11) 3333-4444"
                  maxLength="14"
                  value={formData.phone}
                  onChange={(e) =>
                    {
                      setFormData({
                        ...formData,
                        phone: formatPhone(e.target.value),
                      });
                      setErrors((current) => ({ ...current, cell_phone: null }));
                    }
                  }
                  className="border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Seção: Dados Complementares TISS */}
      <motion.div variants={cardVariants}>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
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
                  Dados usados na geração de guias e faturamento XML
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mother_name" className="text-sm font-medium text-gray-700">
                  Nome da Mãe <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mother_name"
                  placeholder="Ex: Maria da Silva"
                  value={formData.mother_name}
                  onChange={(e) => {
                    setFormData({ ...formData, mother_name: e.target.value });
                    setErrors((current) => ({ ...current, mother_name: null }));
                  }}
                  className={`border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white ${errors.mother_name ? 'border-red-500' : ''}`}
                />
                {errors.mother_name && <p className="mt-1 text-sm text-red-600">{errors.mother_name}</p>}
              </div>

              <div>
                <Label htmlFor="rg_number" className="text-sm font-medium text-gray-700">
                  RG / Registro de Identidade
                </Label>
                <Input
                  id="rg_number"
                  placeholder="Ex: 12345678-9"
                  value={formData.rg_number}
                  onChange={(e) => setFormData({ ...formData, rg_number: e.target.value })}
                  className="border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="state_birth" className="text-sm font-medium text-gray-700">
                  Naturalidade (UF)
                </Label>
                <Input
                  id="state_birth"
                  placeholder="Ex: PR"
                  maxLength="2"
                  value={formData.state_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, state_birth: e.target.value.toUpperCase() })
                  }
                  className="border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white uppercase"
                />
              </div>

              <div>
                <Label htmlFor="marital_status" className="text-sm font-medium text-gray-700">
                  Estado Civil
                </Label>
                <select
                  id="marital_status"
                  value={formData.marital_status}
                  onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700"
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
                  Raça/Etnia
                </Label>
                <select
                  id="ethnicity"
                  value={formData.ethnicity}
                  onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="professional_occupation" className="text-sm font-medium text-gray-700">
                  Profissão
                </Label>
                <Input
                  id="professional_occupation"
                  placeholder="Ex: Médico, Professor..."
                  value={formData.professional_occupation}
                  onChange={(e) =>
                    setFormData({ ...formData, professional_occupation: e.target.value })
                  }
                  className="border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <Label htmlFor="nationality" className="text-sm font-medium text-gray-700">
                  Nacionalidade
                </Label>
                <select
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700"
                >
                  <option value="BR">Brasileiro(a)</option>
                  <option value="other">Estrangeiro(a)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Seção: Endereço */}
      <motion.div variants={cardVariants}>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-purple-25">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-lg">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Endereço</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Localização residencial</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="street" className="text-sm font-medium text-gray-700">
                  Rua
                </Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                  placeholder="Endereço da rua"
                />
              </div>

              <div>
                <Label htmlFor="complement" className="text-sm font-medium text-gray-700">
                  Complemento
                </Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  className="border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                  placeholder="Apartamento, sala, bloco..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="number" className="text-sm font-medium text-gray-700">
                    Número
                  </Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                    placeholder="Nº"
                  />
                </div>

                <div>
                  <Label htmlFor="neighborhood" className="text-sm font-medium text-gray-700">
                    Bairro
                  </Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <Label htmlFor="zip_code" className="text-sm font-medium text-gray-700">
                    CEP
                  </Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: formatCEP(e.target.value) })}
                    className="border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                    Cidade
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                    placeholder="Cidade"
                  />
                </div>

                <div>
                  <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                    Estado (UF)
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value.toUpperCase() })
                    }
                    className="border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                    placeholder="SP"
                    maxLength="2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Botões de Ação */}
      <motion.div
        variants={cardVariants}
        className="flex justify-end gap-3 pt-6 border-t border-gray-100"
      >
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="px-6 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-200"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} className="mr-2" />
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
