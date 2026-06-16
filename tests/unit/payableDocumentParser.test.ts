import { describe, expect, it } from 'vitest';
import { PaymentMethodType } from '../../src/modules/financeiro/contas-pagar/types';
import { parsePayableDocumentFile } from '../../src/modules/financeiro/contas-pagar/utils/payableDocumentParser';

describe('payableDocumentParser', () => {
  it('extrai campos de XML NF-e para contas a pagar', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <nfeProc>
        <NFe>
          <infNFe Id="NFe123">
            <ide>
              <mod>55</mod>
              <nNF>98765</nNF>
              <serie>2</serie>
              <dhEmi>2026-06-13T09:20:00-03:00</dhEmi>
            </ide>
            <emit>
              <CNPJ>11222333000144</CNPJ>
              <xNome>Fornecedor Hospitalar LTDA</xNome>
              <xFant>Fornecedor Hospitalar</xFant>
              <enderEmit>
                <xLgr>Rua Clinica</xLgr>
                <nro>123</nro>
                <xBairro>Centro</xBairro>
                <xMun>Cascavel</xMun>
                <UF>PR</UF>
                <CEP>85802005</CEP>
                <xPais>Brasil</xPais>
              </enderEmit>
              <fone>4533334444</fone>
            </emit>
            <det>
              <prod>
                <cProd>MED001</cProd>
                <xProd>Medicamento teste</xProd>
                <qCom>2.0000</qCom>
                <vUnCom>100.00</vUnCom>
                <vProd>200.00</vProd>
                <rastro>
                  <nLote>LT123</nLote>
                  <qLote>2.000</qLote>
                  <dFab>2026-01-01</dFab>
                  <dVal>2027-01-01</dVal>
                </rastro>
              </prod>
              <med>
                <cProdANVISA>1234567890123</cProdANVISA>
                <vPMC>120.00</vPMC>
              </med>
            </det>
            <total>
              <ICMSTot>
                <vNF>200.00</vNF>
                <vDesc>10.00</vDesc>
                <vICMS>12.00</vICMS>
              </ICMSTot>
            </total>
            <cobr><dup><nDup>001</nDup><dVenc>2026-07-13</dVenc><vDup>200.00</vDup></dup></cobr>
            <pag><detPag><tPag>17</tPag></detPag></pag>
          </infNFe>
        </NFe>
      </nfeProc>`;

    const file = new File([xml], 'nfe.xml', { type: 'application/xml' });
    const parsed = await parsePayableDocumentFile(file);

    expect(parsed?.document_type).toBe('nfe');
    expect(parsed?.confidence).toBe('alta');
    expect(parsed?.supplier_name).toBe('Fornecedor Hospitalar LTDA');
    expect(parsed?.supplier_address).toEqual({
      street: 'Rua Clinica',
      number: '123',
      district: 'Centro',
      city: 'Cascavel',
      state: 'PR',
      zip_code: '85802005',
      country: 'Brasil',
      phone: '4533334444',
    });
    expect(parsed?.document_number).toBe('11222333000144');
    expect(parsed?.invoice_number).toBe('98765');
    expect(parsed?.amount).toBe(200);
    expect(parsed?.discount_amount).toBe(10);
    expect(parsed?.due_date).toBe('2026-07-13');
    expect(parsed?.metadata.document_extraction.installments).toEqual([
      { number: 1, due_date: '2026-07-13', amount: 200 },
    ]);
    expect(parsed?.payment_method).toBe(PaymentMethodType.PIX);
    expect(parsed?.items[0].traceability[0].batch_number).toBe('LT123');
    expect(parsed?.metadata.document_extraction.documentType).toBe('nfe');
    expect(parsed?.metadata.nfe.supplier.address.city).toBe('Cascavel');
    expect(parsed?.metadata.nfe.supplier.phone).toBe('4533334444');
  });

  it('extrai parcelamento quando XML NF-e possui multiplas duplicatas', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <nfeProc>
        <NFe>
          <infNFe Id="NFeParcelada">
            <ide><mod>55</mod><nNF>123</nNF><serie>1</serie><dhEmi>2026-06-13T09:20:00-03:00</dhEmi></ide>
            <emit><CNPJ>11222333000144</CNPJ><xNome>Fornecedor Parcelado LTDA</xNome></emit>
            <det><prod><cProd>SERV1</cProd><xProd>Produto parcelado</xProd><qCom>1</qCom><vUnCom>300.00</vUnCom><vProd>300.00</vProd></prod></det>
            <total><ICMSTot><vNF>300.00</vNF></ICMSTot></total>
            <cobr>
              <dup><nDup>001</nDup><dVenc>2026-07-13</dVenc><vDup>100.00</vDup></dup>
              <dup><nDup>002</nDup><dVenc>2026-08-13</dVenc><vDup>200.00</vDup></dup>
            </cobr>
          </infNFe>
        </NFe>
      </nfeProc>`;

    const file = new File([xml], 'nfe-parcelada.xml', { type: 'application/xml' });
    const parsed = await parsePayableDocumentFile(file);

    expect(parsed?.due_date).toBe('2026-07-13');
    expect(parsed?.installments).toEqual([
      { number: 1, due_date: '2026-07-13', amount: 100 },
      { number: 2, due_date: '2026-08-13', amount: 200 },
    ]);
    expect(parsed?.metadata.document_installments).toEqual(parsed?.installments);
  });

  it('extrai campos basicos de cupom fiscal em texto', async () => {
    const text = `Farmacia Exemplo LTDA
      CNPJ: 11.222.333/0001-44
      COO: 123456
      Data: 13/06/2026
      Forma de pagamento: Cartao de Debito
      Valor Total: R$ 89,90`;

    const file = new File([text], 'cupom.txt', { type: 'text/plain' });
    const parsed = await parsePayableDocumentFile(file);

    expect(parsed?.document_type).toBe('receipt');
    expect(parsed?.supplier_name).toBe('Farmacia Exemplo LTDA');
    expect(parsed?.document_number).toBe('11.222.333/0001-44');
    expect(parsed?.invoice_number).toBe('123456');
    expect(parsed?.issue_date).toBe('2026-06-13');
    expect(parsed?.amount).toBe(89.9);
    expect(parsed?.payment_method).toBe(PaymentMethodType.DEBIT_CARD);
    expect(parsed?.metadata.document_extraction.documentType).toBe('receipt');
  });
});
