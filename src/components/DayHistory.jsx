export default function DayHistory({ history, onBack }) {
  return (
    <div className="min-h-screen bg-[#e8ebe6] flex flex-col max-w-md mx-auto">
      <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-slate-600 p-1 -ml-1 rounded-lg hover:bg-slate-100"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-slate-800">History</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 ? (
          <div className="text-center text-slate-400 mt-16">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-sm">No saved days yet.</p>
            <p className="text-xs mt-1">Tap "Close & Save Day" at the end of each day.</p>
          </div>
        ) : (
          history.map(day => (
            <div
              key={day.date}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
            >
              <p className="text-sm font-semibold text-slate-700">{day.label}</p>
              <p className="text-3xl font-bold text-slate-800 mt-1 tabular-nums">
                {day.totals.calories.toLocaleString()}
                <span className="text-base font-normal text-slate-400 ml-1">cal</span>
              </p>
              <div className="flex gap-3 mt-2">
                <span className="text-xs font-medium text-sky-500 bg-sky-50 px-2 py-0.5 rounded-full tabular-nums">
                  {day.totals.protein}g P
                </span>
                <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full tabular-nums">
                  {day.totals.carbs}g C
                </span>
                <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full tabular-nums">
                  {day.totals.fat}g F
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {day.entries.length} item{day.entries.length !== 1 ? 's' : ''}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
