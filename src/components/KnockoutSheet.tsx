import { useEffect, useRef } from 'react'
import { CloseIcon } from './Icons'

interface Props {
  /** Los que siguen vivos */
  alive: string[]
  /** Premio del puesto en el que cae (0 si no cobra) */
  prize: number
  onPick: (name: string) => void
  onClose: () => void
}

/** Hoja "¿Quién cae?": se toca el nombre del eliminado y queda en el puesto que toca */
export function KnockoutSheet({ alive, prize, onPick, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

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
        <p className="setup-label">
          Queda en {alive.length}º puesto · {prize > 0 ? `se lleva ${prize} €` : 'sin premio'}
        </p>
        <ul className="knockout-grid">
          {alive.map((name) => (
            <li key={name}>
              <button
                onClick={() => {
                  onPick(name)
                  ref.current?.close()
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  )
}
