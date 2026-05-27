import { useState, useEffect } from 'react'
import { CalendarDays, Settings, X } from 'lucide-react'
import { useWedding } from '../context/WeddingContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayMidnight() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

// ─── Couple profile (center) ──────────────────────────────────────────────────

function CoupleAvatar({ emoji, name, bgColor }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: '5px' }}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <span style={{ fontSize: '15px', lineHeight: 1 }}>{emoji}</span>
      </div>
      <span
        style={{
          fontFamily:    'var(--font-heading)',
          color:         'rgba(253,250,248,0.62)',
          fontSize:      '10px',
          fontWeight:    300,
          fontStyle:     'italic',
          letterSpacing: '0.06em',
          lineHeight:    1,
          whiteSpace:    'nowrap',
        }}
      >
        {name}
      </span>
    </div>
  )
}

function CoupleProfile() {
  const { brideName, groomName } = useWedding()
  const bride = brideName || 'Bride'
  const groom = groomName || 'Groom'

  return (
    <div className="flex items-start" style={{ gap: '14px' }}>
      <CoupleAvatar emoji="👰" name={bride} bgColor="rgba(180,98,122,0.30)" />
      <span
        style={{
          color:      '#B4627A',
          fontSize:   '13px',
          lineHeight: 1,
          paddingTop: '9px',
          opacity:    0.85,
        }}
      >
        ♡
      </span>
      <CoupleAvatar emoji="🤵" name={groom} bgColor="rgba(90,122,106,0.28)" />
    </div>
  )
}

// ─── Wedding date section ─────────────────────────────────────────────────────

function WeddingDateSection({ weddingDate, setWeddingDate }) {
  const [today,   setToday]   = useState(todayMidnight)
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')

  useEffect(() => {
    const id = setInterval(() => setToday(todayMidnight()), 60_000)
    return () => clearInterval(id)
  }, [])

  const startEdit = () => { setDraft(weddingDate || ''); setEditing(true) }
  const commitEdit = () => {
    const val = draft.trim()
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) setWeddingDate(val)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="date" autoFocus value={draft}
          onChange={e => setDraft(e.target.value)} onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          style={{
            backgroundColor: 'rgba(255,255,255,0.10)',
            border:          '1px solid rgba(255,255,255,0.28)',
            borderRadius:    '999px', color: '#FDFAF8',
            fontFamily:      'var(--font-body)', fontSize: '12px',
            padding:         '5px 12px', outline: 'none',
          }}
        />
        <button onClick={() => setEditing(false)}
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.10)', color: 'rgba(253,250,248,0.55)', border: 'none', cursor: 'pointer' }}>
          <X size={12} />
        </button>
      </div>
    )
  }

  if (!weddingDate) {
    return (
      <button onClick={startEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all hover:opacity-80"
        style={{
          backgroundColor: 'rgba(255,255,255,0.07)',
          border:          '1px dashed rgba(255,255,255,0.22)',
          color:           'rgba(253,250,248,0.50)',
          fontFamily:      'var(--font-body)',
        }}>
        <CalendarDays size={11} />
        Set wedding date
      </button>
    )
  }

  const [wy, wm, wd] = weddingDate.split('-').map(Number)
  const date     = new Date(wy, wm - 1, wd)
  const daysLeft = Math.round((date - today) / 86_400_000)
  const label    = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const asOf     = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (daysLeft < 0) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={startEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: 'rgba(90,122,106,0.22)', color: '#7ABFA3',
                   fontFamily: 'var(--font-body)', border: '1px solid rgba(122,191,163,0.18)' }}>
          <CalendarDays size={11} />{label}
        </button>
        <span style={{ color: 'rgba(253,250,248,0.35)', fontFamily: 'var(--font-body)', fontSize: '12px' }}>
          · Just married! 🎉
        </span>
      </div>
    )
  }

  const pillColor = daysLeft <= 30 ? '#F87171' : daysLeft <= 90 ? '#FCD34D' : 'rgba(253,250,248,0.82)'
  const pillBg    = daysLeft <= 30 ? 'rgba(239,68,68,0.15)' : daysLeft <= 90 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.09)'
  const muteColor = daysLeft <= 30 ? 'rgba(248,113,113,0.55)' : daysLeft <= 90 ? 'rgba(252,211,77,0.50)' : 'rgba(253,250,248,0.32)'

  return (
    <div className="flex items-center gap-2">
      <button onClick={startEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: pillBg, color: pillColor, fontFamily: 'var(--font-body)',
                 border: '1px solid rgba(255,255,255,0.07)' }}
        title={`As of ${asOf} · Click to change`}>
        <CalendarDays size={11} />{label}
      </button>
      <span style={{ fontFamily: 'var(--font-body)', color: muteColor, fontSize: '12px', whiteSpace: 'nowrap' }}>
        · {daysLeft.toLocaleString()} day{daysLeft !== 1 ? 's' : ''} away
      </span>
    </div>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

export default function TopBar({ onOpenSettings }) {
  const { weddingDate, setWeddingDate } = useWedding()

  return (
    <header
      className="shrink-0"
      style={{
        backgroundColor:     '#1C1410',
        height:              '64px',
        display:             'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems:          'center',
        paddingLeft:         '32px',
        paddingRight:        '32px',
      }}
    >
      {/* LEFT — Vowed logo */}
      <div>
        <p style={{
          color:         '#B4627A', fontFamily: 'var(--font-body)', fontWeight: 500,
          fontSize:      '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
          lineHeight:    1, marginBottom: '4px',
        }}>
          Wedding Planner
        </p>
        <h1 style={{
          fontFamily: 'var(--font-heading)', color: '#FDFAF8', fontSize: '34px',
          fontWeight: 300, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 1,
        }}>
          Vowed
        </h1>
      </div>

      {/* CENTER — Couple profile */}
      <CoupleProfile />

      {/* RIGHT — Wedding date + settings */}
      <div className="flex justify-end items-center gap-3">
        <WeddingDateSection weddingDate={weddingDate} setWeddingDate={setWeddingDate} />

        {/* Settings gear */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          style={{
            width:           '30px',
            height:          '30px',
            borderRadius:    '50%',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border:          'none',
            cursor:          'pointer',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            color:           'rgba(253,250,248,0.45)',
            transition:      'background-color 0.15s, color 0.15s',
            flexShrink:      0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'
            e.currentTarget.style.color = 'rgba(253,250,248,0.80)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = 'rgba(253,250,248,0.45)'
          }}
        >
          <Settings size={13} />
        </button>
      </div>
    </header>
  )
}
