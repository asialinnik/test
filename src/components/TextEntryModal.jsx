import { useState, useRef, useEffect } from 'react'
import { parseFood } from '../utils/parseFood.js'

export default function TextEntryModal({ onAdd, onClose, apiKey }) {
  const [text, setText] = useState('')
  const [estimating, setEstimating] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { calories, protein, carbs, fat }
  const textareaRef = useRef(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleEstimate = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!apiKey) { setError('No API key set — add one in Settings.'); return }
    setEstimating(true)
    setError('')
    setResult(null)
    try {
      const data = await parseFood(trimmed, apiKey)
      setResult({
        calories: String(Math.round(data.total.calories)),
        protein: String(Math.round(data.total.protein)),
        carbs: String(Math.round(data.total.carbs)),
        fat: String(Math.round(data.total.fat)),
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setEstimating(false)
    }
  }

  const handleAdd = () => {
    if (!result) return
    onAdd({
      id: Date.now(),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      description: text.trim(),
      calories: Math.max(0, parseInt(result.calories) || 0),
      protein: Math.max(0, parseInt(result.protein) || 0),
      carbs: Math.max(0, parseInt(result.carbs) || 0),
      fat: Math.max(0, parseInt(result.fat) || 0),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Add food</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); setResult(null); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !estimating) { e.preventDefault(); handleEstimate() } }}
          placeholder="e.g. 200g Greek yogurt with a handful of blueberries"
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
        />

        {error && <p className="mt-1.5 text-xs text-violet-600">{error}</p>}

        {result && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: 'Calories', key: 'calories', unit: 'kcal', color: 'text-slate-800' },
              { label: 'Protein', key: 'protein', unit: 'g', color: 'text-[#4e74a0]' },
              { label: 'Carbs', key: 'carbs', unit: 'g', color: 'text-[#9d8fc7]' },
              { label: 'Fat', key: 'fat', unit: 'g', color: 'text-[#aaa3d4]' },
            ].map(({ label, key, unit, color }) => (
              <div key={key} className="bg-slate-50 rounded-xl px-2 py-2">
                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">{label}</label>
                <div className="flex items-baseline gap-0.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={result[key]}
                    onChange={e => setResult(r => ({ ...r, [key]: e.target.value }))}
                    className={`w-full bg-transparent text-sm font-bold focus:outline-none tabular-nums ${color}`}
                    min="0"
                  />
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {!result ? (
            <button
              onClick={handleEstimate}
              disabled={estimating || !text.trim()}
              className="flex-1 py-3 rounded-2xl bg-[#5f7c66] text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              {estimating ? 'Estimating…' : 'Estimate nutrition'}
            </button>
          ) : (
            <>
              <button
                onClick={handleEstimate}
                disabled={estimating}
                className="py-3 px-4 rounded-2xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                {estimating ? '…' : 'Redo'}
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-3 rounded-2xl bg-green-700 text-white text-sm font-semibold active:scale-95 transition-transform"
              >
                Add entry
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
