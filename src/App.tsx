import { useState } from 'react'
import { BlindStructure } from './components/BlindStructure'
import { ChipCalculator } from './components/ChipCalculator'
import { Timer } from './components/Timer'
import { formatClock, isRunning, remainingMs } from './lib/timer'
import { useGameClock } from './lib/useGameClock'

type Tab = 'fichas' | 'ciegas' | 'reloj'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'fichas', label: 'Fichas', icon: '◉' },
  { id: 'ciegas', label: 'Ciegas', icon: '▤' },
  { id: 'reloj', label: 'Reloj', icon: '◷' },
]

export function App() {
  const [tab, setTab] = useState<Tab>('fichas')
  const clock = useGameClock()
  const goToChips = () => setTab('fichas')
  const { game, now } = clock

  return (
    <div className="app">
      <header className="top">
        <h1>Timba</h1>
        {game && tab !== 'reloj' && (
          <button className="mini-clock" onClick={() => setTab('reloj')}>
            {game.levels[game.index].smallBlind}/{game.levels[game.index].bigBlind}
            <strong className={isRunning(game) ? '' : 'paused'}>{formatClock(remainingMs(game, now))}</strong>
          </button>
        )}
      </header>

      <main>
        {tab === 'fichas' ? (
          <ChipCalculator />
        ) : tab === 'ciegas' ? (
          <BlindStructure onGoToChips={goToChips} />
        ) : (
          <Timer clock={clock} onGoToChips={goToChips} />
        )}
      </main>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
