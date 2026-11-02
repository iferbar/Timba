import type { CSSProperties, ReactNode } from 'react'
import { handRoles } from '../lib/seats'
import { SpadeIcon } from './Icons'

interface Props {
  /** Nombres en el orden de la mesa, empezando por el asiento 1 */
  seats: string[]
  /** Asiento del botón: se marcan el botón y las ciegas de la mano */
  buttonSeat?: number
  /** Eliminados: salen tachados */
  out?: string[]
  /** Asientos ya destapados en el sorteo; el resto, solo con su número */
  revealed?: number
  /** Colores del set, para el montón de fichas de cada asiento */
  chipColors?: string[]
  /** Lo que va escrito en el centro del tapete */
  center?: ReactNode
  /** Si está, los que siguen vivos se pueden tocar (para apuntar quién cae) */
  onPick?: (name: string) => void
}

/** Por encima de esto los nombres no caben alrededor de la mesa: van en lista */
export const MAX_AROUND = 10

/**
 * Punto alrededor del centro: el asiento 1 abajo y el resto en el sentido del
 * reloj. shift corre el punto hacia el asiento siguiente (fracción del hueco).
 */
function around(i: number, n: number, rx: number, ry: number, shift = 0): CSSProperties {
  const angle = Math.PI / 2 + (2 * Math.PI * (i + shift)) / n
  return { left: `${50 + rx * Math.cos(angle)}%`, top: `${50 + ry * Math.sin(angle)}%` }
}

/**
 * Mesa vista un poco desde arriba (madera, tapete y sombra) con cada jugador
 * en su asiento, su montón de fichas y el botón delante del que reparte.
 */
export function SeatTable({ seats, buttonSeat, out = [], revealed = seats.length, chipColors = [], center, onPick }: Props) {
  const roles = buttonSeat !== undefined ? handRoles(seats, out, buttonSeat) : null
  const blind = (i: number) => (i === roles?.big ? 'BB' : i === roles?.small ? 'SB' : null)
  // De mayor a menor valor: la ficha grande abajo del montón
  const stack = chipColors.slice(0, 3).reverse()

  if (seats.length > MAX_AROUND) {
    return (
      <ol className="seat-list">
        {seats.map((name, i) => (
          <li key={name} className={out.includes(name) ? 'out' : ''}>
            <span className="setup-label">{i + 1}</span>
            {i < revealed ? name : '–'}
            {i < revealed && i === roles?.button && <span className="table-puck">D</span>}
            {i < revealed && blind(i) && <small>{blind(i)}</small>}
          </li>
        ))}
      </ol>
    )
  }

  const n = seats.length
  return (
    <div className="seat-table">
      <div className="table-rail" aria-hidden="true">
        <div className="table-felt">{!center && <SpadeIcon />}</div>
      </div>
      {center && <div className="table-center">{center}</div>}

      {/* Montones de fichas, delante de cada asiento ocupado */}
      {stack.length > 0 &&
        seats.map(
          (name, i) =>
            i < revealed &&
            !out.includes(name) && (
              <span key={name} className="seat-stack" style={around(i, n, 25, 19)} aria-hidden="true">
                {stack.map((color, k) => (
                  <i key={k} style={{ background: color, bottom: k * 4 }} />
                ))}
              </span>
            ),
        )}

      {/* Un solo botón que se desliza de asiento en asiento */}
      {roles && (
        // Al lado del montón del que reparte, sin tapar el centro
        <span
          className="table-puck"
          style={around(roles.button, n, 25, 19, 0.32)}
          aria-label={`Botón: ${seats[roles.button]}`}
        >
          D
        </span>
      )}

      <ol>
        {seats.map((name, i) => {
          const shown = i < revealed
          const isOut = out.includes(name)
          return (
            <li
              key={name}
              className={`seat ${shown ? '' : 'hidden'} ${isOut ? 'out' : ''}`}
              style={around(i, n, 41, 42)}
            >
              {onPick && !isOut ? (
                <button className="seat-name" onClick={() => onPick(name)}>
                  {name}
                </button>
              ) : (
                <span className="seat-name">{shown ? name : i + 1}</span>
              )}
              {shown && blind(i) && <small>{blind(i)}</small>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
