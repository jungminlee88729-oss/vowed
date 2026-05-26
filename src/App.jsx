import { useState, useRef, useCallback } from 'react'
import { WeddingProvider, useWedding } from './context/WeddingContext'
import TopBar from './components/TopBar'
import AiCoach from './sections/AiCoach'
import WeddingChecklist from './sections/WeddingChecklist'
import Calendar from './sections/Calendar'
import FinanceTracker from './sections/FinanceTracker'

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#1C1410' }}
    >
      <div style={{ animation: 'vovedFadeIn 0.7s ease-out forwards', opacity: 0 }}>
        <p
          style={{
            color:         '#B4627A',
            fontFamily:    'var(--font-body)',
            fontWeight:    500,
            fontSize:      '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom:  '8px',
            textAlign:     'center',
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
            textAlign:     'center',
          }}
        >
          Vowed
        </h1>
        <div
          style={{
            marginTop:      '24px',
            display:        'flex',
            justifyContent: 'center',
            gap:            '6px',
          }}
        >
          <span className="typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="typing-dot" style={{ animationDelay: '180ms' }} />
          <span className="typing-dot" style={{ animationDelay: '360ms' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RIGHT_TABS = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'calendar',  label: 'Calendar'  },
  { id: 'finance',   label: 'Finance'   },
]

const DIVIDER_W = 8   // px — width of the drag handle strip
const MIN_W     = 300 // px — minimum width for either panel

// ─── Drag-handle grip icon ────────────────────────────────────────────────────

function GripDots() {
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           '4px',
        pointerEvents: 'none',
      }}
    >
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          style={{
            width:           '3px',
            height:          '3px',
            borderRadius:    '50%',
            backgroundColor: '#A09590',
          }}
        />
      ))}
    </div>
  )
}

// ─── App shell ────────────────────────────────────────────────────────────────

function AppContent() {
  const [rightTab, setRightTab] = useState('checklist')

  // Initialise to half the viewport; clamped to minimum
  const [leftWidth, setLeftWidth] = useState(
    () => Math.max(MIN_W, Math.floor(window.innerWidth / 2))
  )

  const containerRef = useRef(null)
  const dragging     = useRef(false)

  // ── Drag start ──────────────────────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true

    // Prevent text selection and show resize cursor globally while dragging
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (moveEvt) => {
      if (!dragging.current || !containerRef.current) return
      const rect  = containerRef.current.getBoundingClientRect()
      const maxW  = rect.width - DIVIDER_W - MIN_W
      const newW  = moveEvt.clientX - rect.left
      setLeftWidth(Math.max(MIN_W, Math.min(maxW, newW)))
    }

    const onMouseUp = () => {
      dragging.current               = false
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup',   onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup',   onMouseUp)
  }, [])

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#FDFAF8' }}>

      {/* ── Full-width dark top bar ── */}
      <TopBar />

      {/* ── Two-column body ── */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">

        {/* ── Left column: AI Coach ── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${leftWidth}px`, flexShrink: 0 }}
        >
          <AiCoach />
        </div>

        {/* ── Resizable divider ── */}
        <div
          onMouseDown={onDividerMouseDown}
          title="Drag to resize"
          style={{
            width:           `${DIVIDER_W}px`,
            flexShrink:      0,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            cursor:          'col-resize',
            backgroundColor: '#E8E2DC',
            transition:      'background-color 0.15s',
            zIndex:          20,
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#D5CCC5' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#E8E2DC' }}
        >
          <GripDots />
        </div>

        {/* ── Right column: tabbed panels ── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ flex: 1, minWidth: `${MIN_W}px` }}
        >
          {/* Tab bar */}
          <div
            className="shrink-0 flex items-center border-b"
            style={{
              height:          '52px',
              paddingLeft:     '20px',
              borderColor:     '#EDE8E3',
              backgroundColor: '#FDFAF8',
            }}
          >
            {RIGHT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className="relative h-full px-5 text-sm font-medium transition-colors"
                style={{
                  fontFamily: 'var(--font-body)',
                  color:      rightTab === tab.id ? '#B4627A' : '#8C8480',
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                }}
              >
                {tab.label}
                {rightTab === tab.id && (
                  <div
                    className="absolute bottom-0 left-3 right-3"
                    style={{
                      height:          '2px',
                      backgroundColor: '#B4627A',
                      borderRadius:    '2px 2px 0 0',
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {rightTab === 'checklist' && <WeddingChecklist />}
            {rightTab === 'calendar'  && <Calendar />}
            {rightTab === 'finance'   && <FinanceTracker />}
          </div>
        </div>

      </div>
    </div>
  )
}

export default function App() {
  return (
    <WeddingProvider>
      <AppContent />
    </WeddingProvider>
  )
}
