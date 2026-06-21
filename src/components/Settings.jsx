import { useState } from 'react'

export default function Settings({ apiKey, goal, onSave, onClose }) {
  const [key, setKey] = useState(apiKey || '')
  const [goalValue, setGoalValue] = useState(String(goal))
  const [error, setError] = useState('')

  const handleSave = () => {
    const trimmed = key.trim()
    if (!trimmed.startsWith('sk-ant-')) {
      setError("Doesn't look like a valid Anthropic key (should start with sk-ant-)")
      return
    }
    onSave({ apiKey: trimmed, goal: Math.max(0, parseInt(goalValue) || 0) })
  }

  return (
    <div className="min-h-screen bg-[#b9c5b0] flex flex-col max-w-md mx-auto">
      <div className="bg-white/80 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
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

      <div className="flex-1 p-4 space-y-4">
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
          <label className="text-sm font-bold text-slate-700 block mb-1">Anthropic API Key</label>
          <p className="text-xs text-slate-400 mb-3">Stored only on this device. Used to understand your food descriptions.</p>
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
      </div>
    </div>
  )
}
