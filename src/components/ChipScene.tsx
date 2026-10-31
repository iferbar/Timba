import { useEffect, useRef } from 'react'
import { createChipScene, type SceneChip } from '../three/chipScene'

interface Props {
  chips: SceneChip[]
}

/** Se carga aparte (React.lazy) para que Three.js solo se descargue en Inicio */
export default function ChipScene({ chips }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chipsKey = chips.map((c) => `${c.color}:${c.value}`).join('|')

  useEffect(() => {
    const host = ref.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let handle: ReturnType<typeof createChipScene> | null = null
    let cancelled = false
    // El número de las fichas usa Fredoka: esperar a que cargue antes de pintarlo
    void document.fonts.load('700 40px "Fredoka Variable"').finally(() => {
      if (cancelled) return
      try {
        // Lo que tapa el título de la cabecera, que flota encima de la escena
        const topInset = () => {
          const title = document.querySelector('.top h1')
          return title ? title.getBoundingClientRect().bottom - host.getBoundingClientRect().top : 0
        }
        handle = createChipScene(host, chips, reduced, topInset)
      } catch {
        // Sin WebGL: queda el fondo de la cabecera
      }
    })
    return () => {
      cancelled = true
      handle?.dispose()
    }
    // chipsKey resume `chips`: solo se rehace la escena si cambian colores o valores
  }, [chipsKey])

  return <div ref={ref} className="hero-scene" />
}
