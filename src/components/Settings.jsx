import { useState } from 'react'

export default function Settings({ apiKey, goal, micSide = 'right', onMicSideChange, onSave, onClose, onSignOut, userEmail, micPreauth, onMicPreauthChange, onExport, onImport }) {
  const [key, setKey] = useState(apiKey || '')
  const [goalValue, setGoalValue] = useState(String(goal))
  const [error, setError] = useState('')
  const [micStatus, setMicStatus] = useState(null) // null | 'granted' | 'denied'
  const [importMsg, setImportMsg] = useState('')
  const [importOk, setImportOk] = useState(false)

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file later
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!parsed || typeof parsed !== 'object' || (!Array.isArray(parsed.history) && !Array.isArray(parsed.currentEntries))) {
          throw new Error('Not a valid backup file.')
        }
        onImport(parsed)
        const days = parsed.history?.length || 0
        setImportOk(true)
        setImportMsg(`Restored ${days} day${days === 1 ? '' : 's'} of history.`)
      } catch (err) {
        setImportOk(false)
        setImportMsg(err.message === 'Not a valid backup file.' ? err.message : 'Could not read that file — is it a backup export?')
      }
    }
    reader.readAsText(file)
  }

  const handleSave = () => {
    const trimmed = key.trim()
    if (!trimmed.startsWith('sk-ant-')) {
      setError("Doesn't look like a valid Anthropic key (should start with sk-ant-)")
      return
    }
    onSave({ apiKey: trimmed, goal: Math.max(0, parseInt(goalValue) || 0) })
  }

  const handleMicToggle = async () => {
    const next = !micPreauth
    if (next) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(t => t.stop())
        setMicStatus('granted')
        onMicPreauthChange(true)
      } catch {
        setMicStatus('denied')
      }
    } else {
      onMicPreauthChange(false)
      setMicStatus(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#b9c5b0] flex flex-col max-w-md mx-auto px-3">
      <div className="sticky top-0 z-10 -mx-3 px-3 bg-[#b9c5b0] pt-3 pb-1">
        <div className="bg-white shadow-sm px-5 py-4 flex items-center gap-3 rounded-3xl">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 -ml-1 rounded-lg hover:bg-slate-100"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-800">Settings</h1>
        </div>
      </div>

      <div className="flex-1 py-3 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <label className="text-sm font-bold text-slate-700 block mb-1">Daily calorie goal</label>
          <p className="text-xs text-slate-400 mb-3">A soft target — shows how much you have left through the day.</p>
          <div className="flex items-baseline gap-2 bg-slate-50 rounded-xl px-4 py-3">
            <input
              type="number"
              inputMode="numeric"
              value={goalValue}
              onChange={e => setGoalValue(e.target.value)}
              className="w-full bg-transparent text-2xl font-bold text-slate-800 tabular-nums focus:outline-none"
              min="0"
            />
            <span className="text-sm text-slate-400 flex-shrink-0">kcal</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <label className="text-sm font-bold text-slate-700 block mb-1">Mic button position</label>
          <p className="text-xs text-slate-400 mb-3">Which corner the floating mic button sits in.</p>
          <div className="flex gap-2">
            {['left', 'right'].map(s => (
              <button
                key={s}
                onClick={() => onMicSideChange?.(s)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors ${
                  micSide === s
                    ? 'bg-[#5f7c66] text-white'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">Microphone access</label>
              <p className="text-xs text-slate-400">
                {micStatus === 'granted' ? 'Permission granted — mic won\'t prompt when you speak.' :
                 micStatus === 'denied' ? 'Permission denied — check your browser/OS settings.' :
                 micPreauth ? 'Active — mic is pre-authorized on startup.' :
                 'Enable to avoid mic permission prompts each session.'}
              </p>
            </div>
            <button
              onClick={handleMicToggle}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ml-4 ${micPreauth ? 'bg-[#5f7c66]' : 'bg-slate-200'}`}
              role="switch"
              aria-checked={micPreauth}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${micPreauth ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <label className="text-sm font-bold text-slate-700 block mb-1">Anthropic API Key</label>
          <p className="text-xs text-slate-400 mb-3">Used to understand your food descriptions. Synced privately to your account so you don't have to re-enter it on each device.</p>
          <input
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setError('') }}
            placeholder="sk-ant-api03-..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono bg-slate-50"
            autoComplete="off"
            autoCapitalize="none"
          />
          {error && <p className="text-xs text-violet-600 mt-2">{error}</p>}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 bg-green-700 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform"
        >
          Save
        </button>

        {(onExport || onImport) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <label className="text-sm font-bold text-slate-700 block mb-1">Backup &amp; restore</label>
            <p className="text-xs text-slate-400 mb-3">Save all your entries to a file, or restore from one. Your API key is never included. Keep a copy somewhere safe.</p>
            <div className="flex gap-2">
              {onExport && (
                <button
                  onClick={onExport}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                >
                  Export
                </button>
              )}
              {onImport && (
                <label className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all text-center cursor-pointer">
                  Import
                  <input type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
                </label>
              )}
            </div>
            {importMsg && <p className={`text-xs mt-2 ${importOk ? 'text-green-700' : 'text-violet-600'}`}>{importMsg}</p>}
          </div>
        )}

        {onSignOut && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <label className="text-sm font-bold text-slate-700 block mb-1">Account</label>
            {userEmail && <p className="text-xs text-slate-400 mb-3">Signed in as {userEmail}. Your data syncs across devices.</p>}
            <button
              onClick={onSignOut}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-50 text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
