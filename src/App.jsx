import { useState, useEffect, useCallback, useRef } from 'react'
import VoiceButton from './components/VoiceButton.jsx'
import FoodLog from './components/FoodLog.jsx'
import DayHistory from './components/DayHistory.jsx'
import ApiKeySetup from './components/ApiKeySetup.jsx'
import Settings from './components/Settings.jsx'
import Login from './components/Login.jsx'
import TextEntryModal from './components/TextEntryModal.jsx'
import { parseFood, suggestMeal } from './utils/parseFood.js'
import { gradientScenes, dayIndex, loadUserImages } from './utils/backgrounds.js'
import { supabase, isSupabaseConfigured } from './lib/supabase.js'
import { pullRemote, pushRemote } from './lib/sync.js'

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

const SUPA_ON = isSupabaseConfigured()

// Signature of the syncable state (everything except the timestamp) so we can
// tell whether anything actually changed and avoid redundant cloud writes.
const blobSignature = (b) =>
  JSON.stringify({
    apiKey: b.apiKey,
    goal: b.goal,
    history: b.history,
    currentDate: b.currentDate,
    currentEntries: b.currentEntries,
    micSide: b.micSide,
    lang: b.lang,
  })

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
  const [micPreauth, setMicPreauth] = useState(() => loadFromStorage('vct-mic-preauth', false))
  const [showTextEntry, setShowTextEntry] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [isSuggesting, setIsSuggesting] = useState(false)

  // --- Auth / cloud sync ---
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!SUPA_ON)   // no Supabase => ready immediately
  const [initialSync, setInitialSync] = useState(!SUPA_ON) // first cloud pull done?
  const lastSyncedRef = useRef(null) // signature of last blob synced
  const pushTimerRef = useRef(null)

  const handleMicSideChange = (s) => {
    localStorage.setItem('vct-mic-side', JSON.stringify(s))
    setMicSide(s)
  }

  const toggleLang = () => {
    const next = lang === 'en-US' ? 'de-DE' : 'en-US'
    localStorage.setItem('vct-lang', JSON.stringify(next))
    setLang(next)
  }

  const handleMicPreauthChange = (val) => {
    localStorage.setItem('vct-mic-preauth', JSON.stringify(val))
    setMicPreauth(val)
  }

  const handleUpdateHistoryDay = useCallback((date, updatedEntries) => {
    setHistory(h => {
      const updated = h.map(day => {
        if (day.date !== date) return day
        const totals = computeTotals(updatedEntries)
        return { ...day, entries: updatedEntries, totals }
      })
      localStorage.setItem('vct-history', JSON.stringify(updated))
      return updated
    })
  }, [])

  useEffect(() => {
    localStorage.setItem(`vct-day-${today}`, JSON.stringify(entries))
    setSuggestion(null)
  }, [entries, today])

  // Catch-up auto-save: archive the previous day's entries if the date has
  // changed since the app was last open (covers device-locked / backgrounded case).
  const catchUp = useCallback(() => {
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
        // Bump timestamp so sign-in reconcile pushes this archived day instead of pulling cloud.
        localStorage.setItem('vct-updated-at', JSON.stringify(Date.now()))
      }
      localStorage.removeItem(`vct-day-${lastActive}`)
      setEntries([])
      setToday(now)
    }
    localStorage.setItem('vct-active-date', JSON.stringify(now))
  }, [])

  useEffect(() => {
    catchUp()
    const onVisible = () => { if (document.visibilityState === 'visible') catchUp() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-warm microphone permission so SpeechRecognition doesn't prompt mid-use.
  useEffect(() => {
    if (!micPreauth) return
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(s => s.getTracks().forEach(t => t.stop()))
      .catch(() => {})
  }, [micPreauth])

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

  // Collect all syncable state into one blob.
  const gatherBlob = useCallback(() => ({
    apiKey,
    goal,
    history,
    currentDate: today,
    currentEntries: entries,
    micSide,
    lang,
    updatedAt: Date.now(),
  }), [apiKey, goal, history, today, entries, micSide, lang])

  // Apply a blob pulled from the cloud to local state + storage.
  const applyBlob = useCallback((blob) => {
    if (typeof blob.apiKey === 'string') {
      setApiKey(blob.apiKey)
      localStorage.setItem('vct-api-key', JSON.stringify(blob.apiKey))
    }
    if (typeof blob.goal === 'number') {
      setGoal(blob.goal)
      localStorage.setItem('vct-goal', JSON.stringify(blob.goal))
    }
    // Merge: cloud wins for same date, but locally-archived days not yet pushed are kept.
    const localHistory = loadFromStorage('vct-history', [])
    const cloudHistory = Array.isArray(blob.history) ? blob.history : []
    const byDate = {}
    localHistory.forEach(d => { byDate[d.date] = d })
    cloudHistory.forEach(d => { byDate[d.date] = d })
    let history2 = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date))
    const now = getToday()
    if (blob.currentDate === now && Array.isArray(blob.currentEntries)) {
      setEntries(blob.currentEntries)
      localStorage.setItem(`vct-day-${now}`, JSON.stringify(blob.currentEntries))
    } else if (blob.currentDate && Array.isArray(blob.currentEntries) && blob.currentEntries.length) {
      // The cloud's "current day" is in the past — archive it into history.
      history2 = archiveInto(history2, blob.currentDate, blob.currentEntries)
    }
    setHistory(history2)
    localStorage.setItem('vct-history', JSON.stringify(history2))
    if (blob.micSide) { setMicSide(blob.micSide); localStorage.setItem('vct-mic-side', JSON.stringify(blob.micSide)) }
    if (blob.lang) { setLang(blob.lang); localStorage.setItem('vct-lang', JSON.stringify(blob.lang)) }
    localStorage.setItem('vct-updated-at', JSON.stringify(blob.updatedAt || Date.now()))
    // Mark as already-synced so the change-watcher below doesn't echo it back.
    lastSyncedRef.current = blobSignature({ ...blob, history: history2, currentDate: now, currentEntries: blob.currentDate === now ? blob.currentEntries : [] })
  }, [])

  // Download all entries as a JSON file (API key deliberately excluded).
  const handleExportData = useCallback(() => {
    const { apiKey: _omitKey, updatedAt: _omitTs, ...data } = gatherBlob()
    const payload = { app: 'voice-calorie-tracker', version: 1, exportedAt: new Date().toISOString(), ...data }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `calorie-tracker-backup-${getToday()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [gatherBlob])

  // Restore from an exported file. Non-destructive: merges with whatever's
  // already here (imported wins per-date), then lets it sync up to the cloud.
  const handleImportData = useCallback((parsed) => {
    const now = getToday()
    const incoming = Array.isArray(parsed.history) ? parsed.history : []
    setHistory(h => {
      const byDate = {}
      h.forEach(d => { if (d && d.date) byDate[d.date] = d })
      incoming.forEach(d => { if (d && d.date) byDate[d.date] = d })
      let merged = Object.values(byDate)
      if (parsed.currentDate && parsed.currentDate !== now && Array.isArray(parsed.currentEntries) && parsed.currentEntries.length) {
        merged = archiveInto(merged, parsed.currentDate, parsed.currentEntries)
      }
      merged.sort((a, b) => b.date.localeCompare(a.date))
      localStorage.setItem('vct-history', JSON.stringify(merged))
      return merged
    })
    if (parsed.currentDate === now && Array.isArray(parsed.currentEntries)) {
      setEntries(prev => {
        const byId = {}
        ;[...parsed.currentEntries, ...prev].forEach(e => { if (e && e.id != null) byId[e.id] = e })
        const merged = Object.values(byId)
        localStorage.setItem(`vct-day-${now}`, JSON.stringify(merged))
        return merged
      })
    }
    if (typeof parsed.goal === 'number') { setGoal(parsed.goal); localStorage.setItem('vct-goal', JSON.stringify(parsed.goal)) }
    if (parsed.micSide) { setMicSide(parsed.micSide); localStorage.setItem('vct-mic-side', JSON.stringify(parsed.micSide)) }
    if (parsed.lang) { setLang(parsed.lang); localStorage.setItem('vct-lang', JSON.stringify(parsed.lang)) }
    // Bump timestamp so the restored data wins the next reconcile and syncs up.
    localStorage.setItem('vct-updated-at', JSON.stringify(Date.now()))
  }, [])

  // Track the auth session.
  useEffect(() => {
    if (!SUPA_ON) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // On sign-in: reconcile cloud vs local (last-write-wins by timestamp).
  useEffect(() => {
    if (!SUPA_ON || !session) return
    let cancelled = false
    ;(async () => {
      let remote
      try {
        remote = await pullRemote(session.user.id)
      } catch {
        // Cloud read failed — do NOT push, or we risk clobbering good cloud
        // data with whatever happens to be in local state right now.
        if (!cancelled) setInitialSync(true)
        return
      }
      if (cancelled) return
      const localUpdated = loadFromStorage('vct-updated-at', 0)
      if (remote && (remote.updatedAt || 0) >= localUpdated) {
        applyBlob(remote)
      } else {
        const blob = gatherBlob()
        // Only push if there's actually something local worth keeping. Pushing
        // an empty blob here is how a fresh/evicted load wipes the cloud.
        const hasLocalData = blob.currentEntries.length > 0 || blob.history.length > 0
        if (hasLocalData) {
          lastSyncedRef.current = blobSignature(blob)
          localStorage.setItem('vct-updated-at', JSON.stringify(blob.updatedAt))
          await pushRemote(session.user.id, blob)
        }
      }
      setInitialSync(true)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Push local changes to the cloud (debounced), skipping no-op echoes.
  useEffect(() => {
    if (!SUPA_ON || !session || !initialSync) return
    const blob = gatherBlob()
    if (blobSignature(blob) === lastSyncedRef.current) return
    // Never let a totally-empty state propagate a wipe to the cloud (and from
    // there to every other device). There's nothing to sync anyway.
    if (blob.currentEntries.length === 0 && blob.history.length === 0) return
    clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      lastSyncedRef.current = blobSignature(blob)
      localStorage.setItem('vct-updated-at', JSON.stringify(blob.updatedAt))
      // Keep an on-device backup of the last non-empty state we synced, so a
      // bad pull/overwrite is recoverable from this device.
      localStorage.setItem('vct-backup', JSON.stringify(blob))
      pushRemote(session.user.id, blob)
    }, 800)
    return () => clearTimeout(pushTimerRef.current)
  }, [session, initialSync, gatherBlob])

  // Pull fresh data when the app regains focus (catch the other device's edits).
  useEffect(() => {
    if (!SUPA_ON || !session) return
    const refresh = async () => {
      if (document.hidden) return
      let remote
      try {
        remote = await pullRemote(session.user.id)
      } catch {
        return // transient read failure — leave local data untouched
      }
      if (remote && (remote.updatedAt || 0) > loadFromStorage('vct-updated-at', 0)) {
        applyBlob(remote)
      }
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [session, applyBlob])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setShowSettings(false)
  }

  // Pick today's background: a user photo if any are configured, else a gradient.
  useEffect(() => {
    let cancelled = false
    loadUserImages().then(images => {
      if (cancelled || images.length === 0) return
      const file = images[dayIndex(images.length)]
      setBgImage(`/backgrounds/${file}`)
    })
    return () => { cancelled = true }
  }, [today])

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

  const handleTextEntry = useCallback((entry) => {
    setEntries(prev => [entry, ...prev])
    setShowTextEntry(false)
  }, [])

  const handleSuggestMeal = useCallback(async () => {
    if (!apiKey) return
    setIsSuggesting(true)
    setSuggestion(null)
    try {
      const text = await suggestMeal(remaining, apiKey)
      setSuggestion(text)
    } catch (e) {
      setSuggestion(`Error: ${e.message}`)
    } finally {
      setIsSuggesting(false)
    }
  }, [apiKey, remaining])

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

  // While Supabase is checking the session / doing the first sync, show a
  // calm placeholder rather than flashing the login or API-key screens.
  if (SUPA_ON && !authReady) {
    return <div className="h-[100dvh] bg-[#b9c5b0]" />
  }

  if (SUPA_ON && !session) {
    return <Login />
  }

  if (SUPA_ON && session && !initialSync) {
    return <div className="h-[100dvh] bg-[#b9c5b0]" />
  }

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
        onSignOut={SUPA_ON && session ? handleSignOut : null}
        userEmail={session?.user?.email}
        micPreauth={micPreauth}
        onMicPreauthChange={handleMicPreauthChange}
        onExport={handleExportData}
        onImport={handleImportData}
      />
    )
  }

  if (showHistory) {
    return <DayHistory history={history} goal={goal} onBack={() => setShowHistory(false)} onUpdateDay={handleUpdateHistoryDay} apiKey={apiKey} />
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

        <FoodLog entries={entries} onDelete={handleDeleteEntry} onEdit={handleEditEntry} apiKey={apiKey} />

        {entries.length > 0 && remaining > 50 && (
          <div className="mt-3">
            {suggestion ? (
              <div className="bg-white/70 backdrop-blur-md rounded-2xl px-4 py-3 shadow-sm">
                <p className="text-sm text-slate-600 leading-relaxed">{suggestion}</p>
                <button
                  onClick={handleSuggestMeal}
                  disabled={isSuggesting}
                  className="text-xs text-slate-400 mt-2 hover:text-slate-600 disabled:opacity-50"
                >
                  {isSuggesting ? 'Thinking…' : 'Suggest something else'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSuggestMeal}
                disabled={isSuggesting || !apiKey}
                className="w-full py-3 rounded-2xl border border-dashed border-slate-300/80 text-slate-400 text-sm hover:border-slate-400 hover:text-slate-500 transition-colors disabled:opacity-40"
              >
                {isSuggesting ? 'Thinking…' : `What can I eat with ${remaining.toLocaleString()} kcal left?`}
              </button>
            )}
          </div>
        )}

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

      {/* Floating text-entry button on the opposite side from the mic */}
      <button
        onClick={() => setShowTextEntry(true)}
        className={`fixed bottom-6 ${micSide === 'right' ? 'left-5' : 'right-5'} w-11 h-11 rounded-2xl bg-white/80 backdrop-blur-md shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 active:scale-95 transition-all`}
        aria-label="Type food manually"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
        </svg>
      </button>

      {showTextEntry && (
        <TextEntryModal
          onAdd={handleTextEntry}
          onClose={() => setShowTextEntry(false)}
          apiKey={apiKey}
        />
      )}
    </div>
  )
}
