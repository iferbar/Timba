import type { BlindLevel } from './blinds'
import type { ChipColor } from './chips'

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
