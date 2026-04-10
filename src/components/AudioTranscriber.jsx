/**
 * =============================================
 * AudioTranscriber - Componente para Gravar e Transcrever Áudio
 * =============================================
 * 
 * Usa Web Speech API para transcrever áudio em tempo real
 * - Grava áudio do microfone
 * - Transcreve automaticamente COM PREVIEW EM TEMPO REAL
 * - Suporta múltiplos idiomas
 * - Sem necessidade de API key
 */

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function AudioTranscriber({ onTranscribe, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [supportedBrowser, setSupportedBrowser] = useState(true);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const { toast } = useToast();

  // Configuração inicial do Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("⚠️ Web Speech API não suportada neste navegador");
      setSupportedBrowser(false);
      return;
    }

    setSupportedBrowser(true);
    
    const recognition = new SpeechRecognition();
    recognition.language = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // ========== EVENTOS ==========
    recognition.onstart = () => {
      console.log("🎤 [ONSTART] Gravação iniciada");
      finalTranscriptRef.current = "";
      setLiveText("");
      setIsRecording(true);
      console.log("✅ Estados atualizados");
    };

    recognition.onresult = (event) => {
      console.log("\n========== ONRESULT ==========");
      console.log("📊 results.length:", event.results.length);
      
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        
        console.log(`   [${i}] isFinal=${isFinal}, transcript="${transcript}"`);
        
        if (isFinal) {
          finalTranscriptRef.current += transcript + " ";
          console.log("  ✅ FINAL adicionado");
        } else {
          interim += transcript;
          console.log("  📝 INTERIM capturado");
        }
      }

      const display = finalTranscriptRef.current + interim;
      console.log("🎬 Display completo:", display);
      setLiveText(display);
      console.log("========== ONRESULT END ==========\n");
    };

    recognition.onerror = (event) => {
      console.error("❌ [ONERROR]:", event.error);
      
      let msg = "Erro ao transcrever";
      if (event.error === "no-speech") msg = "Nenhum áudio detectado";
      if (event.error === "not-allowed") msg = "Permissão negada";
      if (event.error === "audio-capture") msg = "Nenhum microfone";
      if (event.error === "network") msg = "Erro de conexão";
      
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive",
      });
      
      setIsRecording(false);
      setLiveText("");
    };

    recognition.onend = () => {
      console.log("✅ [ONEND] Gravação finalizada");
      console.log("📝 Text final:", finalTranscriptRef.current);
      setIsRecording(false);

      if (finalTranscriptRef.current.trim()) {
        console.log("📤 Enviando:", finalTranscriptRef.current.trim());
        onTranscribe(finalTranscriptRef.current.trim());
        setLiveText("");
      }
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (!supportedBrowser) {
      toast({
        title: "Navegador Incompatível",
        description: "Use Chrome, Edge ou Safari para usar gravação de áudio.",
        variant: "destructive",
      });
      return;
    }

    if (!recognitionRef.current) {
      toast({
        title: "Erro",
        description: "Speech Recognition não inicializado",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      console.warn("⚠️ Já está gravando");
      return;
    }

    try {
      finalTranscriptRef.current = "";
      setLiveText("");
      console.log("🎙️ Iniciando gravação...");
      recognitionRef.current.start();
    } catch (err) {
      console.error("❌ Erro ao iniciar:", err);
      toast({
        title: "Erro",
        description: "Erro ao iniciar gravação de áudio",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    if (!recognitionRef.current || !isRecording) {
      console.warn("⚠️ Não está gravando");
      return;
    }

    try {
      console.log("⏹️ Parando gravação...");
      recognitionRef.current.stop();
    } catch (err) {
      console.error("❌ Erro ao parar:", err);
    }
  };

  if (!supportedBrowser) {
    return (
      <div className="flex gap-2 items-center">
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-2 text-gray-400"
          title="Navegador não suporta gravação de áudio"
        >
          <AlertCircle className="w-4 h-4" />
          Áudio não suportado
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center flex-wrap">
        {!isRecording ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartRecording}
            disabled={disabled}
            className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Clique para gravar áudio. Fale claramente após iniciar."
          >
            <Mic className="w-4 h-4" />
            🎤 Gravar Áudio
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStopRecording}
            className="gap-2 animate-pulse"
            title="Clique para parar a gravação"
          >
            <Square className="w-4 h-4" />
            ⏹️ Parar Gravação
          </Button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 text-red-500 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-xs font-medium">Gravando...</span>
          </div>
        )}
      </div>

      {/* Preview do texto em tempo real */}
      {liveText && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-xs text-blue-700 mb-1">📝 Transcrição em tempo real:</p>
          <p className="text-gray-700 leading-relaxed">{liveText}</p>
        </div>
      )}
    </div>
  );
}
