import { useEffect, useState, type ReactNode } from 'react'
import { AlertBanner } from './components/AlertBanner'
import { BlindStructure } from './components/BlindStructure'
import { ChipCalculator } from './components/ChipCalculator'
import { Home, type Tab } from './components/Home'
import { ChipIcon, ClockIcon, HomeIcon, LevelsIcon, SpadeIcon, SpeakerIcon, SpeakerOffIcon } from './components/Icons'
import { SoundSettings } from './components/SoundSettings'
import { Timer } from './components/Timer'
import { loadCustomSounds, loadLibrarySounds } from './lib/sounds'
import { useAlertConfig } from './lib/storage'
import { formatClock, isRunning, remainingMs } from './lib/timer'
import { useGameClock } from './lib/useGameClock'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'inicio', label: 'Inicio', icon: <HomeIcon /> },
  { id: 'fichas', label: 'Fichas', icon: <ChipIcon /> },
  { id: 'ciegas', label: 'Ciegas', icon: <LevelsIcon /> },
  { id: 'reloj', label: 'Reloj', icon: <ClockIcon /> },
]

export function App() {
  const [tab, setTab] = useState<Tab>('inicio')
  const clock = useGameClock()
  const { game, now } = clock
  const [alerts] = useAlertConfig()
  const [soundOpen, setSoundOpen] = useState(false)

  // Sonidos grabados o elegidos en otra sesión
  useEffect(() => {
    void loadCustomSounds()
    void loadLibrarySounds()
  }, [])

  const goToChips = () => setTab('fichas')

  return (
    <div className={`app tab-${tab}`}>
      <header className="top">
        <h1>
          <SpadeIcon />
          Timba
        </h1>
        <div className="top-actions">
          {/* En Inicio el botón grande ya muestra el nivel y el tiempo */}
          {game && tab !== 'reloj' && tab !== 'inicio' && (
            <button className="mini-clock" onClick={() => setTab('reloj')}>
              {game.levels[game.index].smallBlind}/{game.levels[game.index].bigBlind}
              <strong className={isRunning(game) ? '' : 'paused'}>{formatClock(remainingMs(game, now))}</strong>
            </button>
          )}
          {tab !== 'inicio' && (
            <button
              className={`icon-btn sound-toggle ${alerts.muted ? 'muted' : ''}`}
              onClick={() => setSoundOpen(true)}
              aria-label={alerts.muted ? 'Sonido (silenciado)' : 'Sonido'}
            >
              {alerts.muted ? <SpeakerOffIcon /> : <SpeakerIcon />}
            </button>
          )}
        </div>
      </header>

      <main>
        {tab === 'inicio' ? (
          <Home clock={clock} onNavigate={setTab} />
        ) : tab === 'fichas' ? (
          <ChipCalculator />
        ) : tab === 'ciegas' ? (
          <BlindStructure clock={clock} onGoToChips={goToChips} />
        ) : (
          <Timer clock={clock} onGoToChips={goToChips} />
        )}
      </main>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <AlertBanner />
      {soundOpen && <SoundSettings onClose={() => setSoundOpen(false)} />}
    </div>
  )
}
