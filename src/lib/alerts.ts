import { KeepAwake } from '@capacitor-community/keep-awake'
import { Capacitor } from '@capacitor/core'
import { Haptics } from '@capacitor/haptics'
import { useEffect } from 'react'

let ctx: AudioContext | null = null

/** Los navegadores solo dejan sonar audio tras un toque del usuario: llamar desde un clic */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Sin audio: la app sigue funcionando en silencio
  }
}

function tone(freq: number, startOffset: number, duration: number) {
  if (!ctx) return
  const t = ctx.currentTime + startOffset
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

/** Patrón de vibración: [vibra, pausa, vibra, …] en milisegundos */
function vibrate(pattern: number[]) {
  if (Capacitor.isNativePlatform()) {
    let offset = 0
    pattern.forEach((ms, i) => {
      if (i % 2 === 0) setTimeout(() => void Haptics.vibrate({ duration: ms }).catch(() => {}), offset)
      offset += ms
    })
    return
  }
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // No todos los navegadores permiten vibrar
  }
}

/** Cambio de nivel: tres tonos ascendentes */
export function levelChangeAlert() {
  tone(660, 0, 0.25)
  tone(880, 0.3, 0.25)
  tone(1320, 0.6, 0.6)
  vibrate([300, 150, 300, 150, 600])
}

/** Queda un minuto: dos tonos cortos */
export function oneMinuteAlert() {
  tone(880, 0, 0.15)
  tone(880, 0.25, 0.15)
  vibrate([150, 100, 150])
}

/** Mantiene la pantalla encendida mientras `active` sea true (si el navegador lo permite) */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (Capacitor.isNativePlatform()) {
      void KeepAwake.keepAwake().catch(() => {})
      return () => void KeepAwake.allowSleep().catch(() => {})
    }
    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) void l.release()
        else lock = l
      } catch {
        // Denegado (p. ej. batería baja o sin https): seguimos sin bloqueo
      }
    }
    // Al volver a la app el bloqueo se pierde y hay que pedirlo otra vez
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
