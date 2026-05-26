import { useState } from 'react'
import { RefreshCw, Bell, X, Sparkles, AlertCircle, Clock, Info } from 'lucide-react'
import { useWedding } from '../context/WeddingContext'

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  urgent:  { label: 'Urgent',   color: '#991B1B', bg: '#FEE2E2', Icon: AlertCircle },
  warning: { label: 'Soon',     color: '#92400E', bg: '#FEF3C7', Icon: Clock       },
  info:    { label: 'Reminder', color: '#1E40AF', bg: '#DBEAFE', Icon: Info        },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysAway(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr + 'T00:00:00') - today) / 86_400_000)
}

function shortDate(str) {
  if (!str) return null
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Alert Card ────────────────────────────────────────────────────────────────

function AlertCard({ alert, onDismiss }) {
  const cfg  = PRIORITY_CFG[alert.priority] ?? PRIORITY_CFG.info
  const Icon = cfg.Icon
  const days = daysAway(alert.dueDate)

  const whenStr = days == null     ? null
               : days === 0        ? 'Today'
               : days === 1        ? 'Tomorrow'
               : days < 0          ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`
               : `In ${days} day${days !== 1 ? 's' : ''}`

  return (
    <div
      className="flex gap-3 p-4 rounded-2xl border"
      style={{ backgroundColor: '#fff', borderColor: '#EDE8E3' }}
    >
      {/* Priority accent bar */}
      <div
        className="w-1 rounded-full shrink-0 self-stretch"
        style={{ backgroundColor: cfg.color, opacity: 0.35 }}
      />

      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: cfg.bg }}
      >
        <Icon size={14} style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">

            {/* Badges row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                style={{ backgroundColor: cfg.bg, color: cfg.color, fontFamily: 'var(--font-body)' }}
              >
                {cfg.label}
              </span>
              {whenStr && (
                <span
                  className="text-[10px] font-medium whitespace-nowrap"
                  style={{ color: cfg.color, fontFamily: 'var(--font-body)' }}
                >
                  {whenStr}
                  {alert.dueDate && ` · ${shortDate(alert.dueDate)}`}
                </span>
              )}
              {alert.fromAI && (
                <span
                  className="flex items-center gap-0.5 text-[10px] whitespace-nowrap"
                  style={{ color: '#B4ABA5', fontFamily: 'var(--font-body)' }}
                >
                  <Sparkles size={8} /> From AI
                </span>
              )}
            </div>

            {/* Title */}
            <p
              className="text-sm font-medium"
              style={{ color: '#2C2825', fontFamily: 'var(--font-body)' }}
            >
              {alert.title}
            </p>

            {/* Detail */}
            {alert.detail && (
              <p
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}
              >
                {alert.detail}
              </p>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(alert.id)}
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: '#F5EFE9', color: '#B4ABA5' }}
            title="Dismiss"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Alerts() {
  const { alerts, dismissAlert, syncAlerts, messages } = useWedding()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  // Sort: priority order (urgent → warning → info), then by dueDate, then newest first
  const activeAlerts = alerts
    .filter(a => !a.dismissed)
    .sort((a, b) => {
      const order = { urgent: 0, warning: 1, info: 2 }
      const diff = (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
      if (diff !== 0) return diff
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return b.createdAt - a.createdAt
    })

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
      const { count } = await syncAlerts(messages)
      setSyncMsg(
        count > 0
          ? `✓ Found ${count} alert${count !== 1 ? 's' : ''} in your conversation`
          : '✓ No new alerts found'
      )
    } catch {
      setSyncMsg('Sync failed — check your API key')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 4000)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Sub-header ──────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-end gap-3 px-8 py-4 border-b"
        style={{ borderColor: '#EDE8E3', backgroundColor: '#FDFAF8' }}
      >
        {syncMsg && (
          <span
            className="text-xs"
            style={{
              color:      syncMsg.startsWith('✓') ? '#5A7A6A' : '#B91C1C',
              fontFamily: 'var(--font-body)',
            }}
          >
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
          {syncing ? 'Scanning…' : 'Update from AI conversation'}
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeAlerts.length === 0 ? (

          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#F2E0E5' }}
            >
              <Bell size={28} style={{ color: '#B4627A' }} />
            </div>
            <div className="text-center max-w-xs">
              <h3
                className="text-xl font-light italic mb-2"
                style={{ fontFamily: 'var(--font-heading)', color: '#2C2825' }}
              >
                No active alerts
              </h3>
              <p className="text-sm" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
                Click "Update from AI conversation" to scan your planning chat for deadlines and reminders.
              </p>
            </div>
          </div>

        ) : (
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs mb-4" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
              {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''} · sorted by priority
            </p>
            {activeAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
