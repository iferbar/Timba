/** Buy-in de nuestras partidas, en euros (freezeout, sin recompras) */
export const BUY_IN = 5

/**
 * Reparto del bote, del 1º al último premiado, en euros y siempre en
 * múltiplos del buy-in. Cobra la mitad de los jugadores (redondeando hacia
 * abajo), el último premiado recupera lo apostado y el resto se reparte
 * escalonado: 6 jugadores → 15 · 10 · 5; 7 → 20 · 10 · 5; 8 → 20 · 10 · 5 · 5.
 */
export function prizes(players: number, buyIn = BUY_IN): number[] {
  if (players < 2) return []
  const paid = Math.max(1, Math.floor(players / 2))
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
