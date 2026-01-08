import { useEffect, useMemo, useState } from 'react'
import './App.css'

const DOOR_COUNT = 3

const createDoors = () => {
  const prizeIndex = Math.floor(Math.random() * DOOR_COUNT)
  return Array.from({ length: DOOR_COUNT }, (_, index) => ({
    id: index,
    label: `Door ${index + 1}`,
    hasPrize: index === prizeIndex,
  }))
}

const pickHostDoor = (doors, selectedDoor) => {
  const options = doors.filter(
    (door) => door.id !== selectedDoor && !door.hasPrize
  )
  return options[Math.floor(Math.random() * options.length)].id
}

const pickSwitchDoor = (doors, selectedDoor, hostDoor) =>
  doors.find(
    (door) => door.id !== selectedDoor && door.id !== hostDoor
  )?.id ?? selectedDoor

const getWinRate = (wins, losses) => {
  const total = wins + losses
  if (!total) return '0%'
  return `${Math.round((wins / total) * 100)}%`
}

function App() {
  const [doors, setDoors] = useState(createDoors)
  const [selectedDoor, setSelectedDoor] = useState(null)
  const [hostDoor, setHostDoor] = useState(null)
  const [finalDoor, setFinalDoor] = useState(null)
  const [phase, setPhase] = useState('pick')
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState({
    stayWins: 0,
    stayLosses: 0,
    switchWins: 0,
    switchLosses: 0,
  })
  const [simRuns, setSimRuns] = useState(500)
  const [simStrategy, setSimStrategy] = useState('switch')
  const [lastSimulation, setLastSimulation] = useState(null)

  useEffect(() => {
    if (phase !== 'reveal' || selectedDoor === null) return
    const timeout = setTimeout(() => {
      setHostDoor(pickHostDoor(doors, selectedDoor))
      setPhase('decide')
    }, 900)

    return () => clearTimeout(timeout)
  }, [doors, phase, selectedDoor])

  const statusMessage = useMemo(() => {
    if (phase === 'pick') {
      return 'Choose a door. The host hides a car behind one door.'
    }
    if (phase === 'reveal') {
      return 'The host is revealing a goat door...'
    }
    if (phase === 'decide') {
      return 'One goat is revealed. Do you stay or switch?'
    }
    if (phase === 'result' && result) {
      return result.won
        ? `You ${result.strategy} and won the car!`
        : `You ${result.strategy} and met a goat.`
    }
    return ''
  }, [phase, result])

  const resetRound = () => {
    setDoors(createDoors())
    setSelectedDoor(null)
    setHostDoor(null)
    setFinalDoor(null)
    setPhase('pick')
    setResult(null)
  }

  const handleSelect = (doorId) => {
    if (phase !== 'pick') return
    setSelectedDoor(doorId)
    setPhase('reveal')
  }

  const commitDecision = (strategy) => {
    if (phase !== 'decide') return
    const chosenDoor =
      strategy === 'stay'
        ? selectedDoor
        : pickSwitchDoor(doors, selectedDoor, hostDoor)
    const won = doors.find((door) => door.id === chosenDoor)?.hasPrize
    setFinalDoor(chosenDoor)
    setPhase('result')
    setResult({ strategy, won })
    setStats((prev) => {
      if (strategy === 'stay') {
        return {
          ...prev,
          stayWins: prev.stayWins + (won ? 1 : 0),
          stayLosses: prev.stayLosses + (won ? 0 : 1),
        }
      }
      return {
        ...prev,
        switchWins: prev.switchWins + (won ? 1 : 0),
        switchLosses: prev.switchLosses + (won ? 0 : 1),
      }
    })
  }

  const runSimulation = () => {
    const runs = Math.max(1, Math.min(50000, Number(simRuns) || 1))
    let stayWins = 0
    let stayLosses = 0
    let switchWins = 0
    let switchLosses = 0

    for (let i = 0; i < runs; i += 1) {
      const simDoors = createDoors()
      const initialPick = Math.floor(Math.random() * DOOR_COUNT)
      const hostPick = pickHostDoor(simDoors, initialPick)
      const shouldSwitch =
        simStrategy === 'switch'
          ? true
          : simStrategy === 'stay'
          ? false
          : Math.random() > 0.5
      const finalPick = shouldSwitch
        ? pickSwitchDoor(simDoors, initialPick, hostPick)
        : initialPick
      const won = simDoors.find((door) => door.id === finalPick)?.hasPrize

      if (shouldSwitch) {
        if (won) {
          switchWins += 1
        } else {
          switchLosses += 1
        }
      } else if (won) {
        stayWins += 1
      } else {
        stayLosses += 1
      }
    }

    setStats((prev) => ({
      stayWins: prev.stayWins + stayWins,
      stayLosses: prev.stayLosses + stayLosses,
      switchWins: prev.switchWins + switchWins,
      switchLosses: prev.switchLosses + switchLosses,
    }))

    setLastSimulation({
      runs,
      strategy: simStrategy,
      stayWins,
      stayLosses,
      switchWins,
      switchLosses,
    })
  }

  const totals = useMemo(() => {
    const stayTotal = stats.stayWins + stats.stayLosses
    const switchTotal = stats.switchWins + stats.switchLosses
    return {
      stayTotal,
      switchTotal,
      overall: stayTotal + switchTotal,
    }
  }, [stats])

  return (
    <div className="app">
      <div className="glow glow-top" aria-hidden="true" />
      <div className="glow glow-bottom" aria-hidden="true" />
      <header className="hero">
        <p className="eyebrow">Probability playground</p>
        <h1>Monty Hall Live Lab</h1>
        <p className="subtitle">
          Try the classic paradox, watch the host reveal a goat, and track
          whether switching really wins.
        </p>
      </header>

      <main className="layout">
        <section className="game-panel">
          <div className="status">
            <span className="status-label">Round status</span>
            <p>{statusMessage}</p>
          </div>

          <div className="doors" role="list">
            {doors.map((door) => {
              const isSelected = door.id === selectedDoor
              const isHost = door.id === hostDoor
              const isFinal = door.id === finalDoor
              const isOpen =
                isHost ||
                (phase === 'result' && (isFinal || door.hasPrize))
              const doorClass = [
                'door',
                isSelected ? 'selected' : '',
                isHost ? 'host' : '',
                isFinal ? 'final' : '',
                isOpen ? 'open' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <button
                  key={door.id}
                  type="button"
                  className={doorClass}
                  onClick={() => handleSelect(door.id)}
                  disabled={phase !== 'pick'}
                  role="listitem"
                  aria-label={door.label}
                >
                  <div className="door-frame">
                    <div className="door-face">
                      <span className="door-number">{door.label}</span>
                    </div>
                    <div className="door-reveal">
                      {door.hasPrize ? '🚗' : '🐐'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="decision-bar">
            <div className="decision-actions">
              <button
                type="button"
                className="action secondary"
                onClick={() => commitDecision('stay')}
                disabled={phase !== 'decide'}
              >
                Stay with my door
              </button>
              <button
                type="button"
                className="action primary"
                onClick={() => commitDecision('switch')}
                disabled={phase !== 'decide'}
              >
                Switch doors
              </button>
            </div>
            <button type="button" className="action ghost" onClick={resetRound}>
              New round
            </button>
          </div>
        </section>

        <aside className="stats-panel">
          <h2>Strategy stats dashboard</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Stay strategy</h3>
              <p className="stat-number">{getWinRate(stats.stayWins, stats.stayLosses)}</p>
              <p className="stat-meta">
                {stats.stayWins} wins · {stats.stayLosses} losses
              </p>
            </div>
            <div className="stat-card highlight">
              <h3>Switch strategy</h3>
              <p className="stat-number">{getWinRate(stats.switchWins, stats.switchLosses)}</p>
              <p className="stat-meta">
                {stats.switchWins} wins · {stats.switchLosses} losses
              </p>
            </div>
            <div className="stat-card">
              <h3>Total rounds</h3>
              <p className="stat-number">{totals.overall}</p>
              <p className="stat-meta">
                {totals.stayTotal} stay · {totals.switchTotal} switch
              </p>
            </div>
          </div>

          <div className="simulation">
            <h3>Multi-run simulation</h3>
            <div className="simulation-controls">
              <label>
                Runs
                <input
                  type="number"
                  min="1"
                  max="50000"
                  value={simRuns}
                  onChange={(event) => setSimRuns(event.target.value)}
                />
              </label>
              <label>
                Strategy
                <select
                  value={simStrategy}
                  onChange={(event) => setSimStrategy(event.target.value)}
                >
                  <option value="switch">Always switch</option>
                  <option value="stay">Always stay</option>
                  <option value="random">Random choice</option>
                </select>
              </label>
              <button type="button" className="action primary" onClick={runSimulation}>
                Run simulation
              </button>
            </div>
            {lastSimulation && (
              <div className="simulation-result">
                <p>
                  {lastSimulation.runs.toLocaleString()} runs · Strategy:{' '}
                  {lastSimulation.strategy}
                </p>
                <p>
                  Stay wins {lastSimulation.stayWins} · Switch wins{' '}
                  {lastSimulation.switchWins}
                </p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
