/**
 * 📎 AttachmentModal - Upload Attachments
 *
 * Modal para fazer upload de anexos (NF, boleto, comprovante, etc.)
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, Upload, FileIcon, Trash2 } from 'lucide-react';
import { Payable } from '../../types';
import { useFileUpload } from '../../hooks/useFileUpload';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    file: File;
    attachmentType: string;
  }) => Promise<void>;
  payable?: Payable;
  isLoading?: boolean;
  error?: string;
  existingAttachments?: Array<{
    id: string;
    file_name: string;
    attachment_type: string;
  }>;
  onDeleteAttachment?: (id: string) => Promise<void>;
}

const ATTACHMENT_TYPES = [
  { value: 'invoice', label: 'Nota Fiscal (NF-e)' },
  { value: 'proof', label: 'Comprovante de Pagamento' },
  { value: 'nfe', label: 'Arquivo XML' },
  { value: 'contract', label: 'Contrato' },
  { value: 'other', label: 'Outro' },
];

export function AttachmentModal({
  isOpen,
  onClose,
  onSubmit,
  payable,
  isLoading = false,
  error,
  existingAttachments = [],
  onDeleteAttachment,
}: AttachmentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<string>('invoice');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const fileUpload = useFileUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!selectedFile) {
        alert('Selecione um arquivo');
        return;
      }

      // Validar arquivo
      const validationError = fileUpload.validateFile(selectedFile, attachmentType);
      if (validationError) {
        alert(validationError);
        return;
      }

      // Fazer upload
      const uploadResult = await fileUpload.uploadFile(selectedFile, attachmentType);
      if (!uploadResult) {
        return; // Erro exibido pelo hook
      }

      // Chamar callback com dados do upload
      await onSubmit({
        file: selectedFile,
        attachmentType,
      });

      setSelectedFile(null);
      onClose();
    } catch (err) {
      // Error handled by parent
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!onDeleteAttachment) return;

    try {
      setDeleteLoading(id);
      await onDeleteAttachment(id);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Anexos</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {fileUpload.error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{fileUpload.error}</span>
          </div>
        )}

        {payable && (
          <div className="space-y-4">
            {/* Informações da Conta */}
            <div className="p-3 bg-gray-50 rounded-md space-y-2">
              <div>
                <p className="text-xs text-gray-500">Fornecedor</p>
                <p className="text-sm font-semibold">{payable.supplier_name}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">Descrição</p>
                <p className="text-sm text-gray-700 truncate">{payable.description}</p>
              </div>
            </div>

            {/* Anexos Existentes */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Anexos Atuais</p>
                <div className="space-y-2">
                  {existingAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {ATTACHMENT_TYPES.find((t) => t.value === attachment.attachment_type)
                              ?.label || attachment.attachment_type}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        disabled={deleteLoading === attachment.id}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {deleteLoading === attachment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Novo */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-semibold">Adicionar Anexo</p>

              {/* Tipo de Anexo */}
              <div>
                <Label htmlFor="attachmentType">Tipo de Anexo *</Label>
                <Select value={attachmentType} onValueChange={setAttachmentType}>
                  <SelectTrigger id="attachmentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTACHMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Input Arquivo */}
              <div>
                <Label htmlFor="fileInput">Selecionar Arquivo *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                  <input
                    id="fileInput"
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.xml,.txt,.jpg,.jpeg,.png,.docx,.xlsx"
                  />
                  <label
                    htmlFor="fileInput"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {selectedFile ? (
                        <>
                          <strong>{selectedFile.name}</strong>
                          <br />
                          ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </>
                      ) : (
                        <>
                          Clique para selecionar um arquivo
                          <br />
                          <span className="text-xs text-gray-500">
                            (máximo 10MB)
                          </span>
                        </>
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {/* Info sobre formatos */}
              <p className="text-xs text-gray-500">
                Formatos aceitos: PDF, XML, TXT, JPG, PNG, DOCX, XLSX
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Fechar
          </Button>
          {selectedFile && (
            <Button onClick={handleSubmit} disabled={isLoading || !selectedFile}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Fazer Upload'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AttachmentModal;
