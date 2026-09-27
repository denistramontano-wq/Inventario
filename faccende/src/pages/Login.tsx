import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { HouseHero } from '../components/HouseHero'

export function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    if (result.error) setError(result.error)
    else if (mode === 'signup') {
      setInfo('Controlla la tua email per confermare la registrazione, poi accedi.')
      setMode('signin')
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mx-auto w-64">
          <HouseHero freshness={1} />
        </div>
        <h1 className="mt-2 text-center text-3xl font-black">Faccende di Casa</h1>
        <p className="mt-1 mb-6 text-center text-sub">Una casa fresca, un passo alla volta.</p>
        <form onSubmit={handleSubmit} className="space-y-3 rounded-[2rem] bg-card p-5">
          <input type="email" required autoComplete="email" placeholder="Email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm font-bold text-bad">{error}</p>}
          {info && <p className="text-sm font-bold text-good">{info}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Attendere…' : mode === 'signin' ? 'Accedi' : 'Registrati'}
          </button>
          <p className="text-center text-xs text-muted">Puoi usare lo stesso account dell'app Inventario.</p>
        </form>
        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setInfo(null)
          }}
          className="mt-4 w-full text-center text-sm font-bold text-accent"
        >
          {mode === 'signin' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>
      </div>
    </div>
  )
}
