import { useEffect, useRef, useState } from 'react'
import { unlockAudio, useWakeLock } from './alerts'
import { knockout, levelSpeech, playersEvent, playersSpeech, showBanner, warningSpeech } from './announcer'
import type { GamePlan } from './plan'
import { withQuip, type QuipMoment } from './quips'
import { announce } from './sounds'
import { useAlertConfig, useGameStore } from './storage'
import {
  alivePlayers,
  eliminate,
  gameBuyIn,
  gamePrizes,
  goTo,
  isRunning,
  moveButton,
  newGame,
  pause,
  play,
  playersLeft,
  remainingMs,
  setPlayersLeft,
  tick,
  undoElimination,
  type Game,
} from './timer'

const ONE_MINUTE = 60_000

/** Avisa de que sube el nivel: sonido, voz y cartel en cualquier pestaña */
function announceLevel(game: Game, config: ReturnType<typeof useAlertConfig>[0]) {
  const level = game.levels[game.index]
  const event = level.colorUp.length > 0 ? 'colorUp' : 'level'
  announce(event, withQuip(levelSpeech(level), event, {}, config.quips), config)
  showBanner({
    event,
    title: 'Suben las ciegas',
    big: `${level.smallBlind} / ${level.bigBlind}`,
    subtitle: `Nivel ${level.level} de ${game.levels.length}`,
    colorUp: level.colorUp.map((value) => ({
      value,
      color: game.chips.find((c) => c.value === value)?.color ?? '#888',
    })),
  })
}

/**
 * Reloj de la partida para toda la app: avanza niveles y avisa aunque se
 * esté mirando otra pestaña.
 */
export function useGameClock() {
  const [{ game }, setStore] = useGameStore()
  const [alerts] = useAlertConfig()
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
      if (next.index !== game.index) announceLevel(next, alerts)
      setStore({ game: next })
    }
    const rem = remainingMs(next, now)
    const prev = prevRemaining.current
    const warnMs = alerts.warnMinutes * ONE_MINUTE
    if (warnMs > 0 && prev !== null && prev > warnMs && rem <= warnMs && rem > 0) {
      announce('warning', withQuip(warningSpeech(alerts.warnMinutes), 'warning', {}, alerts.quips), alerts)
    }
    prevRemaining.current = rem
  }, [game, now, setStore, alerts])

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
      const game = {
        ...newGame(plan.levels, plan.chips, plan.levelMinutes),
        players: plan.players,
        stack: plan.stack,
        buyIn: plan.buyIn,
        prizes: plan.prizes,
        names: plan.names,
        dealer: plan.dealer,
        buttonSeat: plan.names && plan.dealer ? plan.names.indexOf(plan.dealer) : undefined,
      }
      setStore({ game: play(game, t) })
    },
    toggle() {
      unlockAudio()
      update((g, t) => (isRunning(g) ? pause(g, t) : play(g, t)))
    },
    next: () => update((g, t) => goTo(g, g.index + 1, t)),
    prev: () => update((g, t) => goTo(g, g.index - 1, t)),
    restartLevel: () => update((g, t) => goTo(g, g.index, t)),
    // Burbuja, mano a mano y ganador se avisan; con ganador el reloj se para solo
    setPlayersLeft: (left: number) => {
      if (game?.players) {
        const prev = playersLeft(game) ?? game.players
        const list = gamePrizes(game)
        const event = playersEvent(prev, Math.max(1, left), list.length)
        if (event) {
          unlockAudio()
          const speech = withQuip(playersSpeech(event, list[0]), event as QuipMoment, {}, alerts.quips)
          announce(event, speech, alerts)
          if (event === 'bubble') showBanner({ event, title: 'Burbuja', subtitle: 'El siguiente en caer se va sin premio' })
          if (event === 'headsUp') showBanner({ event, title: 'Mano a mano', subtitle: 'Quedan dos' })
        }
      }
      update((g, t) => {
        const next = setPlayersLeft(g, left)
        return playersLeft(next) === 1 ? pause(next, t) : next
      })
    },
    // Con nombres: adiós con su puesto y premio (y burbuja, mano a mano o ganador si toca)
    eliminate: (name: string) => {
      if (!game?.players) return
      const before = alivePlayers(game)
      const alive = before.filter((n) => n !== name)
      if (alive.length === 0 || alive.length === before.length) return
      unlockAudio()
      const list = gamePrizes(game)
      const { event, speech, banner } = knockout(name, before.length, alive, list, gameBuyIn(game))
      // El remate va del momento (ganador, mano a mano, burbuja) o, si no, de cómo se va el eliminado
      const prize = list[before.length - 1] ?? 0
      const moment: QuipMoment =
        event !== 'out' ? event : prize === 0 ? 'outUnpaid' : prize === gameBuyIn(game) ? 'outRefund' : 'outPaid'
      const vars = { nombre: name, ganador: alive[0], jugador1: alive[0], jugador2: alive[1], euros: String(prize) }
      announce(event, withQuip(speech, moment, vars, alerts.quips), alerts)
      showBanner(banner)
      update((g, t) => {
        const next = eliminate(g, name)
        return playersLeft(next) === 1 ? pause(next, t) : next
      })
    },
    undoElimination: () => update((g) => undoElimination(g)),
    nextHand: () => update((g) => moveButton(g, 1)),
    prevHand: () => update((g) => moveButton(g, -1)),
    end: () => setStore({ game: null }),
  }
}

export type GameClock = ReturnType<typeof useGameClock>
