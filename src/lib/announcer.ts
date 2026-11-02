import { useSyncExternalStore } from 'react'
import type { BlindLevel } from './blinds'
import { BUY_IN } from './prizes'

/** Momentos de la partida que se avisan */
export type AlertEvent = 'level' | 'colorUp' | 'warning' | 'out' | 'bubble' | 'headsUp' | 'winner'

export const ALERT_EVENTS: { event: AlertEvent; label: string }[] = [
  { event: 'level', label: 'Suben las ciegas' },
  { event: 'colorUp', label: 'Suben con color-up' },
  { event: 'warning', label: 'Aviso antes de subir' },
  { event: 'out', label: 'Eliminación' },
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

const ORDINALS = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo']

/** "tercer puesto", "séptimo puesto"; del 11 en adelante, "puesto 11" */
export function placeWords(place: number): string {
  const word = ORDINALS[place - 1]
  return word ? `${word} puesto` : `puesto ${place}`
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Adiós a un jugador con nombre: su puesto y su premio, y la burbuja, el
 * mano a mano o el ganador si toca. alive son los que siguen tras caer él.
 */
export function knockout(
  name: string,
  place: number,
  alive: string[],
  prizeList: number[],
): { event: AlertEvent; speech: string; banner: Banner } {
  const prize = prizeList[place - 1] ?? 0
  const event = playersEvent(place, place - 1, prizeList.length) ?? 'out'
  const where = placeWords(place)
  const speech = [
    `Adiós, ${name}.`,
    prize > 0
      ? `${capitalize(where)}, ${prize === BUY_IN ? 'recupera sus' : 'se lleva'} ${prize} euros.`
      : `Queda en ${where}.`,
  ]
  const detail = `${place}º puesto${prize > 0 ? ` · ${prize} €` : ''}`

  if (event === 'winner') {
    speech.push(`${alive[0]} gana la partida y se lleva ${prizeList[0]} euros.`)
    return {
      event,
      speech: speech.join(' '),
      banner: { event, title: 'Ganador', big: alive[0], subtitle: `Se lleva ${prizeList[0]} €`, name: true },
    }
  }
  if (event === 'headsUp') {
    speech.push(`Mano a mano entre ${alive[0]} y ${alive[1]}.`)
    return {
      event,
      speech: speech.join(' '),
      banner: {
        event,
        title: 'Mano a mano',
        big: `${alive[0]} y ${alive[1]}`,
        subtitle: `Adiós, ${name}: ${detail}`,
        name: true,
      },
    }
  }
  if (event === 'bubble') speech.push('Burbuja: el siguiente en caer se va sin premio.')
  return {
    event,
    speech: speech.join(' '),
    banner: {
      event,
      title: 'Adiós',
      big: name,
      subtitle: event === 'bubble' ? `${detail}. Burbuja: el siguiente se va sin premio` : detail,
      name: true,
    },
  }
}

/** Cartel a pantalla completa: lo pinta AlertBanner sobre cualquier pestaña */
export interface Banner {
  event: AlertEvent
  title: string
  /** Texto grande (las ciegas, el premio…) */
  big?: string
  /** El texto grande es un nombre: va algo más pequeño para que quepa */
  name?: boolean
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
