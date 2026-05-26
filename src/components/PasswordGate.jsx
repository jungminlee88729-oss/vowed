import { useState } from 'react'

// Password is stored in .env as VITE_APP_PASSWORD — never hard-coded.
// If the env var is not set (e.g. local dev without it), the gate is skipped.
const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD

// ─── Password Gate ────────────────────────────────────────────────────────────

export default function PasswordGate({ children }) {

  // Remember unlock state across page refreshes with localStorage
  const [unlocked, setUnlocked] = useState(
    () => !CORRECT_PASSWORD || localStorage.getItem('vowed_unlocked') === 'true'
  )

  const [value,  setValue]  = useState('')
  const [error,  setError]  = useState(false)
  const [shaking, setShaking] = useState(false)

  // App is unlocked — render normally
  if (unlocked) return children

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value === CORRECT_PASSWORD) {
      localStorage.setItem('vowed_unlocked', 'true')
      setUnlocked(true)
    } else {
      setError(true)
      setShaking(true)
      setValue('')
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        backgroundColor: '#1C1410',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      {/* Fade-in wrapper — matches loading screen animation */}
      <div
        style={{
          animation: 'vovedFadeIn 0.7s ease-out forwards',
          opacity:   0,
          width:     '100%',
          maxWidth:  '340px',
          padding:   '0 24px',
          textAlign: 'center',
        }}
      >

        {/* ── Logo ── */}
        <p
          style={{
            color:         '#B4627A',
            fontFamily:    'var(--font-body)',
            fontWeight:    500,
            fontSize:      '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom:  '8px',
            margin:        '0 0 8px',
          }}
        >
          Wedding Planner
        </p>

        <h1
          style={{
            fontFamily:    'var(--font-heading)',
            color:         '#FDFAF8',
            fontSize:      '52px',
            fontWeight:    300,
            fontStyle:     'italic',
            letterSpacing: '0.02em',
            lineHeight:    1,
            margin:        '0 0 44px',
          }}
        >
          Vowed
        </h1>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <input
            autoFocus
            type="password"
            value={value}
            placeholder="Password"
            onChange={e => { setValue(e.target.value); setError(false) }}
            style={{
              width:           '100%',
              padding:         '13px 16px',
              borderRadius:    '12px',
              border:          `1.5px solid ${error ? '#F87171' : 'rgba(255,255,255,0.1)'}`,
              backgroundColor: 'rgba(255,255,255,0.06)',
              color:           '#FDFAF8',
              fontFamily:      'var(--font-body)',
              fontSize:        '15px',
              outline:         'none',
              textAlign:       'center',
              letterSpacing:   error ? '0.04em' : '0.12em',
              transition:      'border-color 0.15s',
              animation:       shaking ? 'vovedShake 0.5s ease' : 'none',
              // Placeholder colour via box-shadow hack isn't needed;
              // the browser uses the inherited color at ~40% opacity
            }}
          />

          {/* Error message */}
          {error && (
            <p
              style={{
                color:      '#F87171',
                fontSize:   '12px',
                fontFamily: 'var(--font-body)',
                margin:     '-2px 0 0',
              }}
            >
              Incorrect password — try again
            </p>
          )}

          <button
            type="submit"
            style={{
              width:           '100%',
              padding:         '13px',
              borderRadius:    '12px',
              backgroundColor: '#B4627A',
              color:           '#FDFAF8',
              fontFamily:      'var(--font-body)',
              fontSize:        '14px',
              fontWeight:      500,
              letterSpacing:   '0.03em',
              border:          'none',
              cursor:          'pointer',
              transition:      'background-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#C97B90' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#B4627A' }}
          >
            Enter
          </button>

        </form>
      </div>
    </div>
  )
}
