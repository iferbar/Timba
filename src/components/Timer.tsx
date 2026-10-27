import { useGamePlan } from '../lib/plan'
import { elapsedMs, formatClock, isRunning, remainingMs } from '../lib/timer'
import type { GameClock } from '../lib/useGameClock'
import { formatHours, NoPlan } from './BlindStructure'
import { Chip } from './Chip'

interface Props {
  clock: GameClock
  onGoToChips: () => void
}

export function Timer({ clock, onGoToChips }: Props) {
  const plan = useGamePlan()
  const { game, now } = clock

  if (!game) {
    if (!plan) return <NoPlan onGoToChips={onGoToChips} />
    return (
      <div className="screen">
        <section className="card">
          <h2>Nueva partida</h2>
          <p className="summary">
            <strong>{plan.players}</strong> jugadores · stack <strong>{plan.stack.toLocaleString('es-ES')}</strong>
          </p>
          <p className="muted">
            {plan.levels.length} niveles de {plan.levelMinutes} min · pensada para {formatHours(plan.durationMinutes)} ·
            empieza en {plan.levels[0].smallBlind}/{plan.levels[0].bigBlind}
          </p>
        </section>
        <button className="start-btn" onClick={() => clock.start(plan)}>
          Empezar partida
        </button>
        <p className="muted center">
          Los niveles se fijan al empezar. Si cambias algo en Fichas o Ciegas, termina la partida y empieza otra.
        </p>
      </div>
    )
  }

  const level = game.levels[game.index]
  const next = game.levels[game.index + 1]
  const rem = remainingMs(game, now)
  const running = isRunning(game)
  const finished = !running && rem === 0
  const progress = 1 - rem / game.levelMs
  const chip = (value: number) => game.chips.find((c) => c.value === value)

  return (
    <div className="screen timer">
      <div className="timer-level">
        Nivel {level.level} de {game.levels.length}
        {level.overtime && <span className="badge">Prórroga</span>}
      </div>
      <div className="timer-blinds">
        {level.smallBlind.toLocaleString('es-ES')} / {level.bigBlind.toLocaleString('es-ES')}
      </div>
      <div className={`timer-clock ${running ? '' : 'paused'} ${rem <= 60_000 ? 'warning' : ''}`}>
        {formatClock(rem)}
      </div>
      <div className="progress">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="timer-state">{finished ? 'Último nivel terminado' : running ? ' ' : 'En pausa'}</div>

      {level.colorUp.length > 0 && (
        <div className="note">
          {level.colorUp.map((v) => (
            <span key={v} className="set-chip">
              <Chip color={chip(v)?.color ?? '#888'} size={18} /> Retirad las fichas de {v}
            </span>
          ))}
        </div>
      )}

      <div className="controls">
        <button className="ctrl" onClick={clock.prev} disabled={game.index === 0} aria-label="Nivel anterior">
          ⏮
        </button>
        <button className="ctrl main" onClick={clock.toggle} disabled={finished} aria-label={running ? 'Pausa' : 'Reanudar'}>
          {running ? '❚❚' : '▶'}
        </button>
        <button className="ctrl" onClick={clock.next} disabled={!next} aria-label="Nivel siguiente">
          ⏭
        </button>
      </div>

      {next && (
        <section className="card next">
          <span className="muted">Siguiente</span>
          <strong>
            {next.smallBlind.toLocaleString('es-ES')} / {next.bigBlind.toLocaleString('es-ES')}
          </strong>
          {next.colorUp.length > 0 && <span className="muted">· retirar fichas de {next.colorUp.join(', ')}</span>}
        </section>
      )}

      <p className="muted center">Tiempo de partida {formatClock(elapsedMs(game, now), Math.floor)}</p>

      <div className="timer-actions">
        <button className="link" onClick={clock.restartLevel}>
          Reiniciar nivel
        </button>
        <button
          className="link danger"
          onClick={() => {
            if (confirm('¿Terminar la partida?')) clock.end()
          }}
        >
          Terminar partida
        </button>
      </div>
    </div>
  )
}
