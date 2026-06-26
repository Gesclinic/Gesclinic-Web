/**
 * ============================================
 * PhotoCapture - CAPTURA DE FOTO COM CÂMERA
 * ============================================
 * Componente para capturar foto durante cadastro
 * Suporta câmera frontal/traseira em mobile
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const getCameraAccessMessage = (error) => {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'A câmera só funciona em ambiente seguro. Acesse por HTTPS ou localhost, ou use a opção de selecionar arquivo.';
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'Câmera indisponível neste navegador. Use a opção de selecionar arquivo.';
  }

  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Permissão da câmera negada. Libere a câmera no navegador e tente novamente, ou selecione uma foto do arquivo.';
  }

  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') {
    return 'Nenhuma câmera compatível foi encontrada neste dispositivo. Use a opção de selecionar arquivo.';
  }

  if (error?.name === 'NotReadableError' || error?.name === 'AbortError') {
    return 'A câmera está em uso por outro aplicativo ou não pôde ser iniciada. Feche outros aplicativos e tente novamente.';
  }

  return 'Não foi possível acessar a câmera. Verifique as permissões do navegador ou selecione uma foto do arquivo.';
};

export default function PhotoCapture({ onPhotoCapture, currentPhoto = null }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(currentPhoto);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // user = frontal, environment = traseira

  useEffect(() => () => stopCamera(), []);

  async function isCameraPermissionDenied() {
    try {
      if (!navigator.permissions?.query) {
        return false;
      }
      const permission = await navigator.permissions.query({ name: 'camera' });
      return permission.state === 'denied';
    } catch {
      return false;
    }
  }

  async function requestCamera(mode) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('MEDIA_DEVICES_UNAVAILABLE');
    }

    const constraints = {
      video: {
        facingMode: mode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
  }

  // Iniciar câmera
  async function startCamera() {
    try {
      setError(null);
      setIsVideoReady(false);

      if (await isCameraPermissionDenied()) {
        setError(getCameraAccessMessage({ name: 'NotAllowedError' }));
        return;
      }

      setIsCameraActive(true); // Ativar interface primeiro
      await requestCamera(facingMode);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setIsCameraActive(false); // Desativar se houver erro
      setError(getCameraAccessMessage(err));
    }
  }

  // Parar câmera
  function stopCamera() {
    const stream = streamRef.current || videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsVideoReady(false);
  }

  // Capturar foto
  function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;

      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;

      context.drawImage(video, 0, 0);

      const photoDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      setCapturedPhoto(photoDataUrl);

      // Chamar callback com a foto
      onPhotoCapture(photoDataUrl);

      stopCamera();
    }
  }

  // Alternar câmera (frontal/traseira)
  function toggleCamera() {
    stopCamera();
    setFacingMode((prev) => {
      const newMode = prev === 'user' ? 'environment' : 'user';
      // Reiniciar câmera com novo modo
      setTimeout(() => {
        startCameraWithMode(newMode);
      }, 100);
      return newMode;
    });
  }

  // Iniciar câmera com modo específico
  async function startCameraWithMode(mode) {
    try {
      setError(null);
      setIsVideoReady(false);

      if (await isCameraPermissionDenied()) {
        setError(getCameraAccessMessage({ name: 'NotAllowedError' }));
        return;
      }

      setIsCameraActive(true);
      await requestCamera(mode);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setIsCameraActive(false);
      setError(getCameraAccessMessage(err));
    }
  }

  // Upload de arquivo
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const photoDataUrl = event.target?.result;
      if (typeof photoDataUrl === 'string') {
        setCapturedPhoto(photoDataUrl);
        onPhotoCapture(photoDataUrl);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Erro ao ler arquivo');
    };
    reader.readAsDataURL(file);
  }

  // Resetar foto
  function resetPhoto() {
    setCapturedPhoto(null);
    setError(null);
  }

  return (
    <div className="w-full">
      <Card className="p-4">
        <div className="space-y-4">
          {/* Foto Capturada ou Câmera */}
          {capturedPhoto ? (
            <div className="space-y-3">
              <div className="flex justify-center bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={capturedPhoto}
                  alt="Foto do paciente"
                  className="w-full max-h-64 object-cover"
                />
              </div>
              <p className="text-sm text-green-700 font-medium">✓ Foto capturada com sucesso!</p>
            </div>
          ) : isCameraActive ? (
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg overflow-hidden border-4 border-blue-500 shadow-lg relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => setIsVideoReady(true)}
                  onCanPlay={() => setIsVideoReady(true)}
                  className="w-full min-h-96 max-h-screen object-cover"
                />
                {!isVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <p className="text-white text-center text-sm font-medium">Câmera abrindo...</p>
                  </div>
                )}
              </div>

              {/* Controles da Câmera */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleCamera}
                  className="flex-1"
                  title="Alternar câmera"
                >
                  🔄 Trocar Câmera
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    stopCamera();
                    setError(null);
                  }}
                  className="flex-1"
                >
                  ✕ Cancelar
                </Button>
              </div>

              {/* Botão Capturar */}
              <Button
                type="button"
                onClick={capturePhoto}
                disabled={!isVideoReady}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Camera size={18} />
                Capturar Foto
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={startCamera}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Camera size={18} />
                Abrir Câmera
              </Button>

              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  📁 Selecionar Arquivo
                </Button>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Botão Remover Foto */}
          {capturedPhoto && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetPhoto}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <RotateCcw size={16} className="mr-2" />
              Remover Foto
            </Button>
          )}
        </div>
      </Card>

      {/* Canvas Oculto */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
