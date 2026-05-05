/**
 * ============================================
 * FamiliaresTab - Aba de Dados Familiares
 * ============================================
 *
 * Listagem e edição de familiares do paciente com design moderno
 * Sem rota própria - parte do PatientDetailPage
 */

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Users, Phone, Heart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RELATIONSHIP_OPTIONS = [
  'Cônjuge',
  'Filho/Filha',
  'Pai/Mãe',
  'Avô/Avó',
  'Irmão/Irmã',
  'Tio/Tia',
  'Primo/Prima',
  'Outro',
];

export default function FamiliaresTab({ patientId, patientData, updatePatientData }) {
  const { toast } = useToast();
  const [familiares, setFamiliares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFamiliarDialog, setShowFamiliarDialog] = useState(false);
  const [familiarData, setFamiliarData] = useState({
    name: '',
    relationship: 'Cônjuge',
    phone: '',
    isPrimaryContact: false,
  });

  // Simulado: Em produção, buscar da API
  useEffect(() => {
    loadFamiliares();
  }, [patientId]);

  async function loadFamiliares() {
    setLoading(true);
    try {
      // Placeholder para carregamento da API
      setFamiliares([]);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados familiares',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = (id) => {
    setFamiliares(familiares.filter((f) => f.id !== id));
    toast({
      title: 'Sucesso',
      description: 'Familiar removido',
    });
  };

  const handleAddFamiliar = () => {
    if (!familiarData.name.trim() || !familiarData.phone.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o nome e telefone do familiar',
        variant: 'destructive',
      });
      return;
    }

    const novoFamiliar = {
      id: Date.now(),
      name: familiarData.name,
      relationship: familiarData.relationship,
      phone: familiarData.phone,
      isPrimaryContact: familiarData.isPrimaryContact,
    };
    setFamiliares([novoFamiliar, ...familiares]);
    setShowFamiliarDialog(false);
    setFamiliarData({
      name: '',
      relationship: 'Cônjuge',
      phone: '',
      isPrimaryContact: false,
    });
    toast({
      title: 'Sucesso',
      description: 'Familiar adicionado com sucesso',
    });
  };

  const formatPhone = (value) => {
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
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Cabeçalho com Botão Adicionar */}
      <motion.div
        className="flex justify-between items-start gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Dados Familiares</h3>
          <p className="text-sm text-gray-500 mt-1">
            Gerenciar familiares e contatos de emergência
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
          onClick={() => setShowFamiliarDialog(true)}
        >
          <Plus size={16} className="mr-2" />
          Adicionar Familiar
        </Button>
      </motion.div>

      {/* Lista de Familiares */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
            <p className="text-gray-500">Carregando familiares...</p>
          </CardContent>
        </Card>
      ) : familiares.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="border-0 shadow-sm border-l-4 border-green-500 bg-green-50">
            <CardContent className="pt-12 pb-12 text-center">
              <Users className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4 font-medium">Nenhum familiar registrado</p>
              <p className="text-sm text-gray-500 mb-6">
                Adicione familiares e contatos de emergência para este paciente
              </p>
              <Button
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => setShowFamiliarDialog(true)}
              >
                <Plus size={16} className="mr-2" />
                Registrar Familiar
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-3"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          initial="hidden"
          animate="visible"
        >
          {familiares.map((familiar, idx) => (
            <motion.div
              key={familiar.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-l-4 border-green-500">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">{familiar.name}</h4>
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          {familiar.relationship}
                        </Badge>
                        {familiar.isPrimaryContact && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            Contato Principal
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 mt-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{familiar.phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-200 hover:bg-gray-100 text-gray-600 h-9 w-9 p-0"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 hover:bg-red-50 text-red-600 h-9 w-9 p-0"
                        onClick={() => handleDelete(familiar.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Dialog Adicionar Familiar */}
      <Dialog open={showFamiliarDialog} onOpenChange={setShowFamiliarDialog}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content">
          <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Adicionar Novo Familiar
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Nome completo do familiar"
                  value={familiarData.name}
                  onChange={(e) => setFamiliarData({ ...familiarData, name: e.target.value })}
                  className="border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="relationship" className="text-sm font-medium text-gray-700">
                  Parentesco <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={familiarData.relationship}
                  onValueChange={(value) =>
                    setFamiliarData({ ...familiarData, relationship: value })
                  }
                >
                  <SelectTrigger className="border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <SelectItem key={rel} value={rel}>
                        {rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Telefone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="Ex: (11) 99999-9999"
                  maxLength="15"
                  value={familiarData.phone}
                  onChange={(e) =>
                    setFamiliarData({
                      ...familiarData,
                      phone: formatPhone(e.target.value),
                    })
                  }
                  className="border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 mt-1.5"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Checkbox
                  id="primary"
                  checked={familiarData.isPrimaryContact}
                  onCheckedChange={(checked) =>
                    setFamiliarData({
                      ...familiarData,
                      isPrimaryContact: checked,
                    })
                  }
                />
                <Label
                  htmlFor="primary"
                  className="text-sm text-gray-700 font-medium cursor-pointer"
                >
                  É o contato principal
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 border-t border-gray-200 px-6 pb-6 pt-6 bg-white">
            <Button
              variant="outline"
              onClick={() => setShowFamiliarDialog(false)}
              className="border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
              onClick={handleAddFamiliar}
            >
              Adicionar Familiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
