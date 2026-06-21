import { useState } from 'react'

export default function ApiKeySetup({ onSave }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    const trimmed = key.trim()
    if (!trimmed) {
      setError('Please enter your API key.')
      return
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setError("Doesn't look like a valid Anthropic key (should start with sk-ant-)")
      return
    }
    onSave(trimmed)
  }

  return (
    <div className="min-h-screen bg-[#cdd9c0] flex flex-col items-center justify-center p-6 max-w-sm mx-auto">
      <div className="w-20 h-20 bg-violet-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
        <span className="text-4xl">🎤</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">Voice Calorie Tracker</h1>
      <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
        Speak what you ate after each meal. I'll estimate the calories and macros and keep a running total.
      </p>

      <div className="w-full bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <label className="text-sm font-semibold text-slate-700 block mb-1">
          Anthropic API Key
        </label>
        <p className="text-xs text-slate-400 mb-3">
          Used to understand your food descriptions. Stored only on this device, never sent anywhere else.
        </p>
        <input
          type="password"
          value={key}
          onChange={e => { setKey(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="sk-ant-api03-..."
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono bg-slate-50"
          autoComplete="off"
          autoCapitalize="none"
        />
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="w-full mt-4 py-3.5 bg-green-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-95 transition-transform"
        >
          Get Started
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Get a free key at{' '}
        <span className="text-slate-500 font-medium">console.anthropic.com</span>
      </p>
    </div>
  )
}
