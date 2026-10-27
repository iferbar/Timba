import { useState } from 'react'
import { distribute, STACK_BB, targetStackFor, type Distribution, type StackMode } from '../lib/chips'
import { useChipConfig } from '../lib/storage'
import { Chip } from './Chip'
import { SetEditor } from './SetEditor'

const MODES: { mode: StackMode; label: string }[] = [
  { mode: 'corto', label: `Corto · ${STACK_BB.corto} BB` },
  { mode: 'normal', label: `Normal · ${STACK_BB.normal} BB` },
  { mode: 'largo', label: `Largo · ${STACK_BB.largo} BB` },
  { mode: 'custom', label: 'Otro' },
]

const MIN_PLAYERS = 2
const MAX_PLAYERS = 20

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

  const target = targetStackFor(set, config.stackMode, config.customStack)
  const result = distribute(set, config.players, target)
  const setPlayers = (players: number) =>
    setConfig((c) => ({ ...c, players: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, players)) }))

  return (
    <div className="screen">
      <section className="card">
        <div className="card-head">
          <h2>Set de fichas</h2>
          <button className="link" onClick={() => setEditing(true)}>
            Editar sets
          </button>
        </div>
        <div className="pills">
          {config.sets.map((s) => (
            <button
              key={s.id}
              className={`pill ${s.id === set.id ? 'active' : ''}`}
              onClick={() => setConfig((c) => ({ ...c, selectedSetId: s.id }))}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="set-summary">
          {set.chips
            .slice()
            .sort((a, b) => a.value - b.value)
            .map((c) => (
              <span key={c.id} className="set-chip">
                <Chip color={c.color} size={20} />
                {c.value} <small>×{c.quantity}</small>
              </span>
            ))}
        </div>
      </section>

      <section className="card">
        <h2>Jugadores</h2>
        <div className="stepper">
          <button onClick={() => setPlayers(config.players - 1)} aria-label="Menos jugadores">
            −
          </button>
          <span className="stepper-value">{config.players}</span>
          <button onClick={() => setPlayers(config.players + 1)} aria-label="Más jugadores">
            +
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Stack inicial</h2>
        <div className="pills">
          {MODES.map(({ mode, label }) => (
            <button
              key={mode}
              className={`pill ${config.stackMode === mode ? 'active' : ''}`}
              onClick={() => setConfig((c) => ({ ...c, stackMode: mode }))}
            >
              {label}
            </button>
          ))}
        </div>
        {config.stackMode === 'custom' && (
          <label className="field">
            Stack objetivo
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={config.customStack || ''}
              onChange={(e) => setConfig((c) => ({ ...c, customStack: Number(e.target.value) }))}
            />
          </label>
        )}
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
  const off = Math.abs(d.stack - d.target) / d.target
  return (
    <section className="card result">
      <h2>Cada jugador recibe</h2>
      <ul className="rows">
        {d.perPlayer
          .filter((p) => p.count > 0)
          .map((p) => (
            <li key={p.chip.id}>
              <Chip color={p.chip.color} />
              <span className="row-name">
                {p.chip.name} <small>de {p.chip.value}</small>
              </span>
              <span className="row-count">×{p.count}</span>
              <span className="row-value">{p.count * p.chip.value}</span>
            </li>
          ))}
      </ul>
      <div className="total">
        <span>Stack</span>
        <strong>{d.stack.toLocaleString('es-ES')}</strong>
      </div>
      <p className="muted">
        {d.chipsPerPlayer} fichas por jugador · {d.bigBlinds} ciegas grandes (ciegas iniciales {d.bigBlind / 2}/
        {d.bigBlind})
      </p>
      {off > 0.1 && (
        <p className="note">
          Con {players} jugadores este set no llega a {d.target.toLocaleString('es-ES')} con un reparto escalonado. Para
          más stack, juntad otro set.
        </p>
      )}

      <h3>Banca (cambio y color-up)</h3>
      <div className="set-summary">
        {d.bank.map((b) => (
          <span key={b.chip.id} className="set-chip">
            <Chip color={b.chip.color} size={20} />×{b.count}
          </span>
        ))}
      </div>
    </section>
  )
}
