function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function localName(node) {
  return String(node?.localName || node?.nodeName || '').toLowerCase();
}

function firstElement(root, ...names) {
  const wanted = names.map((name) => String(name).toLowerCase());
  return Array.from(root?.getElementsByTagName?.('*') || []).find((node) => wanted.includes(localName(node))) || null;
}

function childText(parent, ...names) {
  if (!parent) return '';
  const wanted = names.map((name) => String(name).toLowerCase());
  const node = Array.from(parent.children || []).find((child) => wanted.includes(localName(child)));
  return node?.textContent?.trim() || '';
}

function descendantText(parent, ...names) {
  if (!parent) return '';
  const wanted = names.map((name) => String(name).toLowerCase());
  const node = Array.from(parent.getElementsByTagName?.('*') || []).find((child) => wanted.includes(localName(child)));
  return node?.textContent?.trim() || '';
}

function findText(root, ...names) {
  const wanted = names.map((name) => String(name).toLowerCase());
  const node = Array.from(root?.getElementsByTagName?.('*') || []).find((child) => wanted.includes(localName(child)));
  return node?.textContent?.trim() || '';
}

function normalizeMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  const number = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? Number(number.toFixed(2)) : null;
}

function normalizeDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const compact = onlyDigits(text);
  if (compact.length === 8) {
    if (compact.startsWith('19') || compact.startsWith('20')) {
      return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
    }
    return `${compact.slice(4, 8)}-${compact.slice(2, 4)}-${compact.slice(0, 2)}`;
  }
  return '';
}

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isMeaningfulProfessionalName(value) {
  const normalized = normalizeName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalized
    && normalized.length >= 4
    && ![
      '-',
      'nao identificado',
      'não identificado',
      'nao informado',
      'não informado',
      'sem profissional',
      'profissional nao informado',
      'profissional não informado',
      'profissional',
    ].includes(normalized);
}

function professionalFromRoot(root) {
  const provider = firstElement(root, 'PrestadorServico', 'Prestador', 'DadosPrestador');
  const professionalNode = firstElement(
    root,
    'ProfissionalExecutante',
    'DadosProfissionalExecutante',
    'ContratadoExecutante',
    'Executante',
    'Profissional',
  );
  const source = professionalNode || provider;
  const rawName = normalizeName(
    descendantText(source, 'NomeProfissional', 'NomeExecutante', 'NomeContratado', 'xNome', 'Nome', 'RazaoSocial')
      || findText(root, 'NomeProfissional', 'NomeExecutante'),
  );
  const name = isMeaningfulProfessionalName(rawName) ? rawName : '';
  const document = onlyDigits(
    descendantText(source, 'CPF', 'CNPJ', 'CpfCnpj', 'CnpjCpf')
      || findText(root, 'CpfProfissional', 'CPFProfissional', 'CnpjProfissional', 'CNPJProfissional'),
  );
  const crm = normalizeName(
    descendantText(source, 'CRM', 'NumeroConselhoProfissional', 'numeroConselhoProfissional', 'RegistroConselho', 'NumeroRegistro')
      || findText(root, 'CRM', 'NumeroConselhoProfissional', 'numeroConselhoProfissional'),
  );
  const state = normalizeName(
    descendantText(source, 'UF', 'UfConselho', 'ufConselho', 'UFConselho', 'Estado')
      || findText(root, 'UfConselho', 'ufConselho', 'UFConselho'),
  ).toUpperCase();

  if (!name && !professionalNode) return null;
  return name || document || crm ? { name, document, crm, state } : null;
}

function professionalFromText(text) {
  const source = normalizeName(text);
  if (!source) return null;

  const crmMatch = source.match(/\b(CRM|CRP|CRO|COREN|CREFITO)\s*[\/\-]?\s*([A-Z]{2})?\s*[:.]?\s*([0-9][0-9.\-\/]*)/i);
  const nameMatch = source.match(/(?:\bpelo\s+|\bpela\s+|\bprofissional\s+|\bmedico\s+|\bm[eé]dica\s+|\bDr\.?\s+|\bDra\.?\s+)(?:Dr\.?\s+|Dra\.?\s+)?([A-ZÁÀÂÃÉÈÊÍÓÔÕÚÇ][\p{L}\s.'-]{3,120}?)(?=,|\s+CRM\b|\s+CRP\b|\s+CRO\b|\s+COREN\b|\s+CREFITO\b|\s+prestado|\s+prestados|\s+realizado|\s+realizados|\.|$)/iu);
  const name = normalizeName(nameMatch?.[1] || '');
  const crm = normalizeName(crmMatch?.[3] || '');
  const state = normalizeName(crmMatch?.[2] || '').toUpperCase();

  return isMeaningfulProfessionalName(name) ? { name, document: '', crm, state } : null;
}

function partyFromElement(element) {
  return {
    name: normalizeName(descendantText(element, 'xNome', 'RazaoSocial', 'Nome', 'NomeRazaoSocial')),
    document: onlyDigits(descendantText(element, 'CNPJ', 'CPF', 'CpfCnpj', 'CnpjCpf')),
  };
}

function getAccessKey(root, nfeElement) {
  const explicit = onlyDigits(findText(root, 'chNFe', 'ChaveNFe', 'ChaveAcesso'));
  if (explicit.length === 44) return explicit;
  const id = nfeElement?.getAttribute?.('Id') || firstElement(root, 'infNFe')?.getAttribute?.('Id') || '';
  const fromId = onlyDigits(id);
  return fromId.length === 44 ? fromId : '';
}

function parseNfe(root) {
  const infNfe = firstElement(root, 'infNFe');
  if (!infNfe) return null;

  const ide = firstElement(infNfe, 'ide');
  const emit = firstElement(infNfe, 'emit');
  const dest = firstElement(infNfe, 'dest');
  const total = firstElement(infNfe, 'ICMSTot');
  const dup = firstElement(infNfe, 'dup');
  const detPag = firstElement(infNfe, 'detPag');

  return {
    type: 'nfe',
    accessKey: getAccessKey(root, infNfe),
    number: childText(ide, 'nNF'),
    series: childText(ide, 'serie'),
    issueDate: normalizeDate(childText(ide, 'dhEmi', 'dEmi')),
    dueDate: normalizeDate(childText(dup, 'dVenc')),
    amount: normalizeMoney(childText(dup, 'vDup')) || normalizeMoney(descendantText(total, 'vNF')),
    emitter: partyFromElement(emit),
    recipient: partyFromElement(dest),
    professional: professionalFromRoot(root),
    paymentMethodCode: childText(detPag, 'tPag'),
  };
}

function parseNfse(root) {
  const nfseRoot = firstElement(root, 'Nfse', 'CompNfse', 'InfNfse', 'DeclaracaoPrestacaoServico');
  const number = findText(root, 'Numero', 'NumeroNfse', 'NumeroNota');
  const verificationCode = findText(root, 'CodigoVerificacao', 'CodVerificacao');
  const amount = normalizeMoney(findText(root, 'ValorLiquidoNfse', 'ValorServicos', 'ValorTotalServicos', 'ValorNota'));

  if (!nfseRoot && !number && !verificationCode && !amount) return null;

  const provider = firstElement(root, 'PrestadorServico', 'Prestador', 'DadosPrestador');
  const taker = firstElement(root, 'TomadorServico', 'Tomador', 'DadosTomador');

  const serviceDescription = normalizeName(findText(root, 'Discriminacao', 'DescricaoServico', 'ItemListaServico'));

  return {
    type: 'nfse',
    accessKey: verificationCode,
    number,
    series: findText(root, 'Serie', 'SerieNfse'),
    issueDate: normalizeDate(findText(root, 'DataEmissao', 'Competencia')),
    dueDate: normalizeDate(findText(root, 'DataVencimento', 'Vencimento')),
    amount,
    emitter: partyFromElement(provider),
    recipient: partyFromElement(taker),
    professional: professionalFromRoot(root) || professionalFromText(serviceDescription),
    serviceDescription,
  };
}

export function isFiscalXmlFile(file) {
  return String(file?.name || '').toLowerCase().endsWith('.xml');
}

export async function readFiscalXmlFile(file) {
  if (!isFiscalXmlFile(file)) return null;
  const xmlText = typeof file.text === 'function'
    ? await file.text()
    : await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Nao foi possivel ler o XML'));
        reader.readAsText(file);
      });
  return parseFiscalXml(xmlText);
}

export async function readFiscalXmlFromUrl(url) {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Nao foi possivel baixar o XML anexado');
  }
  const xmlText = await response.text();
  return parseFiscalXml(xmlText);
}

export function parseFiscalXml(xmlText) {
  if (!xmlText || typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(String(xmlText), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return null;
  return parseNfe(doc) || parseNfse(doc);
}

export function buildPayablePatchFromFiscalDocument(document) {
  if (!document) return {};
  const supplierName = document.emitter?.name || '';
  const reference = document.number || document.accessKey || '';
  return {
    vendor_name: supplierName,
    description: document.serviceDescription || (reference ? `NF ${reference}` : 'Documento fiscal'),
    issue_date: document.issueDate || '',
    due_date: document.dueDate || document.issueDate || '',
    amount: document.amount ? String(document.amount) : '',
    document_number: reference,
  };
}

export function buildReceivablePatchFromFiscalDocument(document) {
  if (!document) return {};
  const payerName = document.recipient?.name || document.emitter?.name || '';
  const reference = document.number || document.accessKey || '';
  const amount = document.amount ? Number(document.amount) : null;
  const professionalName = isMeaningfulProfessionalName(document.professional?.name) ? document.professional.name : '';
  return {
    patient_name: payerName,
    payer_name: payerName,
    professional_name: professionalName,
    profissional_name: professionalName,
    description: document.serviceDescription || (reference ? `NF ${reference}` : 'Documento fiscal'),
    invoice_date: document.issueDate || '',
    due_date: document.dueDate || document.issueDate || '',
    competency_date: document.issueDate || document.dueDate || '',
    amount,
    service_value: amount,
    gross_amount: amount,
    net_value: amount,
    insurance_invoice_number: reference,
    guide_number: reference,
  };
}

export function buildFiscalDocumentNotes(document) {
  if (!document) return '';
  const parts = [
    `XML fiscal: ${String(document.type || '').toUpperCase()}`,
    document.number ? `NF ${document.number}` : null,
    document.series ? `Serie ${document.series}` : null,
    document.accessKey ? `Chave/Cod ${document.accessKey}` : null,
    document.emitter?.document ? `CNPJ/CPF emitente ${document.emitter.document}` : null,
    document.recipient?.document ? `CNPJ/CPF destinatario ${document.recipient.document}` : null,
    document.professional?.name ? `Profissional ${document.professional.name}` : null,
    document.professional?.crm ? `Registro prof. ${document.professional.crm}` : null,
  ];
  return parts.filter(Boolean).join(' | ');
}
