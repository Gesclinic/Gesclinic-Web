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
import { Save, User, Phone, MapPin } from 'lucide-react';

export default function DadosCadastraisTab({ patientId, patientData, updatePatientData }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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

  // Inicializar form com dados do paciente
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

  async function handleSave() {
    if (!patientId) {
      toast({ title: 'Erro', description: 'ID do paciente inválido' });
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  placeholder="Digite o nome completo"
                />
              </div>

              <div>
                <Label htmlFor="document_id" className="text-sm font-medium text-gray-700">
                  CPF/RG <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="document_id"
                  placeholder="Ex: 123.456.789-00"
                  maxLength="14"
                  value={formData.document_id}
                  onChange={(e) =>
                    setFormData({ ...formData, document_id: formatCPF(e.target.value) })
                  }
                  className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <Label htmlFor="birthdate" className="text-sm font-medium text-gray-700">
                  Data de Nascimento
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <Label htmlFor="gender" className="text-sm font-medium text-gray-700">
                  Gênero
                </Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700"
                >
                  <option value="">Selecionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="O">Outro</option>
                </select>
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
                  Celular
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
                  className="border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                />
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
                    setFormData({
                      ...formData,
                      phone: formatPhone(e.target.value),
                    })
                  }
                  className="border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                />
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
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
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
