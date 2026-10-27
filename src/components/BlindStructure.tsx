import { formatMinutes, type BlindLevel } from '../lib/blinds'
import type { ChipColor } from '../lib/chips'
import { useGamePlan } from '../lib/plan'
import { useBlindConfig } from '../lib/storage'
import { Chip } from './Chip'

const DURATIONS = [120, 150, 180, 240]
const LEVEL_LENGTHS = [15, 20, 30]

interface Props {
  onGoToChips: () => void
}

export function BlindStructure({ onGoToChips }: Props) {
  const plan = useGamePlan()
  const [config, setConfig] = useBlindConfig()

  if (!plan) {
    return <NoPlan onGoToChips={onGoToChips} />
  }

  const { levels, chips, stack, players, set } = plan
  const chipByValue = (value: number) => chips.find((c) => c.value === value)

  return (
    <div className="screen">
      <section className="card">
        <div className="card-head">
          <h2>Partida</h2>
          <button className="link" onClick={onGoToChips}>
            Cambiar
          </button>
        </div>
        <p className="summary">
          <strong>{players}</strong> jugadores · stack <strong>{stack.toLocaleString('es-ES')}</strong> · {set.name}
        </p>
        <p className="muted">{(players * stack).toLocaleString('es-ES')} fichas en juego</p>
      </section>

      <section className="card">
        <h2>Duración objetivo</h2>
        <div className="pills">
          {DURATIONS.map((d) => (
            <button
              key={d}
              className={`pill ${config.durationMinutes === d ? 'active' : ''}`}
              onClick={() => setConfig((c) => ({ ...c, durationMinutes: d }))}
            >
              {formatHours(d)}
            </button>
          ))}
        </div>
        <h2 className="spaced">Duración de cada nivel</h2>
        <div className="pills">
          {LEVEL_LENGTHS.map((m) => (
            <button
              key={m}
              className={`pill ${config.levelMinutes === m ? 'active' : ''}`}
              onClick={() => setConfig((c) => ({ ...c, levelMinutes: m }))}
            >
              {m} min
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Niveles</h2>
        <table className="levels">
          <thead>
            <tr>
              <th>Nivel</th>
              <th>Ciegas</th>
              <th>Empieza</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l, i) => (
              <LevelRow
                key={l.level}
                level={l}
                firstOvertime={l.overtime && !levels[i - 1]?.overtime}
                colorUpChips={l.colorUp.map((v) => chipByValue(v)!)}
              />
            ))}
          </tbody>
        </table>
        <p className="muted">
          Pensado para que la partida dure unas {formatHours(config.durationMinutes)}. Si se alarga, siguen los niveles
          de prórroga.
        </p>
      </section>
    </div>
  )
}

export function NoPlan({ onGoToChips }: Props) {
  return (
    <div className="screen">
      <section className="card warning">
        Primero ajusta las fichas: con la configuración actual no hay un reparto válido.
      </section>
      <button className="pill wide" onClick={onGoToChips}>
        Ir a Fichas
      </button>
    </div>
  )
}

function LevelRow({
  level: l,
  firstOvertime,
  colorUpChips,
}: {
  level: BlindLevel
  firstOvertime: boolean
  colorUpChips: ChipColor[]
}) {
  return (
    <>
      {firstOvertime && (
        <tr className="divider">
          <td colSpan={3}>Prórroga</td>
        </tr>
      )}
      {colorUpChips.length > 0 && (
        <tr className="color-up">
          <td colSpan={3}>
            {colorUpChips.map((c) => (
              <span key={c.id} className="set-chip">
                <Chip color={c.color} size={18} /> Retirar fichas de {c.value} ({c.name.toLowerCase()})
              </span>
            ))}
          </td>
        </tr>
      )}
      <tr className={l.overtime ? 'overtime' : ''}>
        <td className="level-num">{l.level}</td>
        <td className="level-blinds">
          {l.smallBlind.toLocaleString('es-ES')} / {l.bigBlind.toLocaleString('es-ES')}
        </td>
        <td className="level-time">{formatMinutes(l.startMinute)}</td>
      </tr>
    </>
  )
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m}` : `${h} h`
}
