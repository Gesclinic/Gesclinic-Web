/**
 * ============================================
 * DocumentosTab - Aba de Documentos
 * ============================================
 *
 * Listagem de documentos do paciente com design moderno (exames, atestados, etc)
 * Sem rota própria - parte do PatientDetailPage
 */

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Plus, Download, Eye, Trash2, FileText, Clock, File } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DOCUMENT_TYPES = [
  'Exame Laboratorial',
  'Exame de Imagem',
  'Prescrição Médica',
  'Atestado Médico',
  'Relatório Clínico',
  'Solicitação de Procedimento',
  'Outro',
];

export default function DocumentosTab({ patientId, patientData, updatePatientData }) {
  const { toast } = useToast();
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    title: '',
    type: 'Exame Laboratorial',
  });

  // Simulado: Em produção, buscar da API
  useEffect(() => {
    loadDocumentos();
  }, [patientId]);

  async function loadDocumentos() {
    setLoading(true);
    try {
      // Placeholder para carregamento da API
      setDocumentos([]);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar documentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = (id) => {
    setDocumentos(documentos.filter((d) => d.id !== id));
    toast({
      title: 'Sucesso',
      description: 'Documento removido',
    });
  };

  const handleDownload = (id, filename) => {
    toast({
      title: 'Download',
      description: `Iniciando download de ${filename}...`,
    });
  };

  const handleUploadSubmit = () => {
    if (!uploadData.file || !uploadData.title.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha o título e selecione um arquivo',
        variant: 'destructive',
      });
      return;
    }

    const novoDoc = {
      id: Date.now(),
      title: uploadData.title,
      fileName: uploadData.file.name,
      fileType: uploadData.type || 'Documento',
      uploadDate: new Date().toLocaleDateString('pt-BR'),
    };
    setDocumentos([...documentos, novoDoc]);
    setShowUploadDialog(false);
    setUploadData({ file: null, title: '', type: 'Exame Laboratorial' });
    toast({
      title: 'Sucesso',
      description: 'Documento enviado com sucesso',
    });
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) {
      return '📄';
    }
    if (fileType.includes('image')) {
      return '🖼️';
    }
    if (fileType.includes('word')) {
      return '📝';
    }
    return '📎';
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Cabeçalho com Botão Upload */}
      <motion.div
        className="flex justify-between items-start gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Documentos</h3>
          <p className="text-sm text-gray-500 mt-1">Exames, relatórios, prescrições e atestados</p>
        </div>
        <Button
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
          onClick={() => setShowUploadDialog(true)}
        >
          <Plus size={16} className="mr-2" />
          Upload de Documento
        </Button>
      </motion.div>

      {/* Lista de Documentos */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
            <p className="text-gray-500">Carregando documentos...</p>
          </CardContent>
        </Card>
      ) : documentos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="border-0 shadow-sm border-l-4 border-indigo-500 bg-indigo-50">
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4 font-medium">Nenhum documento adicionado</p>
              <p className="text-sm text-gray-500 mb-6">
                Faça upload de exames, relatórios e documentos importantes do paciente
              </p>
              <Button
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => setShowUploadDialog(true)}
              >
                <Plus size={16} className="mr-2" />
                Enviar Documento
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
          {documentos.map((doc, idx) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-l-4 border-indigo-500">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <File className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-base break-words">
                          {doc.title}
                        </h4>
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          <Badge className="bg-indigo-100 text-indigo-800 text-xs">
                            {doc.fileType}
                          </Badge>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {doc.uploadDate}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 break-all">{doc.fileName}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-200 hover:bg-gray-100 text-gray-600 h-9 w-9 p-0"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-200 hover:bg-gray-100 text-gray-600 h-9 w-9 p-0"
                        onClick={() => handleDownload(doc.id, doc.fileName)}
                      >
                        <Download size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 hover:bg-red-50 text-red-600 h-9 w-9 p-0"
                        onClick={() => handleDelete(doc.id)}
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

      {/* Dialog Upload de Documento */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content">
          <DialogHeader className="border-b border-gray-200 px-6 pb-4 pt-6">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Enviar Novo Documento
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                  Título do Documento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Ex: Exame de sangue - Colesterol"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                  Tipo de Documento <span className="text-red-500">*</span>
                </Label>
                <select
                  id="type"
                  value={uploadData.type}
                  onChange={(e) => setUploadData({ ...uploadData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white text-gray-700 mt-1.5"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="file" className="text-sm font-medium text-gray-700">
                  Selecionar Arquivo <span className="text-red-500">*</span>
                </Label>
                <input
                  id="file"
                  type="file"
                  onChange={(e) =>
                    setUploadData({ ...uploadData, file: e.target.files?.[0] || null })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm text-gray-700 file:mr-4 file:px-3 file:py-2 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer mt-1.5"
                />
                {uploadData.file && (
                  <p className="text-xs text-gray-500 mt-2">
                    Arquivo selecionado: {uploadData.file.name}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 border-t border-gray-200 px-6 pb-6 pt-6 bg-white">
            <Button
              variant="outline"
              onClick={() => setShowUploadDialog(false)}
              className="border-gray-200 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
              onClick={handleUploadSubmit}
            >
              Enviar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
