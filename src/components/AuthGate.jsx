import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZE_OPTIONS = [
  { id: 'small',  label: 'Small & Intimate', sub: 'Under 50 guests', count: 35  },
  { id: 'medium', label: 'Medium',            sub: '50–150 guests',   count: 100 },
  { id: 'big',    label: 'Big Celebration',   sub: '150+ guests',     count: 200 },
]

const VISION_OPTIONS = [
  'Romantic & Intimate',
  'Grand & Celebratory',
  'Garden & Outdoor',
  'Modern & Minimalist',
  'Traditional & Classic',
  'Cultural Ceremony',
  'Destination Wedding',
  'Relaxed & Casual',
]

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      style={{
        position:        'fixed', inset: 0,
        backgroundColor: '#1C1410',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      <div style={{ animation: 'vovedFadeIn 0.7s ease-out forwards', opacity: 0, textAlign: 'center' }}>
        <p style={{ color: '#B4627A', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '10px',
                    letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Wedding Planner
        </p>
        <h1 style={{ fontFamily: 'var(--font-heading)', color: '#FDFAF8', fontSize: '52px',
                     fontWeight: 300, fontStyle: 'italic', lineHeight: 1, margin: 0 }}>
          Vowed
        </h1>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
          <span className="typing-dot" style={{ animationDelay: '0ms'   }} />
          <span className="typing-dot" style={{ animationDelay: '180ms' }} />
          <span className="typing-dot" style={{ animationDelay: '360ms' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Step progress indicator ──────────────────────────────────────────────────

function StepBar({ step }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '6px' }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          height:          '3px',
          borderRadius:    '2px',
          backgroundColor: n < step  ? 'rgba(180,98,122,0.45)'
                         : n === step ? '#B4627A'
                         : 'rgba(255,255,255,0.13)',
          width:     n === step ? '28px' : '10px',
          transition: 'all 0.25s ease',
        }} />
      ))}
    </div>
  )
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────

export default function AuthGate({ children }) {
  // undefined = loading, null = signed out, object = signed in
  const [session, setSession] = useState(undefined)

  // Which top-level view
  const [view,    setView]    = useState('signin') // 'signin' | 'forgot' | 'onboarding'
  const [step,    setStep]    = useState(1)        // 1 | 2 | 3 (onboarding only)

  // Onboarding data (all 3 steps consolidated)
  const [od, setOd] = useState({
    // Step 1
    brideName: '', groomName: '', weddingDate: '',
    // Step 2
    guestSize: null, guestCount: null, weddingStyle: [], weddingLocation: '', budget: '',
    // Step 3
    email: '', password: '', confirmPassword: '',
  })

  // Sign-in form (separate from onboarding form)
  const [siEmail,    setSiEmail]    = useState('')
  const [siPassword, setSiPassword] = useState('')

  // Forgot-password form
  const [fpEmail, setFpEmail] = useState('')

  // Shared UI states
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [shaking,    setShaking]    = useState(false)

  const upd = (key, val) => setOd(prev => ({ ...prev, [key]: val }))

  // ── Supabase session listener ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <LoadingScreen />
  if (session) return children(session.user.id, session.user.email)

  // ── Helpers ───────────────────────────────────────────────────────────────
  function shakeError(msg) {
    setError(msg)
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  function toView(v) {
    setView(v)
    setStep(1)
    setError('')
    setSuccess('')
  }

  // ── Sign in ───────────────────────────────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault()
    if (!siEmail || !siPassword) { shakeError('Please fill in all fields'); return }
    setSubmitting(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword })
    if (err) shakeError(err.message)
    setSubmitting(false)
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!fpEmail) { shakeError('Enter your email address first'); return }
    setSubmitting(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(fpEmail, {
      redirectTo: window.location.origin,
    })
    if (err) shakeError(err.message)
    else setSuccess('Reset link sent — check your email.')
    setSubmitting(false)
  }

  // ── Onboarding step validation + navigation ────────────────────────────────
  function handleNext() {
    setError('')
    if (step === 1) {
      if (!od.brideName.trim()) { shakeError("Enter the bride's name"); return }
      if (!od.groomName.trim()) { shakeError("Enter the groom's name"); return }
      if (!od.weddingDate)      { shakeError('Pick your wedding date');  return }
    }
    setStep(s => s + 1)
  }

  function handleBack() {
    setError('')
    if (step === 1) { toView('signin') }
    else             { setStep(s => s - 1) }
  }

  // ── Create account (step 3) ───────────────────────────────────────────────
  async function handleCreateAccount(e) {
    e.preventDefault()
    if (!od.email || !od.password || !od.confirmPassword) { shakeError('Please fill in all fields'); return }
    if (od.password !== od.confirmPassword)               { shakeError('Passwords do not match'); return }
    if (od.password.length < 6)                          { shakeError('Password must be at least 6 characters'); return }

    setSubmitting(true); setError('')

    // Persist onboarding data so WeddingProvider can seed it on first load
    try {
      localStorage.setItem('vowed_pending_profile', JSON.stringify({
        brideName:       od.brideName.trim(),
        groomName:       od.groomName.trim(),
        weddingDate:     od.weddingDate,
        guestCount:      od.guestCount,
        weddingStyle:    od.weddingStyle,
        weddingLocation: od.weddingLocation.trim(),
        budget:          od.budget ? Number(od.budget) : null,
      }))
    } catch (_) {}

    const { error: err } = await supabase.auth.signUp({ email: od.email, password: od.password })
    if (err) {
      localStorage.removeItem('vowed_pending_profile')
      shakeError(err.message)
    }
    // On success: onAuthStateChange fires → session is set → children() renders
    setSubmitting(false)
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputBase = {
    width:           '100%',
    padding:         '12px 16px',
    borderRadius:    '12px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color:           '#FDFAF8',
    fontFamily:      'var(--font-body)',
    fontSize:        '14px',
    outline:         'none',
    letterSpacing:   '0.03em',
    transition:      'border-color 0.15s',
  }

  const fieldInput = (isTarget = false) => ({
    ...inputBase,
    border:    `1.5px solid ${error && isTarget ? '#F87171' : 'rgba(255,255,255,0.10)'}`,
    animation: isTarget && shaking ? 'vovedShake 0.5s ease' : 'none',
    textAlign: 'left',
  })

  const centeredInput = (isTarget = false) => ({
    ...fieldInput(isTarget),
    textAlign: 'center',
  })

  const btnPrimary = {
    width:           '100%',
    padding:         '13px',
    borderRadius:    '12px',
    backgroundColor: submitting ? '#8C5068' : '#B4627A',
    color:           '#FDFAF8',
    fontFamily:      'var(--font-body)',
    fontSize:        '14px',
    fontWeight:      500,
    letterSpacing:   '0.04em',
    border:          'none',
    cursor:          submitting ? 'default' : 'pointer',
    opacity:         submitting ? 0.7 : 1,
    transition:      'background-color 0.15s, opacity 0.15s',
  }

  const linkMuted = {
    background: 'none', border: 'none',
    color: 'rgba(253,250,248,0.40)',
    fontFamily: 'var(--font-body)', fontSize: '12px',
    cursor: 'pointer', padding: 0,
  }

  const linkRose = { ...linkMuted, color: '#B4627A' }

  const errBlock = error && (
    <p style={{ color: '#F87171', fontSize: '12px', fontFamily: 'var(--font-body)', margin: '-3px 0 0', textAlign: 'center' }}>
      {error}
    </p>
  )

  // ── Outer wrapper ─────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#1C1410',
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100%',
        padding: view === 'onboarding' ? '40px 24px' : '32px 24px',
      }}>
        <div
          key={view + step}
          style={{
            animation: 'vovedFadeIn 0.35s ease-out forwards',
            opacity:   0,
            width:     '100%',
            maxWidth:  view === 'onboarding' ? '400px' : '340px',
            textAlign: 'center',
          }}
        >

          {/* ── SIGN IN ── */}
          {view === 'signin' && (
            <>
              {/* Logo */}
              <p style={{ color: '#B4627A', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '10px',
                          letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Wedding Planner
              </p>
              <h1 style={{ fontFamily: 'var(--font-heading)', color: '#FDFAF8', fontSize: '52px',
                           fontWeight: 300, fontStyle: 'italic', lineHeight: 1, margin: '0 0 10px' }}>
                Vowed
              </h1>
              <p style={{ color: 'rgba(253,250,248,0.35)', fontFamily: 'var(--font-body)',
                          fontSize: '13px', margin: '0 0 32px' }}>
                Welcome back
              </p>

              {success && (
                <p style={{ color: '#86EFAC', fontSize: '13px', fontFamily: 'var(--font-body)',
                            margin: '-16px 0 18px', lineHeight: 1.4 }}>
                  {success}
                </p>
              )}

              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="email" autoFocus placeholder="Email"
                       value={siEmail} onChange={e => { setSiEmail(e.target.value); setError('') }}
                       style={centeredInput()} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input type="password" placeholder="Password"
                         value={siPassword} onChange={e => { setSiPassword(e.target.value); setError('') }}
                         style={centeredInput(true)} />
                  <div style={{ textAlign: 'right' }}>
                    <button type="button" onClick={() => { toView('forgot'); setFpEmail(siEmail) }} style={linkMuted}>
                      Forgot password?
                    </button>
                  </div>
                </div>

                {errBlock}

                <button type="submit" disabled={submitting} style={btnPrimary}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#C97B90' }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#B4627A' }}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>

                <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <button type="button" onClick={() => toView('onboarding')} style={linkRose}>
                    New here? Start planning →
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === 'forgot' && (
            <>
              <h1 style={{ fontFamily: 'var(--font-heading)', color: '#FDFAF8', fontSize: '40px',
                           fontWeight: 300, fontStyle: 'italic', lineHeight: 1, margin: '0 0 10px' }}>
                Vowed
              </h1>
              <p style={{ color: 'rgba(253,250,248,0.35)', fontFamily: 'var(--font-body)',
                          fontSize: '13px', margin: '0 0 32px' }}>
                Reset your password
              </p>

              {success && (
                <p style={{ color: '#86EFAC', fontSize: '13px', fontFamily: 'var(--font-body)',
                            margin: '-16px 0 18px', lineHeight: 1.4 }}>
                  {success}
                </p>
              )}

              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="email" autoFocus placeholder="Email"
                       value={fpEmail} onChange={e => { setFpEmail(e.target.value); setError('') }}
                       style={centeredInput(true)} />
                {errBlock}
                <button type="submit" disabled={submitting} style={btnPrimary}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#C97B90' }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#B4627A' }}>
                  {submitting ? 'Sending…' : 'Send reset link'}
                </button>
                <button type="button" onClick={() => toView('signin')} style={{ ...linkMuted, marginTop: '8px' }}>
                  ← Back to sign in
                </button>
              </form>
            </>
          )}

          {/* ── ONBOARDING ── */}
          {view === 'onboarding' && (
            <>
              {/* Logo (compact) */}
              <p style={{ color: '#B4627A', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '9px',
                          letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                Wedding Planner
              </p>
              <h1 style={{ fontFamily: 'var(--font-heading)', color: '#FDFAF8', fontSize: '36px',
                           fontWeight: 300, fontStyle: 'italic', lineHeight: 1, margin: '0 0 20px' }}>
                Vowed
              </h1>

              {/* Progress */}
              <StepBar step={step} />
              <p style={{ color: 'rgba(253,250,248,0.28)', fontFamily: 'var(--font-body)', fontSize: '10px',
                          letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 20px' }}>
                Step {step} of 3
              </p>

              {/* ─ Step 1 ─ */}
              {step === 1 && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-heading)', color: '#FDFAF8', fontSize: '28px',
                               fontWeight: 300, fontStyle: 'italic', margin: '0 0 24px' }}>
                    Let's start with your wedding
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                    <div>
                      <label style={labelStyle}>Bride's name <span style={{ color: '#B4627A' }}>*</span></label>
                      <input type="text" autoFocus placeholder="e.g. Jungmin" value={od.brideName}
                             onChange={e => upd('brideName', e.target.value)} style={fieldInput()} />
                    </div>
                    <div>
                      <label style={labelStyle}>Groom's name <span style={{ color: '#B4627A' }}>*</span></label>
                      <input type="text" placeholder="e.g. Jin Won" value={od.groomName}
                             onChange={e => upd('groomName', e.target.value)} style={fieldInput()} />
                    </div>
                    <div>
                      <label style={labelStyle}>Wedding date <span style={{ color: '#B4627A' }}>*</span></label>
                      <input type="date" value={od.weddingDate}
                             onChange={e => upd('weddingDate', e.target.value)}
                             style={{ ...fieldInput(true), colorScheme: 'dark' }} />
                    </div>
                  </div>

                  {error && <p style={{ color: '#F87171', fontSize: '12px', fontFamily: 'var(--font-body)', marginTop: '8px' }}>{error}</p>}

                  <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button type="button" onClick={handleNext} style={btnPrimary}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#C97B90'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#B4627A'}>
                      Continue →
                    </button>
                    <button type="button" onClick={handleBack} style={{ ...linkMuted, marginTop: '4px' }}>
                      ← Back to sign in
                    </button>
                  </div>
                </>
              )}

              {/* ─ Step 2 ─ */}
              {step === 2 && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-heading)', color: '#FDFAF8', fontSize: '26px',
                               fontWeight: 300, fontStyle: 'italic', margin: '0 0 24px', lineHeight: 1.2 }}>
                    What kind of wedding are you planning?
                  </h2>

                  {/* Wedding size */}
                  <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                    <p style={sectionLabel}>Wedding size</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {SIZE_OPTIONS.map(opt => {
                        const active = od.guestSize === opt.id
                        return (
                          <button key={opt.id} type="button"
                            onClick={() => { upd('guestSize', opt.id); upd('guestCount', opt.count) }}
                            style={{
                              flex: 1, padding: '12px 6px', borderRadius: '12px', cursor: 'pointer',
                              border:           `1.5px solid ${active ? '#B4627A' : 'rgba(255,255,255,0.11)'}`,
                              backgroundColor:  active ? 'rgba(180,98,122,0.16)' : 'rgba(255,255,255,0.04)',
                              transition:       'all 0.15s',
                            }}>
                            <p style={{ color: active ? '#E8A4B5' : 'rgba(253,250,248,0.80)', fontFamily: 'var(--font-body)',
                                        fontSize: '12px', fontWeight: 500, margin: '0 0 3px' }}>
                              {opt.label}
                            </p>
                            <p style={{ color: active ? 'rgba(232,164,181,0.65)' : 'rgba(253,250,248,0.38)',
                                        fontFamily: 'var(--font-body)', fontSize: '10px', margin: 0 }}>
                              {opt.sub}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Wedding vision */}
                  <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                    <p style={sectionLabel}>
                      Your vision
                      <span style={{ color: 'rgba(253,250,248,0.30)', fontWeight: 400, fontSize: '10px',
                                     letterSpacing: '0.08em', marginLeft: '8px' }}>
                        pick up to 3
                      </span>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', justifyContent: 'center' }}>
                      {VISION_OPTIONS.map(opt => {
                        const selected = od.weddingStyle.includes(opt)
                        return (
                          <button key={opt} type="button"
                            onClick={() => {
                              if (selected) {
                                upd('weddingStyle', od.weddingStyle.filter(s => s !== opt))
                              } else if (od.weddingStyle.length < 3) {
                                upd('weddingStyle', [...od.weddingStyle, opt])
                              }
                            }}
                            style={{
                              padding:         '7px 13px',
                              borderRadius:    '999px',
                              cursor:          'pointer',
                              border:          `1.5px solid ${selected ? '#B4627A' : 'rgba(255,255,255,0.13)'}`,
                              backgroundColor: selected ? 'rgba(180,98,122,0.18)' : 'rgba(255,255,255,0.04)',
                              color:           selected ? '#E8A4B5' : 'rgba(253,250,248,0.55)',
                              fontFamily:      'var(--font-body)',
                              fontSize:        '12px',
                              transition:      'all 0.15s',
                            }}>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Optional fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginBottom: '24px' }}>
                    <div>
                      <label style={labelStyle}>
                        Wedding location
                        <span style={{ color: 'rgba(253,250,248,0.30)', fontSize: '11px', marginLeft: '6px' }}>optional</span>
                      </label>
                      <input type="text" placeholder="City, country, or venue name"
                             value={od.weddingLocation}
                             onChange={e => upd('weddingLocation', e.target.value)}
                             style={fieldInput()} />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Total budget
                        <span style={{ color: 'rgba(253,250,248,0.30)', fontSize: '11px', marginLeft: '6px' }}>optional</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                                       color: 'rgba(253,250,248,0.35)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                          $
                        </span>
                        <input type="number" min="0" placeholder="30000"
                               value={od.budget}
                               onChange={e => upd('budget', e.target.value)}
                               style={{ ...fieldInput(), paddingLeft: '28px' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button type="button" onClick={handleNext} style={btnPrimary}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#C97B90'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#B4627A'}>
                      Continue →
                    </button>
                    <button type="button" onClick={handleBack} style={{ ...linkMuted, marginTop: '4px' }}>
                      ← Back
                    </button>
                  </div>
                </>
              )}

              {/* ─ Step 3 ─ */}
              {step === 3 && (
                <>
                  <h2 style={{ fontFamily: 'var(--font-heading)', color: '#FDFAF8', fontSize: '26px',
                               fontWeight: 300, fontStyle: 'italic', margin: '0 0 6px', lineHeight: 1.2 }}>
                    Almost there — create your account
                  </h2>
                  <p style={{ color: 'rgba(253,250,248,0.35)', fontFamily: 'var(--font-body)', fontSize: '13px', margin: '0 0 24px' }}>
                    Your wedding planning space awaits, {od.brideName && od.groomName ? `${od.brideName} & ${od.groomName}` : ''}
                  </p>

                  <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="email" autoFocus placeholder="Email address"
                           value={od.email} onChange={e => { upd('email', e.target.value); setError('') }}
                           style={centeredInput()} />
                    <input type="password" placeholder="Password"
                           value={od.password} onChange={e => { upd('password', e.target.value); setError('') }}
                           style={centeredInput()} />
                    <input type="password" placeholder="Confirm password"
                           value={od.confirmPassword}
                           onChange={e => { upd('confirmPassword', e.target.value); setError('') }}
                           style={centeredInput(true)} />

                    {errBlock}

                    <button type="submit" disabled={submitting} style={{ ...btnPrimary, marginTop: '4px' }}
                      onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#C97B90' }}
                      onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#B4627A' }}>
                      {submitting ? 'Creating your space…' : '🌸 Start Planning'}
                    </button>

                    <p style={{ color: 'rgba(253,250,248,0.22)', fontFamily: 'var(--font-body)', fontSize: '11px',
                                margin: '4px 0 0', lineHeight: 1.5 }}>
                      By creating an account you agree to our terms of service.
                    </p>

                    <button type="button" onClick={handleBack} style={{ ...linkMuted, marginTop: '4px' }}>
                      ← Back
                    </button>
                  </form>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── Shared label styles ──────────────────────────────────────────────────────

const labelStyle = {
  display:    'block',
  color:      'rgba(253,250,248,0.55)',
  fontFamily: 'var(--font-body)',
  fontSize:   '12px',
  fontWeight: 500,
  marginBottom: '6px',
}

const sectionLabel = {
  color:         'rgba(253,250,248,0.55)',
  fontFamily:    'var(--font-body)',
  fontSize:      '12px',
  fontWeight:    500,
  letterSpacing: '0.04em',
  marginBottom:  '10px',
}
