/**
 * 📁 File Upload Hook
 * Hook para fazer upload de arquivos para Supabase Storage
 */

import { useState, useCallback } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';

// ============================================================
// TYPES
// ============================================================

interface UploadProgress {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UploadResult {
  path: string;
  publicUrl: string;
  filename: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const ALLOWED_FILE_TYPES = {
  invoice: { formats: ['.pdf', '.xml', '.txt', '.jpg', '.jpeg', '.png'], mimeTypes: ['application/pdf', 'text/xml', 'application/xml', 'text/plain', 'image/jpeg', 'image/png'] },
  proof: { formats: ['.pdf', '.jpg', '.jpeg', '.png'], mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
  nfe: { formats: ['.xml'], mimeTypes: ['text/xml', 'application/xml'] },
  contract: { formats: ['.pdf', '.docx', '.doc'], mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  other: { formats: ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx'], mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const STORAGE_BUCKET = 'finance_docs';

// ============================================================
// HOOK
// ============================================================

export function useFileUpload() {
  const { clinicId } = useClinicContext();
  const [state, setState] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  /**
   * Validar arquivo antes de upload
   */
  const validateFile = useCallback(
    (file: File, attachmentType: string): string | null => {
      // Validar tamanho
      if (file.size > MAX_FILE_SIZE) {
        return `Arquivo muito grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB)`;
      }

      // Validar tipo
      const allowedFormats = ALLOWED_FILE_TYPES[attachmentType as keyof typeof ALLOWED_FILE_TYPES];
      if (!allowedFormats) {
        return 'Tipo de anexo inválido';
      }

      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedFormats.formats.includes(fileExt)) {
        return `Formato não permitido. Use: ${allowedFormats.formats.join(', ')}`;
      }

      return null; // Válido
    },
    []
  );

  /**
   * Fazer upload do arquivo para Supabase Storage
   */
  const uploadFile = useCallback(
    async (
      file: File,
      attachmentType: string
    ): Promise<UploadResult | null> => {
      if (!clinicId || !file) {
        setState({ isUploading: false, progress: 0, error: 'Dados inválidos' });
        return null;
      }

      // Validar arquivo
      const validationError = validateFile(file, attachmentType);
      if (validationError) {
        setState({ isUploading: false, progress: 0, error: validationError });
        return null;
      }

      setState({ isUploading: true, progress: 0, error: null });

      try {
        // Gerar ID único (timestamp + random)
        const now = new Date();
        const safeId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

        // Construir path: {clinic_id}/ap_docs/{YYYY}/{MM}/{safeId}_{filename}
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const path = `${clinicId}/ap_docs/${year}/${month}/${safeId}_${file.name}`;

        // Fazer upload
        const { error: uploadError } = await supabase
          .storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream',
          });

        if (uploadError) {
          throw new Error(uploadError.message || 'Erro ao fazer upload');
        }

        // Obter URL pública
        const { data: urlData } = supabase
          .storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        const publicUrl = urlData?.publicUrl || '';

        setState({ isUploading: false, progress: 100, error: null });

        return {
          path,
          publicUrl,
          filename: file.name,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload';
        setState({ isUploading: false, progress: 0, error: errorMessage });
        return null;
      }
    },
    [clinicId, validateFile]
  );

  return {
    ...state,
    uploadFile,
    validateFile,
  };
}
