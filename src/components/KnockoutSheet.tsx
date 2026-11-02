import { useEffect, useRef } from 'react'
import { CloseIcon } from './Icons'
import { MAX_AROUND, SeatTable } from './SeatTable'

interface Props {
  /** Los que siguen vivos */
  alive: string[]
  /** Premio del puesto en el que cae (0 si no cobra) */
  prize: number
  /** Con asientos sorteados se elige sobre la mesa; si no, en una cuadrícula de nombres */
  seats?: string[]
  out?: string[]
  buttonSeat?: number
  chipColors?: string[]
  onPick: (name: string) => void
  onClose: () => void
}

/**
 * Hoja "¿Quién cae?": se toca al eliminado y queda en el puesto que toca. Con
 * asientos sorteados es la mesa, así que sirve también para mirar quién se
 * sienta dónde (tocando fuera se cierra sin apuntar nada).
 */
export function KnockoutSheet({ alive, prize, seats, out = [], buttonSeat, chipColors, onPick, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const pick = (name: string) => {
    onPick(name)
    ref.current?.close()
  }
  const place = alive.length
  const reward = prize > 0 ? `se lleva ${prize} €` : 'sin premio'
  const onTable = seats && seats.length <= MAX_AROUND

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="knockout-title"
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="knockout-title">¿Quién cae?</h2>
          <button className="icon-btn" onClick={() => ref.current?.close()} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>
        {onTable ? (
          <>
            <SeatTable
              seats={seats}
              out={out}
              buttonSeat={buttonSeat}
              chipColors={chipColors}
              onPick={pick}
              center={
                <>
                  <strong>{place}º puesto</strong>
                  <span>{reward}</span>
                </>
              }
            />
            <p className="muted center">Toca su nombre. Para solo mirar la mesa, toca fuera.</p>
          </>
        ) : (
          <>
            <p className="setup-label">
              Queda en {place}º puesto · {reward}
            </p>
            <ul className="knockout-grid">
              {alive.map((name) => (
                <li key={name}>
                  <button onClick={() => pick(name)}>{name}</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </dialog>
  )
}
