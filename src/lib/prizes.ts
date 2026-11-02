/** Buy-in de nuestras partidas, en euros (freezeout, sin recompras) */
export const BUY_IN = 5
/** Buy-in y premios se cambian de 5 en 5 € */
export const PRIZE_STEP = 5

/** Premios cambiados en la hoja Premios, guardados para la próxima partida */
export interface PrizeConfig {
  buyIn: number
  /**
   * Por nº de jugadores: cuántos cobran (sin poner, la mitad) y cuánto cada
   * uno (sin poner, o si no cuadra con el bote, el reparto escalonado)
   */
  byPlayers: Record<string, { paid?: number; amounts?: number[] }>
}

export const DEFAULT_PRIZE_CONFIG: PrizeConfig = { buyIn: BUY_IN, byPlayers: {} }

/** Cuántos cobran si no se cambia: la mitad, redondeando hacia abajo */
export const autoPaid = (players: number) => Math.max(1, Math.floor(players / 2))

/** Lo que falta por repartir del bote (negativo si se reparte de más) */
export const unassigned = (amounts: number[], pot: number) => pot - amounts.reduce((a, b) => a + b, 0)

/** Premios de la partida: los cambiados a mano si cuadran con el bote; si no, el reparto escalonado */
export function prizePlan(players: number, config: PrizeConfig): number[] {
  if (players < 2) return []
  const custom = config.byPlayers[players] ?? {}
  const paid = Math.min(players, custom.paid ?? autoPaid(players))
  const { amounts } = custom
  const pot = players * config.buyIn
  if (amounts?.length === paid && amounts.every((a) => a > 0) && unassigned(amounts, pot) === 0) return amounts
  return prizes(players, config.buyIn, paid)
}

/**
 * Reparto del bote, del 1º al último premiado, en euros y siempre en
 * múltiplos del buy-in. Cobra la mitad de los jugadores (redondeando hacia
 * abajo, o los que se digan), el último premiado recupera lo apostado y el
 * resto se reparte escalonado: 6 jugadores → 15 · 10 · 5; 7 → 20 · 10 · 5;
 * 8 → 20 · 10 · 5 · 5.
 */
export function prizes(players: number, buyIn = BUY_IN, paidPlaces = autoPaid(players)): number[] {
  if (players < 2) return []
  const paid = Math.min(players, Math.max(1, paidPlaces))
  if (paid === 1) return [players * buyIn]

  // En unidades de buy-in: 1 para el último; el resto con pesos n-1, …, 1
  const rest = players - 1
  const places = paid - 1
  const totalWeight = (places * (places + 1)) / 2
  const exact = Array.from({ length: places }, (_, i) => (rest * (places - i)) / totalWeight)
  const units = exact.map(Math.floor)
  // Lo que falta por el redondeo, a los de mayor decimal (a igualdad, el de más arriba)
  const order = exact.map((_, i) => i).sort((a, b) => exact[b] % 1 - exact[a] % 1 || a - b)
  for (let k = 0, left = rest - units.reduce((a, b) => a + b, 0); k < left; k++) units[order[k]]++
  units.push(1)

  // Nadie premiado se queda sin cobrar: si a alguno le toca 0, sale del 1º
  for (let i = 1; i < units.length; i++) {
    if (units[i] === 0) {
      units[i] = 1
      units[0]--
    }
  }
  // Cada puesto cobra más que el de debajo, salvo los que solo recuperan lo apostado
  for (let changed = true; changed; ) {
    changed = false
    for (let i = 0; i < units.length - 1; i++) {
      if (units[i] <= units[i + 1] && units[i + 1] > 1) {
        units[i]++
        units[i + 1]--
        changed = true
      }
    }
  }
  return units.map((u) => u * buyIn)
}
