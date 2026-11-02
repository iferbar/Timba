import { useState } from 'react'
import {
  clampPlayers,
  distribute,
  MAX_PLAYERS,
  MIN_PLAYERS,
  sortedChips,
  STACK_BB,
  targetStackFor,
  type Distribution,
  type StackMode,
} from '../lib/chips'
import { formatNumber } from '../lib/format'
import { useChipConfig } from '../lib/storage'
import { Chip } from './Chip'
import { ChevronIcon, MinusIcon, PencilIcon, PlusIcon, UsersIcon } from './Icons'
import { SetEditor } from './SetEditor'

// Para un stack a mano está el lápiz
/** Por debajo de esto la partida va demasiado rápida (ver CLAUDE.md: 30–50 BB) */
const MIN_BB = 30

const MODES: { mode: Exclude<StackMode, 'custom'>; label: string }[] = [
  { mode: 'corto', label: `Corto · ${STACK_BB.corto}` },
  { mode: 'normal', label: `Normal · ${STACK_BB.normal}` },
  { mode: 'largo', label: `Largo · ${STACK_BB.largo}` },
]

export function ChipCalculator() {
  const [config, setConfig] = useChipConfig()
  const [editing, setEditing] = useState(false)

  const set = config.sets.find((s) => s.id === config.selectedSetId) ?? config.sets[0]

  if (editing || !set) {
    return (
      <SetEditor
        sets={config.sets}
        onChange={(sets) =>
          setConfig((c) => ({
            ...c,
            sets,
            selectedSetId: sets.some((s) => s.id === c.selectedSetId) ? c.selectedSetId : (sets[0]?.id ?? ''),
          }))
        }
        onClose={() => setEditing(false)}
      />
    )
  }

  const chips = sortedChips(set)
  const target = targetStackFor(set, config.stackMode, config.customStack)
  const result = distribute(set, config.players, target)
  const setPlayers = (players: number) => setConfig((c) => ({ ...c, players: clampPlayers(players) }))
  // Con muchos jugadores el set no da para más: los modos que repiten el
  // stack del anterior no cambiarían nada, así que se desactivan
  const modeStacks = MODES.map(({ mode }) => {
    const r = distribute(set, config.players, targetStackFor(set, mode, config.customStack))
    return r.ok ? r.distribution.stack : null
  })
  const maxed = modeStacks.map((stack, i) => i > 0 && stack !== null && stack === modeStacks[i - 1])
  const maxStack = Math.max(...modeStacks.map((s) => s ?? 0))
  const maxBigBlinds =
    result.ok && maxed.some(Boolean) ? Math.floor(maxStack / result.distribution.bigBlind) : null
  // El lápiz pasa a "Otro" partiendo del stack que sale ahora
  const editStack = () =>
    setConfig((c) => ({ ...c, stackMode: 'custom', customStack: result.ok ? result.distribution.stack : target }))

  return (
    <div className="screen">
      <section className="card">
        <div className="set-select">
          <Chip color={chips[0]?.color ?? '#fff'} size={28} />
          <select
            value={set.id}
            onChange={(e) => setConfig((c) => ({ ...c, selectedSetId: e.target.value }))}
            aria-label="Set de fichas"
          >
            {config.sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronIcon />
          <button className="link" onClick={() => setEditing(true)}>
            Editar sets
          </button>
        </div>
        <div className="set-summary">
          {chips.map((c) => (
            <span key={c.id} className="set-chip">
              <Chip color={c.color} size={34} value={c.value} />
              <small>×{c.quantity}</small>
            </span>
          ))}
        </div>
        <p className="muted">
          {chips.reduce((n, c) => n + c.quantity, 0)} fichas · valor total{' '}
          {formatNumber(chips.reduce((n, c) => n + c.quantity * c.value, 0))}
        </p>
      </section>

      <section className="card players-row">
        <UsersIcon />
        <span>Jugadores</span>
        <div className="stepper compact">
          <button
            onClick={() => setPlayers(config.players - 1)}
            disabled={config.players <= MIN_PLAYERS}
            aria-label="Menos jugadores"
          >
            <MinusIcon />
          </button>
          <span className="stepper-value" aria-live="polite">
            {config.players}
          </span>
          <button
            onClick={() => setPlayers(config.players + 1)}
            disabled={config.players >= MAX_PLAYERS}
            aria-label="Más jugadores"
          >
            <PlusIcon />
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Stack inicial</h2>
          {config.stackMode !== 'custom' && (
            <button className="icon-btn" onClick={editStack} aria-label="Escribir el stack">
              <PencilIcon />
            </button>
          )}
        </div>
        {config.stackMode === 'custom' ? (
          <label className="stack-input">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              autoFocus
              value={config.customStack || ''}
              onChange={(e) => setConfig((c) => ({ ...c, customStack: Number(e.target.value) }))}
              aria-label="Stack objetivo"
            />
          </label>
        ) : (
          result.ok && <strong className="stack-big">{formatNumber(result.distribution.stack)}</strong>
        )}
        {result.ok && (
          <p className="muted">
            {result.distribution.bigBlinds} ciegas grandes · empieza {result.distribution.bigBlind / 2}/
            {result.distribution.bigBlind}
          </p>
        )}
        <div className="pills even">
          {MODES.map(({ mode, label }, i) => (
            <button
              key={mode}
              className={`pill ${config.stackMode === mode ? 'active' : ''}`}
              onClick={() => setConfig((c) => ({ ...c, stackMode: mode }))}
              disabled={maxed[i] && config.stackMode !== mode}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="muted">
          En ciegas grandes. Recomendado 30–50 para 2–3 h.
          {maxBigBlinds !== null && ` Con ${config.players} jugadores este set da como mucho ${maxBigBlinds}.`}
        </p>
      </section>

      {result.ok ? (
        <Result distribution={result.distribution} players={config.players} />
      ) : (
        <section className="card warning">{result.reason}</section>
      )}
    </div>
  )
}

function Result({ distribution: d, players }: { distribution: Distribution; players: number }) {
  return (
    <>
      <section className="card">
        <h2>Cada jugador recibe</h2>
        <ul className="deal-grid">
          {d.perPlayer
            .filter((p) => p.count > 0)
            .map((p) => (
              <li key={p.chip.id}>
                <Chip color={p.chip.color} size={44} value={p.chip.value} />
                <strong>×{p.count}</strong>
                <small>{formatNumber(p.count * p.chip.value)}</small>
              </li>
            ))}
        </ul>
        {/* El stack ya está en grande arriba */}
        <p className="muted center">{d.chipsPerPlayer} fichas por jugador</p>
        {/* Solo avisa si el stack queda corto de verdad, no por no llegar al objetivo exacto */}
        {d.bigBlinds < MIN_BB && (
          <p className="note">
            Con {players} jugadores salen {d.bigBlinds} ciegas grandes: la partida irá rápida. Para más stack, juntad
            otro set.
          </p>
        )}
      </section>

      <section className="card">
        <h2>Banca</h2>
        <div className="set-summary">
          {d.bank.map((b) => (
            <span key={b.chip.id} className="set-chip">
              <Chip color={b.chip.color} size={34} value={b.chip.value} />×{b.count}
            </span>
          ))}
        </div>
        <p className="muted">Para dar cambio y para el color-up.</p>
      </section>
    </>
  )
}
