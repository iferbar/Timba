import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech'
import { Capacitor } from '@capacitor/core'
import { useSyncExternalStore } from 'react'
import { audioContext, vibrate } from './alerts'
import type { AlertEvent } from './announcer'
import { deleteStoredSound, loadStoredSounds, saveStoredSound } from './soundStore'
import type { AlertConfig } from './storage'

// --- Sonidos de casino generados con Web Audio (sin archivos: funcionan offline) ---

type Synth = (c: AudioContext, t: number) => void

/** Campana: tono con un parcial inarmónico que se apaga solo */
function bell(c: AudioContext, at: number, freq: number, duration: number, volume = 0.5) {
  for (const [ratio, gainScale] of [
    [1, 1],
    [2.76, 0.25],
  ]) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq * ratio
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(volume * gainScale, at + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    osc.connect(gain).connect(c.destination)
    osc.start(at)
    osc.stop(at + duration + 0.05)
  }
}

let noise: AudioBuffer | null = null

/** Choque de fichas: ruido muy corto filtrado en agudos */
function clack(c: AudioContext, at: number, volume = 0.7) {
  if (!noise) {
    noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3)
  }
  const src = c.createBufferSource()
  const filter = c.createBiquadFilter()
  const gain = c.createGain()
  src.buffer = noise
  filter.type = 'bandpass'
  filter.frequency.value = 2400 + Math.random() * 1200
  filter.Q.value = 1.2
  gain.gain.value = volume
  src.connect(filter).connect(gain).connect(c.destination)
  src.start(at)
}

/** Nota de fanfarria: triángulo con un poco de brillo */
function horn(c: AudioContext, at: number, freq: number, duration: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.45, at + 0.03)
  gain.gain.setValueAtTime(0.45, at + duration * 0.6)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(gain).connect(c.destination)
  osc.start(at)
  osc.stop(at + duration + 0.05)
}

/** Sonido de cada momento y lo que dura (para que la voz entre después) */
const BUILT_IN: Record<AlertEvent, { duration: number; play: Synth }> = {
  level: {
    duration: 1.3,
    play: (c, t) => {
      clack(c, t)
      clack(c, t + 0.07)
      clack(c, t + 0.16)
      bell(c, t + 0.3, 784, 0.6)
      bell(c, t + 0.5, 1047, 0.8)
    },
  },
  colorUp: {
    duration: 1.6,
    play: (c, t) => {
      for (let i = 0; i < 6; i++) clack(c, t + i * 0.045, 0.6)
      bell(c, t + 0.4, 659, 0.5)
      bell(c, t + 0.55, 880, 0.5)
      bell(c, t + 0.7, 1319, 0.9)
    },
  },
  warning: {
    duration: 0.9,
    play: (c, t) => {
      bell(c, t, 1047, 0.45, 0.4)
      bell(c, t + 0.3, 1047, 0.6, 0.4)
    },
  },
  out: {
    duration: 1.1,
    play: (c, t) => {
      clack(c, t)
      horn(c, t + 0.1, 392, 0.22)
      horn(c, t + 0.35, 330, 0.22)
      horn(c, t + 0.6, 262, 0.5)
    },
  },
  bubble: {
    duration: 1.2,
    play: (c, t) => {
      horn(c, t, 196, 0.25)
      horn(c, t + 0.35, 196, 0.25)
      horn(c, t + 0.7, 294, 0.5)
    },
  },
  headsUp: {
    duration: 1.0,
    play: (c, t) => {
      clack(c, t)
      bell(c, t + 0.1, 523, 0.5)
      bell(c, t + 0.35, 784, 0.7)
    },
  },
  winner: {
    duration: 1.6,
    play: (c, t) => {
      horn(c, t, 523, 0.18)
      horn(c, t + 0.15, 659, 0.18)
      horn(c, t + 0.3, 784, 0.18)
      horn(c, t + 0.45, 1047, 0.9)
      for (let i = 0; i < 5; i++) clack(c, t + 0.5 + i * 0.05, 0.5)
    },
  },
}

const VIBRATION: Record<AlertEvent, number[]> = {
  level: [300, 150, 300, 150, 600],
  colorUp: [300, 150, 300, 150, 300, 150, 600],
  warning: [150, 100, 150],
  out: [200, 100, 400],
  bubble: [500, 200, 500],
  headsUp: [200, 100, 200],
  winner: [200, 100, 200, 100, 800],
}

/** Sorteo de asientos: una ficha por cada asiento y campanas al salir el botón */
export function playSeatSound() {
  const c = audioContext()
  if (c) clack(c, c.currentTime + 0.01, 0.6)
}

export function playDealerSound() {
  const c = audioContext()
  if (!c) return
  bell(c, c.currentTime + 0.02, 784, 0.5)
  bell(c, c.currentTime + 0.2, 1175, 0.8)
}

// --- Sonidos propios: grabados o elegidos del móvil ---

const custom = new Map<AlertEvent, AudioBuffer>()
const customListeners = new Set<() => void>()
let customSnapshot = new Set<AlertEvent>()

function customChanged() {
  customSnapshot = new Set(custom.keys())
  customListeners.forEach((notify) => notify())
}

/** Decodifica sin el contexto principal: así se pueden cargar al arrancar sin un toque del usuario */
async function decode(blob: Blob): Promise<AudioBuffer | null> {
  try {
    return await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(await blob.arrayBuffer())
  } catch {
    return null
  }
}

/** Carga los sonidos guardados (al arrancar la app) */
export async function loadCustomSounds() {
  try {
    const stored = await loadStoredSounds()
    for (const [key, blob] of stored) {
      const buffer = await decode(blob)
      if (buffer) custom.set(key as AlertEvent, buffer)
    }
    customChanged()
  } catch {
    // Sin IndexedDB (p. ej. modo privado): solo sonidos de serie
  }
}

/** Guarda un sonido propio; false si el audio no se puede reproducir */
export async function setCustomSound(event: AlertEvent, blob: Blob): Promise<boolean> {
  const buffer = await decode(blob)
  if (!buffer) return false
  custom.set(event, buffer)
  customChanged()
  await saveStoredSound(event, blob).catch(() => {})
  return true
}

export async function removeCustomSound(event: AlertEvent) {
  custom.delete(event)
  customChanged()
  await deleteStoredSound(event).catch(() => {})
}

/** Momentos que tienen sonido propio */
export function useCustomSounds(): Set<AlertEvent> {
  return useSyncExternalStore(
    (onChange) => {
      customListeners.add(onChange)
      return () => customListeners.delete(onChange)
    },
    () => customSnapshot,
  )
}

/** Suena el sonido del momento (propio o de serie) y devuelve cuánto dura, en segundos */
export function playSound(event: AlertEvent): number {
  const c = audioContext()
  if (!c) return 0
  const t = c.currentTime + 0.02
  const buffer = custom.get(event)
  if (buffer) {
    const src = c.createBufferSource()
    src.buffer = buffer
    src.connect(c.destination)
    src.start(t)
    return buffer.duration
  }
  BUILT_IN[event].play(c, t)
  return BUILT_IN[event].duration
}

// --- Voz ---

let webVoice: SpeechSynthesisVoice | null | undefined

/** Lee un texto en voz alta en español (en el APK, con la voz de Android) */
export function speak(text: string) {
  if (Capacitor.isNativePlatform()) {
    void TextToSpeech.speak({ text, lang: 'es-ES', rate: 1, queueStrategy: QueueStrategy.Add }).catch(() => {})
    return
  }
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth) return
  webVoice ??= synth.getVoices().find((v) => v.lang.startsWith('es')) ?? null
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'es-ES'
  if (webVoice) utterance.voice = webVoice
  synth.speak(utterance)
}

/**
 * Avisa de un momento según los ajustes: vibración, sonido y, al acabar el
 * sonido, la voz. El silencio corta sonido y voz; la vibración va aparte.
 */
export function announce(event: AlertEvent, speech: string, config: AlertConfig) {
  if (config.vibration) vibrate(VIBRATION[event])
  if (config.muted) return
  const duration = playSound(event)
  if (config.voice && speech) setTimeout(() => speak(speech), duration * 1000 + 150)
}
