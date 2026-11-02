import { useEffect, useRef, useState, type ReactNode } from 'react'
import { autoPaid, PRIZE_STEP, prizePlan, prizes, unassigned, type PrizeConfig } from '../lib/prizes'
import { usePrizeConfig } from '../lib/storage'
import { CloseIcon, MinusIcon, PlusIcon } from './Icons'

const MAX_BUY_IN = 100

/**
 * Hoja Premios: buy-in, cuántos cobran y cuánto cada puesto. Lo cambiado se
 * guarda para las partidas con ese número de jugadores; un reparto que no
 * cuadra con el bote no se guarda (sigue el anterior).
 */
export function PrizeSheet({ players, onClose }: { players: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [config, setConfig] = usePrizeConfig()
  const [draft, setDraft] = useState(() => prizePlan(players, config))

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const custom = config.byPlayers[players] ?? {}
  const pot = players * config.buyIn
  const paid = draft.length
  const missing = unassigned(draft, pot)
  const automatic = prizes(players, config.buyIn, paid)
  const handTuned = draft.some((amount, i) => amount !== automatic[i])

  /** Guarda lo de este número de jugadores (sin nada que guardar, se borra) */
  const saveCustom = (c: PrizeConfig, next: PrizeConfig['byPlayers'][string]): PrizeConfig => {
    const byPlayers = { ...c.byPlayers }
    if (next.paid === undefined && next.amounts === undefined) delete byPlayers[players]
    else byPlayers[players] = next
    return { ...c, byPlayers }
  }

  const setBuyIn = (buyIn: number) => {
    const next = { ...config, buyIn }
    setConfig(next)
    setDraft(prizePlan(players, next))
  }

  const setPaid = (count: number | undefined) => {
    const next = saveCustom(config, { paid: count === autoPaid(players) ? undefined : count })
    setConfig(next)
    setDraft(prizePlan(players, next))
  }

  const setAmount = (place: number, amount: number) => {
    const next = draft.map((a, i) => (i === place ? amount : a))
    setDraft(next)
    if (unassigned(next, pot) !== 0) return
    const same = next.every((a, i) => a === automatic[i])
    setConfig((c) => saveCustom(c, { paid: custom.paid, amounts: same ? undefined : next }))
  }

  const resetAmounts = () => {
    setDraft(automatic)
    setConfig((c) => saveCustom(c, { paid: custom.paid }))
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="prizes-title"
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="prizes-title">Premios</h2>
          <button className="icon-btn" onClick={() => ref.current?.close()} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <div className="switches">
          <StepRow
            label="Buy-in"
            hint={`Bote: ${players} × ${config.buyIn} € = ${pot} €`}
            value={`${config.buyIn} €`}
            onMinus={() => setBuyIn(config.buyIn - PRIZE_STEP)}
            onPlus={() => setBuyIn(config.buyIn + PRIZE_STEP)}
            minusDisabled={config.buyIn <= PRIZE_STEP}
            plusDisabled={config.buyIn >= MAX_BUY_IN}
          />
          <StepRow
            label="Cobran"
            hint={
              custom.paid === undefined ? (
                'La mitad de la mesa'
              ) : (
                <button className="link" onClick={() => setPaid(undefined)}>
                  Volver a la mitad ({autoPaid(players)})
                </button>
              )
            }
            value={paid}
            onMinus={() => setPaid(paid - 1)}
            onPlus={() => setPaid(paid + 1)}
            minusDisabled={paid <= 1}
            plusDisabled={paid >= players}
          />
        </div>

        <h3 className="sheet-label">Reparto</h3>
        <div className="switches">
          {draft.map((amount, i) => (
            <StepRow
              key={i}
              label={`${i + 1}º`}
              hint={paid > 1 && amount === config.buyIn ? 'reintegro' : undefined}
              value={`${amount} €`}
              onMinus={() => setAmount(i, amount - PRIZE_STEP)}
              onPlus={() => setAmount(i, amount + PRIZE_STEP)}
              minusDisabled={amount <= PRIZE_STEP}
              plusDisabled={amount >= pot}
            />
          ))}
        </div>

        <p className={`prize-status ${missing === 0 ? 'ok' : 'warn'}`} aria-live="polite">
          {missing === 0
            ? `Cuadra con el bote de ${pot} €`
            : missing > 0
              ? `Faltan ${missing} € por repartir`
              : `Sobran ${-missing} €: quita de algún puesto`}
        </p>
        {missing !== 0 && <p className="muted">Hasta que cuadre se queda el reparto anterior.</p>}
        {handTuned && (
          <button className="link" onClick={resetAmounts}>
            Volver al reparto escalonado
          </button>
        )}

        <p className="muted">
          Se guarda para las partidas de {players} jugadores. Al empezar la partida, los premios quedan fijos.
        </p>
      </div>
    </dialog>
  )
}

function StepRow({
  label,
  hint,
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}: {
  label: string
  hint?: ReactNode
  value: ReactNode
  onMinus: () => void
  onPlus: () => void
  minusDisabled: boolean
  plusDisabled: boolean
}) {
  return (
    <div className="switch-row">
      <span className="sound-name">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <div className="stepper compact" role="group" aria-label={label}>
        <button onClick={onMinus} disabled={minusDisabled} aria-label={`Menos: ${label}`}>
          <MinusIcon />
        </button>
        <span className="stepper-value prize-value" aria-live="polite">
          {value}
        </span>
        <button onClick={onPlus} disabled={plusDisabled} aria-label={`Más: ${label}`}>
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}
