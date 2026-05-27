import { useState } from 'react'
import { X } from 'lucide-react'
import { useWedding } from '../context/WeddingContext'

// ─── Vision options (must match AuthGate) ────────────────────────────────────

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

// ─── Section heading ─────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <h2 style={{
      fontFamily:    'var(--font-body)',
      fontWeight:    600,
      fontSize:      '11px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color:         '#8C8480',
      margin:        '0 0 16px',
      paddingBottom: '10px',
      borderBottom:  '1px solid #EDE8E3',
    }}>
      {children}
    </h2>
  )
}

// ─── Field label ─────────────────────────────────────────────────────────────

function FieldLabel({ children, optional }) {
  return (
    <label style={{
      display:       'block',
      fontFamily:    'var(--font-body)',
      fontSize:      '12px',
      fontWeight:    500,
      color:         '#6B6360',
      marginBottom:  '6px',
    }}>
      {children}
      {optional && (
        <span style={{ color: '#A09590', fontWeight: 400, fontSize: '11px', marginLeft: '5px' }}>
          optional
        </span>
      )}
    </label>
  )
}

// ─── Input style ─────────────────────────────────────────────────────────────

const inputStyle = (error = false) => ({
  width:           '100%',
  padding:         '10px 13px',
  borderRadius:    '10px',
  border:          `1.5px solid ${error ? '#EF4444' : '#E5DDD8'}`,
  backgroundColor: '#FDFAF8',
  color:           '#2C2825',
  fontFamily:      'var(--font-body)',
  fontSize:        '14px',
  outline:         'none',
  boxSizing:       'border-box',
  transition:      'border-color 0.15s',
})

// ─── Settings Panel ───────────────────────────────────────────────────────────

export default function SettingsPanel({ onClose }) {
  const {
    brideName,       setBrideName,
    groomName,       setGroomName,
    weddingDate,     setWeddingDate,
    weddingLocation, setWeddingLocation,
    guestCount,      setGuestCount,
    weddingStyle,    setWeddingStyle,
    budget,          setBudget,
    saveProfile,
    userEmail,
    signOut,
    changePassword,
  } = useWedding()

  // ── Profile form local state ──────────────────────────────────────────────
  const [lBride,    setLBride]    = useState(brideName    || '')
  const [lGroom,    setLGroom]    = useState(groomName    || '')
  const [lDate,     setLDate]     = useState(weddingDate  || '')
  const [lLocation, setLLocation] = useState(weddingLocation || '')
  const [lGuests,   setLGuests]   = useState(guestCount != null ? String(guestCount) : '')
  const [lStyle,    setLStyle]    = useState(weddingStyle || [])
  const [lBudget,   setLBudget]   = useState(budget != null ? String(budget) : '')

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)
  const [profileError,  setProfileError]  = useState('')

  // ── Password form local state ─────────────────────────────────────────────
  const [currentPw,    setCurrentPw]    = useState('')
  const [newPw,        setNewPw]        = useState('')
  const [confirmNewPw, setConfirmNewPw] = useState('')

  const [pwSaving,  setPwSaving]  = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError,   setPwError]   = useState('')

  // ── Save profile ──────────────────────────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfileError('')
    if (!lBride.trim() || !lGroom.trim()) {
      setProfileError('Bride and groom names are required')
      return
    }

    // Update context state
    setBrideName(lBride.trim())
    setGroomName(lGroom.trim())
    setWeddingDate(lDate)
    setWeddingLocation(lLocation.trim())
    setGuestCount(lGuests ? parseInt(lGuests, 10) : null)
    setWeddingStyle(lStyle)
    setBudget(lBudget ? Number(lBudget) : null)

    setProfileSaving(true)
    const { error } = await saveProfile({
      brideName:       lBride.trim(),
      groomName:       lGroom.trim(),
      weddingDate:     lDate,
      weddingLocation: lLocation.trim(),
      guestCount:      lGuests ? parseInt(lGuests, 10) : null,
      weddingStyle:    lStyle,
      budget:          lBudget ? Number(lBudget) : null,
    })
    setProfileSaving(false)

    if (error) {
      setProfileError('Failed to save — please try again')
    } else {
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    if (!currentPw)                     { setPwError('Enter your current password'); return }
    if (!newPw)                         { setPwError('Enter a new password'); return }
    if (newPw !== confirmNewPw)         { setPwError('Passwords do not match'); return }
    if (newPw.length < 6)              { setPwError('Password must be at least 6 characters'); return }
    if (newPw === currentPw)           { setPwError('New password must differ from current'); return }

    setPwSaving(true)
    const { error } = await changePassword(currentPw, newPw)
    setPwSaving(false)

    if (error) {
      setPwError(error.message === 'Invalid login credentials'
        ? 'Incorrect current password'
        : error.message)
    } else {
      setPwSuccess('Password updated!')
      setCurrentPw('')
      setNewPw('')
      setConfirmNewPw('')
      setTimeout(() => setPwSuccess(''), 4000)
    }
  }

  // ── Toggle vision pill ────────────────────────────────────────────────────
  function toggleVision(opt) {
    setLStyle(prev =>
      prev.includes(opt)
        ? prev.filter(s => s !== opt)
        : prev.length < 3 ? [...prev, opt] : prev
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(28,20,16,0.55)',
          zIndex: 400,
        }}
      />

      {/* Panel */}
      <div style={{
        position:        'fixed',
        top:             0,
        right:           0,
        bottom:          0,
        width:           '440px',
        maxWidth:        '100vw',
        backgroundColor: '#FDFAF8',
        zIndex:          500,
        overflowY:       'auto',
        boxShadow:       '-12px 0 40px rgba(0,0,0,0.14)',
        display:         'flex',
        flexDirection:   'column',
      }}>

        {/* Header */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          padding:         '20px 28px',
          borderBottom:    '1px solid #EDE8E3',
          backgroundColor: '#FDFAF8',
          position:        'sticky',
          top:             0,
          zIndex:          10,
        }}>
          <div>
            <h1 style={{
              fontFamily:    'var(--font-heading)',
              color:         '#2C2825',
              fontSize:      '26px',
              fontWeight:    300,
              fontStyle:     'italic',
              margin:        0,
              lineHeight:    1,
            }}>
              Settings
            </h1>
          </div>
          <button
            onClick={onClose}
            style={{
              width:           '32px',
              height:          '32px',
              borderRadius:    '50%',
              border:          'none',
              backgroundColor: '#F5EFE9',
              color:           '#8C8480',
              cursor:          'pointer',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '28px', flex: 1 }}>

          {/* ── SECTION 1: WEDDING PROFILE ── */}
          <div style={{ marginBottom: '40px' }}>
            <SectionHeading>Wedding Profile</SectionHeading>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Names */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <FieldLabel>Bride's name</FieldLabel>
                  <input value={lBride} onChange={e => setLBride(e.target.value)}
                         placeholder="e.g. Jungmin" style={inputStyle()} />
                </div>
                <div>
                  <FieldLabel>Groom's name</FieldLabel>
                  <input value={lGroom} onChange={e => setLGroom(e.target.value)}
                         placeholder="e.g. Jin Won" style={inputStyle()} />
                </div>
              </div>

              {/* Date + Location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <FieldLabel optional>Wedding date</FieldLabel>
                  <input type="date" value={lDate} onChange={e => setLDate(e.target.value)}
                         style={{ ...inputStyle(), colorScheme: 'light' }} />
                </div>
                <div>
                  <FieldLabel optional>Location</FieldLabel>
                  <input value={lLocation} onChange={e => setLLocation(e.target.value)}
                         placeholder="City or venue" style={inputStyle()} />
                </div>
              </div>

              {/* Guests + Budget */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <FieldLabel optional>Guest count</FieldLabel>
                  <input type="number" min="0" value={lGuests}
                         onChange={e => setLGuests(e.target.value)}
                         placeholder="e.g. 120" style={inputStyle()} />
                </div>
                <div>
                  <FieldLabel optional>Total budget ($)</FieldLabel>
                  <input type="number" min="0" value={lBudget}
                         onChange={e => setLBudget(e.target.value)}
                         placeholder="e.g. 30000" style={inputStyle()} />
                </div>
              </div>

              {/* Vision pills */}
              <div>
                <FieldLabel optional>
                  Wedding vision
                  <span style={{ color: '#A09590', fontWeight: 400, fontSize: '11px', marginLeft: '5px' }}>
                    up to 3
                  </span>
                </FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {VISION_OPTIONS.map(opt => {
                    const sel = lStyle.includes(opt)
                    return (
                      <button key={opt} type="button" onClick={() => toggleVision(opt)}
                        style={{
                          padding:         '6px 13px',
                          borderRadius:    '999px',
                          border:          `1.5px solid ${sel ? '#B4627A' : '#E5DDD8'}`,
                          backgroundColor: sel ? '#F2E0E5' : '#FDFAF8',
                          color:           sel ? '#B4627A' : '#8C8480',
                          fontFamily:      'var(--font-body)',
                          fontSize:        '12px',
                          cursor:          'pointer',
                          transition:      'all 0.15s',
                        }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Save button */}
              {profileError && (
                <p style={{ color: '#EF4444', fontFamily: 'var(--font-body)', fontSize: '13px', margin: 0 }}>
                  {profileError}
                </p>
              )}
              <button
                type="submit"
                disabled={profileSaving}
                style={{
                  padding:         '11px',
                  borderRadius:    '10px',
                  backgroundColor: profileSaved ? '#166534' : '#B4627A',
                  color:           '#fff',
                  fontFamily:      'var(--font-body)',
                  fontSize:        '14px',
                  fontWeight:      500,
                  border:          'none',
                  cursor:          profileSaving ? 'default' : 'pointer',
                  opacity:         profileSaving ? 0.7 : 1,
                  transition:      'background-color 0.2s',
                }}
                onMouseEnter={e => { if (!profileSaving && !profileSaved) e.currentTarget.style.backgroundColor = '#C97B90' }}
                onMouseLeave={e => { if (!profileSaving && !profileSaved) e.currentTarget.style.backgroundColor = '#B4627A' }}
              >
                {profileSaved ? '✓ Changes saved' : profileSaving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>

          {/* ── SECTION 2: ACCOUNT SETTINGS ── */}
          <div>
            <SectionHeading>Account Settings</SectionHeading>

            {/* Email display */}
            <div style={{ marginBottom: '24px', padding: '12px 14px', borderRadius: '10px',
                          backgroundColor: '#F5EFE9', border: '1px solid #EDE8E3' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#A09590',
                          letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>
                Account email
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#2C2825', margin: 0 }}>
                {userEmail}
              </p>
            </div>

            {/* Change password */}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
                          color: '#4A4440', margin: 0 }}>
                Change password
              </p>
              <input type="password" placeholder="Current password"
                     value={currentPw} onChange={e => { setCurrentPw(e.target.value); setPwError('') }}
                     style={inputStyle(!!pwError && !currentPw)} />
              <input type="password" placeholder="New password"
                     value={newPw} onChange={e => { setNewPw(e.target.value); setPwError('') }}
                     style={inputStyle()} />
              <input type="password" placeholder="Confirm new password"
                     value={confirmNewPw} onChange={e => { setConfirmNewPw(e.target.value); setPwError('') }}
                     style={inputStyle(!!pwError && !!confirmNewPw && newPw !== confirmNewPw)} />

              {pwError && (
                <p style={{ color: '#EF4444', fontFamily: 'var(--font-body)', fontSize: '13px', margin: 0 }}>
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p style={{ color: '#166534', fontFamily: 'var(--font-body)', fontSize: '13px', margin: 0 }}>
                  ✓ {pwSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={pwSaving}
                style={{
                  padding:         '10px',
                  borderRadius:    '10px',
                  border:          '1.5px solid #E5DDD8',
                  backgroundColor: '#FDFAF8',
                  color:           '#4A4440',
                  fontFamily:      'var(--font-body)',
                  fontSize:        '13px',
                  fontWeight:      500,
                  cursor:          pwSaving ? 'default' : 'pointer',
                  opacity:         pwSaving ? 0.6 : 1,
                  transition:      'background-color 0.15s',
                }}
                onMouseEnter={e => { if (!pwSaving) e.currentTarget.style.backgroundColor = '#F5EFE9' }}
                onMouseLeave={e => { if (!pwSaving) e.currentTarget.style.backgroundColor = '#FDFAF8' }}
              >
                {pwSaving ? 'Updating…' : 'Update password'}
              </button>
            </form>

            {/* Sign out */}
            <button
              onClick={signOut}
              style={{
                width:           '100%',
                padding:         '12px',
                borderRadius:    '10px',
                border:          'none',
                backgroundColor: '#FEF2F2',
                color:           '#B91C1C',
                fontFamily:      'var(--font-body)',
                fontSize:        '14px',
                fontWeight:      500,
                cursor:          'pointer',
                transition:      'background-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FEF2F2' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
