import { useState, useMemo, useReducer, useEffect, useRef } from 'react'
import {
  MapPin, Wine, UtensilsCrossed, Camera, Video, Flower2, ChefHat,
  Music, Scissors, Shirt, Users, Plane, Clock, Star, Heart, Gift, Gem,
  ChevronDown, ChevronRight, CalendarDays, RefreshCw, ArrowRight, Check,
  Pencil, Trash2, Plus, X, MoreHorizontal, AlertTriangle,
} from 'lucide-react'
import { useWedding } from '../context/WeddingContext'
import { getClient } from '../lib/anthropic'

// ─── Icon registry ─────────────────────────────────────────────────────────────
const ICONS = {
  MapPin, Wine, UtensilsCrossed, Camera, Video, Flower2, ChefHat,
  Music, Scissors, Shirt, Users, Plane, Clock, Star, Heart, Gift, Gem,
}

const NEW_CAT_ICONS = [
  { name: 'Star',            Icon: Star            },
  { name: 'Heart',           Icon: Heart           },
  { name: 'Gift',            Icon: Gift            },
  { name: 'Gem',             Icon: Gem             },
  { name: 'MapPin',          Icon: MapPin          },
  { name: 'Camera',          Icon: Camera          },
  { name: 'Music',           Icon: Music           },
  { name: 'Plane',           Icon: Plane           },
  { name: 'Clock',           Icon: Clock           },
  { name: 'Users',           Icon: Users           },
  { name: 'Scissors',        Icon: Scissors        },
  { name: 'UtensilsCrossed', Icon: UtensilsCrossed },
]

// ─── Urgency helpers ───────────────────────────────────────────────────────────

const URGENCY = {
  red:   { dot: '#EF4444', bg: '#FEE2E2', text: '#B91C1C', label: 'Urgent'   },
  amber: { dot: '#F59E0B', bg: '#FEF3C7', text: '#92400E', label: 'Soon'     },
  green: { dot: '#5A7A6A', bg: '#E4EDEA', text: '#3B5E50', label: 'On Track' },
  grey:  { dot: '#C4BBAF', bg: '#F5F0EB', text: '#8C8480', label: 'Flexible' },
}

// ─── Due-date helpers ──────────────────────────────────────────────────────────

/** Resolve the actual due date: explicit dueDate wins; falls back to monthsBefore calc */
function resolveDueDate(monthsBefore, weddingDate, dueDate) {
  if (dueDate) return new Date(dueDate + 'T00:00:00')
  if (monthsBefore == null || !weddingDate) return null
  const wedding = new Date(weddingDate + 'T00:00:00')
  return new Date(wedding.getTime() - monthsBefore * 30.44 * 86_400_000)
}

function calcUrgency(monthsBefore, weddingDate, done, dueDate) {
  if (done) return null
  const resolved = resolveDueDate(monthsBefore, weddingDate, dueDate)
  if (!resolved) return 'grey'
  const daysLeft = (resolved - new Date()) / 86_400_000
  if (daysLeft <= 0)  return 'red'
  if (daysLeft <= 28) return 'red'
  if (daysLeft <= 91) return 'amber'
  return 'green'
}

function formatDueMonth(monthsBefore, weddingDate, dueDate) {
  const resolved = resolveDueDate(monthsBefore, weddingDate, dueDate)
  if (!resolved) return null
  return resolved.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ─── Month+timing helpers (for EditTaskModal) ──────────────────────────────────

function dueDateToMonthTiming(dueDate) {
  if (!dueDate) return { dueMonth: '', dueTiming: 'mid' }
  const [y, m, d] = dueDate.split('-').map(Number)
  const timing = d <= 10 ? 'early' : d <= 20 ? 'mid' : 'end'
  return { dueMonth: `${y}-${String(m).padStart(2, '0')}`, dueTiming: timing }
}

function monthsBeforeToMonthTiming(monthsBefore, weddingDate) {
  if (!weddingDate || monthsBefore == null) return { dueMonth: '', dueTiming: 'mid' }
  const wedding = new Date(weddingDate + 'T00:00:00')
  const approx  = new Date(wedding.getTime() - monthsBefore * 30.44 * 86_400_000)
  const y = approx.getFullYear()
  const m = String(approx.getMonth() + 1).padStart(2, '0')
  return { dueMonth: `${y}-${m}`, dueTiming: 'mid' }
}

function monthTimingToDueDate(dueMonth, dueTiming) {
  if (!dueMonth) return null
  const [y, m] = dueMonth.split('-').map(Number)
  if (dueTiming === 'early') return `${dueMonth}-01`
  if (dueTiming === 'mid')   return `${dueMonth}-15`
  const lastDay = new Date(y, m, 0).getDate()
  return `${dueMonth}-${String(lastDay).padStart(2, '0')}`
}

// ─── Urgency badge ─────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency, monthsBefore, weddingDate, dueDate }) {
  if (!urgency) return null
  const cfg = URGENCY[urgency]
  const due = formatDueMonth(monthsBefore, weddingDate, dueDate)
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.text, fontFamily: 'var(--font-body)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {due && urgency !== 'grey' ? `By ${due}` : cfg.label}
    </span>
  )
}

// ─── Alert dashboard ───────────────────────────────────────────────────────────

function AlertDashboard({ categories, weddingDate, onGoToTask }) {
  const [expanded, setExpanded] = useState(false)

  // Only items whose calculated due date falls in the current calendar month
  const thisMonthItems = useMemo(() => {
    const now      = new Date()
    const curMonth = now.getMonth()
    const curYear  = now.getFullYear()
    const wedding  = new Date(weddingDate + 'T00:00:00')

    const result = []
    categories.forEach(cat => {
      cat.items.forEach(item => {
        if (item.done) return
        const resolved = resolveDueDate(item.monthsBefore, weddingDate, item.dueDate)
        if (!resolved) return
        if (resolved.getMonth() === curMonth && resolved.getFullYear() === curYear) {
          const u = calcUrgency(item.monthsBefore, weddingDate, false, item.dueDate)
          result.push({ item, categoryId: cat.id, categoryLabel: cat.label, urgency: u })
        }
      })
    })
    // Red first, then amber, then the rest
    const order = { red: 0, amber: 1, green: 2, grey: 3 }
    return result.sort((a, b) => (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3))
  }, [categories, weddingDate])

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })
  const count     = thisMonthItems.length
  const hasItems  = count > 0

  return (
    <div className="mb-4">
      {/* ── Collapsed pill / header ── */}
      <button
        onClick={() => hasItems && setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
        style={{
          backgroundColor: hasItems ? '#F9E8ED' : '#E4EDEA',
          border:          `1px solid ${hasItems ? '#E8B4C3' : '#BDD6CC'}`,
          borderRadius:    expanded ? '16px 16px 0 0' : '16px',
          cursor:          hasItems ? 'pointer' : 'default',
        }}
      >
        {/* Icon */}
        {hasItems
          ? <AlertTriangle size={14} style={{ color: '#B4627A', flexShrink: 0 }} />
          : <Check size={13} style={{ color: '#5A7A6A', flexShrink: 0 }} />
        }

        {/* Label */}
        <span
          className="flex-1 text-sm font-medium"
          style={{ color: hasItems ? '#B4627A' : '#3B5E50', fontFamily: 'var(--font-body)' }}
        >
          {hasItems
            ? `${count} item${count !== 1 ? 's' : ''} need attention in ${monthName}`
            : `Nothing due in ${monthName} — you're on track 🎉`
          }
        </span>

        {/* Chevron — only when there are items */}
        {hasItems && (
          expanded
            ? <ChevronDown size={15} style={{ color: '#B4627A', flexShrink: 0 }} />
            : <ChevronRight size={15} style={{ color: '#B4627A', flexShrink: 0 }} />
        )}
      </button>

      {/* ── Expanded list ── */}
      {expanded && hasItems && (
        <div
          className="border border-t-0 rounded-b-2xl overflow-hidden"
          style={{ borderColor: '#E8B4C3' }}
        >
          {thisMonthItems.map(({ item, categoryId, categoryLabel, urgency }, idx) => {
            const cfg = URGENCY[urgency]
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-3"
                style={{
                  backgroundColor: idx % 2 === 0 ? '#fff' : '#FDFAF8',
                  borderTop:       '1px solid #F5EFE9',
                }}
              >
                {/* Priority dot */}
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: '#2C2825', fontFamily: 'var(--font-body)' }}
                  >
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
                      {categoryLabel}
                    </span>
                    {item.assignedTo && item.assignedTo !== 'Both' && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cfg.bg, color: cfg.text, fontFamily: 'var(--font-body)' }}
                      >
                        {item.assignedTo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Go to task */}
                <button
                  onClick={() => { setExpanded(false); onGoToTask(categoryId, item.id) }}
                  className="flex items-center gap-1.5 text-xs font-medium shrink-0 transition-opacity hover:opacity-70"
                  style={{ color: '#B4627A', fontFamily: 'var(--font-body)' }}
                >
                  Go to task
                  <ArrowRight size={11} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Reusable dropdown menu ────────────────────────────────────────────────────

function MenuDropdown({ triggerEl, items, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handle = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      {/* Trigger */}
      <div onClick={e => { e.stopPropagation(); setOpen(v => !v) }}>
        {triggerEl}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-40 rounded-xl py-1`}
          style={{
            minWidth:        '160px',
            backgroundColor: '#FDFAF8',
            border:          '1px solid #EDE8E3',
            boxShadow:       '0 4px 20px rgba(44,40,37,0.12)',
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setOpen(false); item.onClick() }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left"
              style={{
                color:           item.danger ? '#B91C1C' : '#2C2825',
                fontFamily:      'var(--font-body)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = item.danger ? '#FEE2E2' : '#F5EFE9' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {item.Icon && (
                <item.Icon
                  size={13}
                  style={{ color: item.danger ? '#B91C1C' : '#8C8480', flexShrink: 0 }}
                />
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Confirm delete category modal ────────────────────────────────────────────

function ConfirmDeleteCategoryModal({ category, onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(44,40,37,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4"
        style={{ backgroundColor: '#FDFAF8', fontFamily: 'var(--font-body)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: '#B91C1C', letterSpacing: '0.15em' }}
          >
            Delete Category
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-base font-medium mb-1.5" style={{ color: '#2C2825' }}>
          Delete "{category.label}"?
        </p>
        <p className="text-sm mb-5" style={{ color: '#8C8480', lineHeight: 1.6 }}>
          This will permanently remove the category and all{' '}
          <strong style={{ color: '#2C2825' }}>
            {category.items.length} task{category.items.length !== 1 ? 's' : ''}
          </strong>{' '}
          inside it. This cannot be undone.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="rounded-xl text-sm font-medium"
            style={{ flex: 2, padding: '10px 0', backgroundColor: '#B91C1C', color: '#fff' }}
          >
            Delete Category
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Rename category modal ────────────────────────────────────────────────────

function RenameCategoryModal({ category, onClose }) {
  const { renameCategory } = useWedding()
  const [name, setName] = useState(category.label)
  const canSave = name.trim().length > 0 && name.trim() !== category.label

  const handleSave = () => {
    if (!name.trim()) return
    renameCategory(category.id, name.trim())
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(44,40,37,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4"
        style={{ backgroundColor: '#FDFAF8', fontFamily: 'var(--font-body)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: '#B4627A', letterSpacing: '0.15em' }}
          >
            Rename Category
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
            Category name
          </label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') onClose()
            }}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{
              borderColor:     '#DDD5CC',
              backgroundColor: '#fff',
              color:           '#2C2825',
              fontFamily:      'var(--font-body)',
            }}
          />
        </div>

        <div className="flex gap-2">
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
            className="rounded-xl text-sm font-medium"
            style={{
              flex:            2,
              padding:         '10px 0',
              backgroundColor: canSave ? '#B4627A' : '#DDD5CC',
              color:           '#fff',
            }}
          >
            Save Name
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit task modal ───────────────────────────────────────────────────────────

function EditTaskModal({ item, categoryId, onClose }) {
  const { updateItem, weddingDate } = useWedding()
  const [title,      setTitle]      = useState(item.title)
  const [assignedTo, setAssignedTo] = useState(item.assignedTo ?? 'Both')

  // Initialise month + timing from existing dueDate or monthsBefore
  const [dueMonth, setDueMonth] = useState(() => {
    if (item.dueDate)            return dueDateToMonthTiming(item.dueDate).dueMonth
    if (item.monthsBefore != null) return monthsBeforeToMonthTiming(item.monthsBefore, weddingDate).dueMonth
    return ''
  })
  const [dueTiming, setDueTiming] = useState(() => {
    if (item.dueDate) return dueDateToMonthTiming(item.dueDate).dueTiming
    return 'mid'
  })

  const canSave = title.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    const newDueDate = monthTimingToDueDate(dueMonth, dueTiming)
    updateItem(categoryId, item.id, {
      title:        title.trim(),
      dueDate:      newDueDate,
      monthsBefore: null,   // clear legacy field
      assignedTo,
    })
    onClose()
  }

  const inputStyle = {
    borderColor:     '#DDD5CC',
    backgroundColor: '#fff',
    color:           '#2C2825',
    fontFamily:      'var(--font-body)',
  }

  // Human-readable preview of selected month+timing
  const timingLabel = { early: 'Early', mid: 'Mid', end: 'End' }
  const dueDatePreview = (() => {
    if (!dueMonth) return null
    const d = monthTimingToDueDate(dueMonth, dueTiming)
    if (!d) return null
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(44,40,37,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4"
        style={{ backgroundColor: '#FDFAF8', fontFamily: 'var(--font-body)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: '#B4627A', letterSpacing: '0.15em' }}
          >
            Edit Task
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>Task title</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* Due date — month picker + Early / Mid / End */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
            Due date <span style={{ fontWeight: 400 }}>(leave blank = flexible)</span>
          </label>
          <input
            type="month"
            value={dueMonth}
            onChange={e => setDueMonth(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
          {dueMonth && (
            <div className="flex gap-1.5 mt-2">
              {['early', 'mid', 'end'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDueTiming(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    border:          `1px solid ${dueTiming === t ? '#B4627A' : '#E5DDD8'}`,
                    backgroundColor: dueTiming === t ? '#F2E0E5' : '#fff',
                    color:           dueTiming === t ? '#B4627A' : '#8C8480',
                  }}
                >
                  {timingLabel[t]}
                </button>
              ))}
            </div>
          )}
          {dueDatePreview && (
            <p className="mt-1.5 text-xs" style={{ color: '#5A7A6A', fontFamily: 'var(--font-body)' }}>
              → {dueDatePreview}
            </p>
          )}
          {dueMonth && (
            <button
              type="button"
              onClick={() => setDueMonth('')}
              className="mt-1 text-xs"
              style={{ color: '#B4ABA5', fontFamily: 'var(--font-body)' }}
            >
              Clear date
            </button>
          )}
        </div>

        {/* Assign to */}
        <div className="mb-6">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>Assign to</label>
          <div className="flex gap-2">
            {['JungMin', 'Jin Won', 'Both'].map(name => {
              const active = assignedTo === name
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setAssignedTo(name)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    border:          `1px solid ${active ? '#B4627A' : '#E5DDD8'}`,
                    backgroundColor: active ? '#F2E0E5' : '#fff',
                    color:           active ? '#B4627A' : '#8C8480',
                  }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2">
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
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add category modal ────────────────────────────────────────────────────────

function AddCategoryModal({ onClose }) {
  const { addCategory } = useWedding()
  const [name,     setName]     = useState('')
  const [color,    setColor]    = useState('rose')
  const [iconName, setIconName] = useState('Star')

  const canSave = name.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    addCategory({
      id:    `cat-${Date.now()}`,
      label: name.trim(),
      color,
      icon:  iconName,
      items: [],
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(44,40,37,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4"
        style={{ backgroundColor: '#FDFAF8', fontFamily: 'var(--font-body)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <p
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: '#B4627A', letterSpacing: '0.15em' }}
          >
            Add Category
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>Category name *</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            placeholder="e.g. Invitations, Transportation…"
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{
              borderColor:     '#DDD5CC',
              backgroundColor: '#fff',
              color:           '#2C2825',
              fontFamily:      'var(--font-body)',
            }}
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium mb-2" style={{ color: '#8C8480' }}>Color</label>
          <div className="flex gap-3">
            {[
              { value: 'rose', label: 'Rose', dot: '#B4627A', bg: '#F2E0E5' },
              { value: 'sage', label: 'Sage', dot: '#5A7A6A', bg: '#E4EDEA' },
            ].map(opt => {
              const active = color === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium flex-1"
                  style={{
                    border:          `1px solid ${active ? opt.dot : '#E5DDD8'}`,
                    backgroundColor: active ? opt.bg : '#fff',
                    color:           active ? opt.dot : '#8C8480',
                  }}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.dot }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-medium mb-2" style={{ color: '#8C8480' }}>Icon</label>
          <div className="grid grid-cols-6 gap-2">
            {NEW_CAT_ICONS.map(({ name: n, Icon }) => {
              const active = iconName === n
              const dot = color === 'rose' ? '#B4627A' : '#5A7A6A'
              const bg  = color === 'rose' ? '#F2E0E5' : '#E4EDEA'
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setIconName(n)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: active ? bg : '#F5EFE9',
                    border:          active ? `1.5px solid ${dot}` : '1.5px solid transparent',
                  }}
                >
                  <Icon size={15} style={{ color: active ? dot : '#8C8480' }} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2">
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
            className="rounded-xl text-sm font-medium"
            style={{
              flex:            2,
              padding:         '10px 0',
              backgroundColor: canSave ? '#B4627A' : '#DDD5CC',
              color:           '#fff',
            }}
          >
            Add Category
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add task inline ───────────────────────────────────────────────────────────

const DEADLINE_OPTIONS = [
  { value: 'flexible', label: 'Flexible',  monthsBefore: null },
  { value: '6months',  label: '6 months',  monthsBefore: 6    },
  { value: '3months',  label: '3 months',  monthsBefore: 3    },
  { value: '1month',   label: '1 month',   monthsBefore: 1    },
]

function AddTaskInline({ categoryId }) {
  const { addItem } = useWedding()
  const [active,     setActive]     = useState(false)
  const [title,      setTitle]      = useState('')
  const [deadline,   setDeadline]   = useState('flexible')
  const [assignedTo, setAssignedTo] = useState('Both')

  const reset = () => {
    setTitle(''); setDeadline('flexible'); setAssignedTo('Both'); setActive(false)
  }

  const handleAdd = () => {
    if (!title.trim()) return
    const opt = DEADLINE_OPTIONS.find(o => o.value === deadline)
    addItem(categoryId, {
      id:           `task-${Date.now()}`,
      title:        title.trim(),
      monthsBefore: opt?.monthsBefore ?? null,
      assignedTo,
      done:         false,
      subQuestions: [],
    })
    reset()
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="mt-2.5 flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
        style={{ color: '#B4627A', fontFamily: 'var(--font-body)' }}
      >
        <Plus size={12} />
        Add task
      </button>
    )
  }

  return (
    <div
      className="mt-3 p-3 rounded-xl border"
      style={{ backgroundColor: '#FDFAF8', borderColor: '#EDE8E3' }}
    >
      {/* Task title */}
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') reset() }}
        placeholder="Task name…"
        className="w-full text-sm outline-none pb-2 mb-3"
        style={{
          fontFamily:   'var(--font-body)',
          color:        '#2C2825',
          background:   'transparent',
          borderBottom: '1px solid #EDE8E3',
        }}
      />

      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Deadline */}
        <select
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="text-xs rounded-lg border px-2 py-1.5 outline-none"
          style={{
            fontFamily:      'var(--font-body)',
            borderColor:     '#DDD5CC',
            color:           '#2C2825',
            backgroundColor: '#fff',
          }}
        >
          {DEADLINE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Assign to */}
        {['JungMin', 'Jin Won', 'Both'].map(name => (
          <button
            key={name}
            type="button"
            onClick={() => setAssignedTo(name)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
            style={{
              backgroundColor: assignedTo === name ? '#F2E0E5' : '#F5EFE9',
              color:           assignedTo === name ? '#B4627A' : '#8C8480',
              border:          assignedTo === name ? '1px solid #DEB8C5' : '1px solid transparent',
              fontFamily:      'var(--font-body)',
            }}
          >
            {name}
          </button>
        ))}

        {/* Actions */}
        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480', fontFamily: 'var(--font-body)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: title.trim() ? '#B4627A' : '#DDD5CC',
              color:           '#fff',
              fontFamily:      'var(--font-body)',
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-question row ──────────────────────────────────────────────────────────

function SubQuestion({ text, onDiscuss, note }) {
  return (
    <div
      className="flex flex-col gap-1 py-2 pl-4"
      style={{ borderLeft: `2px solid ${note ? '#86EFAC' : '#F2E0E5'}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed" style={{ color: '#6B6260', fontFamily: 'var(--font-body)' }}>
          {text}
        </p>
        <button
          onClick={onDiscuss}
          className="flex items-center gap-1 text-xs font-medium shrink-0 transition-opacity duration-150 hover:opacity-70"
          style={{ color: '#B4627A', fontFamily: 'var(--font-body)' }}
        >
          Discuss with AI
          <ArrowRight size={11} />
        </button>
      </div>
      {note && (
        <p className="text-xs" style={{ color: '#5A7A6A', fontFamily: 'var(--font-body)' }}>
          ✓ {note}
        </p>
      )}
    </div>
  )
}

// ─── Checklist item ────────────────────────────────────────────────────────────

const HIGHLIGHT_DURATION = 5000

function ChecklistItem({ item, categoryId, weddingDate, onEdit, highlighted }) {
  const [expanded, setExpanded] = useState(false)
  const [, rerender] = useReducer(x => x + 1, 0)
  const { toggleItem, deleteItem, discussWithAI } = useWedding()

  const urgency = calcUrgency(item.monthsBefore, weddingDate, item.done, item.dueDate)

  const isRecent = !!(
    item.itemNote?.updatedAt &&
    Date.now() - item.itemNote.updatedAt < HIGHLIGHT_DURATION
  )

  useEffect(() => {
    if (!item.itemNote?.updatedAt) return
    const remaining = HIGHLIGHT_DURATION - (Date.now() - item.itemNote.updatedAt)
    if (remaining <= 0) return
    const t = setTimeout(rerender, remaining)
    return () => clearTimeout(t)
  }, [item.itemNote?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div id={`item-row-${item.id}`} className={isRecent ? 'mention-highlight' : ''}>
      {/* Main row */}
      <div
        className="flex items-center gap-3 py-2.5 px-1 rounded-lg transition-colors duration-300"
        style={{
          backgroundColor: highlighted
            ? '#FEF3C7'
            : isRecent ? undefined
            : expanded ? '#FDFAF8'
            : 'transparent',
        }}
      >
        {/* Checkbox */}
        <button
          onClick={() => toggleItem(categoryId, item.id)}
          className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200"
          style={{
            borderColor:     item.done ? '#5A7A6A' : '#C4BBAF',
            backgroundColor: item.done ? '#5A7A6A' : 'transparent',
          }}
          aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.done && <Check size={11} color="#fff" strokeWidth={3} />}
        </button>

        {/* Title + assigned chip */}
        <span
          className="flex-1 text-sm"
          style={{
            fontFamily:     'var(--font-body)',
            color:          item.done ? '#B4ABA5' : '#2C2825',
            textDecoration: item.done ? 'line-through' : 'none',
          }}
        >
          {item.title}
          {item.assignedTo && item.assignedTo !== 'Both' && (
            <span
              className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#F5EFE9', color: '#8C8480', fontFamily: 'var(--font-body)' }}
            >
              {item.assignedTo}
            </span>
          )}
        </span>

        {/* Recent AI note */}
        {isRecent && !expanded && item.itemNote?.note && (
          <span className="text-xs shrink-0" style={{ color: '#5A7A6A', fontFamily: 'var(--font-body)' }}>
            ✓ {item.itemNote.note}
          </span>
        )}

        {/* Urgency badge */}
        {!item.done && !isRecent && (
          <UrgencyBadge urgency={urgency} monthsBefore={item.monthsBefore} weddingDate={weddingDate} dueDate={item.dueDate} />
        )}

        {/* "..." menu */}
        <MenuDropdown
          triggerEl={
            <button
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#F5EFE9', color: '#B4ABA5' }}
              title="Task options"
            >
              <MoreHorizontal size={12} />
            </button>
          }
          items={[
            { label: 'Edit task',   Icon: Pencil, onClick: () => onEdit(item)               },
            { label: 'Delete task', Icon: Trash2, danger: true, onClick: () => deleteItem(categoryId, item.id) },
          ]}
        />

        {/* Expand sub-questions */}
        {item.subQuestions?.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ color: '#B4ABA5' }}
            aria-label="Toggle sub-questions"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {/* Sub-questions */}
      {expanded && (
        <div className="ml-8 mb-2 space-y-1">
          {item.subQuestions.map((q, i) => (
            <SubQuestion
              key={i}
              text={q}
              note={item.subQNotes?.[i]?.note}
              onDiscuss={() => discussWithAI(q)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Category card ─────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  weddingDate,
  onEditItem,
  highlightedItemId,
  scrollToItemId,
  onScrollDone,
  suggestions,
}) {
  const [open,              setOpen]              = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRename,        setShowRename]        = useState(false)
  const { deleteCategory, acceptChecklistSuggestion, dismissChecklistSuggestion } = useWedding()

  const total = category.items.length
  const done  = category.items.filter(i => i.done).length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  const isRose    = category.color === 'rose'
  const iconBg    = isRose ? '#F2E0E5' : '#E4EDEA'
  const iconColor = isRose ? '#B4627A' : '#5A7A6A'
  const barColor  = isRose ? '#B4627A' : '#5A7A6A'
  const Icon      = ICONS[category.icon] ?? MapPin

  // Force open + scroll when navigated to from the alert dashboard
  useEffect(() => {
    if (!scrollToItemId) return
    setOpen(true)
    const t = setTimeout(() => {
      document.getElementById(`item-row-${scrollToItemId}`)?.scrollIntoView({
        behavior: 'smooth',
        block:    'center',
      })
      onScrollDone?.()
    }, 150)
    return () => clearTimeout(t)
  }, [scrollToItemId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div
        className="rounded-2xl border"
        style={{ borderColor: '#EDE8E3', backgroundColor: '#fff' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors duration-150"
          style={{
            backgroundColor: open ? '#FDFAF8' : '#fff',
            borderRadius:    open ? '16px 16px 0 0' : '16px',
          }}
          onClick={() => setOpen(v => !v)}
        >
          {/* Category icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <Icon size={15} style={{ color: iconColor }} />
          </div>

          {/* Label */}
          <span
            className="flex-1 font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: '#2C2825', fontSize: '17px', letterSpacing: '0.01em' }}
          >
            {category.label}
          </span>

          {/* Progress */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
              {done}/{total}
            </span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EBE6' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#5A7A6A' : barColor }}
              />
            </div>
            {open
              ? <ChevronDown size={15} style={{ color: '#B4ABA5' }} />
              : <ChevronRight size={15} style={{ color: '#B4ABA5' }} />
            }
          </div>

          {/* "..." menu */}
          <MenuDropdown
            triggerEl={
              <button
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
                title="Category options"
              >
                <MoreHorizontal size={14} />
              </button>
            }
            items={[
              { label: 'Rename',          Icon: Pencil, onClick: () => setShowRename(true)        },
              { label: 'Delete category', Icon: Trash2, danger: true, onClick: () => setShowDeleteConfirm(true) },
            ]}
          />
        </div>

        {/* ── Items ── */}
        {open && (
          <div className="px-5 pb-4 border-t" style={{ borderColor: '#F5EFE9' }}>
            <div className="pt-2 space-y-0.5">
              {category.items.map(item => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  categoryId={category.id}
                  weddingDate={weddingDate}
                  onEdit={onEditItem}
                  highlighted={highlightedItemId === item.id}
                />
              ))}
            </div>

            {/* ── AI-suggested items ── */}
            {suggestions?.length > 0 && (
              <div className="mt-3 space-y-2">
                {suggestions.map(s => (
                  <div
                    key={s.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: '#FEFCE8', border: '1px solid #FEF08A' }}
                  >
                    <Sparkles size={12} style={{ color: '#CA8A04', flexShrink: 0, marginTop: '2px' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#713F12', fontFamily: 'var(--font-body)' }}>
                        {s.title}
                      </p>
                      {s.reason && (
                        <p className="text-xs mt-0.5" style={{ color: '#92400E', fontFamily: 'var(--font-body)', opacity: 0.8 }}>
                          {s.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => acceptChecklistSuggestion(s.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontFamily: 'var(--font-body)' }}
                        title="Add this task"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => dismissChecklistSuggestion(s.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
                        title="Dismiss"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <AddTaskInline categoryId={category.id} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showDeleteConfirm && (
        <ConfirmDeleteCategoryModal
          category={category}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => deleteCategory(category.id)}
        />
      )}
      {showRename && (
        <RenameCategoryModal
          category={category}
          onClose={() => setShowRename(false)}
        />
      )}
    </>
  )
}

// ─── Sync logic ────────────────────────────────────────────────────────────────

async function runSync({ messages, categories, markItemsDone, setSyncState }) {
  if (messages.length <= 1) {
    setSyncState({ status: 'idle', note: 'Start a conversation in AI Coach first.' })
    setTimeout(() => setSyncState({ status: 'idle', note: null }), 3000)
    return
  }

  setSyncState({ status: 'loading', note: null })

  const undoneItems = categories.flatMap(cat =>
    cat.items.filter(i => !i.done).map(i => ({ id: i.id, title: i.title, category: cat.label }))
  )

  const transcript = messages
    .filter(m => !m.isError)
    .map(m => `${m.sender ?? 'AI Coach'}: ${m.content}`)
    .join('\n\n')

  const prompt = `Analyze this wedding planning conversation and identify which checklist tasks have been completed, confirmed, or clearly decided upon.

Checklist items to check (format: id | title | category):
${undoneItems.map(i => `${i.id} | ${i.title} | ${i.category}`).join('\n')}

Only mark an item as completed if the conversation contains clear evidence — phrases like "we've booked", "we chose", "we decided", "confirmed", "done", "we're going with", etc.

Return ONLY a valid JSON object with no markdown or explanation:
{"completedIds": ["id1", "id2"]}

If nothing is clearly completed, return: {"completedIds": []}

Wedding planning conversation:
---
${transcript}
---`

  try {
    const client = getClient()
    const response = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 512,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw   = response.content[0]?.text ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')

    const { completedIds } = JSON.parse(match[0])
    const count = completedIds?.length ?? 0
    markItemsDone(completedIds ?? [])

    setSyncState({
      status: 'success',
      note:   count > 0
        ? `✓ ${count} item${count !== 1 ? 's' : ''} updated from your conversation`
        : '✓ No new completions found in the conversation',
    })
  } catch (err) {
    console.error('Sync error:', err)
    setSyncState({ status: 'error', note: 'Sync failed. Check your API key and try again.' })
  }

  setTimeout(() => setSyncState({ status: 'idle', note: null }), 4000)
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function WeddingChecklist() {
  const {
    weddingDate, setWeddingDate,
    categories, messages, markItemsDone,
    checklistSuggestions,
  } = useWedding()

  const [syncState,       setSyncState]       = useState({ status: 'idle', note: null })
  const [editingItem,     setEditingItem]     = useState(null)   // { item, categoryId }
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [scrollTarget,    setScrollTarget]    = useState(null)   // { catId, itemId }
  const [highlightedId,   setHighlightedId]   = useState(null)

  const totalItems = useMemo(() => categories.reduce((s, c) => s + c.items.length, 0), [categories])
  const doneItems  = useMemo(() => categories.reduce((s, c) => s + c.items.filter(i => i.done).length, 0), [categories])
  const overallPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  const isSyncing = syncState.status === 'loading'

  function goToTask(catId, itemId) {
    setScrollTarget({ catId, itemId })
    setHighlightedId(itemId)
    setTimeout(() => setHighlightedId(null), 3000)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b px-5 py-3"
        style={{ borderColor: '#EDE8E3', backgroundColor: '#FDFAF8' }}
      >
        <div className="flex items-center justify-between gap-3">

          {/* Left: title + progress */}
          <div className="flex items-center gap-2.5 min-w-0">
            <h2
              style={{
                fontFamily:  'var(--font-heading)',
                color:       '#2C2825',
                fontSize:    '19px',
                fontWeight:  300,
                fontStyle:   'italic',
                whiteSpace:  'nowrap',
                lineHeight:  1,
              }}
            >
              Wedding Checklist
            </h2>
            <span
              className="text-xs shrink-0"
              style={{ color: '#B4ABA5', fontFamily: 'var(--font-body)' }}
            >
              {doneItems}/{totalItems}
            </span>
            {/* Inline progress bar */}
            <div
              className="w-14 h-1 rounded-full overflow-hidden shrink-0"
              style={{ backgroundColor: '#F0EBE6' }}
            >
              <div
                style={{
                  width:           `${overallPct}%`,
                  height:          '100%',
                  backgroundColor: overallPct === 100 ? '#5A7A6A' : '#B4627A',
                  borderRadius:    '9999px',
                  transition:      'width 0.5s',
                }}
              />
            </div>
          </div>

          {/* Right: add category · sync */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Add Category */}
            <button
              onClick={() => setShowAddCategory(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                fontFamily:      'var(--font-body)',
                backgroundColor: '#F5EFE9',
                color:           '#8C8480',
                border:          '1px solid #E5DDD8',
              }}
            >
              <Plus size={12} />
              Add Category
            </button>

            {/* Sync from AI */}
            <button
              onClick={() => runSync({ messages, categories, markItemsDone, setSyncState })}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                fontFamily:      'var(--font-body)',
                backgroundColor: isSyncing ? '#F5EFE9' : '#F2E0E5',
                color:           isSyncing ? '#B4ABA5' : '#B4627A',
                border:          '1px solid',
                borderColor:     isSyncing ? '#DDD5CC' : '#DEB8C5',
                cursor:          isSyncing ? 'default' : 'pointer',
              }}
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing…' : 'Sync from AI'}
            </button>
          </div>
        </div>

        {/* Sync feedback */}
        {syncState.note && (
          <p
            className="mt-1.5 text-xs"
            style={{
              fontFamily: 'var(--font-body)',
              color:      syncState.status === 'error' ? '#B91C1C' : '#5A7A6A',
            }}
          >
            {syncState.note}
          </p>
        )}
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-5">

        {/* Alert dashboard — only shown when wedding date is set */}
        {weddingDate && (
          <AlertDashboard
            categories={categories}
            weddingDate={weddingDate}
            onGoToTask={goToTask}
          />
        )}

        {/* No-date nudge */}
        {!weddingDate && (
          <div
            className="mb-4 px-4 py-3 rounded-xl flex items-center gap-2.5"
            style={{ backgroundColor: '#FEF9F0', border: '1px solid #F5E4C0' }}
          >
            <CalendarDays size={13} style={{ color: '#B45309', flexShrink: 0 }} />
            <p className="text-xs" style={{ color: '#92400E', fontFamily: 'var(--font-body)' }}>
              <span className="font-medium">Set your wedding date in the toolbar</span> to see urgency timelines and this month's attention dashboard.
            </p>
          </div>
        )}

        {/* Category list */}
        <div className="space-y-3">
          {categories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              weddingDate={weddingDate}
              onEditItem={item => setEditingItem({ item, categoryId: cat.id })}
              highlightedItemId={highlightedId}
              scrollToItemId={scrollTarget?.catId === cat.id ? scrollTarget.itemId : null}
              onScrollDone={() => setScrollTarget(null)}
              suggestions={checklistSuggestions.filter(s => s.categoryId === cat.id)}
            />
          ))}
        </div>

        {/* Add category button */}
        <button
          onClick={() => setShowAddCategory(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed text-sm font-medium transition-colors hover:border-solid"
          style={{
            borderColor:     '#DDD5CC',
            color:           '#8C8480',
            backgroundColor: 'transparent',
            fontFamily:      'var(--font-body)',
          }}
        >
          <Plus size={15} />
          Add Category
        </button>

        {/* Bottom breathing room */}
        <div className="h-4" />
      </div>

      {/* ── Edit task modal ──────────────────────────────────────────────────── */}
      {editingItem && (
        <EditTaskModal
          item={editingItem.item}
          categoryId={editingItem.categoryId}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* ── Add category modal ───────────────────────────────────────────────── */}
      {showAddCategory && (
        <AddCategoryModal onClose={() => setShowAddCategory(false)} />
      )}
    </div>
  )
}
