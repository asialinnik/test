import { useState, useEffect, useCallback } from 'react'
import VoiceButton from './components/VoiceButton.jsx'
import FoodLog from './components/FoodLog.jsx'
import DayHistory from './components/DayHistory.jsx'
import ApiKeySetup from './components/ApiKeySetup.jsx'
import Settings from './components/Settings.jsx'
import { parseFood } from './utils/parseFood.js'
import { gradientScenes, dayIndex, loadUserImages } from './utils/backgrounds.js'

const DEFAULT_GOAL = 1850

const getToday = () => new Date().toISOString().split('T')[0]

const loadFromStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => loadFromStorage('vct-api-key', ''))
  const [goal, setGoal] = useState(() => loadFromStorage('vct-goal', DEFAULT_GOAL))
  const [today] = useState(getToday)
  const [entries, setEntries] = useState(() => loadFromStorage(`vct-day-${getToday()}`, []))
  const [history, setHistory] = useState(() => loadFromStorage('vct-history', []))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [bgImage, setBgImage] = useState(null)

  useEffect(() => {
    localStorage.setItem(`vct-day-${today}`, JSON.stringify(entries))
  }, [entries, today])

  // Pick today's background: a user photo if any are configured, else a gradient.
  useEffect(() => {
    let cancelled = false
    loadUserImages().then(images => {
      if (cancelled || images.length === 0) return
      const file = images[dayIndex(images.length)]
      setBgImage(`/backgrounds/${file}`)
    })
    return () => { cancelled = true }
  }, [])

  const gradient = gradientScenes[dayIndex(gradientScenes.length)]

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const remaining = goal - totals.calories
  const progressPct = goal > 0 ? Math.min((totals.calories / goal) * 100, 100) : 0

  const handleSaveApiKey = (key) => {
    localStorage.setItem('vct-api-key', JSON.stringify(key))
    setApiKey(key)
  }

  const handleSaveSettings = ({ apiKey: key, goal: newGoal }) => {
    localStorage.setItem('vct-api-key', JSON.stringify(key))
    localStorage.setItem('vct-goal', JSON.stringify(newGoal))
    setApiKey(key)
    setGoal(newGoal)
    setShowSettings(false)
  }

  const handleVoiceResult = useCallback(
    async (transcript) => {
      setIsLoading(true)
      setError('')
      try {
        const data = await parseFood(transcript, apiKey)
        const entry = {
          id: Date.now(),
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          description: transcript,
          calories: Math.round(data.total.calories),
          protein: Math.round(data.total.protein),
          carbs: Math.round(data.total.carbs),
          fat: Math.round(data.total.fat),
          items: data.items,
        }
        setEntries(prev => [entry, ...prev])
      } catch (e) {
        setError(e.message || 'Something went wrong. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey]
  )

  const handleDeleteEntry = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleEditEntry = useCallback((updated) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
  }, [])

  const handleCloseDay = () => {
    if (entries.length === 0) return
    const record = {
      date: today,
      label: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      entries,
      totals,
    }
    const newHistory = [record, ...history.filter(h => h.date !== today)]
    setHistory(newHistory)
    localStorage.setItem('vct-history', JSON.stringify(newHistory))
    setEntries([])
    setError('')
  }

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (!apiKey) {
    return <ApiKeySetup onSave={handleSaveApiKey} />
  }

  if (showSettings) {
    return (
      <Settings
        apiKey={apiKey}
        goal={goal}
        onSave={handleSaveSettings}
        onClose={() => setShowSettings(false)}
      />
    )
  }

  if (showHistory) {
    return <DayHistory history={history} onBack={() => setShowHistory(false)} />
  }

  return (
    <div className="min-h-screen bg-[#b9c5b0] flex flex-col max-w-md mx-auto px-3">

      {/* Photo banner card — image at top of the stack */}
      <div className="relative h-44 mt-3 rounded-3xl overflow-hidden shadow-sm">
        {bgImage ? (
          <img
            src={bgImage}
            alt=""
            onError={() => setBgImage(null)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full" style={{ background: gradient }} />
        )}
        {/* Greyish overlay — tones down the photo, no blur */}
        <div className="absolute inset-0 bg-slate-500/25" />
        {/* Gradient scrim so text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

        {/* Today label — bottom left */}
        <div className="absolute bottom-0 left-0 p-4">
          <h1 className="text-lg font-bold text-white leading-none drop-shadow">Today</h1>
          <p className="text-xs text-white/80 mt-0.5 drop-shadow">{todayLabel}</p>
        </div>

        {/* Icons — top right */}
        <div className="absolute top-0 right-0 flex items-center gap-1 p-3">
          <button
            onClick={() => setShowHistory(true)}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/20"
            aria-label="History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/20"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calorie Total */}
      <div className="bg-white shadow-sm px-5 pt-5 pb-5 mt-3 rounded-3xl">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-5xl font-extrabold text-slate-800 tabular-nums tracking-tight leading-none">
              {totals.calories.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1.5 font-medium">
              of {goal.toLocaleString()} kcal
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-700 tabular-nums leading-none">
              {Math.abs(remaining).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1.5 font-medium">
              {remaining >= 0 ? 'left' : 'over'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${remaining >= 0 ? 'bg-green-600/70' : 'bg-violet-400'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Macros: protein emphasized, carbs/fat quiet */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 bg-sky-50 rounded-2xl px-4 py-2.5">
            <div className="text-lg font-bold text-sky-600 tabular-nums leading-none">{totals.protein}g</div>
            <div className="text-xs text-sky-500/70 mt-1 font-medium">protein</div>
          </div>
          <div className="text-center px-2">
            <div className="text-sm font-semibold text-slate-500 tabular-nums leading-none">{totals.carbs}g</div>
            <div className="text-xs text-slate-400 mt-1">carbs</div>
          </div>
          <div className="text-center px-2">
            <div className="text-sm font-semibold text-slate-500 tabular-nums leading-none">{totals.fat}g</div>
            <div className="text-xs text-slate-400 mt-1">fat</div>
          </div>
        </div>
      </div>

      {/* Food Log */}
      <div className="flex-1 overflow-y-auto py-3">
        {entries.length === 0 && !isLoading && (
          <div className="text-center text-slate-400 mt-12 px-4">
            <p className="text-5xl mb-4">🥗</p>
            <p className="text-sm font-medium">Nothing logged yet</p>
            <p className="text-xs mt-1 leading-relaxed">
              Tap the mic below and say what you just ate.
              <br />
              I'll handle the rest.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 mb-2 shadow-sm">
            <div className="flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
            </div>
            <span className="text-slate-500 text-sm">Estimating nutrition…</span>
          </div>
        )}

        {error && (
          <div className="bg-violet-50/80 backdrop-blur-md border border-violet-100 rounded-2xl p-4 mb-2 text-violet-700 text-sm">
            {error}
          </div>
        )}

        <FoodLog entries={entries} onDelete={handleDeleteEntry} onEdit={handleEditEntry} />
      </div>

      {/* Bottom Actions */}
      <div className="bg-white shadow-sm px-5 py-4 mb-3 space-y-2.5 pb-safe-bottom rounded-3xl">
        <VoiceButton onResult={handleVoiceResult} disabled={isLoading} />
        {entries.length > 0 && (
          <button
            onClick={handleCloseDay}
            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 active:bg-slate-100 active:scale-95 transition-all"
          >
            Close & Save Day
          </button>
        )}
      </div>
    </div>
  )
}
