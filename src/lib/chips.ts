export interface ChipColor {
  id: string
  name: string
  /** Color CSS para pintar la ficha */
  color: string
  value: number
  quantity: number
}

export interface ChipSet {
  id: string
  name: string
  chips: ChipColor[]
}

export type StackMode = 'corto' | 'normal' | 'largo' | 'custom'

/** Stack objetivo en ciegas grandes para cada modo predefinido */
export const STACK_BB: Record<Exclude<StackMode, 'custom'>, number> = {
  corto: 30,
  normal: 40,
  largo: 60,
}

export interface ChipCount {
  chip: ChipColor
  count: number
}

export interface Distribution {
  /** Fichas que recibe cada jugador, de menor a mayor valor */
  perPlayer: ChipCount[]
  /** Fichas que quedan en la banca, de menor a mayor valor */
  bank: ChipCount[]
  stack: number
  chipsPerPlayer: number
  bigBlind: number
  bigBlinds: number
  target: number
}

export type DistributionResult =
  | { ok: true; distribution: Distribution }
  | { ok: false; reason: string }

/** Nunca más de esta cantidad de fichas de un mismo color por jugador */
const MAX_PER_COLOR = 25
/** Fichas pequeñas deseables por jugador para pagar las primeras ciegas */
const MIN_SMALL_CHIPS = 8

// Pesos de la puntuación: menor es mejor
const W_TARGET = 10
const W_SMALL = 1
const W_IRREGULAR = 0.15
const W_CHIPS = 0.01

export function sortedChips(set: ChipSet): ChipColor[] {
  return set.chips
    .filter((c) => c.value > 0 && c.quantity > 0)
    .sort((a, b) => a.value - b.value)
}

export function bigBlindFor(set: ChipSet): number {
  const [smallest] = sortedChips(set)
  return smallest ? smallest.value * 2 : 0
}

export function targetStackFor(set: ChipSet, mode: StackMode, customStack: number): number {
  if (mode === 'custom') return customStack
  return bigBlindFor(set) * STACK_BB[mode]
}

/**
 * Reparte las fichas de forma escalonada: cuantas más alto el valor, menos
 * fichas de ese color. Busca la combinación que más se acerca al stack
 * objetivo dejando suficientes fichas pequeñas para las primeras ciegas.
 * Lo que no se reparte queda como banca para cambio y color-up.
 */
export function distribute(set: ChipSet, players: number, target: number): DistributionResult {
  const chips = sortedChips(set)
  if (chips.length === 0) {
    return { ok: false, reason: 'El set no tiene fichas con valor y cantidad.' }
  }
  if (players < 2) {
    return { ok: false, reason: 'Hacen falta al menos 2 jugadores.' }
  }
  if (target <= 0) {
    return { ok: false, reason: 'El stack objetivo tiene que ser mayor que 0.' }
  }

  const smallest = chips[0]
  const maxPer = chips.map((c) => Math.min(Math.floor(c.quantity / players), MAX_PER_COLOR))
  if (maxPer[0] < 2) {
    return {
      ok: false,
      reason: `No hay suficientes fichas de ${smallest.value} (${smallest.name}) para ${players} jugadores. Prueba a juntar otro set.`,
    }
  }

  // Colores que entran en el reparto: la ficha pequeña siempre; el resto si
  // llega al menos una por jugador y no es desproporcionada para el stack.
  const active = chips
    .map((_, i) => i)
    .filter((i) => i === 0 || (maxPer[i] >= 1 && chips[i].value <= target / 4))

  const minSmall = Math.min(MIN_SMALL_CHIPS, maxPer[0])
  const counts = new Array<number>(active.length).fill(0)
  let best: number[] | null = null
  let bestScore = Infinity

  const score = (): number => {
    let stack = 0
    let total = 0
    let irregular = 0
    for (let k = 0; k < active.length; k++) {
      stack += counts[k] * chips[active[k]].value
      total += counts[k]
      // Saltos parecidos entre colores: 10/8/6/4 mejor que 10/5/4/2
      if (k > 1) irregular += Math.abs(counts[k - 2] - 2 * counts[k - 1] + counts[k])
    }
    return (
      (W_TARGET * Math.abs(stack - target)) / target +
      (W_SMALL * (maxPer[0] - counts[0])) / maxPer[0] +
      W_IRREGULAR * irregular +
      W_CHIPS * total
    )
  }

  const search = (k: number, prev: number) => {
    if (k === active.length) {
      const s = score()
      if (s < bestScore) {
        bestScore = s
        best = [...counts]
      }
      return
    }
    // Escalonado estricto: siempre menos fichas que del color anterior
    const hi = Math.min(prev - 1, maxPer[active[k]])
    const lo = k === 0 ? minSmall : 1
    for (let c = lo; c <= hi; c++) {
      counts[k] = c
      search(k + 1, c)
    }
  }
  search(0, Infinity)

  if (!best) {
    return {
      ok: false,
      reason: `Con ${players} jugadores no hay fichas suficientes para un reparto escalonado. Prueba a juntar otro set.`,
    }
  }
  const chosen: number[] = best

  const perPlayer: ChipCount[] = chips.map((chip, i) => {
    const k = active.indexOf(i)
    return { chip, count: k === -1 ? 0 : chosen[k] }
  })
  const stack = perPlayer.reduce((sum, p) => sum + p.count * p.chip.value, 0)
  const bigBlind = smallest.value * 2

  return {
    ok: true,
    distribution: {
      perPlayer,
      bank: perPlayer.map((p) => ({ chip: p.chip, count: p.chip.quantity - p.count * players })),
      stack,
      chipsPerPlayer: perPlayer.reduce((sum, p) => sum + p.count, 0),
      bigBlind,
      bigBlinds: Math.floor(stack / bigBlind),
      target,
    },
  }
}
