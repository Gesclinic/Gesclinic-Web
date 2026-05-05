import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart3, TrendingDown, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { calculateItemTaxes } from '@/lib/taxCalculationApi';

export default function TaxCalculatorComponent({ clinicConfig = {} }) {
  const [invoiceAmount, setInvoiceAmount] = useState(1000);
  const [isHospitalService, setIsHospitalService] = useState(false);

  const { tax_regime = 'lucro_presumido', iss_rate: rawIssRate = 3.0 } = clinicConfig;

  // Converter iss_rate para número seguramente
  const iss_rate = typeof rawIssRate === 'number' ? rawIssRate : parseFloat(rawIssRate) || 3.0;

  // Calcular tributos para o regime atual
  const taxCalculation = useMemo(() => {
    return calculateItemTaxes({
      amount: invoiceAmount,
      isHospitalService: isHospitalService,
      taxRegime: tax_regime,
      issRate: iss_rate, // ISS já é um percentual (3, 2, etc.), não decimal
    });
  }, [tax_regime, invoiceAmount, iss_rate, isHospitalService]);

  const effectiveRate = ((taxCalculation.totalTaxes / invoiceAmount) * 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <CardTitle className="text-lg text-slate-950">Simulador de Tributos</CardTitle>
          <CardDescription>
            Ajuste os valores para ver o cálculo de impostos em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Valor da NF */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Valor Bruto do Serviço</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-500">R$</span>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  min="0"
                  step="100"
                />
              </div>
              <p className="text-xs text-slate-500">Valor de cada serviço/nota fiscal</p>
            </div>

            {/* Equiparação Hospitalar */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Tipo de Serviço</label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={isHospitalService}
                  onChange={(e) => setIsHospitalService(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-900">
                  Serviço Hospitalar (com equiparação)
                </span>
              </label>
              <p className="text-xs text-slate-500">Reduz base de IRPJ e CSLL</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Regime Calculation */}
      <Card
        className={`rounded-3xl border-2 shadow-sm overflow-hidden ${
          tax_regime === 'simples_nacional'
            ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white'
            : tax_regime === 'lucro_presumido'
              ? 'border-green-200 bg-gradient-to-br from-green-50 to-white'
              : 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
        }`}
      >
        <CardHeader
          className={`border-b ${
            tax_regime === 'simples_nacional'
              ? 'border-blue-100 bg-blue-100/50'
              : tax_regime === 'lucro_presumido'
                ? 'border-green-100 bg-green-100/50'
                : 'border-amber-100 bg-amber-100/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-950">
                {tax_regime === 'simples_nacional'
                  ? '📊 Simples Nacional'
                  : tax_regime === 'lucro_presumido'
                    ? '📈 Lucro Presumido'
                    : '📉 Lucro Real'}
              </CardTitle>
              <CardDescription className="mt-1">
                Cálculo atual para R$ {invoiceAmount.toFixed(2)}
              </CardDescription>
            </div>
            {isHospitalService && (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">Equiparação</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Main Numbers */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Valor Bruto
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                R$ {invoiceAmount.toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Tributos Totais
              </p>
              <p className="mt-2 text-2xl font-bold text-red-700">{effectiveRate}%</p>
              <p className="mt-1 text-sm font-semibold text-red-600">
                R$ {taxCalculation.totalTaxes.toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                Valor Líquido
              </p>
              <p className="mt-2 text-2xl font-bold text-green-700">
                R$ {(invoiceAmount - taxCalculation.totalTaxes).toFixed(2)}
              </p>
              <p className="mt-1 text-sm font-semibold text-green-600">
                {(100 - parseFloat(effectiveRate)).toFixed(2)}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Alíquota Efetiva
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{effectiveRate}%</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-4 text-sm font-semibold text-slate-900">Detalhamento de Impostos</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* IRPJ */}
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">IRPJ</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {taxCalculation.irpj.rate.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-600">R$ {taxCalculation.irpj.value.toFixed(2)}</p>
              </div>

              {/* CSLL */}
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">CSLL</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {taxCalculation.csll.rate.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-600">R$ {taxCalculation.csll.value.toFixed(2)}</p>
              </div>

              {/* PIS */}
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">PIS</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {taxCalculation.pis.rate.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-600">R$ {taxCalculation.pis.value.toFixed(2)}</p>
              </div>

              {/* COFINS */}
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">COFINS</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {taxCalculation.cofins.rate.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-600">
                  R$ {taxCalculation.cofins.value.toFixed(2)}
                </p>
              </div>

              {/* ISS */}
              <div className="rounded-xl bg-white p-3 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">ISS</p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {taxCalculation.iss.rate.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-600">R$ {taxCalculation.iss.value.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Equiparação Info */}
          {isHospitalService && (
            <div className="flex gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <Info className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
              <div className="text-sm text-emerald-900">
                <p className="font-semibold mb-1">✅ Equiparação Hospitalar Ativa</p>
                <p className="text-emerald-800">
                  Base de IRPJ reduzida de 32% para 8% | Base de CSLL reduzida de 32% para 12%
                </p>
              </div>
            </div>
          )}

          {/* ISS Warning */}
          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">⚠️ ISS é Municipal</p>
              <p className="text-amber-800">
                A alíquota de ISS varia por município. Verifique com sua prefeitura a alíquota
                correta ({iss_rate ? Number(iss_rate).toFixed(1) : '3.0'}% configurado).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
