import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AtendimentoTabs from "@/components/clinica/Atendimento/AtendimentoTabs";
import DadosAtendimentoTab from "@/components/clinica/Atendimento/DadosAtendimentoTab";
import GuiaConvenioTab from "@/components/clinica/Atendimento/GuiaConvenioTab";
import EvolucaoAtendimentoTab from "@/components/clinica/Atendimento/EvolucaoAtendimentoTab";
import FinanceiroAtendimentoTab from "@/components/clinica/Atendimento/FinanceiroAtendimentoTab";
import DocumentosAtendimentoTab from "@/components/clinica/Atendimento/DocumentosAtendimentoTab";

export default function Atendimento() {
  const { id } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [guide, setGuide] = useState({});
  const [financeiro, setFinanceiro] = useState(null);
  const [evolucao, setEvolucao] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [activeTab, setActiveTab] = useState("dados");

  // Salvar guia do convênio
  async function handleSaveGuide(fields) {
    if (!id) return;
    // Se já existe guia, faz update, senão insert
    if (guide && guide.id) {
      await supabase
        .from('appointment_guides')
        .update({ ...fields })
        .eq('id', guide.id);
      setGuide({ ...guide, ...fields });
    } else {
      const { data: newGuide } = await supabase
        .from('appointment_guides')
        .insert([{ ...fields, appointment_id: id }])
        .select()
        .single();
      setGuide(newGuide);
    }
    alert('Guia salva com sucesso!');
  }

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      // Buscar atendimento pelo id da URL
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*, patient:patients(*), professional:professionals(*), service:services(*)')
        .eq('id', id)
        .single();
      setAppointment(apptData);

      // Buscar guia vinculada
      const { data: guideData } = await supabase
        .from('appointment_guides')
        .select('*')
        .eq('appointment_id', id)
        .single();
      setGuide(guideData || {});

      // Buscar financeiro vinculado
      const { data: finData } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('appointment_id', id)
        .single();
      setFinanceiro(finData || null);

      // Buscar evolução (mock)
      setEvolucao(apptData?.evolucao || "");

      // Buscar documentos (mock)
      setDocumentos([]);
    }
    fetchData();
  }, [id]);

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-semibold flex items-center gap-2 mb-1">Atendimento</h1>
      {appointment && (
        <>
          <div className="text-sm mb-4 flex flex-col gap-2">
            <div style={{ marginTop: 24 }}></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '32px', fontSize: '1.15rem', marginBottom: 12 }}>
              <span><b>Prontuário:</b> {appointment.patient?.record_number || 'Não existe'}</span>
              <span><b>Paciente:</b> {appointment.patient?.full_name || 'Paciente não informado'}</span>
              <span><b>Data de nascimento:</b> {appointment.patient?.birth_date || '-'}</span>
              <span><b>CPF:</b> {appointment.patient?.cpf || '-'}</span>
              <span><b>Telefone:</b> {appointment.patient?.phone || '-'}</span>
              <span><b>Celular:</b> {appointment.patient?.cellphone || '-'}</span>
            </div>
          </div>
          <AtendimentoTabs activeTab={activeTab} setActiveTab={setActiveTab}>
            {activeTab === "dados" && <DadosAtendimentoTab appointment={appointment} />}
            {activeTab === "guia" && <GuiaConvenioTab guide={guide} onSave={handleSaveGuide} />}
            {activeTab === "evolucao" && <EvolucaoAtendimentoTab evolucao={evolucao} />}
            {activeTab === "financeiro" && (
              <FinanceiroAtendimentoTab
                financeiro={financeiro}
                isConvenio={appointment?.payer_id || appointment?.insurance_id}
                bloqueado={
                  (appointment?.payer_id || appointment?.insurance_id) &&
                  (!guide?.guide_number || !guide?.authorization_code)
                }
                onGerarCobranca={async () => {
                  // Gera cobrança para particular
                  const payload = {
                    appointment_id: id,
                    type: 'particular',
                    amount: appointment?.price || 0,
                    discount: 0,
                    net_amount: appointment?.price || 0,
                    payment_method: null,
                    status: 'pending',
                  };
                  const { data } = await supabase
                    .from('financial_transactions')
                    .insert([payload])
                    .select()
                    .single();
                  setFinanceiro(data);
                  alert('Cobrança gerada!');
                }}
                onGerarFaturamento={async () => {
                  // Gera faturamento para convênio
                  const payload = {
                    appointment_id: id,
                    type: 'convenio',
                    amount: appointment?.price || 0,
                    discount: 0,
                    net_amount: appointment?.price || 0,
                    payment_method: 'convenio',
                    status: 'pending',
                  };
                  const { data } = await supabase
                    .from('financial_transactions')
                    .insert([payload])
                    .select()
                    .single();
                  setFinanceiro(data);
                  // Cria registro de faturamento
                  await supabase
                    .from('billing_records')
                    .insert([
                      {
                        appointment_id: id,
                        insurance_id: appointment?.payer_id || appointment?.insurance_id,
                        status: 'open',
                      },
                    ]);
                  alert('Faturamento gerado!');
                }}
              />
            )}
            {activeTab === "documentos" && <DocumentosAtendimentoTab documentos={documentos} />}
          </AtendimentoTabs>
        </>
      )}
    </div>
  );
}

