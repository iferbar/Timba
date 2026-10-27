import { useEffect, useRef, useState } from 'react'
import { levelChangeAlert, oneMinuteAlert, unlockAudio, useWakeLock } from './alerts'
import type { GamePlan } from './plan'
import { useGameStore } from './storage'
import { goTo, isRunning, newGame, pause, play, remainingMs, tick, type Game } from './timer'

const ONE_MINUTE = 60_000

/**
 * Reloj de la partida para toda la app: avanza niveles y avisa aunque se
 * esté mirando otra pestaña.
 */
export function useGameClock() {
  const [{ game }, setStore] = useGameStore()
  const [now, setNow] = useState(() => Date.now())
  const running = game ? isRunning(game) : false
  const prevRemaining = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!game) {
      prevRemaining.current = null
      return
    }
    const next = tick(game, now)
    if (next !== game) {
      levelChangeAlert()
      setStore({ game: next })
    }
    const rem = remainingMs(next, now)
    const prev = prevRemaining.current
    if (prev !== null && prev > ONE_MINUTE && rem <= ONE_MINUTE && rem > 0) oneMinuteAlert()
    prevRemaining.current = rem
  }, [game, now, setStore])

  // Pantalla encendida durante toda la partida, también en pausa
  useWakeLock(game !== null)

  const update = (fn: (g: Game, t: number) => Game) => {
    const t = Date.now()
    setNow(t)
    setStore((s) => (s.game ? { game: fn(s.game, t) } : s))
  }

  return {
    game,
    now,
    start(plan: GamePlan) {
      unlockAudio()
      const t = Date.now()
      setNow(t)
      setStore({ game: play(newGame(plan.levels, plan.chips, plan.levelMinutes), t) })
    },
    toggle() {
      unlockAudio()
      update((g, t) => (isRunning(g) ? pause(g, t) : play(g, t)))
    },
    next: () => update((g, t) => goTo(g, g.index + 1, t)),
    prev: () => update((g, t) => goTo(g, g.index - 1, t)),
    restartLevel: () => update((g, t) => goTo(g, g.index, t)),
    end: () => setStore({ game: null }),
  }
}

export type GameClock = ReturnType<typeof useGameClock>
