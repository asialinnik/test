import { useState } from 'react'
import EditEntryModal from './EditEntryModal.jsx'
import TextEntryModal from './TextEntryModal.jsx'

function computeTotals(entries) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

function DayDetail({ day, onBack, onUpdateDay, apiKey }) {
  const [entries, setEntries] = useState(day.entries)
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const save = (updated) => {
    setEntries(updated)
    onUpdateDay(day.date, updated)
  }

  const handleEdit = (updatedEntry) => {
    const updated = entries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
    setEditing(null)
    save(updated)
  }

  const handleDelete = (id) => {
    const updated = entries.filter(e => e.id !== id)
    setEditing(null)
    save(updated)
  }

  const handleAdd = (entry) => {
    const updated = [entry, ...entries]
    setShowAdd(false)
    save(updated)
  }

  const totals = computeTotals(entries)

  return (
    <div className="min-h-screen bg-[#b9c5b0] flex flex-col max-w-md mx-auto px-3">
      <div className="sticky top-0 z-10 -mx-3 px-3 bg-[#b9c5b0] pt-3 pb-1">
        <div className="bg-white shadow-sm px-5 py-4 flex items-center gap-3 rounded-3xl">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 p-1 -ml-1 rounded-lg hover:bg-slate-100"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800">{day.label}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {/* Day totals */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-3xl font-bold text-slate-800 tabular-nums">
            {totals.calories.toLocaleString()}
            <span className="text-base font-normal text-slate-400 ml-1">cal</span>
          </p>
          <div className="flex gap-3 mt-2">
            <span className="text-xs font-medium text-[#4e74a0] bg-[#e8eef2] px-2 py-0.5 rounded-full tabular-nums">{totals.protein}g P</span>
            <span className="text-xs font-medium text-[#9d8fc7] bg-[#efecf7] px-2 py-0.5 rounded-full tabular-nums">{totals.carbs}g C</span>
            <span className="text-xs font-medium text-[#aaa3d4] bg-[#f0eef8] px-2 py-0.5 rounded-full tabular-nums">{totals.fat}g F</span>
          </div>
        </div>

        {/* Each food entry — tappable to edit */}
        <div className="flex items-center justify-between px-1 pt-1">
          <p className="text-xs font-semibold text-slate-500">What you ate · tap to edit</p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs font-semibold text-[#5f7c66] hover:text-[#4a6652]"
          >
            + Add entry
          </button>
        </div>
        {entries.length === 0 && (
          <p className="text-xs text-slate-400 px-1">No entries left.</p>
        )}
        {entries.map(entry => (
          <button
            key={entry.id}
            onClick={() => setEditing(entry)}
            className="w-full text-left bg-white rounded-xl px-3.5 py-2.5 shadow-sm flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-snug">{entry.description}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {entry.time && <>{entry.time} · </>}
                <span className="text-[#4e74a0] font-medium">{entry.protein}g P</span>
                {' · '}<span className="text-[#9d8fc7]">{entry.carbs}g C</span>
                {' · '}<span className="text-[#aaa3d4]">{entry.fat}g F</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-slate-800 tabular-nums leading-none">{entry.calories}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">kcal</div>
            </div>
          </button>
        ))}
      </div>

      {editing && (
        <EditEntryModal
          entry={editing}
          onSave={handleEdit}
          onDelete={() => handleDelete(editing.id)}
          onClose={() => setEditing(null)}
          apiKey={apiKey}
        />
      )}

      {showAdd && (
        <TextEntryModal
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
          apiKey={apiKey}
        />
      )}
    </div>
  )
}

function StatBlock({ value, unit, label, color }) {
  return (
    <div>
      <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>
        {value}
        <span className="text-sm font-normal text-slate-400 ml-0.5">{unit}</span>
      </p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  )
}

function MonthlyChart({ history, goal }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const byDate = {}
  history.forEach(d => { byDate[d.date] = d.totals.calories })

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const dateStr = `${monthKey}-${String(i + 1).padStart(2, '0')}`
    return { day: i + 1, calories: byDate[dateStr] || 0 }
  })

  const hasData = days.some(d => d.calories > 0)
  const maxVal = Math.max(goal, ...days.map(d => d.calories)) * 1.12 || 1
  const goalPct = (goal / maxVal) * 100
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">{monthLabel}</p>
        <p className="text-xs text-slate-400">daily calories</p>
      </div>

      {!hasData ? (
        <p className="text-xs text-slate-400 py-8 text-center">No saved days this month yet.</p>
      ) : (
        <>
          <div className="relative h-32 flex items-end gap-px">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-slate-300 z-10"
              style={{ bottom: `${goalPct}%` }}
            >
              <span className="absolute -top-2 right-0 text-[9px] text-slate-400 bg-white px-1">
                {goal.toLocaleString()}
              </span>
            </div>
            {days.map(d => (
              <div
                key={d.day}
                className="flex-1 rounded-t-sm transition-all"
                style={{
                  height: d.calories ? `${(d.calories / maxVal) * 100}%` : '0%',
                  backgroundColor: d.calories > goal ? '#aaa3d4' : '#7d9b84',
                }}
                title={`Day ${d.day}: ${d.calories.toLocaleString()} cal`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
            <span>1</span>
            <span>{Math.ceil(daysInMonth / 2)}</span>
            <span>{daysInMonth}</span>
          </div>
        </>
      )}
    </div>
  )
}

export default function DayHistory({ history, goal = 1850, onBack, onUpdateDay, apiKey }) {
  const [selected, setSelected] = useState(null)

  if (selected) {
    return (
      <DayDetail
        day={selected}
        onBack={() => setSelected(null)}
        onUpdateDay={(date, entries) => {
          onUpdateDay(date, entries)
          // keep the local `selected` view in sync so totals update immediately
          setSelected(s => s ? { ...s, entries, totals: computeTotals(entries) } : s)
        }}
        apiKey={apiKey}
      />
    )
  }

  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
  const last7 = sorted.slice(0, 7)
  const avg = key =>
    last7.length
      ? Math.round(last7.reduce((s, d) => s + (d.totals[key] || 0), 0) / last7.length)
      : 0

  return (
    <div className="min-h-screen bg-[#b9c5b0] flex flex-col max-w-md mx-auto px-3">
      <div className="sticky top-0 z-10 -mx-3 px-3 bg-[#b9c5b0] pt-3 pb-1">
        <div className="bg-white shadow-sm px-5 py-4 flex items-center gap-3 rounded-3xl">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 p-1 -ml-1 rounded-lg hover:bg-slate-100"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800">History</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {history.length === 0 ? (
          <div className="text-center text-slate-400 mt-16">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-sm">No saved days yet.</p>
            <p className="text-xs mt-1">Tap "Save" at the end of each day.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Last 7 days
                <span className="text-xs font-normal text-slate-400 ml-1">
                  · {last7.length} day{last7.length !== 1 ? 's' : ''} averaged
                </span>
              </p>
              <div className="flex items-center justify-between">
                <StatBlock value={avg('calories').toLocaleString()} unit="cal" label="avg / day" color="text-slate-800" />
                <StatBlock value={avg('protein')} unit="g" label="protein" color="text-[#4e74a0]" />
                <StatBlock value={avg('carbs')} unit="g" label="carbs" color="text-[#9d8fc7]" />
                <StatBlock value={avg('fat')} unit="g" label="fat" color="text-[#aaa3d4]" />
              </div>
            </div>

            <MonthlyChart history={history} goal={goal} />

            {sorted.map(day => (
              <button
                key={day.date}
                onClick={() => setSelected(day)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">{day.label}</p>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-slate-800 mt-1 tabular-nums">
                  {day.totals.calories.toLocaleString()}
                  <span className="text-base font-normal text-slate-400 ml-1">cal</span>
                </p>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs font-medium text-[#4e74a0] bg-[#e8eef2] px-2 py-0.5 rounded-full tabular-nums">{day.totals.protein}g P</span>
                  <span className="text-xs font-medium text-[#9d8fc7] bg-[#efecf7] px-2 py-0.5 rounded-full tabular-nums">{day.totals.carbs}g C</span>
                  <span className="text-xs font-medium text-[#aaa3d4] bg-[#f0eef8] px-2 py-0.5 rounded-full tabular-nums">{day.totals.fat}g F</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">{day.entries.length} item{day.entries.length !== 1 ? 's' : ''}</p>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
