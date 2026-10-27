export interface BlindInput {
  players: number
  startingStack: number
  /** Valores de las fichas en juego (se ordenan dentro) */
  chipValues: number[]
  levelMinutes: number
  durationMinutes: number
}

export interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  /** Minutos desde el inicio de la partida */
  startMinute: number
  /** Al empezar este nivel ya se pueden retirar estas fichas (color-up) */
  colorUp: number[]
  /** Nivel posterior a la duración objetivo */
  overtime: boolean
}

/**
 * Como en Pokersoup: al llegar a la duración objetivo la ciega grande ronda
 * las fichas totales entre este número, así la partida tiende a acabar ahí.
 */
const END_BB_DIVISOR = 12
/** Niveles extra por si la partida se alarga */
const OVERTIME_LEVELS = 4
const NICE_MANTISSAS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]

/** Ciegas grandes "bonitas" cuya ciega pequeña se paga con la ficha más baja */
function niceBigBlinds(smallest: number, max: number): number[] {
  const out: number[] = []
  for (let exp = 1; exp <= max * 10; exp *= 10) {
    for (const m of NICE_MANTISSAS) {
      const bb = m * exp
      if (bb % (2 * smallest) === 0 && bb <= max) out.push(bb)
    }
  }
  return out
}

/** ¿Se puede formar esta cantidad con fichas de estos valores? */
export function payable(amount: number, values: number[]): boolean {
  const ok = new Array<boolean>(amount + 1).fill(false)
  ok[0] = true
  for (let a = 1; a <= amount; a++) {
    ok[a] = values.some((v) => v <= a && ok[a - v])
  }
  return ok[amount]
}

export function blindStructure(input: BlindInput): BlindLevel[] {
  const values = [...new Set(input.chipValues.filter((v) => v > 0))].sort((a, b) => a - b)
  const { players, startingStack, levelMinutes, durationMinutes } = input
  if (values.length === 0 || players < 2 || startingStack <= 0 || levelMinutes <= 0 || durationMinutes <= 0) {
    return []
  }

  const smallest = values[0]
  const totalChips = players * startingStack
  const startBB = 2 * smallest
  const endBB = Math.max(totalChips / END_BB_DIVISOR, startBB * 2)
  const levelsToEnd = durationMinutes / levelMinutes
  const growth = Math.pow(endBB / startBB, 1 / levelsToEnd)

  const candidates = niceBigBlinds(smallest, totalChips * 2)
  const levelCount = Math.ceil(levelsToEnd) + OVERTIME_LEVELS

  const bigBlinds: number[] = []
  for (let i = 0; i < levelCount; i++) {
    const ideal = startBB * Math.pow(growth, i)
    const prev = bigBlinds.at(-1) ?? 0
    // El valor bonito más cercano (en escala logarítmica), siempre subiendo
    let best = candidates.find((c) => c > prev)
    if (best === undefined) break
    for (const c of candidates) {
      if (c > prev && Math.abs(Math.log(c / ideal)) < Math.abs(Math.log(best / ideal))) best = c
    }
    bigBlinds.push(best)
  }

  const levels: BlindLevel[] = bigBlinds.map((bb, i) => ({
    level: i + 1,
    smallBlind: bb / 2,
    bigBlind: bb,
    startMinute: i * levelMinutes,
    colorUp: [],
    overtime: i * levelMinutes >= durationMinutes,
  }))

  // Una ficha se puede retirar cuando todas las ciegas siguientes se pagan sin
  // ella y además ya es poca cosa (la ciega pequeña vale al menos 4 de ellas).
  let remaining = values
  for (let k = 0; k < values.length - 1; k++) {
    const chip = values[k]
    const without = remaining.filter((v) => v !== chip)
    const from = levels.findIndex(
      (l, i) =>
        l.smallBlind >= 4 * chip &&
        levels.slice(i).every((n) => payable(n.smallBlind, without) && payable(n.bigBlind, without)),
    )
    if (from <= 0) break
    levels[from].colorUp.push(chip)
    remaining = without
  }

  return levels
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}
