import { useEffect, useRef, useState } from 'react'
import type { BlindLevel } from '../lib/blinds'
import type { ChipColor } from '../lib/chips'
import { formatNumber } from '../lib/format'
import { bigBlindsOf, colorUpExchange, SHORT_BB, stackTotal } from '../lib/stackCount'
import { Chip } from './Chip'
import { CloseIcon, MinusIcon, PlusIcon } from './Icons'

interface Props {
  chips: ChipColor[]
  level: BlindLevel
  /** Valores de las fichas ya retiradas (color-up) */
  retired: number[]
  /** Stack medio de la mesa, en fichas */
  average: number | null
  onClose: () => void
}

const MAX_COUNT = 999

/**
 * Hoja para que un jugador cuente su stack en un momento: un all-in, el
 * color-up o ver si va corto. No guarda nada: al cerrarla se pone a cero.
 */
export function StackCounter({ chips, level, retired, average, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const setCount = (id: string, n: number) =>
    setCounts((c) => ({ ...c, [id]: Math.min(MAX_COUNT, Math.max(0, Math.floor(n) || 0)) }))
  const close = () => ref.current?.close()

  const total = stackTotal(chips, counts)
  const bb = bigBlindsOf(total, level.bigBlind)
  // Las retiradas se cambian por la ficha más pequeña que sigue en juego
  const retiredChips = chips.filter((c) => retired.includes(c.value))
  const retiredValue = stackTotal(retiredChips, counts)
  const into = chips.find((c) => !retired.includes(c.value))
  const exchange = into ? colorUpExchange(retiredValue, into.value) : 0

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      // Tocar fuera de la hoja (el fondo) la cierra
      onClick={(e) => e.target === ref.current && close()}
      aria-labelledby="stack-title"
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="stack-title">Mi stack</h2>
          <button className="icon-btn" onClick={close} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <div className="stack-total" aria-live="polite">
          <strong>{formatNumber(total)}</strong>
          <span>
            {formatNumber(bb)} BB
            {average && total > 0 && <> · {formatNumber(Math.round((total / average) * 10) / 10)}× la media</>}
          </span>
        </div>
        {total > 0 && bb < SHORT_BB && <p className="note">Menos de {SHORT_BB} ciegas grandes: zona de all-in.</p>}

        <ul className="count-rows">
          {chips.map((c) => {
            const n = counts[c.id] ?? 0
            const isRetired = retired.includes(c.value)
            return (
              <li key={c.id} className={isRetired ? 'retired' : ''}>
                <span className="count-chip">
                  <Chip color={c.color} size={40} value={c.value} />
                  {isRetired && <small>se retira</small>}
                </span>
                <span className="count-stepper">
                  <button onClick={() => setCount(c.id, n - 1)} disabled={n === 0} aria-label={`Una de ${c.value} menos`}>
                    <MinusIcon />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_COUNT}
                    placeholder="0"
                    value={n || ''}
                    onChange={(e) => setCount(c.id, Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    aria-label={`Fichas de ${c.value}`}
                  />
                  <button onClick={() => setCount(c.id, n + 1)} aria-label={`Una de ${c.value} más`}>
                    <PlusIcon />
                  </button>
                </span>
                <span className="count-sub">{n > 0 && formatNumber(n * c.value)}</span>
              </li>
            )
          })}
        </ul>

        {retiredValue > 0 && into && (
          <p className="note">
            Entregas {formatNumber(retiredValue)} en fichas retiradas:{' '}
            {exchange > 0
              ? `te tocan ${exchange} de ${into.value}`
              : `no llega a media ficha de ${into.value}, no te toca ninguna`}{' '}
            (redondeando a la más cercana).
          </p>
        )}

        <button className="link" onClick={() => setCounts({})} disabled={total === 0}>
          Poner a cero
        </button>
      </div>
    </dialog>
  )
}
