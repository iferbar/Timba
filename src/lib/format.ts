/**
 * Números con punto de miles siempre ("4.500"): toLocaleString('es-ES') no
 * lo pone en los de cuatro cifras.
 */
export function formatNumber(n: number): string {
  const [int, dec] = String(n).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec ? `${grouped},${dec}` : grouped
}
