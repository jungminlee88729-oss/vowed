import { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react'
import {
  ChevronLeft, ChevronRight, Heart, Sparkles, X, Plus, RefreshCw,
  MapPin, Phone, Globe, FileText, DollarSign,
} from 'lucide-react'
import { useWedding } from '../context/WeddingContext'

// ─── Constants ──────────────────────────────────────────────────────────────
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS   = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December']

// ─── Person × type colour matrix ────────────────────────────────────────────

const BRIDE_COLORS = {
  task:     { bg: '#FDF4F6', color: '#C07E95', border: '#ECC5D0' },
  deadline: { bg: '#F9E0E8', color: '#B4627A', border: '#DFA5B5' },
  event:    { bg: '#F0C4D0', color: '#8B3A52', border: '#CC8FA0' },
  base:     '#B4627A',
}
const GROOM_COLORS = {
  task:     { bg: '#F0F7F4', color: '#6E9E8C', border: '#BCD9CE' },
  deadline: { bg: '#DEF0E8', color: '#4A7A65', border: '#95C4AF' },
  event:    { bg: '#C4DED4', color: '#2E5E4A', border: '#7EB9A5' },
  base:     '#4A7A65',
}
const BOTH_COLORS = {
  task:     { bg: '#FDF9ED', color: '#B09040', border: '#EDD89A' },
  deadline: { bg: '#FBF0D0', color: '#9A7820', border: '#E5C870' },
  event:    { bg: '#F2E0A0', color: '#7A5C10', border: '#D4B050' },
  base:     '#9A7820',
}

function buildPersonColors(bride, groom) {
  return {
    [bride]: BRIDE_COLORS, [groom]: GROOM_COLORS, Both: BOTH_COLORS,
    JungMin: BRIDE_COLORS, 'Jin Won': GROOM_COLORS, // legacy keys for existing data
  }
}

function buildPersonIcon(bride, groom) {
  return { [bride]: '👰', [groom]: '🤵', Both: '👰🤵', JungMin: '👰', 'Jin Won': '🤵' }
}

// ─── Calendar-scoped person context ─────────────────────────────────────────

const CalendarPeopleCtx = createContext(null)
function useCalendarPeople() { return useContext(CalendarPeopleCtx) }

function normalizeType(type) {
  if (type === 'vendor')  return 'event'
  if (type === 'wedding') return 'wedding'
  if (['task', 'deadline', 'event'].includes(type)) return type
  return 'event'
}

function getEventCfg(event, personColors) {
  const type = normalizeType(event.type)
  if (type === 'wedding') return { bg: '#FBE8EE', color: '#B4627A', border: '#E8B4C3' }
  const person = event.assignedTo || 'Both'
  return (personColors[person] ?? personColors.Both)[type] ?? personColors.Both.event
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildGrid(year, month) {
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++)     cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0)         cells.push(null)
  return cells
}

function daysAway(dateStr) {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr + 'T00:00:00') - t) / 86_400_000)
}

function shortDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// ─── EventTooltip (hover, no pointer events) ─────────────────────────────────

function EventTooltip({ tooltip, onMouseEnter, onMouseLeave }) {
  const { personIcon } = useCalendarPeople()
  if (!tooltip) return null
  const { event, x, y } = tooltip

  // Keep tooltip from bleeding off the right edge
  const clampedX = Math.min(Math.max(x, 130), (window.innerWidth || 1200) - 130)

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position:      'fixed',
        left:          clampedX,
        top:           y + 6,
        transform:     'translateX(-50%)',
        zIndex:        300,
        pointerEvents: 'auto',
        minWidth:      '190px',
        maxWidth:      '260px',
      }}
    >
      {/* Arrow */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 0, height: 0,
          borderLeft:   '6px solid transparent',
          borderRight:  '6px solid transparent',
          borderBottom: '6px solid #1C1410',
        }} />
      </div>

      <div
        className="rounded-xl shadow-2xl px-3.5 py-3"
        style={{ backgroundColor: '#1C1410', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Person row */}
        {event.type !== 'wedding' && (
          <div
            className="flex items-center gap-2 pb-2 mb-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span style={{ fontSize: '13px', lineHeight: 1 }}>
              {personIcon[event.assignedTo] ?? '👰🤵'}
            </span>
            <span className="text-xs font-medium" style={{ color: 'rgba(253,250,248,0.65)', fontFamily: 'var(--font-body)' }}>
              {event.assignedTo || 'Both'}
            </span>
            {event.fromFinance && (
              <span className="text-[10px] ml-auto" style={{ color: '#FCD34D', fontFamily: 'var(--font-body)' }}>
                ⚠️ Finance
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-medium leading-snug" style={{ color: '#FDFAF8', fontFamily: 'var(--font-body)' }}>
          {event.title}
        </p>

        {/* Finance balance */}
        {event.fromFinance && event.balance > 0 && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: '#FCD34D', fontFamily: 'var(--font-body)' }}>
            Balance due: ${event.balance.toLocaleString()}
          </p>
        )}

        {/* Detail fields */}
        {event.address && (
          <a
            href={mapsUrl(event.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs mt-1.5 flex gap-1.5 items-start"
            style={{
              color:          'rgba(253,250,248,0.65)',
              fontFamily:     'var(--font-body)',
              textDecoration: 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            <span className="shrink-0 mt-px">📍</span>
            <span style={{ textDecoration: 'underline', textDecorationColor: 'rgba(253,250,248,0.25)' }}>
              {event.address}
            </span>
            <span style={{ opacity: 0.45, fontSize: '9px', flexShrink: 0, marginTop: '1px' }}>↗</span>
          </a>
        )}
        {event.phone && (
          <p className="text-xs mt-1 flex gap-1.5 items-center" style={{ color: 'rgba(253,250,248,0.6)', fontFamily: 'var(--font-body)' }}>
            <span>📞</span>{event.phone}
          </p>
        )}
        {event.url && (
          <p className="text-xs mt-1 flex gap-1.5 items-center truncate" style={{ color: 'rgba(253,250,248,0.6)', fontFamily: 'var(--font-body)' }}>
            <span>🔗</span><span className="truncate">{event.url}</span>
          </p>
        )}
        {event.notes && (
          <p className="text-xs mt-1.5 flex gap-1.5 items-start" style={{ color: 'rgba(253,250,248,0.55)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
            <span className="shrink-0 mt-px">📝</span>{event.notes}
          </p>
        )}

        <p className="text-[10px] mt-2" style={{ color: 'rgba(253,250,248,0.3)', fontFamily: 'var(--font-body)' }}>
          Click to view details
        </p>
      </div>
    </div>
  )
}

// ─── EventDetailModal (click to open) ────────────────────────────────────────

function EventDetailModal({ event, onClose, onRemove }) {
  const { personColors, personIcon } = useCalendarPeople()
  if (!event) return null

  const cfg    = getEventCfg(event, personColors)
  const type   = normalizeType(event.type)
  const icon   = type !== 'wedding' ? (personIcon[event.assignedTo] ?? personIcon.Both) : null
  const isWedding  = type === 'wedding'
  const isFinance  = !!event.fromFinance

  const fullDate = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(44,40,37,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4"
        style={{ backgroundColor: '#FDFAF8', fontFamily: 'var(--font-body)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            {/* Person badge */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {icon && <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>}
              {icon && (
                <span className="text-xs font-medium" style={{ color: cfg.color, fontFamily: 'var(--font-body)' }}>
                  {event.assignedTo}
                </span>
              )}
              {isFinance && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontFamily: 'var(--font-body)' }}
                >
                  ⚠️ Finance sync
                </span>
              )}
              {event.fromAI && (
                <span
                  className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#EDE9FE', color: '#6D45B0', fontFamily: 'var(--font-body)' }}
                >
                  <Sparkles size={8} />
                  From AI
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className="text-xl font-light italic leading-snug"
              style={{ fontFamily: 'var(--font-heading)', color: '#2C2825' }}
            >
              {event.title}
            </h3>

            {/* Date */}
            <p className="text-xs mt-1" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
              {fullDate}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Details */}
        {(event.address || event.phone || event.url || event.notes || (isFinance && event.balance > 0)) && (
          <div
            className="rounded-xl p-3.5 mb-4 flex flex-col gap-2.5"
            style={{ backgroundColor: '#F9F5F0', border: '1px solid #EDE8E3' }}
          >
            {isFinance && event.balance > 0 && (
              <div className="flex items-center gap-2.5">
                <DollarSign size={13} style={{ color: '#C47A1A', flexShrink: 0 }} />
                <span className="text-sm font-semibold" style={{ color: '#C47A1A' }}>
                  Balance due: ${event.balance.toLocaleString()}
                </span>
              </div>
            )}
            {event.address && (
              <div className="flex items-start gap-2.5">
                <MapPin size={13} style={{ color: '#B4627A', flexShrink: 0, marginTop: '2px' }} />
                <a
                  href={mapsUrl(event.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm leading-snug"
                  style={{ color: '#B4627A', textDecoration: 'none' }}
                >
                  {event.address}
                  <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '3px' }}>↗</span>
                </a>
              </div>
            )}
            {event.phone && (
              <div className="flex items-center gap-2.5">
                <Phone size={13} style={{ color: '#8C8480', flexShrink: 0 }} />
                <a
                  href={`tel:${event.phone}`}
                  className="text-sm"
                  style={{ color: '#2C2825', textDecoration: 'none' }}
                >
                  {event.phone}
                </a>
              </div>
            )}
            {event.url && (
              <div className="flex items-center gap-2.5">
                <Globe size={13} style={{ color: '#8C8480', flexShrink: 0 }} />
                <a
                  href={event.url.startsWith('http') ? event.url : `https://${event.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm truncate"
                  style={{ color: '#B4627A' }}
                >
                  {event.url}
                </a>
              </div>
            )}
            {event.notes && (
              <div className="flex items-start gap-2.5">
                <FileText size={13} style={{ color: '#8C8480', flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm leading-relaxed" style={{ color: '#2C2825' }}>{event.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {isFinance ? (
          <p className="text-xs text-center" style={{ color: '#B4ABA5', fontFamily: 'var(--font-body)' }}>
            Manage payment dates in the Finance tab
          </p>
        ) : !isWedding && (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
            >
              Close
            </button>
            <button
              onClick={() => { onRemove(event.id); onClose() }}
              className="rounded-xl text-sm font-medium"
              style={{
                flex: 1,
                padding: '10px 0',
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                fontFamily: 'var(--font-body)',
              }}
            >
              Delete
            </button>
          </div>
        )}
        {isWedding && (
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}

// ─── EventPill ───────────────────────────────────────────────────────────────

function EventPill({ event, onShowTooltip, onHideTooltip, onClickEvent }) {
  const { personColors, personIcon } = useCalendarPeople()
  const ref  = useRef(null)
  const cfg  = getEventCfg(event, personColors)
  const type = normalizeType(event.type)
  const icon = type !== 'wedding' ? (personIcon[event.assignedTo] ?? personIcon.Both) : null

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      onShowTooltip(event, { x: rect.left + rect.width / 2, y: rect.bottom })
    }
  }

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHideTooltip}
      onClick={e => { e.stopPropagation(); onClickEvent(event) }}
      className="flex items-center gap-0.5 rounded-full px-1.5 py-[2px] w-full min-w-0 cursor-pointer"
      style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {icon && (
        <span className="shrink-0 leading-none" style={{ fontSize: '8px' }}>{icon}</span>
      )}
      {/* Finance / deadline exclamation */}
      {(type === 'deadline' || event.fromFinance) && (
        <span className="shrink-0 leading-none" style={{ fontSize: '8px' }}>⚠️</span>
      )}
      <span
        className="text-[10px] font-medium truncate leading-tight"
        style={{ color: cfg.color, fontFamily: 'var(--font-body)' }}
      >
        {event.title}
      </span>
      {event.fromAI && (
        <Sparkles size={7} style={{ color: cfg.color, opacity: 0.6, flexShrink: 0 }} />
      )}
    </div>
  )
}

// ─── CalendarCell ─────────────────────────────────────────────────────────────

function CalendarCell({ date, events, isToday, isWeddingDay, onClick, onShowTooltip, onHideTooltip, onClickEvent }) {
  const [hovered, setHovered] = useState(false)

  if (!date) {
    return (
      <div
        className="min-h-[86px] border-r border-b"
        style={{ borderColor: '#EDE8E3', backgroundColor: '#FAFAF9' }}
      />
    )
  }

  const bg = isWeddingDay ? '#FBE8EE'
           : hovered      ? '#FDF7F5'
           : isToday       ? '#F9F5F0'
           : '#fff'

  const shown    = events.slice(0, 2)
  const overflow = events.length - shown.length

  return (
    <div
      onClick={() => onClick(date)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="min-h-[86px] border-r border-b p-1.5 flex flex-col gap-0.5 cursor-pointer select-none"
      style={{ borderColor: '#EDE8E3', backgroundColor: bg, transition: 'background-color 0.1s' }}
    >
      {/* Day number row */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          className="w-6 h-6 flex items-center justify-center rounded-full text-xs"
          style={{
            fontFamily:      'var(--font-body)',
            backgroundColor: isToday ? '#B4627A' : 'transparent',
            color:           isToday      ? '#fff'
                           : isWeddingDay ? '#B4627A'
                           : '#2C2825',
            fontWeight:      isToday || isWeddingDay ? 600 : 400,
          }}
        >
          {date.getDate()}
        </span>
        {isWeddingDay && <Heart size={11} fill="#B4627A" style={{ color: '#B4627A' }} />}
        {hovered && !isWeddingDay && <Plus size={11} style={{ color: '#C4BBAF' }} />}
      </div>

      {/* Events */}
      {shown.map(ev => (
        <EventPill
          key={ev.id}
          event={ev}
          onShowTooltip={onShowTooltip}
          onHideTooltip={onHideTooltip}
          onClickEvent={onClickEvent}
        />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] px-1.5" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
          +{overflow} more
        </span>
      )}
    </div>
  )
}

// ─── AddressAutocomplete ─────────────────────────────────────────────────────
// Calls Nominatim (OpenStreetMap) — no API key required.
// Debounces 350 ms; closes on outside click; onMouseDown select so the
// input's onBlur doesn't fire and steal focus before the pick registers.

function AddressAutocomplete({ value, onChange, inputStyle }) {
  const [suggestions, setSuggestions] = useState([])
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const debounceRef  = useRef(null)
  const containerRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    onChange(val)
    clearTimeout(debounceRef.current)

    if (val.length < 3) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
        )
        const data = await res.json()
        const list = data.map(d => d.display_name)
        setSuggestions(list)
        setOpen(list.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
      setLoading(false)
    }, 350)
  }

  const select = (addr) => {
    onChange(addr)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={value}
          onChange={handleInput}
          placeholder="e.g. 123 Park Ave, New York, NY"
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ ...inputStyle, paddingRight: loading ? '32px' : undefined }}
          autoComplete="off"
        />
        {/* Subtle spinner while fetching */}
        {loading && (
          <div
            style={{
              position:  'absolute',
              right:     '10px',
              top:       '50%',
              transform: 'translateY(-50%)',
              width:     '13px',
              height:    '13px',
              border:    '2px solid #EDE8E3',
              borderTopColor: '#B4627A',
              borderRadius:   '50%',
              animation: 'spin 0.75s linear infinite',
            }}
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          style={{
            position:        'absolute',
            top:             'calc(100% + 4px)',
            left:            0,
            right:           0,
            margin:          0,
            padding:         0,
            listStyle:       'none',
            backgroundColor: '#fff',
            border:          '1px solid #DDD5CC',
            borderRadius:    '14px',
            boxShadow:       '0 8px 28px rgba(44,40,37,0.13)',
            zIndex:          200,
            overflow:        'hidden',
          }}
        >
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => select(s)}
                className="w-full text-left flex items-start gap-2.5 px-3.5 py-2.5 text-sm transition-colors"
                style={{
                  fontFamily:      'var(--font-body)',
                  color:           '#2C2825',
                  lineHeight:      1.4,
                  background:      'none',
                  cursor:          'pointer',
                  borderBottom:    i < suggestions.length - 1 ? '1px solid #F5EFE9' : 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDF7F5' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <MapPin
                  size={11}
                  style={{ color: '#B4627A', flexShrink: 0, marginTop: '3px' }}
                />
                <span>{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── AddEventModal ────────────────────────────────────────────────────────────

function AddEventModal({ date, onSave, onClose }) {
  const { personColors, bride, groom } = useCalendarPeople()
  const [title,      setTitle]      = useState('')
  const [assignedTo, setAssignedTo] = useState('Both')
  const [address,    setAddress]    = useState('')
  const [phone,      setPhone]      = useState('')
  const [url,        setUrl]        = useState('')
  const [notes,      setNotes]      = useState('')

  if (!date) return null

  const dayLabel = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const canSave = title.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      title:      title.trim(),
      assignedTo,
      type:       'event',
      address:    address.trim()  || null,
      phone:      phone.trim()    || null,
      url:        url.trim()      || null,
      notes:      notes.trim()    || null,
    })
  }

  const inputStyle = {
    borderColor: '#DDD5CC', backgroundColor: '#fff',
    color: '#2C2825', fontFamily: 'var(--font-body)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(44,40,37,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FDFAF8', fontFamily: 'var(--font-body)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-1"
               style={{ color: '#B4627A', letterSpacing: '0.15em' }}>
              Add Event
            </p>
            <h3 className="text-xl font-light italic leading-tight"
                style={{ fontFamily: 'var(--font-heading)', color: '#2C2825' }}>
              {dayLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center mt-0.5 shrink-0"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4">

          {/* Event name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
              Event name *
            </label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave() }}
              placeholder="e.g. Venue walkthrough, florist deposit…"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {/* Assign to */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
              Assign to *
            </label>
            <div className="flex gap-2">
              {[
                { name: bride, icon: '👰' },
                { name: groom, icon: '🤵' },
                { name: 'Both', icon: '👰🤵' },
              ].map(({ name, icon }) => {
                const active    = assignedTo === name
                const baseColor = (personColors[name] ?? personColors.Both).base
                return (
                  <button
                    key={name}
                    onClick={() => setAssignedTo(name)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      border:          `1px solid ${active ? baseColor : '#E5DDD8'}`,
                      backgroundColor: active ? `${baseColor}18` : '#fff',
                      color:           active ? baseColor : '#8C8480',
                    }}
                  >
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>
                    <span>{name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Address — with live autocomplete */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
              Address <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
            </label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              inputStyle={inputStyle}
            />
          </div>

          {/* Phone + URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
                Phone <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(212) 555-0100"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
                URL <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="venue-site.com"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
              Notes <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Bring deposit check, ask about outdoor permit…"
              rows={3}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none"
              style={{ ...inputStyle, lineHeight: '1.5' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl text-sm font-medium transition-all"
            style={{
              flex:            2,
              padding:         '10px 0',
              backgroundColor: canSave ? '#B4627A' : '#DDD5CC',
              color:           '#fff',
            }}
          >
            Add Event
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AgendaRow ────────────────────────────────────────────────────────────────

function AgendaRow({ event, onRemove, onClickEvent }) {
  const { personColors, personIcon } = useCalendarPeople()
  const cfg       = getEventCfg(event, personColors)
  const type      = normalizeType(event.type)
  const icon      = type !== 'wedding' ? (personIcon[event.assignedTo] ?? personIcon.Both) : null
  const days      = daysAway(event.date)
  const when      = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`
  const urgent    = days <= 7

  const hasDetails = event.address || event.phone || event.url || event.notes || event.fromFinance

  return (
    <div
      className="flex items-start gap-4 py-3 border-b group cursor-pointer"
      style={{ borderColor: '#F5EFE9' }}
      onClick={() => onClickEvent(event)}
    >
      {/* When */}
      <div className="w-20 shrink-0 text-right pt-0.5">
        <p className="text-xs font-semibold"
           style={{ color: urgent ? '#B4627A' : '#8C8480', fontFamily: 'var(--font-body)' }}>
          {when}
        </p>
        <p className="text-[10px]" style={{ color: '#B4ABA5', fontFamily: 'var(--font-body)' }}>
          {shortDate(event.date)}
        </p>
      </div>

      {/* Colour bar */}
      <div
        className="w-0.5 rounded-full shrink-0 mt-1"
        style={{ backgroundColor: cfg.color, opacity: 0.6, height: '32px' }}
      />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug" style={{ color: '#2C2825', fontFamily: 'var(--font-body)' }}>
            {icon && <span className="mr-1">{icon}</span>}
            {(type === 'deadline' || event.fromFinance) && <span className="mr-0.5">⚠️</span>}
            {event.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {event.fromAI && (
              <span className="flex items-center gap-0.5 text-[10px]"
                    style={{ color: '#B4ABA5', fontFamily: 'var(--font-body)' }}>
                <Sparkles size={9} /> AI
              </span>
            )}
            {event.fromFinance && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontFamily: 'var(--font-body)' }}>
                Finance
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); onRemove(event.id) }}
              className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: '#B4ABA5', backgroundColor: '#F5EFE9' }}
            >
              <X size={11} />
            </button>
          </div>
        </div>

        {/* Sub-details */}
        {hasDetails && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {event.fromFinance && event.balance > 0 && (
              <span className="text-xs font-medium" style={{ color: '#C47A1A', fontFamily: 'var(--font-body)' }}>
                ${event.balance.toLocaleString()} due
              </span>
            )}
            {event.address && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
                <MapPin size={10} />{event.address}
              </span>
            )}
            {event.phone && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
                <Phone size={10} />{event.phone}
              </span>
            )}
            {event.notes && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
                <FileText size={10} />{event.notes.length > 40 ? event.notes.slice(0, 40) + '…' : event.notes}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const { personColors, bride, groom } = useCalendarPeople()
  const items = [
    { icon: '👰',  label: bride, color: personColors[bride].base, bg: personColors[bride].event.bg },
    { icon: '🤵',  label: groom, color: personColors[groom].base, bg: personColors[groom].event.bg },
    { icon: '👰🤵', label: 'Both', color: personColors.Both.base,  bg: personColors.Both.event.bg  },
  ]
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map(({ icon, label, color, bg }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full shrink-0"
            style={{ backgroundColor: bg, fontSize: '11px', lineHeight: 1 }}
          >
            {icon}
          </span>
          <span className="text-xs" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Calendar ────────────────────────────────────────────────────────────

export default function Calendar() {
  const {
    weddingDate, calendarEvents, addCalendarEvent, removeCalendarEvent,
    messages, extractAndUpdate, vendors,
    brideName, groomName,
  } = useWedding()

  const bride        = brideName || 'Bride'
  const groom        = groomName || 'Groom'
  const personColors = useMemo(() => buildPersonColors(bride, groom), [bride, groom])
  const personIcon   = useMemo(() => buildPersonIcon(bride, groom),   [bride, groom])

  const [syncing,     setSyncing]     = useState(false)
  const [syncMsg,     setSyncMsg]     = useState(null)
  const [tooltip,     setTooltip]     = useState(null)   // { event, x, y }
  const [detailEvent, setDetailEvent] = useState(null)   // event to show in detail modal

  const hideTimerRef = useRef(null)

  const handleSync = async () => {
    if (syncing) return
    if (messages.length <= 1) {
      setSyncMsg('Start a conversation in AI Coach first.')
      setTimeout(() => setSyncMsg(null), 3000)
      return
    }
    setSyncing(true)
    setSyncMsg(null)
    try {
      await extractAndUpdate(messages)
      setSyncMsg('✓ Calendar updated from your conversation')
    } catch {
      setSyncMsg('Sync failed — check your API key')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 4000)
  }

  const todayDate = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const todayStr  = useMemo(() => toYMD(todayDate), [todayDate])

  const initDate = weddingDate ? new Date(weddingDate + 'T00:00:00') : todayDate
  const [viewYear,     setViewYear]     = useState(initDate.getFullYear())
  const [viewMonth,    setViewMonth]    = useState(initDate.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  const weddingStr = weddingDate || null

  // ── Finance-synced deadline events (derived, not stored) ────────────────────
  const financeEvents = useMemo(() => {
    if (!vendors?.length) return []
    return vendors
      .filter(v => {
        if (!v.dueDate) return false
        // Skip fully paid
        if (v.totalCost > 0 && v.depositPaid >= v.totalCost) return false
        return true
      })
      .map(v => ({
        id:          `finance-${v.id}`,
        title:       `${v.name} payment`,
        date:        v.dueDate,
        type:        'deadline',
        assignedTo:  v.assignedTo || 'Both',
        fromAI:      false,
        fromFinance: true,
        balance:     Math.max(0, v.totalCost - v.depositPaid),
      }))
  }, [vendors])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const goToday = () => {
    setViewYear(todayDate.getFullYear())
    setViewMonth(todayDate.getMonth())
  }
  const goWedding = () => {
    if (!weddingStr) return
    const d = new Date(weddingStr + 'T00:00:00')
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  // ── Grid ─────────────────────────────────────────────────────────────────────
  const gridCells = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth])

  // ── Events index ─────────────────────────────────────────────────────────────
  const eventsByDate = useMemo(() => {
    const idx = {}
    // Wedding day
    if (weddingStr) {
      idx[weddingStr] = [{
        id: '__wedding__', title: 'Our Wedding Day', date: weddingStr,
        type: 'wedding', assignedTo: 'Both', fromAI: false,
      }]
    }
    // Regular calendar events
    calendarEvents.forEach(ev => {
      if (!idx[ev.date]) idx[ev.date] = []
      if (ev.date === weddingStr && ev.id === '__wedding__') return
      idx[ev.date].push(ev)
    })
    // Finance deadline events
    financeEvents.forEach(ev => {
      if (!idx[ev.date]) idx[ev.date] = []
      // Avoid duplicate if same vendor is already there
      const dup = idx[ev.date].some(e => e.id === ev.id)
      if (!dup) idx[ev.date].push(ev)
    })
    return idx
  }, [calendarEvents, financeEvents, weddingStr])

  // ── Upcoming (next 5 events) ──────────────────────────────────────────────
  const upcoming = useMemo(() => {
    const list = []
    if (weddingStr && weddingStr >= todayStr) {
      list.push({ id: '__wedding__', title: 'Our Wedding Day', date: weddingStr, type: 'wedding', assignedTo: 'Both', fromAI: false })
    }
    calendarEvents.forEach(ev => { if (ev.date >= todayStr) list.push(ev) })
    financeEvents.forEach(ev => { if (ev.date >= todayStr) list.push(ev) })
    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
  }, [calendarEvents, financeEvents, weddingStr, todayStr])

  // ── Tooltip handlers ─────────────────────────────────────────────────────────
  const showTooltip = useCallback((event, pos) => {
    clearTimeout(hideTimerRef.current)
    setTooltip({ event, x: pos.x, y: pos.y })
  }, [])
  const hideTooltip = useCallback(() => {
    hideTimerRef.current = setTimeout(() => setTooltip(null), 350)
  }, [])
  // Lets the tooltip itself cancel the hide timer when the mouse moves onto it
  const cancelHide = useCallback(() => {
    clearTimeout(hideTimerRef.current)
  }, [])

  // ── Event handlers ────────────────────────────────────────────────────────────
  const handleCellClick = (date) => {
    hideTooltip()
    setSelectedDate(date)
  }

  const handleClickEvent = useCallback((event) => {
    hideTooltip()
    setDetailEvent(event)
  }, [hideTooltip])

  const handleSave = ({ title, type, assignedTo, address, phone, url, notes }) => {
    addCalendarEvent({
      id:         `manual-${Date.now()}`,
      title,
      date:       toYMD(selectedDate),
      type:       type || 'event',
      assignedTo,
      fromAI:     false,
      address:    address || null,
      phone:      phone   || null,
      url:        url     || null,
      notes:      notes   || null,
    })
    setSelectedDate(null)
  }

  const handleRemove = useCallback((id) => {
    // Finance events are derived — can't remove them here
    if (id.startsWith('finance-')) return
    removeCalendarEvent(id)
  }, [removeCalendarEvent])

  const isViewingWeddingMonth =
    weddingStr &&
    viewYear  === new Date(weddingStr + 'T00:00:00').getFullYear() &&
    viewMonth === new Date(weddingStr + 'T00:00:00').getMonth()

  return (
    <CalendarPeopleCtx.Provider value={{ personColors, personIcon, bride, groom }}>
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: '#EDE8E3', backgroundColor: '#FDFAF8' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <ChevronLeft size={15} />
          </button>
          <h2
            className="text-xl font-light italic w-44 text-center"
            style={{ fontFamily: 'var(--font-heading)', color: '#2C2825', fontSize: '22px' }}
          >
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {syncMsg && (
            <span className="text-xs" style={{ color: syncMsg.startsWith('✓') ? '#5A7A6A' : '#B91C1C', fontFamily: 'var(--font-body)' }}>
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all"
            style={{
              fontFamily:      'var(--font-body)',
              backgroundColor: syncing ? '#F5EFE9' : '#F2E0E5',
              color:           syncing ? '#B4ABA5' : '#B4627A',
              border:          '1px solid',
              borderColor:     syncing ? '#DDD5CC' : '#DEB8C5',
            }}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Update from AI'}
          </button>
          <Legend />
          {weddingStr && !isViewingWeddingMonth && (
            <button
              onClick={goWedding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#F2E0E5', color: '#B4627A', fontFamily: 'var(--font-body)' }}
            >
              <Heart size={10} fill="#B4627A" />
              Wedding day
            </button>
          )}
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480', fontFamily: 'var(--font-body)' }}
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Weekday headers */}
        <div
          className="grid grid-cols-7 border-b sticky top-0 z-10"
          style={{ borderColor: '#EDE8E3', backgroundColor: '#FDFAF8' }}
        >
          {WEEKDAYS.map(d => (
            <div
              key={d}
              className="py-2.5 text-center text-xs font-medium"
              style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 border-l" style={{ borderColor: '#EDE8E3' }}>
          {gridCells.map((date, idx) => {
            const dStr = date ? toYMD(date) : null
            const evts = dStr ? (eventsByDate[dStr] ?? []) : []
            return (
              <CalendarCell
                key={idx}
                date={date}
                events={evts}
                isToday={dStr === todayStr}
                isWeddingDay={!!(dStr && dStr === weddingStr)}
                onClick={handleCellClick}
                onShowTooltip={showTooltip}
                onHideTooltip={hideTooltip}
                onClickEvent={handleClickEvent}
              />
            )
          })}
        </div>

        {/* ── Upcoming events ───────────────────────────────────────────── */}
        <div className="px-8 pt-8 pb-10">
          <div className="flex items-baseline justify-between mb-1">
            <h3
              className="font-light italic"
              style={{ fontFamily: 'var(--font-heading)', color: '#2C2825', fontSize: '20px' }}
            >
              Upcoming events
            </h3>
            <span className="text-xs" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
              {upcoming.length} event{upcoming.length !== 1 ? 's' : ''}
            </span>
          </div>

          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: '#B4ABA5', fontFamily: 'var(--font-body)' }}>
              No upcoming events yet. Click any day on the calendar to add one, or tell the AI Coach about an upcoming appointment.
            </p>
          ) : (
            <div className="mt-3">
              {upcoming.map(ev => (
                <AgendaRow
                  key={ev.id}
                  event={ev}
                  onRemove={handleRemove}
                  onClickEvent={handleClickEvent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Hover tooltip ─────────────────────────────────────────────────── */}
      <EventTooltip tooltip={tooltip} onMouseEnter={cancelHide} onMouseLeave={hideTooltip} />

      {/* ── Event Detail Modal ────────────────────────────────────────────── */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onRemove={handleRemove}
        />
      )}

      {/* ── Add Event Modal ───────────────────────────────────────────────── */}
      {selectedDate && (
        <AddEventModal
          date={selectedDate}
          onSave={handleSave}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
    </CalendarPeopleCtx.Provider>
  )
}
