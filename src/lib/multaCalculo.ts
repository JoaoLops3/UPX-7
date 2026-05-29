/** Referência: 7 dias de atraso = R$ 5,00 (proporcional por dia). */
export const MULTA_DIAS_REFERENCIA = 7;
export const MULTA_VALOR_REFERENCIA = 5;

export function valorMultaPorDia(): number {
  return MULTA_VALOR_REFERENCIA / MULTA_DIAS_REFERENCIA;
}

export function calcularValorMulta(diasAtraso: number): number {
  if (diasAtraso <= 0) return 0;
  return Math.round(diasAtraso * valorMultaPorDia() * 100) / 100;
}

export function formatValorMulta(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

export function formatMultaCalculo(diasAtraso: number): string {
  const valor = calcularValorMulta(diasAtraso);
  const valorDia = formatValorMulta(valorMultaPorDia());
  const valorTotal = formatValorMulta(valor);
  const diaLabel = diasAtraso === 1 ? '1 dia' : `${diasAtraso} dias`;
  return `${diaLabel} × R$ ${valorDia}/dia (R$ 5,00 a cada 7 dias) = R$ ${valorTotal}`;
}
