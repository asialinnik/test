// Daily-rotating background scenes.
//
// Two sources, in priority order:
//  1. Your own photos — drop image files into /public/backgrounds/ and list
//     their filenames in /public/backgrounds/manifest.json. These load from
//     your own device, work offline, and cost nothing.
//  2. Atmospheric gradient fallbacks below — used when you haven't added any
//     photos yet, or if a photo fails to load. They evoke the moods you like
//     (night sky, coastline, alpine forest, golden hour) so the app always
//     looks intentional, never broken.

export const gradientScenes = [
  // Milky-way night sky
  'radial-gradient(120% 80% at 50% -10%, #2a3a5c 0%, #1b2540 40%, #0d1326 100%)',
  // Teal coastline (Sardinia / Skye)
  'linear-gradient(180deg, #bfe3df 0%, #7fc2c0 45%, #3f8b93 100%)',
  // Alpine forest haze
  'linear-gradient(180deg, #cdd8c4 0%, #93a986 50%, #5c7359 100%)',
  // Golden hour over mountains
  'linear-gradient(180deg, #e9d3a8 0%, #c9a06f 45%, #6f5b6e 100%)',
  // Pre-dawn lake
  'linear-gradient(180deg, #d7dee6 0%, #9fb0c4 50%, #5a6b86 100%)',
]

// Stable per-day index: same scene all day, advances at midnight (local).
export function dayIndex(length) {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now - start) / 86400000)
  return day % length
}

// Reads the optional user-photo manifest. Returns [] if absent/invalid.
export async function loadUserImages() {
  try {
    const res = await fetch('/backgrounds/manifest.json', { cache: 'no-store' })
    if (!res.ok) return []
    const list = await res.json()
    return Array.isArray(list) ? list.filter(Boolean) : []
  } catch {
    return []
  }
}
