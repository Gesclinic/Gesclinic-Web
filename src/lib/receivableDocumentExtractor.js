const PAYMENT_METHOD_MAP = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartao de credito',
  '04': 'Cartao de debito',
  '05': 'credito_loja',
  '10': 'vale_alimentacao',
  '11': 'vale_refeicao',
  '12': 'vale_presente',
  '13': 'vale_combustivel',
  '15': 'Boleto',
  '16': 'Transferencia',
  '17': 'Pix',
  '18': 'Transferencia',
  '19': 'cashback',
  '90': 'sem_pagamento',
  '99': 'Outro',
};

const PAYMENT_METHOD_TEXT_MAP = [
  [/pix/i, 'Pix'],
  [/cart[aã]o\s+de\s+cr[eé]dito|cart[aã]o\s+credito|cartao\s+credito|cr[eé]dito/i, 'Cartao de credito'],
  [/cart[aã]o\s+de\s+d[eé]bito|cart[aã]o\s+debito|cartao\s+debito|d[eé]bito/i, 'Cartao de debito'],
  [/dinheiro|esp[eé]cie/i, 'Dinheiro'],
  [/boleto/i, 'Boleto'],
  [/transfer[eê]ncia|transferencia|ted/i, 'Transferencia'],
  [/cheque/i, 'Cheque'],
];

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function inferReceivableInvoiceNumberFromFileName(fileName) {
  const name = String(fileName || '').trim();
  if (!name) return null;
  const nfseMatch = name.match(/(?:^|[_\-\s])NFS?E?[_\-\s]*(\d{2,})(?:[_\-\s.]|$)/i)
    || name.match(/NFS?E?[_\-\s]*(\d{2,})/i);
  if (nfseMatch?.[1]) return nfseMatch[1];
  const firstNumber = name.match(/(?:^|[_\-\s])(\d{3,})(?:[_\-\s.]|$)/);
  return firstNumber?.[1] || null;
}

function normalizeMoney(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const raw = String(value).trim();
  const text = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/[^\d.-]/g, '');
  const number = Number(text);
  return Number.isFinite(number) ? number.toFixed(2) : null;
}

function normalizeIsoDate(value) {
  if (!value) {
    return null;
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const compact = onlyDigits(text);
  if (compact.length === 8) {
    if (compact.startsWith('20') || compact.startsWith('19')) {
      return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
    }
    return `${compact.slice(4, 8)}-${compact.slice(2, 4)}-${compact.slice(0, 2)}`;
  }
  return null;
}

function normalizePlainText(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyEncodedBlob(value) {
  const text = String(value || '').trim();
  if (text.length < 180) return false;
  const compact = text.replace(/\s+/g, '');
  if (!compact) return false;
  const encodedChars = compact.match(/[A-Za-z0-9+/=]/g)?.length || 0;
  return encodedChars / compact.length > 0.92 && !/[<>{}:;,|]/.test(text);
}

function cleanMeaningfulText(value, maxLength = 500) {
  const text = normalizePlainText(value);
  if (!text || isLikelyEncodedBlob(text)) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function localName(element) {
  return String(element?.localName || element?.nodeName || '').toLowerCase();
}

function findText(root, ...names) {
  const elements = Array.from(root.getElementsByTagName('*'));
  for (const name of names) {
    const wanted = String(name).toLowerCase();
    const node = elements.find((element) => localName(element) === wanted);
    if (node?.textContent?.trim()) {
      return node.textContent.trim();
    }
  }
  return '';
}

function findLastText(root, ...names) {
  const elements = Array.from(root.getElementsByTagName('*'));
  for (const name of names) {
    const wanted = String(name).toLowerCase();
    const node = elements.reverse().find((element) => localName(element) === wanted);
    if (node?.textContent?.trim()) {
      return node.textContent.trim();
    }
  }
  return '';
}

function findChildText(parent, ...names) {
  if (!parent) {
    return '';
  }
  const children = Array.from(parent.children || []);
  for (const name of names) {
    const wanted = String(name).toLowerCase();
    const node = children.find((element) => localName(element) === wanted);
    if (node?.textContent?.trim()) {
      return node.textContent.trim();
    }
  }
  return '';
}

function findDescendantText(parent, ...names) {
  if (!parent) {
    return '';
  }
  const elements = Array.from(parent.getElementsByTagName('*'));
  for (const name of names) {
    const wanted = String(name).toLowerCase();
    const node = elements.find((element) => localName(element) === wanted);
    if (node?.textContent?.trim()) {
      return node.textContent.trim();
    }
  }
  return '';
}

function firstElement(root, ...names) {
  const wanted = names.map((name) => String(name).toLowerCase());
  return Array.from(root.getElementsByTagName('*')).find((element) => wanted.includes(localName(element))) || null;
}

function readFileText(file) {
  if (typeof file.text === 'function') {
    return file.text();
  }

  if (typeof FileReader === 'undefined') {
    return Promise.reject(new Error('Leitura de arquivo indisponivel neste ambiente'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Nao foi possivel ler o arquivo'));
    reader.readAsText(file);
  });
}

function normalizePaymentMethod(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const byCode = PAYMENT_METHOD_MAP[onlyDigits(raw)];
  if (byCode) {
    return byCode;
  }

  const matched = PAYMENT_METHOD_TEXT_MAP.find(([pattern]) => pattern.test(raw));
  return matched?.[1] || null;
}

function normalizeCardLast4(value) {
  const digits = onlyDigits(value);
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function extractObservationValue(observation, label) {
  const pattern = new RegExp(`${label}\\s*:\\s*([^|\\n\\r]+)`, 'i');
  return normalizePlainText(String(observation || '').match(pattern)?.[1] || '');
}

function extractLabeledValue(text, labels = []) {
  const source = normalizePlainText(text);
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:=-]\\s*([^|;\\n\\r]+)`, 'i');
    const value = source.match(pattern)?.[1]?.trim();
    if (value) return normalizePlainText(value);
  }
  return '';
}

function extractPartyDocument(element, fallbackRoot, prefixes = []) {
  const scoped = findDescendantText(element, 'CNPJ', 'CPF', 'CpfCnpj', 'Cpf', 'Cnpj', 'NIF', 'cNif');
  if (scoped) return onlyDigits(scoped);

  for (const prefix of prefixes) {
    const found = findText(
      fallbackRoot,
      `${prefix}Cnpj`,
      `${prefix}Cpf`,
      `${prefix}Documento`,
      `${prefix}_cnpj`,
      `${prefix}_cpf`,
      `${prefix}_documento`,
    );
    if (found) return onlyDigits(found);
  }

  return null;
}

function regexExtract(xmlText, patterns = []) {
  for (const pattern of patterns) {
    const match = String(xmlText || '').match(pattern);
    const value = match?.[1] || match?.[0] || '';
    if (String(value).trim()) return String(value).trim();
  }
  return '';
}

function normalizeInvoiceNumberCandidate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = onlyDigits(raw);
  return digits || raw;
}

function inferInvoiceNumberFromCandidates(candidates = [], { documentType, model, xmlText } = {}) {
  const isNfeLike = documentType === 'nfe' || documentType === 'nfce' || model === '55' || model === '65';

  const accessKey = onlyDigits(regexExtract(xmlText, [
    /<(?:\w+:)?chNFe\b[^>]*>\s*([0-9]{44})\s*<\/(?:\w+:)?chNFe>/i,
  ]));
  if (isNfeLike && accessKey.length === 44) {
    const nnfFromKey = accessKey.slice(25, 34).replace(/^0+/, '');
    if (nnfFromKey) return nnfFromKey;
  }

  const normalized = Array.from(new Set(
    candidates
      .map((candidate) => normalizeInvoiceNumberCandidate(candidate))
      .filter(Boolean),
  ));
  if (!normalized.length) return '';

  const nonAccessKey = normalized.find((candidate) => {
    const digits = onlyDigits(candidate);
    return digits.length >= 1 && digits.length <= 12;
  });
  if (nonAccessKey) return nonAccessKey;

  const first = normalized[0] || '';
  const firstDigits = onlyDigits(first);
  if (firstDigits.length === 44) {
    const nnf = firstDigits.slice(25, 34).replace(/^0+/, '');
    if (nnf) return nnf;
  }

  return first;
}

function parseXmlText(xmlText) {
  const parser = new DOMParser();
  const document = parser.parseFromString(xmlText, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) {
    throw new Error('XML invalido ou ilegivel');
  }

  const root = document.documentElement;
  const nfse = firstElement(document, 'infNfse', 'Nfse', 'CompNfse', 'nfse', 'nf');
  const ide = firstElement(document, 'ide', 'identificacao', 'infCFe', 'infnfse');
  const hasInfNfe = Boolean(firstElement(document, 'infNFe'));
  const hasInfCfe = Boolean(firstElement(document, 'infCFe', 'CFe'));
  const hasNfse = Boolean(firstElement(document, 'Nfse', 'CompNfse', 'InfNfse'));
  const rootName = localName(root);
  const model = findChildText(ide, 'mod', 'modelo') || findText(document, 'mod', 'modelo');
  const documentType = hasInfCfe || rootName.includes('cfe')
    ? 'sat_cfe'
    : model === '65' || rootName.includes('nfce')
      ? 'nfce'
      : hasNfse
        ? 'nfse'
        : hasInfNfe || model === '55'
          ? 'nfe'
          : (nfse ? 'nfse' : 'nfe');
  const total = firstElement(document, 'total', 'ICMSTot', 'ValoresNfse', 'Valores', 'valores');
  const cobranca = firstElement(document, 'dup', 'cobr');
  const pagamento = firstElement(document, 'detPag', 'pag');
  const dest = firstElement(document, 'dest', 'TomadorServico', 'Tomador', 'DadosTomador', 'toma', 'tomador');
  const emit = firstElement(document, 'emit', 'PrestadorServico', 'Prestador', 'DadosPrestador', 'prest', 'prestador');
  const products = Array.from(document.getElementsByTagName('*'))
    .filter((element) => localName(element) === 'prod')
    .map((element) => findChildText(element, 'xProd'))
    .filter(Boolean);
  const serviceDescriptions = Array.from(document.getElementsByTagName('*'))
    .filter((element) => ['descritivo', 'discriminacao', 'descricaoservico', 'descricao', 'servico', 'xdescserv', 'xdiscriminacao'].includes(localName(element)))
    .map((element) => cleanMeaningfulText(element.textContent, 300))
    .filter((value, index, values) => value && values.indexOf(value) === index);
  const observation = cleanMeaningfulText(findText(document, 'observacao', 'Observacao', 'InfAdic', 'infCpl', 'informacoesComplementares', 'outrasInformacoes'), 500);
  const allText = normalizePlainText(document.documentElement?.textContent || '');
  const observedPaymentMethod = extractObservationValue(observation, 'Forma de pagamento')
    || extractLabeledValue(allText, ['Forma de pagamento', 'Forma pagamento', 'Pagamento', 'Meio de pagamento']);
  const doctorName = extractObservationValue(observation, 'Medico')
    || extractObservationValue(observation, 'M[eé]dico')
    || extractLabeledValue(allText, ['Medico', 'M[eé]dico', 'Profissional', 'Prestador executante']);
  const doctorCrm = extractObservationValue(observation, 'CRM') || extractLabeledValue(allText, ['CRM', 'Conselho']);
  const cardLast4 = normalizeCardLast4(
    extractObservationValue(observation, 'Ultimos 4 digitos')
      || extractObservationValue(observation, 'Final do cartao')
      || extractObservationValue(observation, 'Cartao final')
      || extractLabeledValue(allText, ['Ultimos 4 digitos', 'Ultimos digitos do cartao', 'Final do cartao', 'Cartao final', 'Cartao'])
      || findText(document, 'card_last4', 'cartao_final', 'final_cartao', 'ultimos_digitos_cartao'),
  );

  const infNfse = firstElement(document, 'InfNfse', 'infnfse');
  const nfeCandidates = [
    findChildText(ide, 'nNF'),
    findText(document, 'nNF'),
    regexExtract(xmlText, [/<(?:\w+:)?nNF\b[^>]*>\s*([^<\s]+)\s*<\/(?:\w+:)?nNF>/i]),
  ];
  const nfseCandidates = [
    findChildText(infNfse, 'nDFSe', 'nDfse', 'nNFSe', 'nNfse', 'nDPS', 'nDps', 'Numero', 'numero'),
    findChildText(ide, 'nDFSe', 'nDfse', 'nNFSe', 'nNfse', 'nDPS', 'nDps', 'NumeroNfse', 'numero_nfse', 'NFSeNumero', 'numero_nota', 'numNota'),
    findText(document, 'nDFSe', 'nDfse', 'nNFSe', 'nNfse', 'nDPS', 'nDps', 'NumeroNfse', 'numero_nfse', 'NFSeNumero', 'numero_nota', 'numNota'),
    regexExtract(xmlText, [
      /<(?:\w+:)?(?:nDFSe|nDfse|nNFSe|nNfse|nDPS|nDps|NumeroNfse|numero_nfse|NFSeNumero|numero_nota|numNota|Numero)\b[^>]*>\s*([^<\s]+)\s*<\/(?:\w+:)?(?:nDFSe|nDfse|nNFSe|nNfse|nDPS|nDps|NumeroNfse|numero_nfse|NFSeNumero|numero_nota|numNota|Numero)>/i,
      /\bNFS?-?E?\s*(?:n[\u00ba\u00b0o]?\s*)?(\d{6,12})\b/i,
    ]),
  ];
  const satCandidates = [
    findChildText(ide, 'nCFe'),
    findText(document, 'nCFe'),
    regexExtract(xmlText, [/<(?:\w+:)?nCFe\b[^>]*>\s*([^<\s]+)\s*<\/(?:\w+:)?nCFe>/i]),
  ];
  const fallbackCandidates = [
    findChildText(ide, 'numeroNota', 'numero_nfe', 'nf_numero', 'número'),
    findText(document, 'numeroNota', 'numero_nfe', 'nf_numero', 'número'),
    regexExtract(xmlText, [/<(?:\w+:)?(?:numeroNota|numero_nfe|nf_numero)\b[^>]*>\s*([^<\s]+)\s*<\/(?:\w+:)?(?:numeroNota|numero_nfe|nf_numero)>/i]),
  ];

  const nfNumber = inferInvoiceNumberFromCandidates(
    documentType === 'nfe' || documentType === 'nfce'
      ? [...nfeCandidates, ...fallbackCandidates]
      : documentType === 'nfse'
        ? [...nfseCandidates, ...fallbackCandidates]
        : documentType === 'sat_cfe'
          ? [...satCandidates, ...fallbackCandidates]
          : [...nfeCandidates, ...nfseCandidates, ...satCandidates, ...fallbackCandidates],
    { documentType, model, xmlText },
  );
  const payerName = cleanMeaningfulText(
    findChildText(dest, 'xNome', 'RazaoSocial', 'Nome', 'nome_razao_social', 'sobrenome_nome_fantasia', 'nome_fantasia')
      || findDescendantText(dest, 'xNome', 'RazaoSocial', 'Nome', 'nome_razao_social', 'sobrenome_nome_fantasia', 'nome_fantasia')
      || findText(document, 'RazaoSocialTomador', 'NomeTomador', 'nome_tomador', 'tomador_nome', 'razao_social_tomador'),
    160,
  );
  const issuerName = cleanMeaningfulText(
    findChildText(emit, 'xNome', 'RazaoSocial', 'Nome', 'nome_razao_social', 'sobrenome_nome_fantasia', 'nome_fantasia')
      || findDescendantText(emit, 'xNome', 'RazaoSocial', 'Nome', 'nome_razao_social', 'sobrenome_nome_fantasia', 'nome_fantasia')
      || findText(document, 'RazaoSocialPrestador', 'NomePrestador', 'nome_prestador', 'prestador_nome', 'razao_social_prestador'),
    160,
  );
  const payerDocument = extractPartyDocument(dest, document, ['Tomador', 'tomador']);
  const issuerDocument = extractPartyDocument(emit, document, ['Prestador', 'prestador', 'Emitente', 'emitente']);
  const grossAmount = normalizeMoney(
    findChildText(total, 'vNF', 'ValorServicos', 'ValorServico', 'vServPrest', 'vServ', 'ValorNfse', 'ValorTotal', 'valor_total', 'valor_tributavel', 'valor_rps', 'ValorLiquidoNfse', 'vLiq', 'ValorLiquido')
      || findText(document, 'vNF', 'ValorServicos', 'ValorServico', 'vServPrest', 'vServ', 'ValorNfse', 'ValorTotal', 'valor_total', 'valor_tributavel', 'valor_rps', 'ValorLiquidoNfse', 'vLiq', 'ValorLiquido'),
  );
  const taxesValue = normalizeMoney(
    findChildText(total, 'vTotTrib', 'ValorIss', 'ValorIssRetido', 'ValorPis', 'ValorCofins', 'valor_issrf', 'valor_ir', 'valor_inss', 'valor_pis', 'valor_cofins', 'valor_contribuicao_social')
      || findText(document, 'vTotTrib', 'ValorIss', 'ValorIssRetido', 'ValorPis', 'ValorCofins', 'valor_issrf', 'valor_ir', 'valor_inss', 'valor_pis', 'valor_cofins', 'valor_contribuicao_social'),
  );
  const invoiceDate = normalizeIsoDate(findText(document, 'dhEmi', 'dEmi', 'DataEmissao', 'Competencia', 'dCompet', 'data_nfse', 'data_fato', 'data_emissao', 'dataEmissao'));
  const explicitDueDate = normalizeIsoDate(findChildText(cobranca, 'dVenc', 'data_vencimento') || findText(document, 'dVenc', 'DataVencimento', 'Vencimento', 'data_vencimento', 'dataVencimento'));
  const paymentDate = normalizeIsoDate(findText(document, 'DataPagamento', 'data_pagamento', 'data_recebimento', 'dtPagamento'));
  const paymentMethodRaw = observedPaymentMethod || findChildText(pagamento, 'tPag') || findText(document, 'tPag', 'FormaPagamento', 'forma_pagamento', 'tipo_pagamento', 'meio_pagamento');
  const description = products.length
    ? products.slice(0, 3).join(' | ')
    : serviceDescriptions.slice(0, 3).join(' | ') || cleanMeaningfulText(findText(document, 'Discriminacao', 'DescricaoServico', 'xDescServ', 'ItemListaServico', 'descritivo', 'descricao', 'servico'), 300);
  const paymentMethod = normalizePaymentMethod(paymentMethodRaw);
  const dueDate = explicitDueDate || invoiceDate;

  const fields = {
    payer_name: payerName || null,
    payer_document: payerDocument || null,
    description: description || (nfNumber ? `NF ${nfNumber}` : null),
    amount: grossAmount,
    taxes_value: taxesValue,
    invoice_date: invoiceDate,
    due_date: dueDate,
    competency_date: invoiceDate,
    payment_method: paymentMethod,
    payment_date: paymentDate || (paymentMethod ? invoiceDate : null),
    guide_number: nfNumber || null,
    invoice_number: nfNumber || null,
    issuer_name: issuerName || null,
    issuer_document: issuerDocument || null,
    doctor_name: doctorName || null,
    doctor_crm: doctorCrm || null,
    card_last4: cardLast4,
    observation: observation || null,
  };

  const filledCount = Object.values(fields).filter(Boolean).length;
  return {
    documentType,
    confidence: filledCount >= 5 ? 'alta' : filledCount >= 3 ? 'media' : 'baixa',
    fields,
    warnings: filledCount ? [] : ['Nenhum campo financeiro reconhecido no XML.'],
  };
}

export async function extractReceivableDocument(file) {
  if (!file) {
    return null;
  }

  const name = file.name || '';
  const type = file.type || '';
  const isXml = type.includes('xml') || name.toLowerCase().endsWith('.xml');
  const isText = type.startsWith('text/') || name.toLowerCase().endsWith('.txt');

  if (isXml || isText) {
    const text = await readFileText(file);
    return parseXmlText(text);
  }

  return {
    documentType: type.includes('pdf') ? 'pdf' : 'imagem',
    confidence: 'manual',
    fields: {},
    warnings: ['Arquivo anexado para rastreabilidade; leitura automatica disponivel para XML.'],
  };
}

export function buildReceivableDocumentExtractionMetadata(extraction) {
  if (!extraction) {
    return null;
  }

  const fields = extraction.fields || {};
  return {
    documentType: extraction.documentType,
    confidence: extraction.confidence,
    warnings: extraction.warnings || [],
    issuerName: fields.issuer_name || null,
    issuerDocument: fields.issuer_document || null,
    fields: {
      payer_name: fields.payer_name || null,
      payer_document: fields.payer_document || null,
      payer_id: fields.payer_id || null,
      payer_registry_source: fields.payer_registry_source || null,
      description: fields.description || null,
      amount: fields.amount || null,
      taxes_value: fields.taxes_value || null,
      invoice_date: fields.invoice_date || null,
      due_date: fields.due_date || null,
      competency_date: fields.competency_date || null,
      payment_method: fields.payment_method || null,
      payment_date: fields.payment_date || null,
      guide_number: fields.guide_number || null,
      invoice_number: fields.invoice_number || null,
      issuer_name: fields.issuer_name || null,
      issuer_document: fields.issuer_document || null,
      doctor_name: fields.doctor_name || null,
      doctor_crm: fields.doctor_crm || null,
      card_last4: fields.card_last4 || null,
      observation: fields.observation || null,
    },
  };
}