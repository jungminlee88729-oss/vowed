import { useState, useMemo } from 'react'
import { Plus, Pencil, X, Sparkles, PiggyBank, TrendingUp, CreditCard, RefreshCw, AlertCircle } from 'lucide-react'
import { useWedding } from '../context/WeddingContext'

// ─── Constants ─────────────────────────────────────────────────────────────────

// Built dynamically inside the component from brideName / groomName context
function buildPersonIcon(brideName, groomName) {
  const b = brideName || 'Bride'
  const g = groomName || 'Groom'
  return { [b]: '👰', [g]: '🤵', Both: '👰🤵', JungMin: '👰', 'Jin Won': '🤵' }
}

const STATUS_CFG = {
  paid:          { label: 'Completed ✓',      color: '#166534', bg: '#DCFCE7' },
  deposit:       { label: 'Deposit paid',     color: '#92400E', bg: '#FEF3C7' },
  'due-soon':    { label: 'Payment due soon', color: '#991B1B', bg: '#FEE2E2' },
  'not-started': { label: 'Not started',      color: '#6B7280', bg: '#F3F4F6' },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getStatus({ totalCost, depositPaid, dueDate }) {
  const tc      = totalCost  || 0
  const dp      = depositPaid || 0
  const balance = Math.max(0, tc - dp)

  if (balance === 0 && (tc > 0 || dp > 0)) return 'paid'

  if (balance === 0 && dueDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due   = new Date(dueDate + 'T00:00:00')
    if (due <= today) return 'paid'
  }

  if (dp > 0) return 'deposit'
  if (dueDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due   = new Date(dueDate + 'T00:00:00')
    if (Math.round((due - today) / 86_400_000) <= 14) return 'due-soon'
  }
  return 'not-started'
}

function fmt(n) {
  if (n == null || n === '') return '—'
  const abs = Math.abs(n)
  const str = '$' + abs.toLocaleString('en-US')
  return n < 0 ? `−${str}` : str
}

function shortDate(str) {
  if (!str) return '—'
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Due Soon Banner ───────────────────────────────────────────────────────────

function DueSoonBanner({ vendors }) {
  const dueSoon = vendors.filter(v => getStatus(v) === 'due-soon')
  if (dueSoon.length === 0) return null
  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5 rounded-2xl mb-5"
      style={{ backgroundColor: '#FFF1F1', border: '1px solid #FECACA' }}
    >
      <AlertCircle size={15} style={{ color: '#991B1B', flexShrink: 0, marginTop: '1px' }} />
      <div>
        <p className="text-sm font-medium" style={{ color: '#991B1B', fontFamily: 'var(--font-body)' }}>
          {dueSoon.length} payment{dueSoon.length !== 1 ? 's' : ''} due within 14 days
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#B91C1C', fontFamily: 'var(--font-body)', opacity: 0.8 }}>
          {dueSoon.map(v => v.name).join(' · ')}
        </p>
      </div>
    </div>
  )
}

// ─── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, iconColor, iconBg, label, value, isEditable, onSaveEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')

  const startEdit = () => {
    if (!isEditable) return
    setDraft(String(value))
    setEditing(true)
  }

  const commitEdit = () => {
    const n = parseFloat(String(draft).replace(/[^0-9.]/g, ''))
    if (!isNaN(n) && n >= 0) onSaveEdit(n)
    setEditing(false)
  }

  return (
    <div
      className="flex-1 rounded-2xl p-5 border flex flex-col gap-3"
      style={{ backgroundColor: '#fff', borderColor: '#EDE8E3', minWidth: '180px' }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={17} style={{ color: iconColor }} />
        </div>
        {isEditable && (
          <button
            onClick={startEdit}
            className="p-1.5 rounded-lg"
            style={{ color: '#C4BBAF' }}
            title="Edit budget"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>

      <div>
        <p className="text-xs mb-1" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
          {label}
        </p>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter')  commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="text-2xl w-full outline-none border-b-2"
            style={{
              fontFamily:  'var(--font-heading)',
              color:       '#2C2825',
              borderColor: '#B4627A',
              background:  'transparent',
              fontWeight:  300,
            }}
          />
        ) : (
          <p
            className="text-2xl"
            style={{
              fontFamily: 'var(--font-heading)',
              color:      '#2C2825',
              fontWeight: 300,
              cursor:     isEditable ? 'pointer' : 'default',
            }}
            onClick={startEdit}
          >
            {fmt(value)}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ vendor }) {
  const cfg = STATUS_CFG[getStatus(vendor)]
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.color, fontFamily: 'var(--font-body)' }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Vendor Modal ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', totalCost: '', depositPaid: '', dueDate: '', assignedTo: 'Both',
}

function VendorModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const set     = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const canSave = form.name.trim().length > 0 && String(form.totalCost).trim() !== ''

  const handleSave = () => {
    if (!canSave) return
    onSave({
      name:        form.name.trim(),
      totalCost:   parseFloat(String(form.totalCost).replace(/[^0-9.]/g, '')) || 0,
      depositPaid: parseFloat(String(form.depositPaid).replace(/[^0-9.]/g, '')) || 0,
      dueDate:     form.dueDate,
      assignedTo:  form.assignedTo,
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
        className="w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4"
        style={{ backgroundColor: '#FDFAF8', fontFamily: 'var(--font-body)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: '#B4627A', letterSpacing: '0.15em' }}
            >
              {initial ? 'Edit Vendor' : 'Add Vendor'}
            </p>
            <h3
              className="text-xl font-light italic"
              style={{ fontFamily: 'var(--font-heading)', color: '#2C2825' }}
            >
              Payment details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">

          {/* Vendor name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
              Vendor name *
            </label>
            <input
              autoFocus
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="e.g. Blue Hour Studio"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {/* Total cost + deposit paid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
                Total cost ($) *
              </label>
              <input
                type="number"
                min="0"
                value={form.totalCost}
                onChange={e => set('totalCost', e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
                Deposit paid ($)
              </label>
              <input
                type="number"
                min="0"
                value={form.depositPaid}
                onChange={e => set('depositPaid', e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Due date + who paid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
                Next payment due
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8C8480' }}>
                Who Paid
              </label>
              <div className="flex gap-1.5 h-[42px] items-center">
                {[
                  { name: bride, icon: '👰' },
                  { name: groom, icon: '🤵' },
                  { name: 'Both', icon: '👰🤵' },
                ].map(({ name, icon }) => {
                  const active = form.assignedTo === name
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => set('assignedTo', name)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        border:          `1px solid ${active ? '#B4627A' : '#E5DDD8'}`,
                        backgroundColor: active ? '#F2E0E5' : '#fff',
                        color:           active ? '#B4627A' : '#8C8480',
                      }}
                    >
                      {icon} {name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ backgroundColor: '#F5EFE9', color: '#8C8480', fontFamily: 'var(--font-body)' }}
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
              fontFamily:      'var(--font-body)',
            }}
          >
            {initial ? 'Save Changes' : 'Add Vendor'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Vendor Row ────────────────────────────────────────────────────────────────

function VendorRow({
  vendor, onEdit, onRemove,
  isDragging, isDragOver,
  onHandleDragStart, onRowDragOver, onRowDrop, onRowDragEnd,
}) {
  const [hovered, setHovered] = useState(false)
  const balance = Math.max(0, vendor.totalCost - vendor.depositPaid)

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={onRowDragOver}
      onDrop={onRowDrop}
      onDragEnd={onRowDragEnd}
      style={{
        backgroundColor: isDragOver ? '#FEF0F3' : hovered ? '#FDF7F5' : '#fff',
        opacity:         isDragging ? 0.4 : 1,
        transition:      'background-color 0.1s, opacity 0.1s',
        borderBottom:    '1px solid #F5EFE9',
        boxShadow:       isDragOver ? 'inset 0 2px 0 #DEB8C5' : 'none',
      }}
    >
      {/* ── Drag handle ── */}
      <td style={{ padding: '0 8px', textAlign: 'center', verticalAlign: 'middle', width: '40px' }}>
        <span
          draggable
          onDragStart={onHandleDragStart}
          style={{
            display:       'inline-block',
            color:         hovered ? '#B4ABA5' : 'transparent',
            cursor:        'grab',
            userSelect:    'none',
            fontSize:      '13px',
            letterSpacing: '1px',
            lineHeight:    1,
            transition:    'color 0.12s',
          }}
          title="Drag to reorder"
        >
          ⋮⋮
        </span>
      </td>

      {/* ── Vendor name + hover actions ── */}
      <td style={{ padding: '14px 16px', overflow: 'hidden' }}>
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <span
              className="text-sm font-medium"
              style={{
                color:        '#2C2825',
                fontFamily:   'var(--font-body)',
                whiteSpace:   'nowrap',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                display:      'block',
              }}
            >
              {vendor.name}
            </span>
            {vendor.aiUpdated && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium w-fit whitespace-nowrap"
                style={{ backgroundColor: '#EDE9FE', color: '#6D45B0', fontFamily: 'var(--font-body)' }}
              >
                <Sparkles size={8} />
                Updated from AI
              </span>
            )}
          </div>

          {/* Edit / delete — visible on hover, no layout shift */}
          <div
            className="flex items-center gap-1 ml-auto shrink-0"
            style={{
              opacity:       hovered ? 1 : 0,
              pointerEvents: hovered ? 'auto' : 'none',
              transition:    'opacity 0.12s',
            }}
          >
            <button
              onClick={() => onEdit(vendor)}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#F5EFE9', color: '#8C8480' }}
              title="Edit vendor"
            >
              <Pencil size={10} />
            </button>
            <button
              onClick={() => onRemove(vendor.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
              title="Remove vendor"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      </td>

      {/* ── Total cost ── */}
      <td
        className="text-sm text-right whitespace-nowrap"
        style={{ padding: '14px 16px', color: '#2C2825', fontFamily: 'var(--font-body)' }}
      >
        {fmt(vendor.totalCost)}
      </td>

      {/* ── Deposit paid ── */}
      <td
        className="text-sm text-right whitespace-nowrap"
        style={{
          padding:    '14px 16px',
          fontFamily: 'var(--font-body)',
          color:      vendor.depositPaid > 0 ? '#166534' : '#B4ABA5',
          fontWeight: vendor.depositPaid > 0 ? 500 : 400,
        }}
      >
        {vendor.depositPaid > 0 ? fmt(vendor.depositPaid) : '—'}
      </td>

      {/* ── Balance ── */}
      <td
        className="text-sm text-right whitespace-nowrap"
        style={{
          padding:    '14px 16px',
          fontFamily: 'var(--font-body)',
          color:      balance > 0 ? '#C47A1A' : '#166534',
          fontWeight: 500,
        }}
      >
        {balance > 0 ? fmt(balance) : '—'}
      </td>

      {/* ── Who Paid ── */}
      <td className="whitespace-nowrap" style={{ padding: '14px 16px' }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: '14px', lineHeight: 1 }}>
            {PERSON_ICON[vendor.assignedTo] ?? '👰🤵'}
          </span>
          <span className="text-xs" style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}>
            {vendor.assignedTo || 'Both'}
          </span>
        </div>
      </td>

      {/* ── Due Date ── */}
      <td
        className="text-sm whitespace-nowrap"
        style={{ padding: '14px 16px', color: '#6B7280', fontFamily: 'var(--font-body)' }}
      >
        {shortDate(vendor.dueDate)}
      </td>

      {/* ── Status ── */}
      <td className="whitespace-nowrap" style={{ padding: '14px 16px' }}>
        <StatusBadge vendor={vendor} />
      </td>
    </tr>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function FinanceTracker() {
  const {
    budget, setBudget,
    vendors, addVendor, updateVendor, removeVendor, reorderVendors,
    messages, extractAndUpdate,
    brideName, groomName,
  } = useWedding()

  const PERSON_ICON = buildPersonIcon(brideName, groomName)
  const bride = brideName || 'Bride'
  const groom = groomName || 'Groom'

  const [showModal,  setShowModal]  = useState(false)
  const [editVendor, setEditVendor] = useState(null)
  const [syncing,    setSyncing]    = useState(false)
  const [syncMsg,    setSyncMsg]    = useState(null)

  // ── Drag state ────────────────────────────────────────────────────────────────
  const [dragSrc,  setDragSrc]  = useState(null)  // index of the row being dragged
  const [dragOver, setDragOver] = useState(null)  // index of the current drop target

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
      setSyncMsg('✓ Finance updated from your conversation')
    } catch {
      setSyncMsg('Sync failed — check your API key')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 4000)
  }

  const totalPaid    = useMemo(() => vendors.reduce((s, v) => s + (v.depositPaid || 0), 0), [vendors])
  const totalCostAll = useMemo(() => vendors.reduce((s, v) => s + (v.totalCost   || 0), 0), [vendors])
  const totalBalance = useMemo(() => vendors.reduce((s, v) => s + Math.max(0, v.totalCost - v.depositPaid), 0), [vendors])
  const totalOwed    = budget - totalPaid

  const handleAdd = (data) => {
    addVendor({ id: `v-${Date.now()}`, fromAI: false, aiUpdated: false, ...data })
    setShowModal(false)
  }

  const handleEditSave = (data) => {
    updateVendor(editVendor.id, { ...data, aiUpdated: false })
    setEditVendor(null)
  }

  const TH = { color: '#8C8480', fontFamily: 'var(--font-body)' }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Sub-header ──────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-end gap-3 px-8 py-4 border-b"
        style={{ borderColor: '#EDE8E3', backgroundColor: '#FDFAF8' }}
      >
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
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ backgroundColor: '#B4627A', color: '#fff', fontFamily: 'var(--font-body)' }}
        >
          <Plus size={14} />
          Add Vendor
        </button>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <SummaryCard
            icon={PiggyBank}
            iconColor="#B4627A"
            iconBg="#F2E0E5"
            label="Total Budget"
            value={budget}
            isEditable
            onSaveEdit={setBudget}
          />
          <SummaryCard
            icon={TrendingUp}
            iconColor="#166534"
            iconBg="#DCFCE7"
            label="Total Paid"
            value={totalPaid}
          />
          <SummaryCard
            icon={CreditCard}
            iconColor={totalOwed >= 0 ? '#92400E' : '#991B1B'}
            iconBg={totalOwed >= 0    ? '#FEF0D6' : '#FEE2E2'}
            label={totalOwed >= 0     ? 'Still Owed' : 'Over Budget'}
            value={Math.abs(totalOwed)}
          />
        </div>

        {/* ── Due Soon Banner ───────────────────────────────────────────────── */}
        <DueSoonBanner vendors={vendors} />

        {/* ── Vendor table ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#EDE8E3' }}>
          <div className="overflow-x-auto">
            <table
              className="w-full"
              style={{ tableLayout: 'fixed', minWidth: '920px' }}
            >
              {/*
                Column widths:
                  col 1 — drag handle  40px (fixed)
                  col 2 — vendor name  22%
                  col 3 — total cost   12%
                  col 4 — deposit paid 12%
                  col 5 — balance      12%
                  col 6 — who paid     15%
                  col 7 — due date     14%
                  col 8 — status       13%
              */}
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '22%'  }} />
                <col style={{ width: '12%'  }} />
                <col style={{ width: '12%'  }} />
                <col style={{ width: '12%'  }} />
                <col style={{ width: '15%'  }} />
                <col style={{ width: '14%'  }} />
                <col style={{ width: '13%'  }} />
              </colgroup>

              {/* Header */}
              <thead>
                <tr style={{ backgroundColor: '#FDFAF8', borderBottom: '1px solid #EDE8E3' }}>
                  <th style={{ width: '40px' }} />  {/* drag handle — no label */}
                  <th className="px-4 py-3 text-xs font-medium text-left"  style={TH}>Vendor</th>
                  <th className="px-4 py-3 text-xs font-medium text-right" style={TH}>Total Cost</th>
                  <th className="px-4 py-3 text-xs font-medium text-right" style={TH}>Deposit Paid</th>
                  <th className="px-4 py-3 text-xs font-medium text-right" style={TH}>Balance</th>
                  <th className="px-4 py-3 text-xs font-medium text-left"  style={TH}>Who Paid</th>
                  <th className="px-4 py-3 text-xs font-medium text-left"  style={TH}>Due Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-left"  style={TH}>Status</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-16 text-center text-sm"
                      style={{ color: '#B4ABA5', fontFamily: 'var(--font-body)' }}
                    >
                      No vendors yet. Click "Add Vendor" to get started, or tell the AI Coach about a booking.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor, index) => {
                    const isDragging = dragSrc === index
                    // Only highlight as drop target when another row is being dragged
                    const isDragOver = dragOver === index && dragSrc !== null && dragSrc !== index

                    return (
                      <VendorRow
                        key={vendor.id}
                        vendor={vendor}
                        isDragging={isDragging}
                        isDragOver={isDragOver}
                        onHandleDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          setDragSrc(index)
                        }}
                        onRowDragOver={(e) => {
                          e.preventDefault()
                          // Don't highlight the row being dragged as a drop target
                          if (dragSrc !== null && dragSrc !== index && dragOver !== index) {
                            setDragOver(index)
                          }
                        }}
                        onRowDrop={(e) => {
                          e.preventDefault()
                          if (dragSrc !== null && dragSrc !== index) {
                            const reordered = [...vendors]
                            const [removed] = reordered.splice(dragSrc, 1)
                            reordered.splice(index, 0, removed)
                            reorderVendors(reordered)
                          }
                          setDragSrc(null)
                          setDragOver(null)
                        }}
                        onRowDragEnd={() => {
                          setDragSrc(null)
                          setDragOver(null)
                        }}
                        onEdit={v => setEditVendor(v)}
                        onRemove={removeVendor}
                      />
                    )
                  })
                )}
              </tbody>

              {/* Totals footer */}
              {vendors.length > 0 && (
                <tfoot style={{ borderTop: '2px solid #EDE8E3' }}>
                  <tr style={{ backgroundColor: '#FDFAF8' }}>
                    <td /> {/* drag handle */}
                    <td
                      className="px-4 py-3 text-xs font-semibold"
                      style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}
                    >
                      Totals
                    </td>
                    <td
                      className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap"
                      style={{ color: '#2C2825', fontFamily: 'var(--font-body)' }}
                    >
                      {fmt(totalCostAll)}
                    </td>
                    <td
                      className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap"
                      style={{ color: '#166534', fontFamily: 'var(--font-body)' }}
                    >
                      {fmt(totalPaid)}
                    </td>
                    <td
                      className="px-4 py-3 text-sm font-semibold text-right whitespace-nowrap"
                      style={{
                        color:      totalBalance > 0 ? '#C47A1A' : '#166534',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {totalBalance > 0 ? fmt(totalBalance) : '—'}
                    </td>
                    <td /> {/* Who Paid */}
                    <td colSpan={2} /> {/* Due Date + Status */}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <VendorModal
          onSave={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
      {editVendor && (
        <VendorModal
          initial={{
            name:        editVendor.name,
            totalCost:   String(editVendor.totalCost),
            depositPaid: String(editVendor.depositPaid),
            dueDate:     editVendor.dueDate,
            assignedTo:  editVendor.assignedTo,
          }}
          onSave={handleEditSave}
          onClose={() => setEditVendor(null)}
        />
      )}
    </div>
  )
}
