/**
 * ============================================
 * ConveniosTab - Aba de Convênios
 * ============================================
 * 
 * Listagem e edição de convênios do paciente com design moderno
 * Sem rota própria - parte do PatientDetailPage
 */

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Heart, Calendar, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function ConveniosTab({ patientId, patientData, updatePatientData }) {
  const { toast } = useToast();
  const [convenios, setConvenios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConvenioDialog, setShowConvenioDialog] = useState(false);
  const [convenioData, setConvenioData] = useState({
    name: "",
    membershipNumber: "",
    expiryDate: "",
    isPrimary: false,
  });

  // Simulado: Em produção, buscar da API
  useEffect(() => {
    loadConvenios();
  }, [patientId]);

  async function loadConvenios() {
    setLoading(true);
    try {
      // Placeholder para carregamento da API
      setConvenios([]);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar convênios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = (id) => {
    setConvenios(convenios.filter((c) => c.id !== id));
    toast({
      title: "Sucesso",
      description: "Convênio removido",
    });
  };

  const handleAddConvenio = () => {
    if (
      !convenioData.name.trim() ||
      !convenioData.membershipNumber.trim() ||
      !convenioData.expiryDate
    ) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const novoConvenio = {
      id: Date.now(),
      name: convenioData.name,
      membershipNumber: convenioData.membershipNumber,
      expiryDate: convenioData.expiryDate,
      isPrimary: convenioData.isPrimary,
    };
    setConvenios([novoConvenio, ...convenios]);
    setShowConvenioDialog(false);
    setConvenioData({
      name: "",
      membershipNumber: "",
      expiryDate: "",
      isPrimary: false,
    });
    toast({
      title: "Sucesso",
      description: "Convênio adicionado com sucesso",
    });
  };

  const isExpired = (date) => {
    const today = new Date();
    const expiry = new Date(date);
    return expiry < today;
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
          <h3 className="text-lg font-semibold text-gray-900">Convênios</h3>
          <p className="text-sm text-gray-500 mt-1">
            Gerenciar convênios e planos de saúde
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
          onClick={() => setShowConvenioDialog(true)}
        >
          <Plus size={16} className="mr-2" />
          Adicionar Convênio
        </Button>
      </motion.div>

      {/* Lista de Convênios */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-500">Carregando convênios...</p>
          </CardContent>
        </Card>
      ) : convenios.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="border-0 shadow-sm border-l-4 border-blue-500 bg-blue-50">
            <CardContent className="pt-12 pb-12 text-center">
              <Heart className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4 font-medium">
                Nenhum convênio registrado para este paciente
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Clique no botão abaixo para adicionar um novo convênio
              </p>
              <Button
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => setShowConvenioDialog(true)}
              >
                <Plus size={16} className="mr-2" />
                Registrar Convênio
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
          {convenios.map((convenio, idx) => (
            <motion.div
              key={convenio.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <Card className={`border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-l-4 ${isExpired(convenio.expiryDate) ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {convenio.name}
                        </h4>
                        {convenio.isPrimary && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            Principal
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            Matrícula: <span className="font-medium text-gray-900">{convenio.membershipNumber}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Válido até: <span className="font-medium text-gray-900">{new Date(convenio.expiryDate).toLocaleDateString('pt-BR')}</span>
                          </span>
                          {isExpired(convenio.expiryDate) && (
                            <Badge className="bg-red-100 text-red-800 text-xs ml-2">
                              Vencido
                            </Badge>
                          )}
                        </div>
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
                        onClick={() => handleDelete(convenio.id)}
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

      {/* Dialog Adicionar Convênio */}
      <Dialog open={showConvenioDialog} onOpenChange={setShowConvenioDialog}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content">
          <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Adicionar Novo Convênio
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome do Convênio <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                placeholder="Ex: Unimed, Bradesco Saúde, etc"
                value={convenioData.name}
                onChange={(e) =>
                  setConvenioData({ ...convenioData, name: e.target.value })
                }
                className="border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="membership" className="text-sm font-medium text-gray-700">Número de Matrícula <span className="text-red-500">*</span></Label>
              <Input
                id="membership"
                placeholder="Ex: 123456789"
                value={convenioData.membershipNumber}
                onChange={(e) =>
                  setConvenioData({
                    ...convenioData,
                    membershipNumber: e.target.value,
                  })
                }
                className="border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="expiry" className="text-sm font-medium text-gray-700">Data de Validade <span className="text-red-500">*</span></Label>
              <Input
                id="expiry"
                type="date"
                value={convenioData.expiryDate}
                onChange={(e) =>
                  setConvenioData({
                    ...convenioData,
                    expiryDate: e.target.value,
                  })
                }
                className="border-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 mt-1.5"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                id="primary"
                checked={convenioData.isPrimary}
                onCheckedChange={(checked) =>
                  setConvenioData({
                    ...convenioData,
                    isPrimary: checked,
                  })
                }
              />
              <Label htmlFor="primary" className="text-sm text-gray-700 font-medium cursor-pointer">
                Este é o convênio principal
              </Label>
            </div>
            </div>
          </div>
          <DialogFooter className="gap-3 border-t border-gray-200 px-6 pb-6 pt-6 bg-white">
            <Button
              variant="outline"
              onClick={() => setShowConvenioDialog(false)}
              className="border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
              onClick={handleAddConvenio}
            >
              Adicionar Convênio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
