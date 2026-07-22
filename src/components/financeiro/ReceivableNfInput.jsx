import React, { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, ExternalLink, FileText, Paperclip, X } from 'lucide-react';

export default function ReceivableNfInput({
  selectedFile,
  selectedFiles = [],
  onFileSelected,
  onFilesSelected,
  currentUrl = null,
  currentName = null,
  label = 'Documento/NF',
  multiple = false,
}) {
  const id = useId();
  const fileInputId = `${id}-file`;
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [draggingFile, setDraggingFile] = useState(false);

  const processFiles = (files) => {
    if (multiple) {
      onFilesSelected?.(files);
      return;
    }
    onFileSelected?.(files[0] || null);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera indisponivel neste navegador. Use a opcao de anexar arquivo.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      setCameraError(
        error?.name === 'NotAllowedError'
          ? 'Permissao da camera negada. Libere a camera no navegador e tente novamente.'
          : 'Nao foi possivel abrir a camera neste dispositivo.',
      );
    }
  };

  const openCamera = () => {
    setCameraOpen(true);
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      setCameraError('Camera ainda nao esta pronta. Tente novamente em alguns segundos.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Nao foi possivel capturar a foto.');
        return;
      }
      const file = new File([blob], `nf-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, {
        type: 'image/jpeg',
      });
      onFileSelected(file);
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  useEffect(() => {
    if (cameraOpen) {
      startCamera();
    }
  }, [cameraOpen]);

  useEffect(() => () => stopCamera(), []);

  return (
    <div
      className={`rounded border bg-white p-3 transition ${draggingFile ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-100' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDraggingFile(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDraggingFile(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDraggingFile(false);
        processFiles(Array.from(event.dataTransfer.files || []));
      }}
    >
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <FileText className="w-4 h-4 text-blue-600" />
        {label}
      </Label>

      {currentUrl && (
        <a
          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
          href={currentUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="w-3 h-3" />
          {currentName || 'Abrir documento atual'}
        </a>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="gap-2" asChild>
          <label htmlFor={fileInputId} className="cursor-pointer">
            <Paperclip className="w-4 h-4" />
            Anexar arquivo
          </label>
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={openCamera}>
          <Camera className="w-4 h-4" />
          Tirar foto
        </Button>
      </div>

      <Input
        id={fileInputId}
        type="file"
        accept=".pdf,.xml,.txt,.jpg,.jpeg,.png,image/*"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          processFiles(Array.from(event.target.files || []));
        }}
      />
      <p className="mt-2 text-xs text-slate-500">
        Arraste PDF/XML/imagem para esta área, selecione um arquivo ou capture uma foto pela camera do dispositivo.
      </p>
      {selectedFile && (!multiple || selectedFiles.length <= 1) && (
        <p className="mt-2 text-xs font-medium text-slate-700">
          Selecionado: {selectedFile.name}
        </p>
      )}
      {multiple && selectedFiles.length > 1 && (
        <p className="mt-2 text-xs font-medium text-slate-700">
          Selecionados: {selectedFiles.length} arquivo(s)
        </p>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Tirar foto do documento/NF</h3>
                <p className="text-sm text-slate-500">Posicione o documento dentro do quadro e capture.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeCamera}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="overflow-hidden rounded border bg-slate-950">
              {cameraError ? (
                <div className="p-6 text-center text-sm text-white">{cameraError}</div>
              ) : (
                <video
                  ref={videoRef}
                  className="max-h-[65vh] w-full bg-black object-contain"
                  playsInline
                  muted
                  autoPlay
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeCamera}>
                Fechar
              </Button>
              <Button type="button" className="bg-blue-600 text-white" onClick={capturePhoto} disabled={!!cameraError}>
                <Camera className="mr-2 w-4 h-4" />
                Capturar foto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}