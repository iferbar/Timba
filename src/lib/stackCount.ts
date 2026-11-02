import type { ChipColor } from './chips'

/** Por debajo de esto ya solo queda ir all-in o retirarse */
export const SHORT_BB = 10

/** Valor de un montón de fichas contadas por color (id de la ficha → cuántas) */
export function stackTotal(chips: ChipColor[], counts: Record<string, number>): number {
  return chips.reduce((sum, c) => sum + (counts[c.id] ?? 0) * c.value, 0)
}

/**
 * Color-up: las fichas retiradas se cambian por la ficha más pequeña que sigue
 * en juego, redondeando a la cantidad más cercana.
 */
export function colorUpExchange(amount: number, value: number): number {
  return Math.round(amount / value)
}

/** Ciegas grandes con un decimal si son pocas (ahí cada media ciega cuenta) */
export function bigBlindsOf(stack: number, bigBlind: number): number {
  const bb = stack / bigBlind
  return bb < SHORT_BB ? Math.round(bb * 10) / 10 : Math.floor(bb)
}
