import { navItems } from '../navItems'
import { useWedding } from '../context/WeddingContext'

// Compute how many checklist items are currently urgent (past/imminently due)
function countUrgent(categories, weddingDate) {
  if (!weddingDate) return 0
  const wedding = new Date(weddingDate + 'T00:00:00')
  const today   = new Date()
  let count = 0
  categories.forEach(cat => {
    cat.items.forEach(item => {
      if (item.done || item.monthsBefore == null) return
      const dueDate  = new Date(wedding.getTime() - item.monthsBefore * 30.44 * 86_400_000)
      const daysLeft = (dueDate - today) / 86_400_000
      if (daysLeft <= 28) count++
    })
  })
  return count
}

export default function Sidebar({ active, setActive }) {
  const { categories, weddingDate } = useWedding()
  const urgentCount = countUrgent(categories, weddingDate)

  return (
    <aside
      className="flex flex-col w-64 shrink-0 h-full border-r"
      style={{
        backgroundColor: '#2C2825',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo area */}
      <div
        className="px-8 py-8 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <p
          className="text-xs uppercase tracking-[0.2em] mb-1"
          style={{ color: '#B4627A', fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          Wedding Planner
        </p>
        <h1
          className="text-4xl font-light italic"
          style={{ fontFamily: 'var(--font-heading)', color: '#FDFAF8', letterSpacing: '0.02em' }}
        >
          Vowed
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-4 space-y-1">
        {navItems.map(({ id, label, Icon }) => {
          const isActive   = active === id
          const showBadge  = id === 'checklist' && urgentCount > 0

          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200"
              style={{
                backgroundColor: isActive ? 'rgba(180,98,122,0.18)' : 'transparent',
                color: isActive ? '#B4627A' : 'rgba(253,250,248,0.55)',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {/* Icon */}
              <div className="relative shrink-0">
                <Icon
                  size={18}
                  style={{ color: isActive ? '#B4627A' : 'rgba(253,250,248,0.45)' }}
                />
                {/* Red dot badge */}
                {showBadge && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#EF4444' }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className="flex-1 text-sm font-medium tracking-wide"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {label}
              </span>

              {/* Active dot */}
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#B4627A' }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-8 py-5 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <p className="text-xs" style={{ color: 'rgba(253,250,248,0.3)', fontFamily: 'var(--font-body)' }}>
          Est. 2026 · Your perfect day
        </p>
      </div>
    </aside>
  )
}
