import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [step, setStep] = useState('email') // email | code
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async () => {
    const addr = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
      setError('Please enter a valid email address.')
      return
    }
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setStep('code')
  }

  const verify = async () => {
    const token = code.trim()
    if (token.length < 6) { setError('Enter the 6-digit code from your email.'); return }
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'email',
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    // Success: onAuthStateChange in App takes over from here.
  }

  return (
    <div className="min-h-[100dvh] bg-[#b9c5b0] flex flex-col justify-center max-w-md mx-auto px-6">
      <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-sm p-7">
        <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">these are the good days</h1>
        <p className="text-sm text-slate-500 mt-2">
          {step === 'email'
            ? 'Sign in with your email to sync across your devices.'
            : `We sent a 6-digit code to ${email}. Enter it below.`}
        </p>

        {step === 'email' ? (
          <div className="mt-6 space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && sendCode()}
              placeholder="you@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <button
              onClick={sendCode}
              disabled={busy}
              className="w-full py-3.5 bg-[#5f7c66] text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
              onKeyDown={e => e.key === 'Enter' && verify()}
              placeholder="123456"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-2xl tracking-[0.4em] text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <button
              onClick={verify}
              disabled={busy}
              className="w-full py-3.5 bg-[#5f7c66] text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-60"
            >
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="w-full py-2 text-slate-400 text-xs font-medium hover:text-slate-600"
            >
              Use a different email
            </button>
          </div>
        )}

        {error && <p className="text-xs text-violet-600 mt-3">{error}</p>}
      </div>
    </div>
  )
}
