import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Save, AlertCircle, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getAlertConfigs, updateAlertConfig, createAlertConfig } from '@/lib/alertsApi';

/**
 * AlertSettings.jsx
 * Página de configuração de alertas por clínica
 */
const AlertSettings = () => {
  const { clinicId } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});

  // Carrega configurações
  const loadConfigs = async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      const data = await getAlertConfigs(clinicId);
      
      // Se não houver configs, cria padrões
      if (data.length === 0) {
        const defaultConfigs = [
          { alert_type: 'delinquency', is_enabled: true, severity_level: 'HIGH', check_frequency: 'DAILY' },
          { alert_type: 'repayment_late', is_enabled: true, severity_level: 'HIGH', check_frequency: 'DAILY' },
          { alert_type: 'low_cashflow', is_enabled: true, severity_level: 'CRITICAL', check_frequency: 'DAILY' },
          { alert_type: 'goal_missed', is_enabled: true, severity_level: 'MEDIUM', check_frequency: 'DAILY' }
        ];
        
        const created = await Promise.all(
          defaultConfigs.map(conf => createAlertConfig(clinicId, conf.alert_type, conf))
        );
        setConfigs(created);
      } else {
        setConfigs(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [clinicId]);

  // Atualiza mudança local
  const handleChange = (configId, field, value) => {
    setChanges(prev => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        [field]: value
      }
    }));
  };

  // Salva mudanças
  const handleSave = async (configId) => {
    if (!changes[configId]) return;

    try {
      setSaving(true);
      const config = configs.find(c => c.id === configId);
      const updates = { ...config, ...changes[configId] };
      
      await updateAlertConfig(clinicId, config.alert_type, updates);
      
      setConfigs(configs.map(c => c.id === configId ? updates : c));
      setChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[configId];
        return newChanges;
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Descrições de alertas
  const alertDescriptions = {
    delinquency: 'Notifique quando houver faturas vencidas',
    repayment_late: 'Notifique quando repasses estiverem atrasados por mais de 48h',
    low_cashflow: 'Notifique quando o fluxo de caixa estiver crítico',
    goal_missed: 'Notifique quando KPIs não atingirem as metas'
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8 text-blue-500" />
          Configurações de Alertas
        </h1>
        <p className="text-gray-500 mt-1">Personalize os alertas da sua clínica</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Carregando configurações...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {configs.map(config => {
            const current = changes[config.id] ? { ...config, ...changes[config.id] } : config;
            const hasChanges = !!changes[config.id];

            return (
              <Card key={config.id} className={hasChanges ? 'border-blue-300 bg-blue-50' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {config.alert_type.replace('_', ' ').toUpperCase()}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {alertDescriptions[config.alert_type]}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {current.is_enabled ? (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Toggle Ativo/Inativo */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={current.is_enabled}
                        onChange={(e) => handleChange(config.id, 'is_enabled', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        {current.is_enabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </label>
                  </div>

                  {/* Severidade */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Nível de Severidade</label>
                    <select
                      value={current.severity_level}
                      onChange={(e) => handleChange(config.id, 'severity_level', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="LOW">Baixo</option>
                      <option value="MEDIUM">Médio</option>
                      <option value="HIGH">Alto</option>
                      <option value="CRITICAL">Crítico</option>
                    </select>
                  </div>

                  {/* Frequência */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Frequência de Verificação</label>
                    <select
                      value={current.check_frequency}
                      onChange={(e) => handleChange(config.id, 'check_frequency', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="HOURLY">A cada hora</option>
                      <option value="3HOURLY">A cada 3 horas</option>
                      <option value="DAILY">Diariamente</option>
                    </select>
                  </div>

                  {/* Canais de Notificação */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-3">Canais de Notificação</label>
                    <div className="space-y-2">
                      {['email', 'sms', 'push', 'dashboard'].map(channel => (
                        <label key={channel} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={current.notify_channels?.[channel] || false}
                            onChange={(e) => handleChange(config.id, 'notify_channels', {
                              ...current.notify_channels,
                              [channel]: e.target.checked
                            })}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-600 flex items-center gap-1">
                            {channel === 'email' && <Mail className="w-4 h-4" />}
                            {channel === 'sms' && <MessageSquare className="w-4 h-4" />}
                            {channel === 'push' && <Bell className="w-4 h-4" />}
                            {channel === 'dashboard' && <Bell className="w-4 h-4" />}
                            {channel.charAt(0).toUpperCase() + channel.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Email Recipients */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Recipients de Email (um por linha)
                    </label>
                    <textarea
                      value={(current.email_recipients || []).join('\n')}
                      onChange={(e) => handleChange(config.id, 'email_recipients', e.target.value.split('\n').filter(Boolean))}
                      placeholder="admin@clinic.com&#10;financeiro@clinic.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                      rows="3"
                    />
                  </div>

                  {/* Botão Save */}
                  {hasChanges && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setChanges(prev => {
                          const newChanges = { ...prev };
                          delete newChanges[config.id];
                          return newChanges;
                        })}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => handleSave(config.id)}
                        disabled={saving}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Salvando...' : 'Salvar Mudanças'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertSettings;
