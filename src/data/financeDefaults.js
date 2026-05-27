// ─── Finance defaults ──────────────────────────────────────────────────────────
// weeksFromNow is called at module-load time, so the Florist due date is always
// ~3 weeks from the first time the app boots.

function weeksFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const DEFAULT_BUDGET = 30000

export const DEFAULT_VENDORS = [
  {
    id:          'v-venue',
    name:        'Venue',
    category:    'Venue',
    totalCost:   8000,
    depositPaid: 2000,
    dueDate:     '',
    assignedTo:  'Both',
    fromAI:      false,
    aiUpdated:   false,
  },
  {
    id:          'v-photo',
    name:        'Photographer',
    category:    'Photography',
    totalCost:   3500,
    depositPaid: 1000,
    dueDate:     '',
    assignedTo:  'Both',
    fromAI:      false,
    aiUpdated:   false,
  },
  {
    id:          'v-florist',
    name:        'Florist',
    category:    'Florals',
    totalCost:   2500,
    depositPaid: 0,
    dueDate:     weeksFromNow(3),
    assignedTo:  'Both',
    fromAI:      false,
    aiUpdated:   false,
  },
  {
    id:          'v-caterer',
    name:        'Caterer',
    category:    'Catering',
    totalCost:   6000,
    depositPaid: 2000,
    dueDate:     '',
    assignedTo:  'Both',
    fromAI:      false,
    aiUpdated:   false,
  },
  {
    id:          'v-dj',
    name:        'DJ / Band',
    category:    'Music',
    totalCost:   2000,
    depositPaid: 500,
    dueDate:     '',
    assignedTo:  'Both',
    fromAI:      false,
    aiUpdated:   false,
  },
]
