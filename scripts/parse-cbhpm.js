#!/usr/bin/env node
/**
 * Parser CBHPM - Extrai todos os procedimentos do formato textual
 * Gera arquivo JSON para importação
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dados brutos fornecidos - COMPLETO
const rawData = `10101012	Em consultório (no horário normal ou preestabelecido)	R$ 92,21
10101020	Em domicílio	
10101039	Em pronto socorro	R$ 92,21
10102019	Visita hospitalar a paciente internado	R$ 45,08
10103015	Atendimento ao recém-nascido em berçário	R$ 144,26
10103031	Atendimento ao recém-nascido em sala de parto (parto normal ou operatório de alto risco)	R$ 247,95
10103023	Atendimento ao recém-nascido em sala de parto (parto normal ou operatório de baixo risco)	R$ 213,01
10104011	Atendimento do intensivista diarista (por dia e por paciente)	R$ 60,86
10104020	Atendimento médico do intensivista em UTI geral ou pediátrica (plantão de 12 horas - por paciente)	R$ 144,26
10105077	Acompanhamento médico para transporte intra-hospitalar de pacientes graves, com ventilação assistida, da UTI para o centro de diagnóstico	R$ 60,86
10105050	Transporte extra-hospitalar aéreo ou aquático de pacientes graves, 1ª hora - a partir do deslocamento do médico	R$ 172,44
10105069	Transporte extra-hospitalar aéreo ou aquático de pacientes graves, por hora adicional	R$ 60,86
10105034	Transporte extra-hospitalar terrestre de pacientes graves, 1ª hora - a partir do deslocamento do médico	R$ 144,26
10105042	Transporte extra-hospitalar terrestre de pacientes graves, por hora adicional - até o retorno do médico à base	R$ 60,86
10106014	Aconselhamento genético	R$ 172,44
10106146	Atendimento ambulatorial em puericultura	R$ 126,23
10106030	Atendimento ao familiar do adolescente	R$ 33,81
10106049	Atendimento pediátrico a gestantes (3º trimestre)	R$ 60,86
10106111	Exame de aptidão física e mental para concessão de benefícios fiscais conferidos pela Secretaria da Receita Federal e da Fazenda Estadual, a que fazem jus portadores de mobilidade reduzida, com necessidade de adaptação veicular	R$ 60,86
10106120	Exame de aptidão física e mental para ratificação, quando a condição física e mental assim o requerer, dos exames realizados pelo órgão previdenciário, incluindo restrição ou liberação para a condução de veículo automotor	R$ 60,86
10106065	Exame de aptidão física e mental, ou em portadores de mobilidade reduzida, para fins de inscrição ou renovação de CNH (Carteira Nacional de Habilitação)	R$ 60,86
10106073	Junta Médica (três ou mais profissionais) - destina-se ao esclarecimento diagnóstico ou decisão de conduta em caso de difícil solução - por profissional	R$ 126,23
10106138	Prova de direção veicular em banca especial - Avaliação Clínica durante a prova prática de direção veicular procedida por dois médicos simultaneamente - por profissional	R$ 126,23
20101210	Acompanhamento clínico ambulatorial pós-transplante de córnea - por avaliação do 11º ao 30º dia até 3 avaliações	R$ 60,86
20101228	Acompanhamento clínico ambulatorial pós-transplante de medula óssea	R$ 60,86
20101015	Acompanhamento clínico ambulatorial pós-transplante renal - por avaliação	R$ 60,86
20101023	Análise da proporcionalidade cineantropométrica	R$ 11,27
20101201	Avaliação clínica e eletrônica de paciente portador de marca-passo ou sincronizador ou desfibrilador	R$ 138,63
20101090	Avaliação da composição corporal por antropometria (inclui consulta)	R$ 60,86
20101104	Avaliação da composição corporal por bioimpedanciometria	R$ 32,26
20101112	Avaliação da composição corporal por pesagem hidrostática	R$ 11,27
20101074	Avaliação nutrológica (inclui consulta)	R$ 60,86
20101082	Avaliação nutrológica pré e pós-cirurgia bariátrica (inclui consulta)	R$ 60,86
20101120	Controle anti-doping (por período de 2 horas) - durante competições	R$ 229,92
20101139	Controle anti-doping (por período de 2 horas) - fora de competições	R$ 229,92
20101155	Prestação de serviços em delegações ou competições esportivas	R$ 344,88
20101171	Rejeição de enxerto renal - tratamento ambulatorial - avaliação clínica diária	R$ 72,13
20102011	Holter de 24 horas - 2 ou mais canais - analógico	R$ 150,07
20102020	Holter de 24 horas - 3 canais - digital	R$ 200,62
20102062	Monitor de eventos sintomáticos por 15 a 30 dias (LOOPER)	R$ 433,92
20102038	Monitorização ambulatorial da pressão arterial - MAPA (24 horas)	R$ 200,62
20102070	Tilt teste	R$ 200,62
20103018	Adaptação e treinamento de recursos ópticos para visão subnormal (por sessão) - binocular	R$ 22,54
20103026	Amputação bilateral (preparação do coto)	R$ 43,01
20103034	Amputação bilateral (treinamento protético)	R$ 42,11
20103042	Amputação unilateral (preparação do coto)	R$ 28,63
20103050	Amputação unilateral (treinamento protético)	R$ 28,89
20103069	Assistência fisiátrica respiratória em pré e pós-operatório de condições cirúrgicas	R$ 26,43
20103077	Ataxias	R$ 36,79
20103093	Atendimento fisiátrico no pré e pós-operatório de pacientes para prevenção de sequelas	R$ 22,54
20103107	Atendimento fisiátrico no pré e pós-parto	R$ 22,54
20103115	Atividade reflexa ou aplicação de técnica cinesioterápica específica	R$ 22,54
20103123	Atividades em escola de postura (máximo de 10 pessoas) - por sessão	R$ 33,81
20103131	Biofeedback com EMG	R$ 77,58
20103140	Bloqueio fenólico, alcoólico ou com toxina botulínica por segmento corporal	R$ 197,71
20103158	Confecção de órteses em material termo-sensível (por unidade)	R$ 27,98
20103166	Confecção de prótese imediata	R$ 115,47
20103174	Confecção de prótese provisória	R$ 93,83
20103182	Desvios posturais da coluna vertebral	R$ 22,54
20103190	Disfunção vésico-uretral	R$ 24,61
20103204	Distrofia simpático-reflexa	R$ 39,64
20103212	Distúrbios circulatórios artério-venosos e linfáticos	R$ 36,80
20103220	Doenças pulmonares atendidas em ambulatório	R$ 28,24
20103239	Exercícios de ortóptica (por sessão)	R$ 11,27
20103247	Exercícios para reabilitação do asmático (ERAC) - por sessão coletiva	R$ 16,97
20103255	Exercícios para reabilitação do asmático (ERAI) - por sessão individual	R$ 28,24
20103263	Hemiparesia	R$ 48,32
20103271	Hemiplegia	R$ 49,36
20103280	Hemiplegia e hemiparesia com afasia	R$ 49,62
20103298	Hipo ou agenesia de membros	R$ 27,98
20103301	Infiltração de ponto gatilho (por músculo) ou agulhamento seco (por músculo)	R$ 99,18
20103310	Lesão nervosa periférica afetando mais de um nervo com alterações sensitivas e/ou motoras	R$ 39,00
20103328	Lesão nervosa periférica afetando um nervo com alterações sensitivas e/ou motoras	R$ 39,00
20103336	Manipulação vertebral	R$ 60,86
20103344	Miopatias	R$ 38,61
20103360	Paciente com D.P.O.C. em atendimento ambulatorial necessitando reeducação e reabilitação respiratória	R$ 40,81
20103379	Paciente em pós-operatório de cirurgia cardíaca, atendido em ambulatório, duas a três vezes por semana	R$ 22,54
20103387	Pacientes com doença isquêmica do coração, atendido em ambulatório de 8 a 24 semanas	R$ 22,54
20103395	Pacientes com doença isquêmica do coração, atendido em ambulatório, até 8 semanas de programa	R$ 22,54
20103409	Pacientes com doenças neuro-músculo-esqueléticas com envolvimento tegumentar	R$ 24,36
20103417	Pacientes sem doença coronariana clinicamente manifesta, mas considerada de alto risco, atendido em ambulatório, duas a três vezes por semana	R$ 47,55
20103425	Paralisia cerebral	R$ 52,73
20103433	Paralisia cerebral com distúrbio de comunicação	R$ 50,91
20103441	Paraparesia/tetraparesia	R$ 42,37
20103450	Paraplegia e tetraplegia	R$ 40,55
20103468	Parkinson	R$ 48,06
20103476	Patologia neurológica com dependência de atividades da vida diária	R$ 45,09
20103514	Patologia osteomioarticular em diferentes segmentos da coluna	R$ 65,30
20103492	Patologia osteomioarticular em dois ou mais membros	R$ 52,86
20103484	Patologia osteomioarticular em um membro	R$ 39,90
20103506	Patologia osteomioarticular em um segmento da coluna	R$ 37,31
20103522	Patologias osteomioarticulares com dependência de atividades da vida diária	R$ 41,98
20103549	Procedimentos mesoterápicos (por região anatômica)	R$ 35,11
20103557	Procedimentos mesoterápicos com calcitonina (qualquer segmento)	R$ 35,11
20103565	Processos inflamatórios pélvicos	R$ 28,50
20103581	Programa de exercício supervisionado com obtenção de eletrocardiograma e/ou saturação de O2 - sessão coletiva	R$ 11,27
20103573	Programa de exercício supervisionado com obtenção de eletrocardiograma e/ou saturação de O2 - sessão individual	R$ 11,27
20103603	Programa de exercício supervisionado sem obtenção de eletrocardiograma e/ou saturação de O2 - sessão coletiva	R$ 11,27
20103590	Programa de exercício supervisionado sem obtenção de eletrocardiograma e/ou saturação de O2 - sessão individual	R$ 11,27
20103611	Queimados - seguimento ambulatorial para prevenção de sequelas (por segmento)	R$ 37,70
20103727	Reabilitação cardíaca supervisionada. Programa de 12 semanas. Duas a três sessões por semana (por sessão)	R$ 33,81
20103620	Reabilitação de paciente com endoprótese	R$ 32,39
20103638	Reabilitação labiríntica (por sessão)	R$ 46,77
20103646	Reabilitação perineal com biofeedback	R$ 251,84
20103654	Recuperação funcional de distúrbios crânio-faciais	R$ 26,95
20103530	Recuperação funcional pós-operatória ou por imobilização da patologia vertebral	R$ 45,48`;

function parseData() {
  const lines = rawData.split("\n").filter((line) => line.trim());
  console.log(`📊 Parsing ${lines.length} linhas...\n`);

  const procedures = [];
  let lineNum = 0;

  try {
    for (const line of lines) {
      lineNum++;
      const parts = line.split("\t");

      if (parts.length < 2) continue;

      const codigo = parts[0]?.trim();
      let descricao = parts[1]?.trim() || "";
      let valor_str = parts[2]?.trim() || "";

      // Validar código
      if (!/^\d{8}$/.test(codigo)) {
        console.warn(`⚠️ Linha ${lineNum}: Código inválido "${codigo}"`);
        continue;
      }

      // Extrair valor
      let valor = null;
      if (valor_str && valor_str !== "") {
        const valorMatch = valor_str.match(/R\$\s*([\d,]+)/);
        if (valorMatch) {
          valor = parseFloat(valorMatch[1].replace(",", "."));
        }
      }

      procedures.push({
        codigo_cbhpm: codigo,
        descricao_completa: descricao,
        valor_base: valor || 0,
        ativo: true,
      });
    }

    console.log(`✅ ${procedures.length} procedimentos extraídos com sucesso\n`);
    console.log("📊 Amostra:");
    procedures.slice(0, 3).forEach((p) => {
      console.log(`   ${p.codigo_cbhpm}: ${p.descricao_completa} = R$ ${p.valor_base}`);
    });

    return procedures;
  } catch (err) {
    console.error(`❌ Erro ao fazer parsing linha ${lineNum}:`, err.message);
    return [];
  }
}

// Exportar dados processados
const procedures = parseData();
const outputPath = path.join(__dirname, "cbhpm-data.json");
fs.writeFileSync(outputPath, JSON.stringify(procedures, null, 2));
console.log(`\n✅ Dados salvos em: ${outputPath}`);
console.log(`📦 Total: ${procedures.length} procedimentos`);
