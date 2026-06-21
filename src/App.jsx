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

const computeTotals = (entries) =>
  entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

const labelForDate = (dateStr) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

// Build a saved-day record and merge it into a history list (replacing any
// existing record for that date). Returns the new history array.
const archiveInto = (history, dateStr, dayEntries) => {
  const record = {
    date: dateStr,
    label: labelForDate(dateStr),
    entries: dayEntries,
    totals: computeTotals(dayEntries),
  }
  return [record, ...history.filter(h => h.date !== dateStr)]
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => loadFromStorage('vct-api-key', ''))
  const [goal, setGoal] = useState(() => loadFromStorage('vct-goal', DEFAULT_GOAL))
  const [today, setToday] = useState(getToday)
  const [entries, setEntries] = useState(() => loadFromStorage(`vct-day-${getToday()}`, []))
  const [history, setHistory] = useState(() => loadFromStorage('vct-history', []))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [bgImage, setBgImage] = useState(null)
  const [micSide, setMicSide] = useState(() => loadFromStorage('vct-mic-side', 'right'))
  const [lang, setLang] = useState(() => loadFromStorage('vct-lang', 'en-US'))

  const handleMicSideChange = (s) => {
    localStorage.setItem('vct-mic-side', JSON.stringify(s))
    setMicSide(s)
  }

  const toggleLang = () => {
    const next = lang === 'en-US' ? 'de-DE' : 'en-US'
    localStorage.setItem('vct-lang', JSON.stringify(next))
    setLang(next)
  }

  useEffect(() => {
    localStorage.setItem(`vct-day-${today}`, JSON.stringify(entries))
  }, [entries, today])

  // Catch-up auto-save: if the app was last open on an earlier day (e.g. closed
  // overnight), archive that day before showing today's fresh log.
  useEffect(() => {
    const lastActive = loadFromStorage('vct-active-date', null)
    const now = getToday()
    if (lastActive && lastActive !== now) {
      const prevEntries = loadFromStorage(`vct-day-${lastActive}`, [])
      if (prevEntries.length > 0) {
        setHistory(h => {
          const updated = archiveInto(h, lastActive, prevEntries)
          localStorage.setItem('vct-history', JSON.stringify(updated))
          return updated
        })
      }
      localStorage.removeItem(`vct-day-${lastActive}`)
    }
    localStorage.setItem('vct-active-date', JSON.stringify(now))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live auto-save at midnight: while the app stays open, roll the day over
  // the moment the calendar date changes.
  useEffect(() => {
    const tick = () => {
      const now = getToday()
      if (now === today) return
      setEntries(curr => {
        if (curr.length > 0) {
          setHistory(h => {
            const updated = archiveInto(h, today, curr)
            localStorage.setItem('vct-history', JSON.stringify(updated))
            return updated
          })
        }
        return []
      })
      localStorage.removeItem(`vct-day-${today}`)
      localStorage.setItem('vct-active-date', JSON.stringify(now))
      setToday(now)
    }
    const interval = setInterval(tick, 30000)
    return () => clearInterval(interval)
  }, [today])

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

  const totals = computeTotals(entries)

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
    const newHistory = archiveInto(history, today, entries)
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
        micSide={micSide}
        onMicSideChange={handleMicSideChange}
        onSave={handleSaveSettings}
        onClose={() => setShowSettings(false)}
      />
    )
  }

  if (showHistory) {
    return <DayHistory history={history} goal={goal} onBack={() => setShowHistory(false)} />
  }

  return (
    <div className="h-[100dvh] bg-[#b9c5b0] flex flex-col max-w-md mx-auto px-3 overflow-hidden">

      {/* Photo banner card — image at top of the stack */}
      <div className="relative h-44 mt-3 rounded-3xl overflow-hidden shadow-sm flex-shrink-0">
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
        <div className="absolute inset-0 bg-slate-500/35" />
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
            onClick={toggleLang}
            className="text-white/90 hover:text-white px-2 py-1 rounded-lg hover:bg-white/20 text-xs font-bold tracking-wide"
            aria-label="Toggle voice language"
          >
            {lang === 'de-DE' ? 'DE' : 'EN'}
          </button>
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

      {/* Calorie Total — always visible, not sticky (layout handles it) */}
      <div className="-mx-3 px-3 bg-[#b9c5b0] pt-3 pb-3 flex-shrink-0">
        <div className="bg-white/70 backdrop-blur-md shadow-sm px-5 py-3.5 rounded-3xl">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <div className="text-4xl font-extrabold text-slate-800 tabular-nums tracking-tight leading-none">
              {totals.calories.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              of {goal.toLocaleString()}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-xl font-bold text-slate-700 tabular-nums leading-none">
              {Math.abs(remaining).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {remaining >= 0 ? 'left' : 'over'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${remaining >= 0 ? 'bg-green-600/70' : 'bg-violet-400'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Macros: balanced columns, protein emphasized */}
        <div className="flex items-stretch gap-2 mt-2.5">
          <div className="flex-1 bg-[#e8eef2] rounded-xl px-3 py-1.5 text-center">
            <div className="text-base font-bold text-[#4e74a0] tabular-nums leading-none">{totals.protein}g</div>
            <div className="text-[11px] text-[#4e74a0]/70 mt-0.5 font-medium">protein</div>
          </div>
          <div className="flex-1 rounded-xl px-3 py-1.5 text-center">
            <div className="text-base font-semibold text-[#9d8fc7] tabular-nums leading-none">{totals.carbs}g</div>
            <div className="text-[11px] text-slate-400 mt-0.5">carbs</div>
          </div>
          <div className="flex-1 rounded-xl px-3 py-1.5 text-center">
            <div className="text-base font-semibold text-[#aaa3d4] tabular-nums leading-none">{totals.fat}g</div>
            <div className="text-[11px] text-slate-400 mt-0.5">fat</div>
          </div>
        </div>
        </div>
      </div>

      {/* Food Log — scrolls inside this container only, never behind the summary */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 pb-28">
        {entries.length === 0 && !isLoading && (
          <div className="text-center text-slate-500 mt-20 px-4">
            <p className="text-base font-medium">these are the good days</p>
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

        {entries.length > 0 && (
          <div className="text-center mt-4">
            <button
              onClick={handleCloseDay}
              className="text-slate-400 text-xs font-medium hover:text-slate-600 active:scale-95 transition-all px-3 py-1"
            >
              Save
            </button>
            <p className="text-[10px] text-slate-400/70 mt-1">Auto-saves at midnight</p>
          </div>
        )}
      </div>

      {/* Floating mic button */}
      <VoiceButton onResult={handleVoiceResult} disabled={isLoading} side={micSide} lang={lang} />
    </div>
  )
}
