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

/** Radios (en % de la mesa): montones junto al borde y, por delante, las fichas de botón y ciegas */
const STACK_RX = 29
const STACK_RY = 22
const PUCK_RX = 21
const PUCK_RY = 14.5

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
              <span key={name} className="seat-stack" style={around(i, n, STACK_RX, STACK_RY)} aria-hidden="true">
                {stack.map((color, k) => (
                  <i key={k} style={{ background: color, bottom: k * 4 }} />
                ))}
              </span>
            ),
        )}

      {/* Botón y ciegas: una ficha de cada delante del jugador, que se desliza al pasar la mano */}
      {roles && (
        <>
          <span
            className="table-puck"
            style={around(roles.button, n, PUCK_RX, PUCK_RY)}
            aria-label={`Botón: ${seats[roles.button]}`}
          >
            D
          </span>
          {/* Mano a mano el botón pone la pequeña: su ficha va al lado de la D (unos 25°) para no taparse */}
          <span
            className="table-puck blind"
            style={
              roles.small === roles.button
                ? around(roles.small, n, PUCK_RX, PUCK_RY, -n * 0.07)
                : around(roles.small, n, PUCK_RX, PUCK_RY)
            }
            aria-label={`Ciega pequeña: ${seats[roles.small]}`}
          >
            SB
          </span>
          <span
            className="table-puck blind big"
            style={around(roles.big, n, PUCK_RX, PUCK_RY)}
            aria-label={`Ciega grande: ${seats[roles.big]}`}
          >
            BB
          </span>
        </>
      )}

      <ol>
        {seats.map((name, i) => {
          const shown = i < revealed
          const isOut = out.includes(name)
          return (
            <li
              key={name}
              className={`seat ${shown ? '' : 'hidden'} ${isOut ? 'out' : ''}`}
              style={around(i, n, 43, 43)}
            >
              {onPick && !isOut ? (
                <button className="seat-name" onClick={() => onPick(name)}>
                  {name}
                </button>
              ) : (
                <span className="seat-name">{shown ? name : i + 1}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
