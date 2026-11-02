import { KeepAwake } from '@capacitor-community/keep-awake'
import { Capacitor } from '@capacitor/core'
import { Haptics } from '@capacitor/haptics'
import { useEffect } from 'react'

let ctx: AudioContext | null = null

/** Contexto de audio compartido (null si el navegador no tiene Web Audio) */
export function audioContext(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
  } catch {
    // Sin audio: la app sigue funcionando en silencio
  }
  return ctx
}

/** Los navegadores solo dejan sonar audio tras un toque del usuario: llamar desde un clic */
export function unlockAudio() {
  const c = audioContext()
  if (c?.state === 'suspended') void c.resume()
}

/** Patrón de vibración: [vibra, pausa, vibra, …] en milisegundos */
export function vibrate(pattern: number[]) {
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
