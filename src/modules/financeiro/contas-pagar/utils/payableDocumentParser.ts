import { PaymentMethodType } from '../types';

export interface ParsedPayableDocument {
  document_type?: 'nfe' | 'nfce' | 'nfse' | 'sat_cfe' | 'receipt' | 'xml' | 'document';
  confidence?: 'alta' | 'media' | 'baixa';
  warnings?: string[];
  supplier_name?: string;
  supplier_address?: {
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    phone?: string;
  };
  document_number?: string;
  invoice_number?: string;
  guide_number?: string;
  invoice_series?: string;
  issue_date?: string;
  due_date?: string;
  amount?: number;
  discount_amount?: number;
  description?: string;
  payment_method?: PaymentMethodType;
  installments?: Array<{
    number: number;
    due_date?: string;
    amount?: number;
  }>;
  items: Array<{
    code?: string;
    description: string;
    quantity?: number;
    unit_value?: number;
    total_value?: number;
    anvisa_code?: string;
    pmc_value?: number;
    traceability: Array<{
      batch_number?: string;
      batch_quantity?: number;
      manufacture_date?: string;
      expiration_date?: string;
      aggregation_code?: string;
    }>;
  }>;
  taxes: Record<string, number>;
  metadata: Record<string, any>;
}

function localName(element: Element | null | undefined): string {
  return element?.localName?.toLowerCase() || '';
}

function allElements(parent: Element | Document): Element[] {
  return Array.from(parent.getElementsByTagName('*'));
}

function elementsByLocalName(parent: Element | Document, names: string[]): Element[] {
  const normalized = names.map((name) => name.toLowerCase());
  return allElements(parent).filter((element) => normalized.includes(localName(element)));
}

function firstElement(parent: Element | Document, names: string[]): Element | null {
  const normalized = names.map((name) => name.toLowerCase());
  return allElements(parent).find((element) => normalized.includes(localName(element))) || null;
}

function textFrom(parent: Element | Document | null | undefined, ...names: string[]): string {
  if (!parent) return '';
  const normalized = names.map((name) => name.toLowerCase());
  const element = allElements(parent).find((item) => normalized.includes(localName(item)));
  return element?.textContent?.trim() || '';
}

function parseMoney(value?: string | number | null): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const cleaned = String(value)
    .replace(/R\$|BRL/gi, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '');
  if (!cleaned) return undefined;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberFrom(parent: Element | Document | null | undefined, ...names: string[]): number | undefined {
  const value = textFrom(parent, ...names);
  if (!value) return undefined;
  return parseMoney(value);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  return values.find((value) => String(value || '').trim())?.trim();
}

function firstNumber(...values: Array<number | null | undefined>): number | undefined {
  return values.find((value) => Number.isFinite(value));
}

function regexExtract(xmlText: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = xmlText.match(pattern);
    const value = match?.[1] || match?.[0];
    if (value?.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function inferInvoiceNumberFromFileName(fileName: string, documentType?: ParsedPayableDocument['document_type']): string | undefined {
  const base = String(fileName || '').replace(/\.[a-z0-9]+$/i, '').trim();
  if (!base) return undefined;

  // Padrões legíveis (ex.: NFSE_27244_..., NFE-30199)
  const explicit = base.match(/(?:^|[_\-\s])NFS?E?[_\-\s]*(\d{2,})(?:[_\-\s.]|$)/i)
    || base.match(/(?:^|[_\-\s])NFE[_\-\s]*(\d{2,})(?:[_\-\s.]|$)/i)
    || base.match(/(?:^|[_\-\s])NF[_\-\s]*(\d{2,})(?:[_\-\s.]|$)/i);
  if (explicit?.[1]) return explicit[1].replace(/^0+/, '') || '0';

  const digits = onlyDigits(base);
  if (!digits) return undefined;

  // Em muitos layouts NFS-e de prefeitura, o numero da nota vem como bloco imediatamente
  // antes do marcador de competencia (ex.: 2606 para 2026/06) no nome do arquivo.
  if (documentType === 'nfse' && digits.length >= 20) {
    const markerRegex = /2\d(0[1-9]|1[0-2])/g;
    let marker: RegExpExecArray | null;
    let markerIndex = -1;
    while ((marker = markerRegex.exec(digits)) !== null) {
      markerIndex = marker.index;
    }

    if (markerIndex > 0) {
      const prefix = digits.slice(0, markerIndex);
      const blockBeforeMarker = prefix.match(/0*([1-9]\d{1,11})$/)?.[1];
      if (blockBeforeMarker) return blockBeforeMarker;
    }
  }

  return undefined;
}

function onlyDigits(value?: string | null): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizeInvoiceNumberCandidate(value?: string | null): string | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const digits = onlyDigits(raw);
  // Para notas fiscais brasileiras, usamos preferencialmente o formato numerico.
  return digits || raw;
}

function inferInvoiceNumberFromCandidates(
  candidates: Array<string | undefined>,
  options: { documentType?: ParsedPayableDocument['document_type']; model?: string; xmlText?: string },
): string | undefined {
  const isNfeLike = options.documentType === 'nfe' || options.documentType === 'nfce' || options.model === '55' || options.model === '65';
  const accessKeyInXml = onlyDigits(options.xmlText?.match(/<(?:\w+:)?chNFe\b[^>]*>\s*([0-9]{44})\s*<\/(?:\w+:)?chNFe>/i)?.[1] || '');
  if (isNfeLike && accessKeyInXml) {
    const accessKeyNnf = accessKeyInXml.slice(25, 34).replace(/^0+/, '');
    if (accessKeyNnf) return accessKeyNnf;
  }

  const normalized = Array.from(new Set(
    candidates
      .map((candidate) => normalizeInvoiceNumberCandidate(candidate))
      .filter(Boolean) as string[],
  ));
  if (!normalized.length) return undefined;

  const nonAccessKey = normalized.find((candidate) => {
    const digits = onlyDigits(candidate);
    return digits.length >= 1 && digits.length <= 12;
  });
  if (nonAccessKey) return nonAccessKey;

  const first = normalized[0];
  const firstDigits = onlyDigits(first);
  // Quando vier uma chave de acesso (44 digitos), nunca usamos a chave inteira como numero da NF.
  // Extraimos o bloco nNF (9 digitos) da posicao padrao para evitar exibicao de identificadores longos.
  if (firstDigits.length === 44) {
    const nnf = firstDigits.slice(25, 34).replace(/^0+/, '');
    if (nnf) return nnf;
  }

  return first;
}

function dateOnly(value: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (match?.[0]) return match[0];
  const brMatch = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return brMatch ? `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}` : undefined;
}

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLabeledText(text: string, labels: string[]): string | undefined {
  const normalized = normalizeText(text);
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:=\\-]?\\s*([^\\n|;]+)`, 'i');
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function extractLabeledLineText(text: string, labels: string[]): string | undefined {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const label of labels) {
    const pattern = new RegExp(`^\\s*${label}\\s*[:=\\-]?\\s*(.+)$`, 'i');
    const line = lines.find((item) => pattern.test(normalizeText(item)));
    const match = line ? normalizeText(line).match(pattern) : null;
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function extractDocumentNumber(text: string): string | undefined {
  const match = text.match(/(?:CNPJ|CPF)\s*[:=\-]?\s*([0-9./-]{11,18})/i)
    || text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/)
    || text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
  return match?.[1] || match?.[0];
}

function mapTextPaymentMethod(value?: string): PaymentMethodType | undefined {
  const text = normalizeText(value || '').toLowerCase();
  if (!text) return undefined;
  if (/pix/.test(text)) return PaymentMethodType.PIX;
  if (/dinheiro|especie/.test(text)) return PaymentMethodType.CASH;
  if (/credito|cartao de credito/.test(text)) return PaymentMethodType.CREDIT_CARD;
  if (/debito|cartao de debito/.test(text)) return PaymentMethodType.DEBIT_CARD;
  if (/boleto/.test(text)) return PaymentMethodType.BANK_SLIP;
  if (/ted|transferencia/.test(text)) return PaymentMethodType.TED;
  if (/doc\b/.test(text)) return PaymentMethodType.DOC;
  return PaymentMethodType.OTHER;
}

function mapNfePaymentMethod(code: string): PaymentMethodType | undefined {
  const normalized = String(code || '').padStart(2, '0');
  const map: Record<string, PaymentMethodType> = {
    '01': PaymentMethodType.CASH,
    '02': PaymentMethodType.OTHER,
    '03': PaymentMethodType.CREDIT_CARD,
    '04': PaymentMethodType.DEBIT_CARD,
    '05': PaymentMethodType.OTHER,
    '15': PaymentMethodType.BANK_SLIP,
    '16': PaymentMethodType.OTHER,
    '17': PaymentMethodType.PIX,
    '18': PaymentMethodType.OTHER,
    '19': PaymentMethodType.OTHER,
    '90': PaymentMethodType.OTHER,
    '99': PaymentMethodType.OTHER,
  };
  return map[normalized];
}

export async function parsePayableDocumentFile(file: File): Promise<ParsedPayableDocument | null> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const isXml = extension === 'xml' || file.type.includes('xml');
  const isText = extension === 'txt' || file.type.includes('text/plain');
  if (!isXml && !isText) {
    return buildAttachmentOnlyDocument(file);
  }

  const content = await readFileAsText(file);
  return isXml ? parseXmlPayableDocument(file, content) : parseTextPayableDocument(file, content);
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Nao foi possivel ler o arquivo.'));
    reader.readAsText(file);
  });
}

function parseXmlPayableDocument(file: File, xmlText: string): ParsedPayableDocument {
  const documentXml = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parserError = documentXml.querySelector('parsererror');
  if (parserError) {
    throw new Error('XML invalido. Verifique o arquivo da NF ou cupom.');
  }

  const emit = firstElement(documentXml, ['emit', 'prestadorservico', 'prestador', 'emitente']);
  const ide = firstElement(documentXml, ['ide', 'identificacao', 'infnfse', 'nfse', 'infCFe']);
  const total = firstElement(documentXml, ['ICMSTot', 'total', 'ValoresNfse', 'valores', 'totalicms']);
  const duplicates = elementsByLocalName(documentXml, ['dup'])
    .map((duplicate, index) => ({
      number: Number(textFrom(duplicate, 'nDup')) || index + 1,
      due_date: dateOnly(textFrom(duplicate, 'dVenc', 'DataVencimento', 'Vencimento', 'data_vencimento')),
      amount: numberFrom(duplicate, 'vDup', 'ValorDuplicata', 'Valor', 'valor'),
    }))
    .filter((duplicate) => duplicate.due_date || duplicate.amount !== undefined);
  const firstDuplicate = duplicates[0];
  const payment = firstElement(documentXml, ['detPag', 'pag', 'pagamento', 'MP']);
  const rootName = localName(documentXml.documentElement);
  const hasInfNfe = Boolean(firstElement(documentXml, ['infNFe']));
  const hasInfCfe = Boolean(firstElement(documentXml, ['infCFe', 'CFe']));
  const hasNfse = Boolean(firstElement(documentXml, ['Nfse', 'CompNfse', 'InfNfse']));
  const model = textFrom(ide, 'mod', 'modelo');
  const documentType: ParsedPayableDocument['document_type'] = hasInfCfe || rootName.includes('cfe')
    ? 'sat_cfe'
    : model === '65' || rootName.includes('nfce')
      ? 'nfce'
      : hasNfse
        ? 'nfse'
        : hasInfNfe || model === '55'
          ? 'nfe'
          : 'xml';

  const supplierName = firstNonEmpty(
    textFrom(emit, 'xNome', 'RazaoSocial', 'Nome', 'nome_razao_social', 'xFant', 'NomeFantasia'),
    textFrom(documentXml, 'xNome', 'RazaoSocial', 'Nome', 'nome_razao_social', 'xFant', 'NomeFantasia', 'RazaoSocialPrestador', 'NomePrestador'),
  );
  const cnpj = firstNonEmpty(
    textFrom(emit, 'CNPJ', 'CPF', 'CNPJPrestador', 'CpfCnpj', 'cpfcnpj'),
    textFrom(documentXml, 'CNPJ', 'CPF', 'CNPJPrestador', 'CpfCnpj', 'cpfcnpj', 'Cnpj', 'Cpf'),
  );
  const supplierAddressElement = firstElement(emit || documentXml, ['enderEmit', 'Endereco', 'EnderecoPrestador', 'endereco']);
  const supplierAddress = {
    street: textFrom(supplierAddressElement, 'xLgr', 'Logradouro', 'Endereco', 'logradouro') || undefined,
    number: textFrom(supplierAddressElement, 'nro', 'Numero', 'numero') || undefined,
    district: textFrom(supplierAddressElement, 'xBairro', 'Bairro', 'bairro') || undefined,
    city: textFrom(supplierAddressElement, 'xMun', 'Cidade', 'Municipio', 'municipio') || undefined,
    state: textFrom(supplierAddressElement, 'UF', 'Uf', 'Estado', 'estado') || undefined,
    zip_code: textFrom(supplierAddressElement, 'CEP', 'Cep', 'cep') || undefined,
    country: textFrom(supplierAddressElement, 'xPais', 'Pais', 'pais') || undefined,
    phone: textFrom(emit, 'fone', 'Telefone', 'telefone') || undefined,
  };
  const infNfse = firstElement(documentXml, ['InfNfse', 'infnfse']);
  const nfeCandidates = [
    textFrom(ide, 'nNF'),
    textFrom(documentXml, 'nNF'),
    regexExtract(xmlText, [/<(?:\w+:)?nNF\b[^>]*>\s*([^<\s]+)\s*<\/(?:\w+:)?nNF>/i]),
  ];
  const nfseCandidates = [
    textFrom(infNfse, 'nDFSe', 'nDfse', 'Numero', 'numero'),
    textFrom(ide, 'nDFSe', 'nDfse', 'NumeroNfse', 'numero_nfse', 'NFSeNumero', 'numero_nota', 'numNota'),
    textFrom(documentXml, 'nDFSe', 'nDfse', 'NumeroNfse', 'numero_nfse', 'NFSeNumero', 'numero_nota', 'numNota'),
    regexExtract(xmlText, [
      /<(?:\w+:)?(?:nDFSe|nDfse|NumeroNfse|numero_nfse|NFSeNumero|numero_nota|numNota|Numero)\b[^>]*>\s*([^<\s]+)\s*<\/(?:\w+:)?(?:nDFSe|nDfse|NumeroNfse|numero_nfse|NFSeNumero|numero_nota|numNota|Numero)>/i,
      /\bNFS?-?E?\s*(?:n[\u00ba\u00b0o]?\s*)?(\d{6,12})\b/i,
    ]),
  ];
  const satCandidates = [
    textFrom(ide, 'nCFe'),
    textFrom(documentXml, 'nCFe'),
    regexExtract(xmlText, [/<(?:\w+:)?nCFe\b[^>]*>\s*([^<\s]+)\s*<\/(?:\w+:)?nCFe>/i]),
  ];
  const fallbackCandidates = [
    textFrom(ide, 'numeroNota', 'numero_nfe', 'nf_numero', 'número'),
    textFrom(documentXml, 'numeroNota', 'numero_nfe', 'nf_numero', 'número'),
    regexExtract(xmlText, [/<(?:\w+:)?(?:numeroNota|numero_nfe|nf_numero)\b[^>]*>\s*([^<\s]+)\s*<\/(?:\w+:)?(?:numeroNota|numero_nfe|nf_numero)>/i]),
  ];

  const invoiceNumberCandidates = documentType === 'nfe' || documentType === 'nfce'
    ? [...nfeCandidates, ...fallbackCandidates]
    : documentType === 'nfse'
      ? [...nfseCandidates, ...fallbackCandidates]
      : documentType === 'sat_cfe'
        ? [...satCandidates, ...fallbackCandidates]
        : [...nfeCandidates, ...nfseCandidates, ...satCandidates, ...fallbackCandidates];

  const invoiceNumber = inferInvoiceNumberFromCandidates(invoiceNumberCandidates, { documentType, model, xmlText })
    || inferInvoiceNumberFromFileName(file.name, documentType);
  const invoiceSeries = firstNonEmpty(
    textFrom(ide, 'serie', 'Serie', 'serie_nfse', 'serienfe', 'serie_nfe'),
    textFrom(documentXml, 'serie', 'Serie', 'serie_nfse', 'serienfe', 'serie_nfe'),
  );
  const issueDate = dateOnly(
    firstNonEmpty(
      textFrom(ide, 'dhEmi', 'dEmi', 'DataEmissao', 'data_nfse', 'data_emissao', 'competencia', 'DataCompetencia'),
      textFrom(documentXml, 'dhEmi', 'dEmi', 'DataEmissao', 'data_nfse', 'data_emissao', 'competencia', 'DataCompetencia'),
      regexExtract(xmlText, [/(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2})?/]),
    ) || '',
  );
  const dueDate = dateOnly(
    firstNonEmpty(
      firstDuplicate?.due_date,
      textFrom(documentXml, 'dVenc', 'DataVencimento', 'Vencimento', 'data_vencimento', 'DataVenc', 'dtVencimento'),
      issueDate,
    ) || '',
  );
  const duplicatesTotal = duplicates.reduce((acc, installment) => acc + Number(installment.amount || 0), 0);
  const amount = firstNumber(
    numberFrom(total, 'vNF', 'vCFe', 'ValorNfse', 'ValorServicos', 'ValorTotal', 'vProd', 'valor_total', 'valorbruto', 'valor_bruto', 'vlr_total', 'ValorLiquidoNfse', 'valor_liquido_nfse', 'valor_tributavel', 'valor_rps', 'vServ'),
    numberFrom(documentXml, 'vNF', 'vCFe', 'ValorNfse', 'ValorServicos', 'ValorTotal', 'valor_total', 'valorbruto', 'valor_bruto', 'vlr_total', 'ValorLiquidoNfse', 'valor_liquido_nfse', 'valor_tributavel', 'valor_rps', 'vServ'),
    duplicatesTotal > 0 ? duplicatesTotal : undefined,
    parseMoney(regexExtract(xmlText, [
      /<(?:\w+:)?(?:ValorLiquidoNfse|valor_liquido_nfse|ValorNfse|ValorServicos|ValorTotal|valor_total|vNF|vCFe|vServ)\b[^>]*>\s*([^<]+)\s*<\/(?:\w+:)?(?:ValorLiquidoNfse|valor_liquido_nfse|ValorNfse|ValorServicos|ValorTotal|valor_total|vNF|vCFe|vServ)>/i,
      /(?:valor\s*total|valor\s*nf|valor\s*liquido)\s*[:=]?\s*R?\$?\s*([0-9.,]+)/i,
    ])),
  );
  const discount = numberFrom(total, 'vDesc', 'ValorDesconto', 'valor_desconto')
    ?? numberFrom(documentXml, 'vDesc', 'ValorDesconto', 'valor_desconto');
  const paymentCode = textFrom(payment, 'tPag', 'cMP', 'forma_pagamento');
  const paymentMethod = paymentCode
    ? mapNfePaymentMethod(paymentCode)
    : mapTextPaymentMethod(
      firstNonEmpty(
        textFrom(payment, 'xPag', 'MeioPagamento', 'forma_pagamento', 'FormaPagamento'),
        textFrom(documentXml, 'xPag', 'MeioPagamento', 'forma_pagamento', 'FormaPagamento'),
      ),
    );

  const items = Array.from(documentXml.querySelectorAll('det')).map((det) => {
    const prod = firstElement(det, ['prod']) || det;
    const med = firstElement(det, ['med']);
    const traceability = allElements(prod).filter((element) => localName(element) === 'rastro').map((rastro) => ({
      batch_number: textFrom(rastro, 'nLote') || undefined,
      batch_quantity: numberFrom(rastro, 'qLote'),
      manufacture_date: dateOnly(textFrom(rastro, 'dFab')),
      expiration_date: dateOnly(textFrom(rastro, 'dVal')),
      aggregation_code: textFrom(rastro, 'cAgreg') || undefined,
    }));

    return {
      code: textFrom(prod, 'cProd', 'cProdANVISA') || undefined,
      description: textFrom(prod, 'xProd', 'descricao', 'Discriminacao') || 'Item da NF',
      quantity: numberFrom(prod, 'qCom', 'qTrib', 'quantidade'),
      unit_value: numberFrom(prod, 'vUnCom', 'vUnTrib', 'valor_unitario'),
      total_value: numberFrom(prod, 'vProd', 'valor_total'),
      anvisa_code: med ? textFrom(med, 'cProdANVISA') || undefined : undefined,
      pmc_value: med ? numberFrom(med, 'vPMC') : undefined,
      traceability,
    };
  });

  const serviceDescription = textFrom(documentXml, 'Discriminacao', 'DescricaoServico', 'descritivo', 'descricao');
  if (!items.length && serviceDescription) {
    items.push({
      description: serviceDescription,
      total_value: amount,
      traceability: [],
    });
  }

  const medicationItems = items.filter((item) => item.anvisa_code || item.traceability.length > 0);

  const taxes = {
    icms: numberFrom(total, 'vICMS') ?? numberFrom(documentXml, 'vICMS') ?? 0,
    ipi: numberFrom(total, 'vIPI') ?? numberFrom(documentXml, 'vIPI') ?? 0,
    pis: numberFrom(total, 'vPIS') ?? numberFrom(documentXml, 'vPIS') ?? 0,
    cofins: numberFrom(total, 'vCOFINS') ?? numberFrom(documentXml, 'vCOFINS') ?? 0,
    iss: numberFrom(total, 'ValorIss', 'ValorIssRetido', 'vISS') ?? numberFrom(documentXml, 'ValorIss', 'ValorIssRetido', 'vISS') ?? 0,
    total_tributes: numberFrom(total, 'vTotTrib') ?? numberFrom(documentXml, 'vTotTrib') ?? 0,
  };

  const itemSummary = items.slice(0, 3).map((item) => item.description).join(', ');
  const documentLabel = documentType === 'receipt' || documentType === 'sat_cfe' || documentType === 'nfce' ? 'Cupom' : 'NF';
  const description = invoiceNumber
    ? `${documentLabel} ${invoiceNumber}${supplierName ? ` - ${supplierName}` : ''}${itemSummary ? ` - ${itemSummary}` : ''}`
    : itemSummary;

  const fields = {
    supplier_name: supplierName || null,
    supplier_document: cnpj || null,
    invoice_number: invoiceNumber || null,
    nf_number: invoiceNumber || null,
    numero_nota: invoiceNumber || null,
    guide_number: invoiceNumber || null,
    invoice_series: invoiceSeries || null,
    issue_date: issueDate || null,
    due_date: dueDate || null,
    amount: amount ?? null,
    discount_amount: discount ?? null,
    payment_method: paymentMethod || null,
    description: description || null,
    installments_count: duplicates.length || 1,
  };
  const filledCount = Object.values(fields).filter(Boolean).length;
  const confidence = filledCount >= 6 ? 'alta' : filledCount >= 3 ? 'media' : 'baixa';
  const warnings = filledCount ? [] : ['Nenhum campo financeiro reconhecido no documento.'];

  return {
    document_type: documentType,
    confidence,
    warnings,
    supplier_name: supplierName || undefined,
    supplier_address: Object.values(supplierAddress).some(Boolean) ? supplierAddress : undefined,
    document_number: cnpj || undefined,
    invoice_number: invoiceNumber || undefined,
    guide_number: invoiceNumber || undefined,
    invoice_series: invoiceSeries || undefined,
    issue_date: issueDate,
    due_date: dueDate,
    amount,
    discount_amount: discount,
    description: description || undefined,
    payment_method: paymentMethod,
    installments: duplicates.length > 1 ? duplicates : undefined,
    items,
    taxes,
    metadata: {
      imported_from: `${documentType}_xml`,
      imported_at: new Date().toISOString(),
      document_extraction: {
        documentType,
        confidence,
        warnings,
        source_file_name: file.name,
        fields,
        taxes,
        item_count: items.length,
        installments: duplicates,
      },
      document_installments: duplicates,
      nfe: {
        key: firstElement(documentXml, ['infNFe', 'infCFe'])?.getAttribute('Id') || textFrom(documentXml, 'chNFe', 'chCFe') || null,
        supplier_name: supplierName || null,
        supplier_document: cnpj || null,
        supplier: {
          name: supplierName || null,
          document: cnpj || null,
          fantasy_name: textFrom(emit, 'xFant') || null,
          state_registration: textFrom(emit, 'IE') || null,
          tax_regime: textFrom(emit, 'CRT') || null,
          phone: supplierAddress.phone || null,
          address: supplierAddress,
        },
        invoice_number: invoiceNumber || null,
        invoice_series: invoiceSeries || null,
        issue_date: issueDate || null,
        due_date: dueDate || null,
        installments: duplicates,
        payment_code: payment ? textFrom(payment, 'tPag') : null,
        items,
        medication_traceability: medicationItems.map((item) => ({
          code: item.code || null,
          description: item.description,
          anvisa_code: item.anvisa_code || null,
          pmc_value: item.pmc_value || null,
          traceability: item.traceability,
        })),
        taxes,
      },
    },
  };
}

function parseTextPayableDocument(file: File, rawText: string): ParsedPayableDocument {
  const text = normalizeText(rawText);
  const firstContentLine = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0];
  const supplierName = extractLabeledLineText(rawText, ['Fornecedor', 'Emitente', 'Razao Social', 'Empresa'])
    || firstContentLine;
  const documentNumber = extractDocumentNumber(text);
  const invoiceNumber = extractLabeledLineText(rawText, ['COO', 'Extrato', 'Cupom', 'Numero', 'NF', 'NFCe', 'NFC-e']);
  const issueDate = dateOnly(extractLabeledLineText(rawText, ['Emissao', 'Data', 'Data Emissao']) || text);
  const dueDate = dateOnly(extractLabeledLineText(rawText, ['Vencimento', 'Vencto']) || '') || issueDate;
  const totalLabel = extractLabeledLineText(rawText, ['Valor Total', 'Total', 'Valor pago', 'VALOR A PAGAR']);
  const amount = parseMoney(totalLabel) ?? parseMoney((text.match(/(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}/g) || []).pop());
  const discount = parseMoney(extractLabeledLineText(rawText, ['Desconto', 'Descontos']));
  const paymentMethod = mapTextPaymentMethod(extractLabeledLineText(rawText, ['Forma de pagamento', 'Pagamento', 'Meio de pagamento']));
  const description = invoiceNumber
    ? `Cupom ${invoiceNumber}${supplierName ? ` - ${supplierName}` : ''}`
    : `Cupom fiscal - ${file.name}`;
  const fields = {
    supplier_name: supplierName || null,
    supplier_document: documentNumber || null,
    invoice_number: invoiceNumber || null,
    invoice_series: null,
    issue_date: issueDate || null,
    due_date: dueDate || null,
    amount: amount ?? null,
    discount_amount: discount ?? null,
    payment_method: paymentMethod || null,
    description,
  };
  const filledCount = Object.values(fields).filter(Boolean).length;
  const confidence = filledCount >= 5 ? 'media' : filledCount >= 3 ? 'baixa' : 'baixa';

  return {
    document_type: 'receipt',
    confidence,
    warnings: amount ? [] : ['Valor total nao reconhecido no cupom.'],
    supplier_name: supplierName || undefined,
    document_number: documentNumber || undefined,
    invoice_number: invoiceNumber || undefined,
    issue_date: issueDate,
    due_date: dueDate,
    amount,
    discount_amount: discount,
    description,
    payment_method: paymentMethod,
    items: [],
    taxes: {},
    metadata: {
      imported_from: 'receipt_text',
      imported_at: new Date().toISOString(),
      document_extraction: {
        documentType: 'receipt',
        confidence,
        warnings: amount ? [] : ['Valor total nao reconhecido no cupom.'],
        source_file_name: file.name,
        fields,
        taxes: {},
        item_count: 0,
      },
      receipt: {
        supplier_name: supplierName || null,
        supplier_document: documentNumber || null,
        invoice_number: invoiceNumber || null,
        issue_date: issueDate || null,
        due_date: dueDate || null,
        amount: amount ?? null,
        discount_amount: discount ?? null,
        payment_method: paymentMethod || null,
      },
    },
  };
}

function buildAttachmentOnlyDocument(file: File): ParsedPayableDocument | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension || '')) {
    return null;
  }

  return {
    document_type: 'document',
    confidence: 'baixa',
    warnings: ['Arquivo anexado para conferencia manual. Leitura automatica disponivel para XML e TXT.'],
    description: `Documento fiscal - ${file.name}`,
    items: [],
    taxes: {},
    metadata: {
      imported_from: 'manual_attachment',
      imported_at: new Date().toISOString(),
      document_extraction: {
        documentType: 'document',
        confidence: 'baixa',
        warnings: ['Arquivo anexado para conferencia manual. Leitura automatica disponivel para XML e TXT.'],
        source_file_name: file.name,
        fields: {},
        taxes: {},
        item_count: 0,
      },
    },
  };
}
