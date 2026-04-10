/**
 * ============================================
 * PhotoCapture - CAPTURA DE FOTO COM CÂMERA
 * ============================================
 * Componente para capturar foto durante cadastro
 * Suporta câmera frontal/traseira em mobile
 */

import React, { useRef, useState } from "react";
import { Camera, Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PhotoCapture({ onPhotoCapture, currentPhoto = null }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(currentPhoto);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState("user"); // user = frontal, environment = traseira

  // Iniciar câmera
  async function startCamera() {
    try {
      setError(null);
      setIsCameraActive(true); // Ativar interface primeiro

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setIsCameraActive(false); // Desativar se houver erro
      setError(
        "Não foi possível acessar a câmera. Verifique as permissões do navegador."
      );
    }
  }

  // Parar câmera
  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  }

  // Capturar foto
  function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      const video = videoRef.current;

      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;

      context.drawImage(video, 0, 0);

      const photoDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);
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
      const newMode = prev === "user" ? "environment" : "user";
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

      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setError(
        "Não foi possível acessar a câmera. Verifique as permissões do navegador."
      );
    }
  }

  // Upload de arquivo
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const photoDataUrl = event.target?.result;
      if (typeof photoDataUrl === "string") {
        setCapturedPhoto(photoDataUrl);
        onPhotoCapture(photoDataUrl);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError("Erro ao ler arquivo");
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
              <p className="text-sm text-green-700 font-medium">
                ✓ Foto capturada com sucesso!
              </p>
            </div>
          ) : isCameraActive ? (
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg overflow-hidden border-4 border-blue-500 shadow-lg relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full min-h-96 max-h-screen object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <p className="text-white text-center text-sm font-medium">Câmera abrindo...</p>
                </div>
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
