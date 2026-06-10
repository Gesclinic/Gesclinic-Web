/**
 * 💰 Utilitários - Fluxo de Caixa
 */

/**
 * Formata valor em moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata valor percentual
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calcula variação percentual entre dois valores
 */
export function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : Infinity;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Obtém cor baseada no valor (positivo/negativo)
 */
export function getValueColor(value: number): string {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
}

/**
 * Obtém cor de fundo baseada no valor
 */
export function getValueBg(value: number): string {
  if (value > 0) return 'bg-green-50';
  if (value < 0) return 'bg-red-50';
  return 'bg-gray-50';
}

/**
 * Formata data em formato brasileiro
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Calcula dias até data
 */
export function daysUntil(date: string): number {
  const today = new Date();
  const target = new Date(date);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calcula média de valores
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calcula total de valores
 */
export function calculateTotal(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Gera série temporal de datas
 */
export function generateDateSeries(
  startDate: string,
  endDate: string,
  interval: 'daily' | 'weekly' | 'monthly' = 'daily'
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);

    switch (interval) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
  }

  return dates;
}

/**
 * Agrupa dados por período
 */
export function groupByPeriod(
  data: any[],
  dateField: string,
  valueField: string,
  period: 'daily' | 'weekly' | 'monthly' = 'daily'
): { date: string; total: number }[] {
  const grouped: { [key: string]: number } = {};

  data.forEach(item => {
    const date = new Date(item[dateField]);
    let key: string;

    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    grouped[key] = (grouped[key] || 0) + (item[valueField] || 0);
  });

  return Object.entries(grouped)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calcula projeção linear
 */
export function linearProjection(
  historicalData: { date: string; value: number }[],
  futureDate: string
): number {
  if (historicalData.length < 2) {
    return historicalData[0]?.value || 0;
  }

  // Calcular slope (inclinação)
  const n = historicalData.length;
  const sumX = Array.from({ length: n }, (_, i) => i).reduce((a, b) => a + b, 0);
  const sumY = historicalData.reduce((sum, d) => sum + d.value, 0);
  const sumXY = historicalData.reduce((sum, d, i) => sum + i * d.value, 0);
  const sumX2 = Array.from({ length: n }, (_, i) => i).reduce((sum, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calcular dias até futuro
  const lastDate = new Date(historicalData[n - 1].date);
  const future = new Date(futureDate);
  const daysDiff = Math.ceil((future.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  return intercept + slope * (n + daysDiff - 1);
}

/**
 * Valida intervalo de datas
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

/**
 * Obtém último dia do mês
 */
export function getLastDayOfMonth(date: string): string {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];
}

/**
 * Obtém primeiro dia do mês
 */
export function getFirstDayOfMonth(date: string): string {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1)
    .toISOString()
    .split('T')[0];
}
