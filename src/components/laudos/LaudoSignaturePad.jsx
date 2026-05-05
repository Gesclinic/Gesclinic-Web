import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function paintSignature(canvas, dataUrl) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (!dataUrl) {
    return;
  }

  const image = new Image();
  image.onload = () => {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  };
  image.src = dataUrl;
}

export default function LaudoSignaturePad({ signature, onChange, disabled = false }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) {
      return;
    }

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = wrapper.clientWidth || 320;
    const height = 150;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.scale(ratio, ratio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#0f172a';
    context.lineWidth = 2.2;

    paintSignature(canvas, signature?.visual_signature_data_url || '');
  }, [signature?.visual_signature_data_url]);

  const updateSignatureValue = (patch) => {
    onChange?.({
      ...signature,
      ...patch,
    });
  };

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const bounds = canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const handlePointerDown = (event) => {
    if (disabled) {
      return;
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const point = getPoint(event);
    if (!canvas || !context || !point) {
      return;
    }
    drawingRef.current = true;
    lastPointRef.current = point;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handlePointerMove = (event) => {
    if (!drawingRef.current || disabled) {
      return;
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const point = getPoint(event);
    if (!canvas || !context || !point) {
      return;
    }
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
  };

  const commitSignature = () => {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    updateSignatureValue({ visual_signature_data_url: canvas.toDataURL('image/png') });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    paintSignature(canvas, '');
    updateSignatureValue({ visual_signature_data_url: '' });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="signature-signer-name">Assinante</Label>
        <Input
          id="signature-signer-name"
          value={signature?.signed_by_name || ''}
          onChange={(event) => updateSignatureValue({ signed_by_name: event.target.value })}
          placeholder="Nome do responsável pela assinatura"
          className="bg-white"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signature-certificate-id">
          Certificado digital <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              id="signature-certificate-id"
              value={signature?.certificate_id || ''}
              onChange={(event) => updateSignatureValue({ certificate_id: event.target.value })}
              placeholder="Ex.: ICP-A1-2026-001"
              className="bg-white flex-1"
              disabled={disabled}
              required
              aria-required="true"
            />
            <Button
              type="button"
              variant="outline"
              className="whitespace-nowrap"
              disabled={disabled}
              onClick={async () => {
                // Sugestão para produção: integrar com Web PKI (https://webpki.lacunasoftware.com/)
                alert(
                  'Para produção, integre com Web PKI para leitura segura do certificado A1/A3.',
                );
              }}
            >
              Web PKI
            </Button>
          </div>
          <div className="flex gap-2 items-center mt-2">
            <input
              type="file"
              accept=".pfx,.p12"
              id="pfx-upload"
              disabled={disabled}
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) {
                  return;
                }
                const password = prompt('Digite a senha do certificado A1 (.pfx):');
                if (!password) {
                  return;
                }
                // Leitura local do .pfx usando pkijs
                try {
                  const pkijs = await import('pkijs');
                  const asn1js = await import('asn1js');
                  const buffer = file.arrayBuffer
                    ? await file.arrayBuffer()
                    : await new Response(file).arrayBuffer();
                  const asn1 = asn1js.fromBER(buffer);
                  if (asn1.offset === -1) {
                    throw new Error('Arquivo .pfx inválido ou corrompido.');
                  }
                  const pfx = new pkijs.PFX({ schema: asn1.result });
                  // pkijs >=3.x: parseInternalValues pode ser sync, depende da versão
                  let bags;
                  if (typeof pfx.parseInternalValues === 'function') {
                    bags = await pfx.parseInternalValues({ password });
                  } else if (typeof pfx.parseInternalValuesSync === 'function') {
                    bags = pfx.parseInternalValuesSync({ password });
                  } else {
                    throw new Error('Versão do pkijs incompatível.');
                  }
                  // Procura certificado
                  const certBag = bags.certBags?.[0]?.parsedValue;
                  if (certBag) {
                    const subject = certBag.subject.typesAndValues
                      .map((tv) => tv.value.valueBlock.value)
                      .join(' ');
                    const serial = certBag.serialNumber.valueBlock.valueHex
                      ? Array.from(new Uint8Array(certBag.serialNumber.valueBlock.valueHex))
                        .map((b) => b.toString(16).padStart(2, '0'))
                        .join('')
                      : '';
                    const notAfter = certBag.notAfter.value;
                    updateSignatureValue({
                      certificate_id: serial,
                      certificate_subject: subject,
                      certificate_validity: notAfter,
                    });
                    alert(
                      `Certificado lido:\nNome: ${subject}\nSérie: ${serial}\nValidade: ${notAfter}`,
                    );
                  } else {
                    alert('Não foi possível extrair o certificado do arquivo.');
                  }
                } catch (err) {
                  console.error('Erro detalhado ao ler .pfx:', err);
                  alert('Erro ao ler o .pfx: ' + (err.message || err));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="whitespace-nowrap"
              disabled={disabled}
              onClick={() => document.getElementById('pfx-upload').click()}
            >
              Carregar .pfx (A1)
            </Button>
          </div>
          {signature?.certificate_subject && (
            <div className="mt-2 text-xs text-slate-700">
              <div>
                <b>Nome:</b> {signature.certificate_subject}
              </div>
              <div>
                <b>Série:</b> {signature.certificate_id}
              </div>
              <div>
                <b>Validade:</b> {signature.certificate_validity}
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Obrigatório. Digite o identificador do certificado digital, utilize a leitura automática
          ou faça upload do .pfx (A1).
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Assinatura visual</Label>
          <Button
            type="button"
            variant="ghost"
            className="px-3 text-slate-600"
            onClick={clearSignature}
            disabled={disabled}
          >
            Limpar
          </Button>
        </div>
        <div
          ref={wrapperRef}
          className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white"
        >
          <canvas
            ref={canvasRef}
            className="block w-full touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={commitSignature}
            onPointerLeave={commitSignature}
          />
        </div>
        <p className="text-xs text-slate-500">
          Desenhe a assinatura do profissional. O traço será salvo junto com o hash do documento.
        </p>
      </div>
    </div>
  );
}
