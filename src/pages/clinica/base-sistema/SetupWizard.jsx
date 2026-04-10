// src/pages/clinica/base-sistema/SetupWizard.jsx
// ============================================================
// SETUP WIZARD - Assistente de configuração inicial
// ============================================================
// Guia o usuário através dos passos necessários para
// configurar a clínica, validando e bloqueando features

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, ChevronRight, ArrowRight, Zap, Lock } from "lucide-react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import * as baseSystemApi from "@/lib/baseSystemApi";
import {
  SETUP_WIZARD_STEPS,
  SETUP_WIZARD_CATEGORIES,
  calculateWizardProgress,
  isWizardComplete,
  formatStepForUI,
} from "./setupWizardSteps";

export function SetupWizard({ onComplete, compactMode = false }) {
  const navigate = useNavigate();
  const { user, clinicId } = useAuth();
  const [wizardStatus, setWizardStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(
    "cadastros-estruturais"
  );

  // Load wizard status (only on mount or clinicId change)
  useEffect(() => {
    console.log("SetupWizard mounted, clinicId:", clinicId);
    if (clinicId) {
      loadWizardStatus();
    } else {
      // If no clinicId, set empty status
      setWizardStatus({});
      setLoading(false);
    }
  }, [clinicId]);

  async function loadWizardStatus() {
    try {
      setLoading(true);
      console.log("Loading wizard status for clinicId:", clinicId);
      const steps = await baseSystemApi.getSetupWizardStatus(clinicId);
      console.log("Steps received:", steps);

      const statusMap = {};
      if (Array.isArray(steps)) {
        steps.forEach((step) => {
          statusMap[step.step] = {
            completed: step.completed,
            count: step.count,
          };
        });
      }

      setWizardStatus(statusMap);
      setError(null);

      // Trigger callback se completado
      if (isWizardComplete(statusMap) && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Erro ao carregar status do wizard:", err);
      setError("Erro ao carregar status. Tente novamente.");
      setWizardStatus({});
    } finally {
      setLoading(false);
    }
  }

  if (!clinicId) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
            <span className="text-sm text-red-700">Nenhuma clínica associada. Por favor, faça login.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading || !wizardStatus) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Clock className="mr-2 h-5 w-5 animate-spin text-amber-600" />
            <span className="text-sm text-amber-700">Carregando configuração...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = calculateWizardProgress(wizardStatus);
  const isComplete = isWizardComplete(wizardStatus);

  // Modo compacto (para banner)
  if (compactMode) {
    return (
      <Card className={isComplete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className={isComplete ? "text-green-700 font-semibold" : "text-amber-700 font-semibold"}>
                  {isComplete ? "? Configuração Completa" : "Configuração da Clínica"}
                </span>
                <span className={isComplete ? "text-green-700" : "text-amber-700"}>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isComplete ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={() => navigate("/clinica/base-sistema")}
              variant={isComplete ? "outline" : "default"}
              size="sm"
              className="w-full"
            >
              {isComplete ? "Ir para Base do Sistema" : "Completar Configuração"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modo completo
  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">{error}</p>
                <Button
                  onClick={loadWizardStatus}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview - Melhorado */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span>Setup Wizard</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Verifique o que já está configurado e o que ainda precisa ser ajustado para liberar o sistema
              </CardDescription>
            </div>
            <Badge variant={isComplete ? "default" : "secondary"} className="text-lg px-3 py-1">
              {progress}% ?
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar com animação */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    isComplete 
                      ? "bg-gradient-to-r from-green-400 to-green-600" 
                      : "bg-gradient-to-r from-blue-400 to-indigo-600"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-600">Obrigatórios</p>
                <p className="text-lg font-bold text-blue-600">
                  {SETUP_WIZARD_STEPS.filter((s) => wizardStatus[s.id]?.completed && s.required).length}/
                  {SETUP_WIZARD_STEPS.filter((s) => s.required).length}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-600">Opcionais</p>
                <p className="text-lg font-bold text-indigo-600">
                  {SETUP_WIZARD_STEPS.filter((s) => wizardStatus[s.id]?.completed && !s.required).length}/
                  {SETUP_WIZARD_STEPS.filter((s) => !s.required).length}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-bold text-green-600">
                  {SETUP_WIZARD_STEPS.filter((s) => wizardStatus[s.id]?.completed).length}/
                  {SETUP_WIZARD_STEPS.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories - Modelo correto: diagnóstico + um botão por grupo */}
      {Object.entries(SETUP_WIZARD_CATEGORIES).map(([categoryId, category]) => {
        const categorySteps = category.steps;
        const completedSteps = categorySteps.filter((s) => wizardStatus[s.id]?.completed).length;
        const requiredSteps = categorySteps.filter((s) => s.required).length;
        const completedRequired = categorySteps.filter((s) => s.required && wizardStatus[s.id]?.completed).length;
        
        // Determinar status da categoria
        const isCategoryComplete = completedSteps === categorySteps.length;
        const isBlocked = categoryId !== "cadastros-estruturais" && 
          !isWizardComplete(SETUP_WIZARD_CATEGORIES["cadastros-estruturais"].steps.reduce((acc, s) => {
            acc[s.id] = wizardStatus[s.id];
            return acc;
          }, {}));

        const buttonLabels = {
          "cadastros-estruturais": "Acessar Cadastros",
          "regras-operacionais": "Configurar Regras",
          "parametros-financeiros": "Configurar Financeiro"
        };

        const buttonRoutes = {
          "cadastros-estruturais": "#",
          "regras-operacionais": "#",
          "parametros-financeiros": "#"
        };

        return (
          <Card 
            key={categoryId}
            className={`transition-all duration-300 border-2 ${
              isCategoryComplete
                ? "border-green-300 bg-green-50 shadow-md"
                : isBlocked
                ? "border-gray-300 bg-gray-50 opacity-60"
                : `border-${category.color}-300 bg-${category.color}-50 shadow-md`
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Cor categoria */}
                  <div
                    className={`w-1.5 h-12 rounded-full ${
                      isCategoryComplete
                        ? "bg-green-500"
                        : isBlocked
                        ? "bg-gray-400"
                        : `bg-${category.color}-500`
                    } shadow-md`}
                  />
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-xl">{category.icon}</span>
                      {category.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {isCategoryComplete && "? Completo"}
                      {isBlocked && "?? Bloqueado (complete o anterior)"}
                      {!isCategoryComplete && !isBlocked && `${completedRequired}/${requiredSteps} obrigatórios concluídos`}
                    </CardDescription>
                  </div>
                </div>

                {/* Status Badge */}
                {isCategoryComplete && (
                  <Badge className="bg-green-600 text-white">Completo ?</Badge>
                )}
                {isBlocked && (
                  <Badge variant="secondary" className="text-gray-600 flex gap-1">
                    <Lock className="h-3 w-3" />
                    Bloqueado
                  </Badge>
                )}
              </div>
            </CardHeader>

            {/* Conteúdo: lista informativa (NÃO clicável) */}
            <CardContent className="space-y-3">
              {categorySteps.map((step) => {
                const status = wizardStatus[step.id] || {};
                const isCompleted = status.completed;

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isCompleted
                        ? "bg-green-50 border-green-200"
                        : step.required
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : step.required ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${
                        isCompleted ? "text-green-900" : "text-gray-900"
                      }`}>
                        {step.title}
                      </p>
                      {isCompleted && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mt-1 text-xs">
                          ? {status.count} item(ns)
                        </Badge>
                      )}
                      {!isCompleted && step.required && (
                        <Badge variant="destructive" className="mt-1 text-xs">Obrigatório</Badge>
                      )}
                      {!isCompleted && !step.required && (
                        <Badge variant="secondary" className="opacity-70 mt-1 text-xs">Opcional</Badge>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ? UM ÚNICO BOTÃO POR CATEGORIA (fonte de navegação segura) */}
              <Button
                disabled={isBlocked}
                className={`w-full mt-4 ${
                  isCategoryComplete
                    ? "bg-green-600 hover:bg-green-700"
                    : isBlocked
                    ? "bg-gray-400 cursor-not-allowed"
                    : `bg-${category.color}-600 hover:bg-${category.color}-700`
                }`}
                title={isBlocked ? "Complete a categoria anterior" : `Acessar ${category.title} no menu lateral`}
              >
                {buttonLabels[categoryId]}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Tooltip de orientação */}
              {isBlocked && (
                <p className="text-xs text-gray-600 text-center mt-2">
                  Complete a categoria anterior para liberar
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ?? PRÓXIMOS PASSOS - APENAS TEXTO (sem navegação) */}
      {!isComplete && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Próximos Passos
            </CardTitle>
            <CardDescription>
              Siga este roteiro para completar a configuração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-blue-600 min-w-6">1.</span>
                <span className="text-sm text-gray-700">Cadastre os <strong>serviços</strong> que sua clínica oferece</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-blue-600 min-w-6">2.</span>
                <span className="text-sm text-gray-700">Cadastre os <strong>profissionais</strong> que prestam os serviços</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-blue-600 min-w-6">3.</span>
                <span className="text-sm text-gray-700">Vincule os profissionais aos serviços que podem realizar</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-blue-600 min-w-6">4.</span>
                <span className="text-sm text-gray-700">Configure as <strong>regras de agenda</strong> para cada serviço</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 font-bold text-blue-600 min-w-6">5.</span>
                <span className="text-sm text-gray-700">Defina os <strong>preços</strong> e <strong>repasses</strong> financeiros</span>
              </li>
            </ol>
            <p className="text-xs text-gray-600 mt-4 p-3 bg-white rounded border border-blue-100">
              ? <strong>Dica:</strong> Use o menu lateral para acessar cada seção. O assistente aqui mostra apenas o status de configuração.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completion Message */}
      {isComplete && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 mt-0.5 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <p className="text-base font-bold text-green-900">
                  ?? Configuração Completa!
                </p>
                <p className="text-sm text-green-800 mt-2">
                  Todos os passos obrigatórios foram concluídos. Sua clínica está pronta para usar todos os módulos do sistema.
                </p>
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => navigate("/clinica/agenda")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Ir para Agenda
                  </Button>
                  <Button
                    onClick={() => navigate("/clinica/dashboard")}
                    variant="outline"
                  >
                    Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

