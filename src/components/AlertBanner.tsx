import { useEffect } from 'react'
import { showBanner, useBanner } from '../lib/announcer'
import { Chip } from './Chip'

/** Lo que tarda en quitarse solo el cartel */
const BANNER_MS = 7000

/**
 * Cartel a pantalla completa para los momentos importantes (suben las ciegas,
 * burbuja, mano a mano): con ruido en la mesa el sonido se pierde, el cartel no.
 * Se quita solo o tocándolo.
 */
export function AlertBanner() {
  const banner = useBanner()

  useEffect(() => {
    if (!banner) return
    const id = setTimeout(() => showBanner(null), BANNER_MS)
    return () => clearTimeout(id)
  }, [banner])

  if (!banner) return null
  return (
    <button className={`alert-banner ${banner.event} ${banner.name ? 'names' : ''}`} onClick={() => showBanner(null)} aria-live="assertive">
      <span className="alert-title">{banner.title}</span>
      {banner.big && <strong className="alert-big">{banner.big}</strong>}
      {banner.subtitle && <span className="alert-subtitle">{banner.subtitle}</span>}
      {banner.colorUp && banner.colorUp.length > 0 && (
        <span className="alert-colorup">
          {banner.colorUp.map((c) => (
            <span key={c.value} className="set-chip">
              <Chip color={c.color} size={40} value={c.value} /> Retirad las de {c.value}
            </span>
          ))}
        </span>
      )}
      <small className="alert-dismiss">Toca para cerrar</small>
    </button>
  )
}
