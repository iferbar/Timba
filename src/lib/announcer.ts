import { useSyncExternalStore } from 'react'
import type { BlindLevel } from './blinds'

/** Momentos de la partida que se avisan */
export type AlertEvent = 'level' | 'colorUp' | 'warning' | 'bubble' | 'headsUp' | 'winner'

export const ALERT_EVENTS: { event: AlertEvent; label: string }[] = [
  { event: 'level', label: 'Suben las ciegas' },
  { event: 'colorUp', label: 'Suben con color-up' },
  { event: 'warning', label: 'Aviso antes de subir' },
  { event: 'bubble', label: 'Burbuja' },
  { event: 'headsUp', label: 'Mano a mano' },
  { event: 'winner', label: 'Ganador' },
]

/** Lo que dice la voz al subir de nivel. Los números van sin puntos para que se lean bien */
export function levelSpeech(level: BlindLevel): string {
  const parts = [`Nivel ${level.level}.`, `Ciegas ${level.smallBlind}, ${level.bigBlind}.`]
  if (level.colorUp.length > 0) parts.push(`Retirad las fichas de ${level.colorUp.join(' y ')}.`)
  return parts.join(' ')
}

export function warningSpeech(minutes: number): string {
  return minutes === 1 ? 'Queda un minuto para subir las ciegas.' : `Quedan ${minutes} minutos para subir las ciegas.`
}

/**
 * Qué momento marca una eliminación: ganador con 1, mano a mano con 2 y
 * burbuja cuando el siguiente en caer ya no cobra. Deshacer no avisa.
 */
export function playersEvent(prevLeft: number, left: number, paidPlaces: number): AlertEvent | null {
  if (left >= prevLeft) return null
  if (left === 1) return 'winner'
  if (left === 2) return 'headsUp'
  if (left === paidPlaces + 1) return 'bubble'
  return null
}

export function playersSpeech(event: AlertEvent, firstPrize: number): string {
  if (event === 'winner') return `Tenemos ganador. Se lleva ${firstPrize} euros.`
  if (event === 'headsUp') return 'Mano a mano.'
  if (event === 'bubble') return 'Burbuja. El siguiente en caer se va sin premio.'
  return ''
}

/** Cartel a pantalla completa: lo pinta AlertBanner sobre cualquier pestaña */
export interface Banner {
  event: AlertEvent
  title: string
  /** Texto grande (las ciegas, el premio…) */
  big?: string
  subtitle?: string
  colorUp?: { color: string; value: number }[]
}

let banner: Banner | null = null
const bannerListeners = new Set<() => void>()

export function showBanner(next: Banner | null) {
  banner = next
  bannerListeners.forEach((notify) => notify())
}

export function useBanner(): Banner | null {
  return useSyncExternalStore(
    (onChange) => {
      bannerListeners.add(onChange)
      return () => bannerListeners.delete(onChange)
    },
    () => banner,
  )
}
