import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async () => {
    const addr = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: addr, password })
      setBusy(false)
      if (error) { setError(error.message); return }
      // If email confirmation is OFF, we get a session immediately and App takes over.
      // If it's ON, no session yet — tell the user to confirm.
      if (!data.session) {
        setNotice('Account created. Check your email to confirm, then sign in.')
        setMode('signin')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password })
      setBusy(false)
      if (error) { setError(error.message); return }
      // Success: onAuthStateChange in App takes over.
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#b9c5b0] flex flex-col justify-center max-w-md mx-auto px-6">
      <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-sm p-7">
        <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">these are the good days</h1>
        <p className="text-sm text-slate-500 mt-2">
          {mode === 'signin'
            ? 'Sign in to sync your days across your devices.'
            : 'Create an account to sync across your devices.'}
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="you@example.com"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Password"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-3.5 bg-[#5f7c66] text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}
            className="w-full py-2 text-slate-400 text-xs font-medium hover:text-slate-600"
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </div>

        {error && <p className="text-xs text-violet-600 mt-3">{error}</p>}
        {notice && <p className="text-xs text-slate-500 mt-3">{notice}</p>}
      </div>
    </div>
  )
}
