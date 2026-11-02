import type { BlindLevel } from './blinds'
import type { ChipColor } from './chips'
import { moveButtonSeat } from './seats'

/**
 * Estado de una partida en curso. El tiempo se guarda como marcas de reloj
 * (no como un contador), así sigue siendo correcto aunque el móvil bloquee
 * la pantalla o se recargue la app.
 */
export interface Game {
  /** Copia de los niveles al empezar: cambiar la configuración no afecta a la partida */
  levels: BlindLevel[]
  chips: ChipColor[]
  levelMs: number
  index: number
  /** Momento en que acaba el nivel actual si está en marcha; null si está en pausa */
  endsAt: number | null
  /** Tiempo que queda del nivel cuando está en pausa */
  remaining: number
  /** Jugadores y stack con los que empezó (opcionales: partidas guardadas antes no los tienen) */
  players?: number
  stack?: number
  /** Jugadores que siguen vivos; sin apuntar eliminaciones, todos */
  left?: number
  /** Nombres de los jugadores (opcionales: sin nombres solo se cuentan) */
  names?: string[]
  /** Eliminados con nombre por orden de caída: el primero acabó el último */
  out?: string[]
  /** Quién empezó con el botón (si se sortearon los asientos; names va en el orden de la mesa) */
  dealer?: string
  /** Asiento (índice en names) que lleva el botón en esta mano */
  buttonSeat?: number
}

export function newGame(levels: BlindLevel[], chips: ChipColor[], levelMinutes: number): Game {
  const levelMs = levelMinutes * 60_000
  return { levels, chips, levelMs, index: 0, endsAt: null, remaining: levelMs }
}

export function isRunning(game: Game): boolean {
  return game.endsAt !== null
}

export function remainingMs(game: Game, now: number): number {
  return game.endsAt === null ? game.remaining : Math.max(0, game.endsAt - now)
}

export function play(game: Game, now: number): Game {
  if (game.endsAt !== null || game.remaining <= 0) return game
  return { ...game, endsAt: now + game.remaining }
}

export function pause(game: Game, now: number): Game {
  if (game.endsAt === null) return game
  return { ...game, endsAt: null, remaining: Math.max(0, game.endsAt - now) }
}

/** Avanza los niveles que hayan terminado. Si se acaba el último, se queda a 0. */
export function tick(game: Game, now: number): Game {
  if (game.endsAt === null || now < game.endsAt) return game
  let { index, endsAt } = game
  const last = game.levels.length - 1
  while (now >= endsAt && index < last) {
    index++
    endsAt += game.levelMs
  }
  if (now >= endsAt) return { ...game, index, endsAt: null, remaining: 0 }
  return { ...game, index, endsAt }
}

/** Salta a un nivel con el tiempo completo, sin cambiar si estaba en marcha */
export function goTo(game: Game, index: number, now: number): Game {
  const i = Math.min(Math.max(index, 0), game.levels.length - 1)
  const running = isRunning(game)
  return {
    ...game,
    index: i,
    endsAt: running ? now + game.levelMs : null,
    remaining: game.levelMs,
  }
}

export function playersLeft(game: Game): number | undefined {
  return game.left ?? game.players
}

/** Apunta una eliminación (o la deshace): entre 1 y los jugadores que empezaron */
export function setPlayersLeft(game: Game, left: number): Game {
  if (!game.players) return game
  return { ...game, left: Math.min(game.players, Math.max(1, left)) }
}

/** Jugadores con nombre que siguen vivos */
export function alivePlayers(game: Game): string[] {
  const out = game.out ?? []
  return (game.names ?? []).filter((n) => !out.includes(n))
}

/** Apunta que ha caído un jugador con nombre; su puesto es el número de vivos que había */
export function eliminate(game: Game, name: string): Game {
  const alive = alivePlayers(game)
  if (!game.players || alive.length <= 1 || !alive.includes(name)) return game
  const out = [...(game.out ?? []), name]
  return { ...game, out, left: game.players - out.length }
}

/** Devuelve a la partida al último eliminado (por si se apuntó mal) */
export function undoElimination(game: Game): Game {
  if (!game.players || !game.out?.length) return game
  const out = game.out.slice(0, -1)
  return { ...game, out, left: game.players - out.length }
}

/** Quién ha acabado en cada puesto ya decidido (1 = ganador) */
export function finishers(game: Game): Map<number, string> {
  const places = new Map<number, string>()
  const players = game.players
  if (!players) return places
  game.out?.forEach((name, i) => places.set(players - i, name))
  const alive = alivePlayers(game)
  if (game.names && alive.length === 1) places.set(1, alive[0])
  return places
}

/**
 * Asiento del botón en esta mano, o undefined si no se sortearon los asientos.
 * Las partidas empezadas antes de llevar el botón lo sacan de quién repartió primero.
 */
export function buttonSeatOf(game: Game): number | undefined {
  if (game.buttonSeat !== undefined) return game.buttonSeat
  const seat = game.dealer ? (game.names?.indexOf(game.dealer) ?? -1) : -1
  return seat >= 0 ? seat : undefined
}

/** Pasa el botón a la mano siguiente (step -1: lo devuelve si se tocó de más) */
export function moveButton(game: Game, step: 1 | -1): Game {
  const seat = buttonSeatOf(game)
  if (!game.names || seat === undefined) return game
  return { ...game, buttonSeat: moveButtonSeat(game.names, game.out ?? [], seat, step) }
}

export function elapsedMs(game: Game, now: number): number {
  return game.index * game.levelMs + (game.levelMs - remainingMs(game, now))
}

/** Cuenta atrás redondea hacia arriba (no marca 0:00 hasta acabar); el tiempo transcurrido, hacia abajo */
export function formatClock(ms: number, round: (n: number) => number = Math.ceil): string {
  const total = round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? m.toString().padStart(2, '0') : m.toString()
  return `${h > 0 ? `${h}:` : ''}${mm}:${s.toString().padStart(2, '0')}`
}
