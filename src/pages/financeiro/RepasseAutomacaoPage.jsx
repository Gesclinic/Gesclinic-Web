import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function RepasseAutomacaoPage() {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [automacoes, setAutomacoes] = useState({
    fechar_repasse_automatico: false,
    gerar_pix_automatico: false,
  });

  const [configAutom, setConfigAutom] = useState({
    dia_fechamento: 28,
    dia_envio_pix: 25,
    modo_teste: true,
  });

  // TODO: Integrar com API para carregar histórico de automações
  const [logs, setLogs] = useState([]);

  const handleToggleAutomacao = (automacao) => {
    setAutomacoes((prev) => ({
      ...prev,
      [automacao]: !prev[automacao],
    }));
  };

  const handleSalvarAutomacoes = async () => {
    try {
      // TODO: Integrar com API para salvar automações
      console.log('Salvando automações:', { automacoes, configAutom });
    } catch (err) {
      console.error('Erro ao salvar automações:', err);
    }
  };

  const handleExecutarAgora = async (tipo) => {
    try {
      console.log(`Executando ${tipo} agora...`);
      // TODO: Executar automação
    } catch (err) {
      console.error(`Erro ao executar ${tipo}:`, err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Automações</h3>
        <p className="text-sm text-blue-800">
          Configure processos automatizados para fechamento de repasses e geração de transferências
          PIX. As automações serão executadas conforme o cronograma definido.
        </p>
      </div>

      {/* Aviso: Modo Teste */}
      {configAutom.modo_teste && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-yellow-900">🧪 Modo Teste Ativado</h4>
            <p className="text-sm text-yellow-800">
              As automações estão em modo teste e não executarão de verdade. Désative para ativar
              modo produção.
            </p>
          </div>
        </div>
      )}

      {/* 1. Fechar Repasse Automático */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📅 Fechar Repasse Automaticamente</CardTitle>
              <CardDescription>
                Encerre automaticamente o cálculo de repassos em um dia específico do mês
              </CardDescription>
            </div>
            <Switch
              checked={automacoes.fechar_repasse_automatico}
              onCheckedChange={() => handleToggleAutomacao('fechar_repasse_automatico')}
            />
          </div>
        </CardHeader>

        {automacoes.fechar_repasse_automatico && (
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <strong>✓ Ativo:</strong> O repasse será fechado automaticamente no dia{' '}
                {configAutom.dia_fechamento}ํ de cada mês às 00:00
              </div>
            </div>

            <div>
              <Label htmlFor="dia-fechamento">Dia do Mês para Fechar Repasse</Label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  id="dia-fechamento"
                  type="number"
                  min="1"
                  max="31"
                  value={configAutom.dia_fechamento}
                  onChange={(e) =>
                    setConfigAutom((prev) => ({
                      ...prev,
                      dia_fechamento: parseInt(e.target.value),
                    }))
                  }
                  className="w-20 px-3 py-2 border rounded-lg"
                />
                <span className="text-sm text-gray-600">do mês</span>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
              <p className="font-medium text-gray-900 mb-2">Próximas execuções:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• 28 de março de 2026</li>
                <li>• 28 de abril de 2026</li>
                <li>• 28 de maio de 2026</li>
              </ul>
            </div>

            <Button
              onClick={() => handleExecutarAgora('fechar_repasse')}
              variant="outline"
              className="w-full"
            >
              ▶️ Executar Agora
            </Button>
          </CardContent>
        )}
      </Card>

      {/* 2. Gerar PIX Automático */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>💳 Gerar PIX Automaticamente</CardTitle>
              <CardDescription>
                Gere automaticamente QR Codes PIX para transferências aos profissionais
              </CardDescription>
            </div>
            <Switch
              checked={automacoes.gerar_pix_automatico}
              onCheckedChange={() => handleToggleAutomacao('gerar_pix_automatico')}
            />
          </div>
        </CardHeader>

        {automacoes.gerar_pix_automatico && (
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <strong>✓ Ativo:</strong> PIX será gerado automaticamente no dia{' '}
                {configAutom.dia_envio_pix}ํ de cada mês às 08:00
              </div>
            </div>

            <div>
              <Label htmlFor="dia-pix">Dia do Mês para Gerar PIX</Label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  id="dia-pix"
                  type="number"
                  min="1"
                  max="31"
                  value={configAutom.dia_envio_pix}
                  onChange={(e) =>
                    setConfigAutom((prev) => ({ ...prev, dia_envio_pix: parseInt(e.target.value) }))
                  }
                  className="w-20 px-3 py-2 border rounded-lg"
                />
                <span className="text-sm text-gray-600">do mês</span>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-2">⚙️ Configuração de PIX</p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <label>Incluir descrição no PIX (ex: "Repasse Médico - Março 2026")</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <label>Enviar email com QR Code para o profissional</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <label>Gerar relatório PDF com todos os PIX</label>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleExecutarAgora('gerar_pix')}
              variant="outline"
              className="w-full"
            >
              ▶️ Gerar PIX Agora
            </Button>
          </CardContent>
        )}
      </Card>

      {/* 3. Modo Teste */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Modo Teste</CardTitle>
          <CardDescription>
            Desative o modo teste para executar automações em produção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
            <label>Ativar Modo Teste</label>
            <Switch
              checked={configAutom.modo_teste}
              onCheckedChange={(checked) =>
                setConfigAutom((prev) => ({ ...prev, modo_teste: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Histórico de Execuções */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Histórico de Execuções</CardTitle>
          <CardDescription>Últimas automações executadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded border text-sm"
              >
                <div
                  className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                    log.status === 'sucesso' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{log.evento}</p>
                  <p className="text-xs text-gray-500">{log.data}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-gray-900">{log.valor}</p>
                  <p
                    className={`text-xs font-semibold ${
                      log.status === 'sucesso' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {log.status === 'sucesso' ? '✓' : '✗'} {log.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSalvarAutomacoes} className="bg-blue-600 hover:bg-blue-700">
          Salvar Configuração
        </Button>
      </div>
    </div>
  );
}
