import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  AlertNotificationManager,
} from './AlertNotificationManager';

/**
 * Painel de configuração de alertas e notificações
 * Permite: Email notifications, Threshold customization, Report scheduling
 */
export function AlertSettingsPanel() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    emailCritical: true,
    emailDigest: false,
    digestFrequency: 'daily',
    deletionThreshold: 3,
    rapidChangesThreshold: 5,
    outOfHoursAlert: true,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      if (!user?.id) return;

      const prefs = await AlertNotificationManager.getNotificationPreferences(user.id);
      const customThresholds = AlertNotificationManager.getAlertThreshold();

      setSettings({
        emailCritical: prefs?.email_critical_alerts ?? true,
        emailDigest: prefs?.email_daily_digest ?? false,
        digestFrequency: prefs?.frequency ?? 'daily',
        deletionThreshold: customThresholds.deletions,
        rapidChangesThreshold: customThresholds.rapidChanges,
        outOfHoursAlert: true,
      });

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user?.id) return;

      // Salvar preferências no banco
      await AlertNotificationManager.saveNotificationPreferences(user.id, settings);

      // Salvar thresholds localmente
      AlertNotificationManager.setAlertThreshold({
        deletions: settings.deletionThreshold,
        rapidChanges: settings.rapidChangesThreshold,
      });

      // Agendar relatório se necessário
      if (settings.emailDigest) {
        await AlertNotificationManager.scheduleReportEmail(
          localStorage.getItem('clinic_id'),
          user.id,
          settings.digestFrequency
        );
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Carregando configurações...</div>;
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">⚙️ Configurações de Alertas</h3>

        {/* Email Notifications Section */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-4">📧 Notificações por Email</h4>

          <div className="space-y-4">
            {/* Critical Alerts Email */}
            <div className="flex items-center justify-between p-3 bg-red-50 rounded border border-red-200">
              <div>
                <label className="font-semibold text-red-900">Alertas Críticos</label>
                <p className="text-xs text-red-700 mt-1">
                  Receber email imediatamente quando alertas críticos são detectados
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailCritical}
                onChange={e =>
                  setSettings({ ...settings, emailCritical: e.target.checked })
                }
                className="w-5 h-5 cursor-pointer"
              />
            </div>

            {/* Daily Digest Email */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
              <div>
                <label className="font-semibold text-blue-900">Relatório Diário</label>
                <p className="text-xs text-blue-700 mt-1">
                  Receber email com resumo diário/semanal de atividades
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailDigest}
                onChange={e =>
                  setSettings({ ...settings, emailDigest: e.target.checked })
                }
                className="w-5 h-5 cursor-pointer"
              />
            </div>

            {/* Digest Frequency */}
            {settings.emailDigest && (
              <div className="p-3 bg-blue-50 rounded">
                <label className="block font-semibold text-blue-900 mb-2">
                  Frequência do Relatório
                </label>
                <select
                  value={settings.digestFrequency}
                  onChange={e =>
                    setSettings({ ...settings, digestFrequency: e.target.value })
                  }
                  className="w-full p-2 border rounded bg-white"
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Alert Thresholds Section */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-4">🎯 Limites de Alertas</h4>

          <div className="space-y-4">
            {/* Deletion Threshold */}
            <div className="p-3 bg-orange-50 rounded border border-orange-200">
              <label className="font-semibold text-orange-900 block mb-2">
                Deleções em {settings.deletionThreshold}h
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.deletionThreshold}
                onChange={e =>
                  setSettings({
                    ...settings,
                    deletionThreshold: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-orange-700 mt-2">
                <span>1 deleção</span>
                <span className="font-bold">{settings.deletionThreshold}</span>
                <span>10+ deleções</span>
              </div>
              <p className="text-xs text-orange-700 mt-2">
                Alerta se {settings.deletionThreshold}+ agendamentos forem deletados em 1 hora
              </p>
            </div>

            {/* Rapid Changes Threshold */}
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <label className="font-semibold text-yellow-900 block mb-2">
                Mudanças Rápidas
              </label>
              <input
                type="range"
                min="2"
                max="15"
                value={settings.rapidChangesThreshold}
                onChange={e =>
                  setSettings({
                    ...settings,
                    rapidChangesThreshold: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-yellow-700 mt-2">
                <span>2 mudanças</span>
                <span className="font-bold">{settings.rapidChangesThreshold}</span>
                <span>15+ mudanças</span>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Alerta se {settings.rapidChangesThreshold}+ mudanças ocorrerem em 5 minutos
              </p>
            </div>
          </div>
        </div>

        {/* Other Settings */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-4">🔔 Outras Configurações</h4>

          <div className="space-y-4">
            {/* Out of Hours Alert */}
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded border border-purple-200">
              <div>
                <label className="font-semibold text-purple-900">Alertar Fora do Horário</label>
                <p className="text-xs text-purple-700 mt-1">
                  Alerta se atividades ocorrerem fora do horário comercial (6h-18h)
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.outOfHoursAlert}
                onChange={e =>
                  setSettings({ ...settings, outOfHoursAlert: e.target.checked })
                }
                className="w-5 h-5 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            className="bg-blue-600 text-white hover:bg-blue-700 flex-1"
          >
            💾 Salvar Configurações
          </Button>

          {saved && (
            <div className="flex-1 bg-green-100 border border-green-400 text-green-800 p-3 rounded text-sm font-semibold text-center">
              ✓ Configurações salvas com sucesso!
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
          <p className="text-xs text-blue-800">
            <strong>💡 Nota:</strong> Estas configurações se aplicam apenas ao seu usuário.
            Administradores podem definir políticas globais de auditoria nas configurações da clínica.
          </p>
        </div>
      </div>
    </Card>
  );
}
