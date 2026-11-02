import type { AlertEvent } from './announcer'

/** El sonido grabado o subido desde el móvil para ese momento */
export const CUSTOM = 'custom'
/** Sin sonido: solo voz y vibración */
export const NONE = 'none'

/** Sonido generado de cada momento: suena si su archivo de serie no está (o aún no se ha cargado) */
export const SYNTH_SOUND: Record<AlertEvent, string> = {
  level: 'chips-bells',
  colorUp: 'chips-arpeggio',
  warning: 'double-bell',
  out: 'farewell',
  bubble: 'low-horn',
  headsUp: 'chips-two-bells',
  winner: 'fanfare',
}

/** Sonido de serie de cada momento: ids de la biblioteca de sounds.ts o archivos de src/assets/sounds */
export const DEFAULT_SOUND: Record<AlertEvent, string> = {
  ...SYNTH_SOUND,
  level: 'file:ciegas.mp3',
  warning: 'file:aviso_antes_ciegas.mp3',
  out: 'file:jugador_eliminado.mp3',
}

/**
 * Qué suena en un momento. Sin elegir nada, el propio si lo hay (como antes de
 * poder elegir) y si no el de serie. Lo que ya no existe (un propio borrado, un
 * archivo quitado de la app) vuelve al de serie.
 */
export function resolveSound(
  event: AlertEvent,
  choices: Partial<Record<AlertEvent, string>>,
  hasCustom: boolean,
  exists: (id: string) => boolean,
): string {
  const chosen = choices[event] ?? (hasCustom ? CUSTOM : DEFAULT_SOUND[event])
  if (chosen === CUSTOM) return hasCustom ? CUSTOM : DEFAULT_SOUND[event]
  if (chosen === NONE || exists(chosen)) return chosen
  return DEFAULT_SOUND[event]
}

/** Nombre a mostrar de un archivo de sonido: "../assets/sounds/campana-hotel_2.mp3" → "Campana hotel 2" */
export function labelFromFile(path: string): string {
  const name = (path.split('/').pop() ?? path).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return name.charAt(0).toUpperCase() + name.slice(1)
}
