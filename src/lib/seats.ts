/** Sorteo de asientos: los nombres en el orden de la mesa y quién empieza con el botón */
export interface SeatDraw {
  seats: string[]
  dealer: string
}

/** Fisher-Yates; random se puede cambiar en los tests */
export function drawSeats(names: string[], random: () => number = Math.random): SeatDraw {
  const seats = [...names]
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = seats[i]
    seats[i] = seats[j]
    seats[j] = swap
  }
  return { seats, dealer: seats[Math.floor(random() * seats.length)] }
}

/** Asientos (índices) del botón y de las ciegas en una mano */
export interface HandRoles {
  button: number
  small: number
  big: number
}

/** Siguiente asiento con alguien vivo, en el sentido del reloj (step -1: hacia atrás) */
function nextAlive(seats: string[], out: string[], from: number, step: 1 | -1 = 1): number {
  for (let k = 1; k <= seats.length; k++) {
    const i = (from + step * k + seats.length * k) % seats.length
    if (!out.includes(seats[i])) return i
  }
  return from
}

/**
 * Botón y ciegas de una mano: las ciegas van a la izquierda del botón (los
 * siguientes vivos). Mano a mano, el botón pone la pequeña. Si el del botón ha
 * caído, el botón se queda en su asiento vacío hasta la mano siguiente.
 */
export function handRoles(seats: string[], out: string[], buttonSeat: number): HandRoles {
  const alive = seats.filter((n) => !out.includes(n)).length
  const small = alive === 2 && !out.includes(seats[buttonSeat]) ? buttonSeat : nextAlive(seats, out, buttonSeat)
  return { button: buttonSeat, small, big: nextAlive(seats, out, small) }
}

/** Botón de la mano siguiente (o de la anterior, para deshacer un toque de más) */
export function moveButtonSeat(seats: string[], out: string[], buttonSeat: number, step: 1 | -1): number {
  return nextAlive(seats, out, buttonSeat, step)
}

/** Botón y ciegas de la primera mano, por nombre */
export function firstHand({ seats, dealer }: SeatDraw): { button: string; small: string; big: string } {
  const roles = handRoles(seats, [], seats.indexOf(dealer))
  return { button: dealer, small: seats[roles.small], big: seats[roles.big] }
}

/** El sorteo solo vale si los sentados son justo los que juegan hoy */
export function drawMatches(draw: SeatDraw | undefined, playing: string[]): draw is SeatDraw {
  return (
    draw !== undefined &&
    draw.seats.length === playing.length &&
    playing.every((name) => draw.seats.includes(name))
  )
}

export function drawSpeech(draw: SeatDraw): string {
  const { button, small, big } = firstHand(draw)
  if (button === small) return `Reparte ${button}, que pone la ciega pequeña. Ciega grande, ${big}.`
  return `Reparte ${button}. Ciega pequeña, ${small}. Ciega grande, ${big}.`
}
