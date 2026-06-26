// src/pages/financeiro/RepasseTransferenciaPage.jsx
/**
 * Página: Configuração de Transferências Bancárias
 * Configura dados bancários dos profissionais e automatiza transferências
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { useClinicContext } from '../../contexts/ClinicContext';
import {
  salvarDadosBancarios,
  obterDadosBancarios,
  processarTransferenciasLote,
  obterHistoricoTransferencias,
} from '@/lib/repasseBancariaApi';
import {
  salvarConfiguracaoEmail,
  obterConfiguracaoEmail,
  enviarNotificacoesEmLote,
} from '@/lib/repasseEmailApi';
import { listProfessionals } from '@/lib/professionalsApi';

export default function RepasseTransferenciaPage() {
  const { user } = useAuth();
  const { clinic, clinicId } = useClinicContext();

  // Estados
  const [abaSelecionada, setAbaSelecionada] = useState('dados-bancarios'); // 'dados-bancarios', 'email', 'historico'
  const [profissionais, setProfissionais] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState(null);

  // Formulário - Dados Bancários
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [dadosBancarios, setDadosBancarios] = useState({
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: 'corrente',
    cpf_cnpj: '',
    tipo_chave: 'cpf',
    chave_pix: '',
    titular: '',
  });

  // Formulário - Email
  const [configEmail, setConfigEmail] = useState({
    provedor: 'sendgrid',
    chave_api: '',
    email_remetente: '',
    nome_remetente: clinic?.name || 'Gesclinic',
  });

  // Histórico
  const [historico, setHistorico] = useState([]);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, [clinicId]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const profList = await listProfessionals(clinicId);
      setProfissionais(profList);

      // Hardcoded popular Brazilian banks
      const bancosList = [
        { code: '001', name: 'Bradesco' },
        { code: '033', name: 'Banco Santander' },
        { code: '104', name: 'Caixa Econômica Federal' },
        { code: '341', name: 'Banco Itaú' },
        { code: '656', name: 'Banco do Brasil' },
        { code: '260', name: 'Nu Pagamentos S.A.' },
        { code: '655', name: 'Banco de Investimentos Global' },
      ];
      setBancos(bancosList);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados' });
    } finally {
      setCarregando(false);
    }
  };

  // Carregar dados bancários do profissional
  const carregarDadosProfissional = async (profId) => {
    try {
      setSelectedProfessional(profId);
      const dados = await obterDadosBancarios(profId, clinicId);
      if (dados) {
        setDadosBancarios(dados);
      } else {
        setDadosBancarios({
          banco: '',
          agencia: '',
          conta: '',
          tipo_conta: 'corrente',
          cpf_cnpj: '',
          tipo_chave: 'cpf',
          chave_pix: '',
          titular: '',
        });
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados' });
    }
  };

  // Salvar dados bancários
  const handleSalvarDadosBancarios = async () => {
    try {
      if (!selectedProfessional) {
        setMensagem({ tipo: 'aviso', texto: 'Selecione um profissional' });
        return;
      }

      setCarregando(true);
      await salvarDadosBancarios(selectedProfessional, clinicId, dadosBancarios);
      setMensagem({ tipo: 'sucesso', texto: 'Dados bancários salvos com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setCarregando(false);
    }
  };

  // Salvar configuração de email
  const handleSalvarEmail = async () => {
    try {
      setCarregando(true);
      await salvarConfiguracaoEmail(clinicId, configEmail);
      setMensagem({ tipo: 'sucesso', texto: 'Configuração de email salva!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setCarregando(false);
    }
  };

  // Carregar histórico
  const handleCarregarHistorico = async () => {
    try {
      setCarregando(true);
      const hist = await obterHistoricoTransferencias(clinicId);
      setHistorico(hist);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar histórico' });
    } finally {
      setCarregando(false);
    }
  };

  if (carregando && abaSelecionada === 'historico') {
    handleCarregarHistorico();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuração de Transferências</h1>
          <p className="text-gray-600 mt-2">PIX, TED e automação de pagamentos</p>
        </div>

        {/* Mensagens */}
        {mensagem && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-100 text-green-800'
                : mensagem.tipo === 'erro'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setAbaSelecionada('dados-bancarios')}
            className={`px-4 py-2 border-b-2 ${
              abaSelecionada === 'dados-bancarios'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            💳 Dados Bancários
          </button>
          <button
            onClick={() => setAbaSelecionada('email')}
            className={`px-4 py-2 border-b-2 ${
              abaSelecionada === 'email'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📧 Configuração de Email
          </button>
          <button
            onClick={() => {
              setAbaSelecionada('historico');
              handleCarregarHistorico();
            }}
            className={`px-4 py-2 border-b-2 ${
              abaSelecionada === 'historico'
                ? 'border-blue-500 text-blue-600 font-semibold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Histórico de Transferências
          </button>
        </div>

        {/* Conteúdo da Aba 1: Dados Bancários */}
        {abaSelecionada === 'dados-bancarios' && (
          <div className="space-y-6">
            {/* Seleção de Profissional */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Selecionar Profissional</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profissionais.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => carregarDadosProfissional(prof.id)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      selectedProfessional === prof.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{prof.name}</p>
                    <p className="text-sm text-gray-500">{prof.especialidade}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Formulário de Dados Bancários */}
            {selectedProfessional && (
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-xl font-bold">Dados Bancários</h2>

                {/* Banco */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                  <select
                    value={dadosBancarios.banco}
                    onChange={(e) =>
                      setDadosBancarios({ ...dadosBancarios, banco: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o banco</option>
                    {bancos.map((banco) => (
                      <option key={banco.code} value={banco.name}>
                        {banco.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Agência e Conta */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                    <input
                      type="text"
                      value={dadosBancarios.agencia}
                      onChange={(e) =>
                        setDadosBancarios({ ...dadosBancarios, agencia: e.target.value })
                      }
                      placeholder="0001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                    <input
                      type="text"
                      value={dadosBancarios.conta}
                      onChange={(e) =>
                        setDadosBancarios({ ...dadosBancarios, conta: e.target.value })
                      }
                      placeholder="123456-7"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Tipo de Conta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Conta
                  </label>
                  <select
                    value={dadosBancarios.tipo_conta}
                    onChange={(e) =>
                      setDadosBancarios({ ...dadosBancarios, tipo_conta: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="corrente">Corrente</option>
                    <option value="poupança">Poupança</option>
                  </select>
                </div>

                {/* CPF/CNPJ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <input
                    type="text"
                    value={dadosBancarios.cpf_cnpj}
                    onChange={(e) =>
                      setDadosBancarios({ ...dadosBancarios, cpf_cnpj: e.target.value })
                    }
                    placeholder="123.456.789-00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* PIX */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Configuração PIX</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Chave
                      </label>
                      <select
                        value={dadosBancarios.tipo_chave}
                        onChange={(e) =>
                          setDadosBancarios({ ...dadosBancarios, tipo_chave: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cpf">CPF</option>
                        <option value="email">Email</option>
                        <option value="telefone">Telefone</option>
                        <option value="aleatoria">Aleatória</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chave PIX
                      </label>
                      <input
                        type="text"
                        value={dadosBancarios.chave_pix}
                        onChange={(e) =>
                          setDadosBancarios({ ...dadosBancarios, chave_pix: e.target.value })
                        }
                        placeholder="seu.email@exemplo.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Titular */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titular da Conta
                  </label>
                  <input
                    type="text"
                    value={dadosBancarios.titular}
                    onChange={(e) =>
                      setDadosBancarios({ ...dadosBancarios, titular: e.target.value })
                    }
                    placeholder="Nome completo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Botão Salvar */}
                <button
                  onClick={handleSalvarDadosBancarios}
                  disabled={carregando}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition mt-6"
                >
                  💾 Salvar Dados Bancários
                </button>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba 2: Email */}
        {abaSelecionada === 'email' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">Configuração de Email</h2>

            {/* Provedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provedor</label>
              <select
                value={configEmail.provedor}
                onChange={(e) => setConfigEmail({ ...configEmail, provedor: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="sendgrid">SendGrid</option>
                <option value="aws_ses">AWS SES</option>
                <option value="mailgun">Mailgun</option>
                <option value="smtp">SMTP Customizado</option>
              </select>
            </div>

            {/* Chave API */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave API</label>
              <input
                type="password"
                value={configEmail.chave_api}
                onChange={(e) => setConfigEmail({ ...configEmail, chave_api: e.target.value })}
                placeholder="Insira sua chave de API"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtenha a chave em seu painel do {configEmail.provedor}
              </p>
            </div>

            {/* Email Remetente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Remetente
              </label>
              <input
                type="email"
                value={configEmail.email_remetente}
                onChange={(e) =>
                  setConfigEmail({ ...configEmail, email_remetente: e.target.value })
                }
                placeholder="noreply@clinica.com.br"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Nome Remetente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Remetente</label>
              <input
                type="text"
                value={configEmail.nome_remetente}
                onChange={(e) => setConfigEmail({ ...configEmail, nome_remetente: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botão Salvar */}
            <button
              onClick={handleSalvarEmail}
              disabled={carregando}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition mt-6"
            >
              💾 Salvar Configuração
            </button>
          </div>
        )}

        {/* Conteúdo da Aba 3: Histórico */}
        {abaSelecionada === 'historico' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Histórico de Transferências</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Profissional</th>
                    <th className="text-left py-3 px-4 font-semibold">Valor</th>
                    <th className="text-left py-3 px-4 font-semibold">Método</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((trans) => (
                    <tr key={trans.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{trans.professional?.name || 'N/A'}</td>
                      <td className="py-3 px-4 font-semibold">R$ {trans.valor?.toFixed(2)}</td>
                      <td className="py-3 px-4">{trans.metodo.toUpperCase()}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            trans.status === 'concluido'
                              ? 'bg-green-100 text-green-800'
                              : trans.status === 'pendente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {trans.status === 'concluido'
                            ? 'Estável'
                            : trans.status === 'pendente'
                              ? 'Atenção'
                              : 'Crítico'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(trans.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
