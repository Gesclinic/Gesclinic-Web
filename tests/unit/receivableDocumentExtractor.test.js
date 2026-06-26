import { describe, expect, it } from 'vitest';
import { extractReceivableDocument, inferReceivableInvoiceNumberFromFileName } from '../../src/lib/receivableDocumentExtractor.js';

describe('receivableDocumentExtractor', () => {
  it('infere numero da NF pelo nome do arquivo XML quando necessario', () => {
    expect(inferReceivableInvoiceNumberFromFileName('NFSE_27244_1784300_1_1.xml')).toBe('27244');
    expect(inferReceivableInvoiceNumberFromFileName('NFE-30199.xml')).toBe('30199');
  });

  it('extrai campos financeiros de XML NFS-e municipal com tags em snake_case', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <nfse>
        <nf>
          <numero_nfse>27228</numero_nfse>
          <data_nfse>2026-06-12</data_nfse>
          <valor_total>321.45</valor_total>
          <valor_desconto>0.00</valor_desconto>
          <valor_ir>1.23</valor_ir>
          <observacao>Forma de pagamento: Cartao Debito | Final do cartao: 1234 | Medico: NEURO CENTRO - CRISTIANE EGEWARTH | CRM: 32942</observacao>
          <prestador>
            <cpfcnpj>12345678000190</cpfcnpj>
            <nome_razao_social>Neuroclinica Cascavel LTDA</nome_razao_social>
          </prestador>
          <tomador>
            <cpfcnpj>11122233344</cpfcnpj>
            <sobrenome_nome_fantasia>ADADA</sobrenome_nome_fantasia>
            <nome_razao_social>Convenio Exemplo</nome_razao_social>
          </tomador>
          <itens>
            <lista>
              <descritivo>Consulta neurologica</descritivo>
            </lista>
          </itens>
          <forma_pagamento>17</forma_pagamento>
        </nf>
      </nfse>`;

    const file = new File([xml], 'NFSE_27228_1784300_1_1.xml', { type: 'text/xml' });
    const extraction = await extractReceivableDocument(file);

    expect(extraction.documentType).toBe('nfse');
    expect(extraction.confidence).toBe('alta');
    expect(extraction.warnings).toEqual([]);
    expect(extraction.fields).toMatchObject({
      payer_name: 'Convenio Exemplo',
      payer_document: '11122233344',
      issuer_name: 'Neuroclinica Cascavel LTDA',
      issuer_document: '12345678000190',
      description: 'Consulta neurologica',
      amount: '321.45',
      taxes_value: '1.23',
      invoice_date: '2026-06-12',
      due_date: '2026-06-12',
      competency_date: '2026-06-12',
      payment_method: 'Cartao de debito',
      payment_date: '2026-06-12',
      guide_number: '27228',
      invoice_number: '27228',
      doctor_name: 'NEURO CENTRO - CRISTIANE EGEWARTH',
      doctor_crm: '32942',
      card_last4: '1234',
    });
  });

  it('extrai campos de XML com tags alternativas e labels livres', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <CompNfse>
        <Nfse>
          <NumeroNfse>30199</NumeroNfse>
          <DataEmissao>2026-06-13T09:20:00</DataEmissao>
          <ValoresNfse>
            <ValorServicos>700,00</ValorServicos>
            <ValorIss>21,00</ValorIss>
          </ValoresNfse>
          <TomadorServico>
            <IdentificacaoTomador>
              <CpfCnpj>
                <Cpf>12345678901</Cpf>
              </CpfCnpj>
            </IdentificacaoTomador>
            <DadosTomador>
              <RazaoSocial>MAURICIO BARCARO</RazaoSocial>
            </DadosTomador>
          </TomadorServico>
          <PrestadorServico>
            <IdentificacaoPrestador>
              <CpfCnpj>
                <Cnpj>12345678000190</Cnpj>
              </CpfCnpj>
            </IdentificacaoPrestador>
            <DadosPrestador>
              <RazaoSocial>Neuroclinica Cascavel LTDA</RazaoSocial>
            </DadosPrestador>
          </PrestadorServico>
          <Servico>
            <Descricao>Consulta medica especializada</Descricao>
          </Servico>
          <DataVencimento>13/06/2026</DataVencimento>
          <DataPagamento>2026-06-13</DataPagamento>
          <outrasInformacoes>
            Forma pagamento = cartao credito | Ultimos 4 digitos = 9876 | Profissional - CRISTIANE EGEWARTH | Conselho: CRM 32942
          </outrasInformacoes>
        </Nfse>
      </CompNfse>`;

    const file = new File([xml], 'NFSE_30199.xml', { type: 'text/xml' });
    const extraction = await extractReceivableDocument(file);

    expect(extraction.confidence).toBe('alta');
    expect(extraction.fields).toMatchObject({
      payer_name: 'MAURICIO BARCARO',
      payer_document: '12345678901',
      issuer_name: 'Neuroclinica Cascavel LTDA',
      issuer_document: '12345678000190',
      description: 'Consulta medica especializada',
      amount: '700.00',
      taxes_value: '21.00',
      invoice_date: '2026-06-13',
      due_date: '2026-06-13',
      payment_method: 'Cartao de credito',
      payment_date: '2026-06-13',
      guide_number: '30199',
      invoice_number: '30199',
      doctor_name: 'CRISTIANE EGEWARTH',
      doctor_crm: 'CRM 32942',
      card_last4: '9876',
    });
  });

  it('prioriza nNF exato em XML NF-e e ignora Numero generico de outros blocos', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <nfeProc>
        <NFe>
          <infNFe>
            <ide>
              <mod>55</mod>
              <nNF>432109</nNF>
              <dhEmi>2026-06-21T09:30:00-03:00</dhEmi>
            </ide>
            <dest><xNome>Paciente Exemplo</xNome><CPF>12345678901</CPF></dest>
            <emit><xNome>Clinica Exata LTDA</xNome><CNPJ>11222333000144</CNPJ></emit>
            <cobr><fat><Numero>44444444444444444444444444444444444444444444</Numero></fat></cobr>
            <total><ICMSTot><vNF>150.00</vNF></ICMSTot></total>
          </infNFe>
        </NFe>
      </nfeProc>`;

    const file = new File([xml], 'nfe-receber-prioridade.xml', { type: 'text/xml' });
    const extraction = await extractReceivableDocument(file);

    expect(extraction.documentType).toBe('nfe');
    expect(extraction.fields.invoice_number).toBe('432109');
    expect(extraction.fields.invoice_number).not.toBe('44444444444444444444444444444444444444444444');
    expect(extraction.fields.guide_number).toBe('432109');
  });

  it('deriva nNF da chave chNFe quando nNF nao estiver presente', async () => {
    const accessKey = '35260212345678000195550010000123456789012345';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <nfeProc>
        <NFe>
          <infNFe Id="NFe${accessKey}">
            <ide><mod>55</mod><dhEmi>2026-06-22T11:00:00-03:00</dhEmi></ide>
            <dest><xNome>Paciente Exemplo</xNome><CPF>12345678901</CPF></dest>
            <emit><xNome>Clinica Exata LTDA</xNome><CNPJ>11222333000144</CNPJ></emit>
            <total><ICMSTot><vNF>120.00</vNF></ICMSTot></total>
            <chNFe>${accessKey}</chNFe>
          </infNFe>
        </NFe>
      </nfeProc>`;

    const file = new File([xml], 'nfe-receber-chave.xml', { type: 'text/xml' });
    const extraction = await extractReceivableDocument(file);

    expect(extraction.documentType).toBe('nfe');
    expect(extraction.fields.invoice_number).toBe('12345');
    expect(extraction.fields.invoice_number).not.toBe(accessKey);
    expect(extraction.fields.guide_number).toBe('12345');
  });

  it('extrai numero da NF pela tag nDFSe em XML NFS-e', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <NFSe>
        <infNFSe>
          <nNFSe>4000</nNFSe>
          <nDFSe>15111734</nDFSe>
          <emit>
            <xNome>MANAGER CONSULTORIA EM INFORMATICA LTDA</xNome>
            <CNPJ>80750714000156</CNPJ>
          </emit>
          <valores>
            <vBC>3656.70</vBC>
          </valores>
        </infNFSe>
      </NFSe>`;

    const file = new File([xml], '42054072280750714000156000000000400026064873828638.xml', { type: 'text/xml' });
    const extraction = await extractReceivableDocument(file);

    expect(extraction.documentType).toBe('nfse');
    expect(extraction.fields.invoice_number).toBe('15111734');
    expect(extraction.fields.guide_number).toBe('15111734');
  });
});
