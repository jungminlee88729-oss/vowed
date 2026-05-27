import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { DEFAULT_CATEGORIES } from '../data/checklistDefaults'
import { DEFAULT_BUDGET, DEFAULT_VENDORS } from '../data/financeDefaults'
import { getClient } from '../lib/anthropic'
import { supabase } from '../lib/supabase'

// ─── Initial AI message ───────────────────────────────────────────────────────
export const INITIAL_AI_MESSAGE = {
  id: 'init',
  role: 'assistant',
  content:
    "Hi! I'm your Vowed Wedding Coordinator. Before we dive into lists and logistics, I'd love to understand your vision first. How do you imagine your wedding day feeling — is it intimate and romantic, big and celebratory, relaxed and outdoor? And do you have a date or location in mind yet?",
  sender: 'Vowed Wedding Coordinator',
}

// ─── Tiny log helpers ─────────────────────────────────────────────────────────
function logRead(table, data, error) {
  if (error) console.error(`[Vowed] READ  ${table}: ❌`, error.message, error)
  else       console.log(`[Vowed] READ  ${table}: ✓ ${data?.length ?? (data ? 1 : 0)} rows`)
}
function logWrite(table, label, error) {
  if (error && error.code !== '23505')
    console.error(`[Vowed] WRITE ${table} (${label}): ❌`, error.message, error)
  else if (!error || error.code === '23505')
    console.log(`[Vowed] WRITE ${table} (${label}): ✓`)
}

// ─── Context ──────────────────────────────────────────────────────────────────
const WeddingContext = createContext(null)

// ─── Generate personalised welcome message ────────────────────────────────────
function generateWelcomeMessage(profile) {
  const { brideName, groomName, weddingDate, weddingLocation, weddingStyle, guestCount } = profile || {}

  if (!brideName && !groomName) return INITIAL_AI_MESSAGE.content

  const names = [brideName, groomName].filter(Boolean).join(' & ')

  let dateStr = ''
  if (weddingDate) {
    try {
      const [y, m, d] = weddingDate.split('-').map(Number)
      dateStr = new Date(y, m - 1, d).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    } catch (_) {}
  }

  const locationStr = weddingLocation || ''
  const visionStr   = weddingStyle?.length
    ? weddingStyle.slice(0, 2).join(' & ').toLowerCase()
    : 'beautiful'
  const guestStr    = guestCount ? `, ${guestCount} guests` : ''
  const contextStr  = dateStr && locationStr ? `your ${locationStr} wedding on ${dateStr}`
                    : dateStr                ? `your wedding on ${dateStr}`
                    : locationStr            ? `your ${locationStr} wedding`
                    :                          'your wedding'

  return `Hi ${names}! I'm so excited to help you plan ${contextStr}${guestStr}! 🎉

Based on your ${visionStr} vision, here's where I'd focus first:

**Venue** sets the tone for everything and books up fastest — especially for ${dateStr ? `a ${dateStr.split(',')[0]} date` : 'your date'}. **Photography** goes next, since the best photographers book 12–18 months out. Once you have your venue confirmed, **catering** and your **guest list** will fall naturally into place.

What feels most exciting or most overwhelming right now? I'm here to help you take it one step at a time! 💕`
}

export function WeddingProvider({ children, userId, userEmail, initialProfile }) {

  // ── UI renders immediately — no loading gate ──────────────────────────────
  const [loading, setLoading] = useState(false)

  // ── Navigation ───────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('ai-coach')
  const [activeUser,    setActiveUser]    = useState(null) // set from brideName after load

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const [messages,        setMessages]        = useState([INITIAL_AI_MESSAGE])
  const [pendingQuestion, setPendingQuestion] = useState(null)

  // ── Wedding facts ─────────────────────────────────────────────────────────────
  const [brideName,       setBrideName]       = useState('')
  const [groomName,       setGroomName]       = useState('')
  const [weddingDate,     setWeddingDate]     = useState('')
  const [weddingLocation, setWeddingLocation] = useState('')
  const [guestCount,      setGuestCount]      = useState(null)
  const [weddingStyle,    setWeddingStyle]    = useState([])
  const [keyDecisions,    setKeyDecisions]    = useState([])

  // ── Calendar ─────────────────────────────────────────────────────────────────
  const [calendarEvents, setCalendarEvents] = useState([])

  // ── Finance ───────────────────────────────────────────────────────────────────
  const [budget,  setBudget]  = useState(DEFAULT_BUDGET)
  const [vendors, setVendors] = useState(DEFAULT_VENDORS)

  // ── Alerts ────────────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState([])

  // ── Checklist ─────────────────────────────────────────────────────────────────
  const [categories,           setCategories]           = useState(DEFAULT_CATEGORIES)
  const [checklistSuggestions, setChecklistSuggestions] = useState([])

  // ── Refs — read current state in async / event-handler code ──────────────────
  const profileIdRef      = useRef(null)
  const dbReadyRef        = useRef(false)
  const categoriesRef     = useRef(DEFAULT_CATEGORIES)
  const calendarEventsRef = useRef([])
  const vendorsRef        = useRef(DEFAULT_VENDORS)
  const checklistSugRef   = useRef([])

  useEffect(() => { categoriesRef.current     = categories           }, [categories])
  useEffect(() => { calendarEventsRef.current = calendarEvents       }, [calendarEvents])
  useEffect(() => { vendorsRef.current        = vendors              }, [vendors])
  useEffect(() => { checklistSugRef.current   = checklistSuggestions }, [checklistSuggestions])

  // ── Debounced profile auto-save ───────────────────────────────────────────────
  useEffect(() => {
    if (!dbReadyRef.current || !profileIdRef.current) return
    const timer = setTimeout(async () => {
      const payload = {
        bride_name:       brideName       || null,
        groom_name:       groomName       || null,
        wedding_date:     weddingDate     || null,
        wedding_location: weddingLocation || null,
        guest_count:      guestCount,
        wedding_style:    weddingStyle,
        budget,
      }
      const { error } = await supabase
        .from('couple_profile')
        .update(payload)
        .eq('id', profileIdRef.current)
      logWrite('couple_profile', 'auto-save', error)
    }, 1000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brideName, groomName, weddingDate, weddingLocation, guestCount, weddingStyle, budget])

  // ── Seed helpers — each seeds only its own table(s) ─────────────────────────

  async function seedProfile(profile) {
    console.log('[Vowed] Seeding couple_profile...')
    const row = {
      user_id:          userId,
      bride_name:       profile?.brideName       || null,
      groom_name:       profile?.groomName       || null,
      budget:           profile?.budget != null ? Number(profile.budget) : DEFAULT_BUDGET,
      guest_count:      profile?.guestCount      ?? 80,
      wedding_style:    profile?.weddingStyle    ?? [],
      wedding_date:     profile?.weddingDate     || null,
      wedding_location: profile?.weddingLocation || null,
    }
    const { data, error } = await supabase
      .from('couple_profile')
      .insert(row)
      .select()
      .single()
    logWrite('couple_profile', 'seed', error)
    if (data) profileIdRef.current = data.id
  }

  async function seedMessages(profile) {
    console.log('[Vowed] Seeding chat_messages...')
    const content = generateWelcomeMessage(profile)
    const { error } = await supabase.from('chat_messages').insert({
      id:      `init-${userId.slice(0, 8)}`,
      role:    INITIAL_AI_MESSAGE.role,
      content,
      sender:  INITIAL_AI_MESSAGE.sender,
      user_id: userId,
    })
    logWrite('chat_messages', 'seed', error)
  }

  async function seedChecklist() {
    const catRows = DEFAULT_CATEGORIES.map((cat, ci) => ({
      id:       cat.id,
      label:    cat.label,
      icon:     cat.icon  ?? null,
      color:    cat.color ?? null,
      position: ci,
      user_id:  userId,
    }))

    const itemRows = DEFAULT_CATEGORIES.flatMap(cat =>
      cat.items.map((item, ii) => ({
        id:            item.id,
        category_id:   cat.id,
        title:         item.title,
        done:          false,
        months_before: item.monthsBefore != null ? Math.round(item.monthsBefore) : null,
        due_date:      item.dueDate || null,
        assigned_to:   item.assignedTo    ?? 'Both',
        from_ai:       false,
        sub_questions: item.subQuestions  ?? [],
        item_note:     null,
        sub_q_notes:   {},
        position:      ii,
        user_id:       userId,
      }))
    )

    console.log('[Vowed] Seeding', catRows.length, 'categories...')
    const { error: catErr } = await supabase.from('checklist_categories').upsert(catRows, { onConflict: 'id' })
    logWrite('checklist_categories', 'seed', catErr)

    // Items have FK → categories, so they must go after
    console.log('[Vowed] Seeding', itemRows.length, 'checklist items...')
    const { error: itemsErr } = await supabase.from('checklist_items').upsert(itemRows, { onConflict: 'id' })
    logWrite('checklist_items', 'seed', itemsErr)
  }

  async function seedItems() {
    const itemRows = DEFAULT_CATEGORIES.flatMap(cat =>
      cat.items.map((item, ii) => ({
        id:            item.id,
        category_id:   cat.id,
        title:         item.title,
        done:          false,
        months_before: item.monthsBefore != null ? Math.round(item.monthsBefore) : null,
        due_date:      item.dueDate || null,
        assigned_to:   item.assignedTo    ?? 'Both',
        from_ai:       false,
        sub_questions: item.subQuestions  ?? [],
        item_note:     null,
        sub_q_notes:   {},
        position:      ii,
        user_id:       userId,
      }))
    )
    console.log('[Vowed] Re-seeding', itemRows.length, 'checklist items (categories already exist)...')
    const { error } = await supabase.from('checklist_items').upsert(itemRows, { onConflict: 'id' })
    logWrite('checklist_items', 'seed-repair', error)
  }

  async function seedVendors() {
    console.log('[Vowed] Seeding vendors...')
    const rows = DEFAULT_VENDORS.map((v, i) => ({
      id:           v.id,
      name:         v.name,
      category:     v.category    ?? '',
      total_cost:   v.totalCost   ?? 0,
      deposit_paid: v.depositPaid ?? 0,
      due_date:     v.dueDate     || null,
      assigned_to:  v.assignedTo  ?? 'Both',
      from_ai:      false,
      ai_updated:   false,
      position:     i,
      user_id:      userId,
    }))
    const { error } = await supabase.from('vendors').insert(rows)
    logWrite('vendors', 'seed', error)
  }

  // ── loadFromSupabase — runs once on mount ─────────────────────────────────────
  async function loadFromSupabase() {
    console.log('[Vowed] ══ Starting data load ══')

    // ── Step 0: migrate existing data (user_id IS NULL) to this user ──────────
    // This runs once the first time an existing user signs in after auth was added.
    // Safe to skip if user_id column doesn't exist yet (caught below).
    try {
      const { count: unmigratedCount } = await supabase
        .from('couple_profile')
        .select('id', { count: 'exact', head: true })
        .is('user_id', null)

      if (unmigratedCount > 0) {
        console.log('[Vowed] Migrating', unmigratedCount, 'legacy row(s) to current user...')
        await Promise.all([
          supabase.from('couple_profile')       .update({ user_id: userId }).is('user_id', null),
          supabase.from('chat_messages')        .update({ user_id: userId }).is('user_id', null),
          supabase.from('checklist_categories') .update({ user_id: userId }).is('user_id', null),
          supabase.from('checklist_items')      .update({ user_id: userId }).is('user_id', null),
          supabase.from('calendar_events')      .update({ user_id: userId }).is('user_id', null),
          supabase.from('vendors')              .update({ user_id: userId }).is('user_id', null),
        ])
        console.log('[Vowed] Migration complete')
      }
    } catch (migErr) {
      console.warn('[Vowed] Migration check skipped:', migErr.message)
    }

    try {
      // ── Step 1: check every table count in ONE parallel round-trip ─────────
      console.log('[Vowed] Checking table counts...')
      const [
        { count: profileCount, error: profCountErr },
        { count: msgsCount    },
        { count: catsCount    },
        { count: itemsCount   },
        { count: vendorsCount },
      ] = await Promise.all([
        supabase.from('couple_profile')       .select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('chat_messages')        .select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('checklist_categories') .select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('checklist_items')      .select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('vendors')              .select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ])

      console.log('[Vowed] Table counts:', {
        couple_profile:       profileCount ?? '❌',
        chat_messages:        msgsCount    ?? '❌',
        checklist_categories: catsCount    ?? '❌',
        checklist_items:      itemsCount   ?? '❌',
        vendors:              vendorsCount ?? '❌',
      })

      if (profCountErr) {
        console.error('[Vowed] ❌ Cannot read tables:', profCountErr.message)
      }

      // ── Step 2: seed each table independently based on what's actually empty ─
      const seedTasks = []
      if (!profileCount) seedTasks.push(seedProfile(initialProfile))
      if (!msgsCount)    seedTasks.push(seedMessages(initialProfile))
      if (!vendorsCount) seedTasks.push(seedVendors())

      if (!catsCount) {
        seedTasks.push(seedChecklist())
      } else if (!itemsCount) {
        console.log('[Vowed] Purging stale checklist_categories to re-seed from scratch...')
        await supabase.from('checklist_categories').delete().eq('user_id', userId).neq('id', '')
        seedTasks.push(seedChecklist())
      }

      if (seedTasks.length > 0) {
        console.log('[Vowed] Seeding', seedTasks.length, 'missing table(s)...')
        await Promise.all(seedTasks)
        console.log('[Vowed] Seeding complete')
      } else {
        console.log('[Vowed] All tables already populated — skipping seed')
      }

      // ── Step 3: fetch everything in ONE parallel round-trip ────────────────
      console.log('[Vowed] Fetching all data...')
      const [
        { data: profiles,  error: profErr   },
        { data: msgs,      error: msgsErr   },
        { data: dbCats,    error: catsErr   },
        { data: dbItems,   error: itemsErr  },
        { data: dbEvents,  error: eventsErr },
        { data: dbVendors, error: vendErr   },
      ] = await Promise.all([
        supabase.from('couple_profile')       .select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(1),
        supabase.from('chat_messages')        .select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('checklist_categories') .select('*').eq('user_id', userId).order('position',   { ascending: true }),
        supabase.from('checklist_items')      .select('*').eq('user_id', userId).order('position',   { ascending: true }),
        supabase.from('calendar_events')      .select('*').eq('user_id', userId).order('event_date', { ascending: true }),
        supabase.from('vendors')              .select('*').eq('user_id', userId).order('position',   { ascending: true }).order('created_at', { ascending: true }),
      ])

      logRead('couple_profile',       profiles,  profErr)
      logRead('chat_messages',        msgs,      msgsErr)
      logRead('checklist_categories', dbCats,    catsErr)
      logRead('checklist_items',      dbItems,   itemsErr)
      logRead('calendar_events',      dbEvents,  eventsErr)
      logRead('vendors',              dbVendors, vendErr)

      // ── Step 4: apply loaded data to React state ───────────────────────────

      // couple_profile
      const profile = profiles?.[0]
      if (profile) {
        profileIdRef.current = profile.id
        if (profile.bride_name)            setBrideName(profile.bride_name)
        if (profile.groom_name)            setGroomName(profile.groom_name)
        if (profile.wedding_date)          setWeddingDate(profile.wedding_date)
        if (profile.wedding_location)      setWeddingLocation(profile.wedding_location)
        if (profile.guest_count != null)   setGuestCount(profile.guest_count)
        if (profile.wedding_style?.length) setWeddingStyle(profile.wedding_style)
        if (profile.budget != null)        setBudget(profile.budget)
        // Initialise activeUser from bride name
        setActiveUser(prev => prev ?? (profile.bride_name || null))
      }

      // chat_messages
      if (msgs?.length) {
        setMessages(msgs.map(m => ({
          id:            m.id,
          role:          m.role,
          content:       m.content,
          sender:        m.sender          ?? undefined,
          isError:       m.is_error        ?? false,
          wasResearched: m.was_researched  ?? false,
        })))
      }

      // checklist categories + items
      if (dbCats?.length) {
        const byCategory = {}
        dbItems?.forEach(item => {
          if (!byCategory[item.category_id]) byCategory[item.category_id] = []
          byCategory[item.category_id].push({
            id:           item.id,
            title:        item.title,
            done:         item.done,
            monthsBefore: item.months_before,
            dueDate:      item.due_date,
            assignedTo:   item.assigned_to,
            fromAI:       item.from_ai,
            subQuestions: item.sub_questions ?? [],
            itemNote:     item.item_note     ?? null,
            subQNotes:    item.sub_q_notes   ?? {},
          })
        })
        setCategories(dbCats.map(cat => ({
          id:    cat.id,
          label: cat.label,
          icon:  cat.icon  ?? undefined,
          color: cat.color ?? undefined,
          items: byCategory[cat.id] ?? [],
        })))
        console.log('[Vowed] ✓ Checklist loaded:', dbCats.length, 'categories,', dbItems?.length ?? 0, 'items')
      }

      // calendar_events
      if (dbEvents?.length) {
        setCalendarEvents(dbEvents.map(e => ({
          id:         e.id,
          title:      e.title,
          date:       e.event_date,
          type:       e.event_type,
          assignedTo: e.assigned_to,
          fromAI:     e.from_ai,
          address:    e.address ?? undefined,
          phone:      e.phone   ?? undefined,
          url:        e.url     ?? undefined,
          notes:      e.notes   ?? undefined,
        })))
      }

      // vendors
      if (dbVendors?.length) {
        setVendors(dbVendors.map(v => ({
          id:          v.id,
          name:        v.name,
          category:    v.category     ?? '',
          totalCost:   v.total_cost   ?? 0,
          depositPaid: v.deposit_paid ?? 0,
          dueDate:     v.due_date     ?? null,
          assignedTo:  v.assigned_to  ?? 'Both',
          fromAI:      v.from_ai      ?? false,
          aiUpdated:   v.ai_updated   ?? false,
          position:    v.position     ?? 0,
        })))
      }

      console.log('[Vowed] ══ Data load complete ══')

    } catch (err) {
      console.error('[Vowed] loadFromSupabase threw:', err)
    } finally {
      dbReadyRef.current = true
    }
  }

  // Kick off background load after first render
  useEffect(() => { loadFromSupabase() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── persistMessage — called from AiCoach after every message ─────────────────
  async function persistMessage(message) {
    if (!message?.id) return
    console.log('[Vowed] WRITE chat_messages:', message.role, message.id.slice(0, 12))
    const { error } = await supabase.from('chat_messages').insert({
      id:             message.id,
      role:           message.role,
      content:        message.content,
      sender:         message.sender        ?? null,
      is_error:       message.isError       ?? false,
      was_researched: message.wasResearched ?? false,
      user_id:        userId,
    })
    logWrite('chat_messages', `${message.role} msg`, error)
  }

  // ── Calendar actions ─────────────────────────────────────────────────────────

  function addCalendarEvent(event) {
    const dup = calendarEventsRef.current.some(
      e => e.title.toLowerCase() === event.title.toLowerCase() && e.date === event.date
    )
    if (dup) return

    setCalendarEvents(prev => [...prev, event])

    if (dbReadyRef.current) {
      const row = {
        id:          event.id,
        title:       event.title,
        event_date:  event.date,
        event_type:  event.type       ?? 'event',
        assigned_to: event.assignedTo ?? 'Both',
        from_ai:     event.fromAI     ?? false,
        address:     event.address    ?? null,
        phone:       event.phone      ?? null,
        url:         event.url        ?? null,
        notes:       event.notes      ?? null,
        user_id:     userId,
      }
      console.log('[Vowed] WRITE calendar_events (add):', event.title)
      supabase.from('calendar_events').insert(row)
        .then(({ error }) => logWrite('calendar_events', 'add', error))
    }
  }

  function removeCalendarEvent(id) {
    setCalendarEvents(prev => prev.filter(e => e.id !== id))
    if (dbReadyRef.current) {
      console.log('[Vowed] WRITE calendar_events (delete):', id)
      supabase.from('calendar_events').delete().eq('id', id)
        .then(({ error }) => logWrite('calendar_events', 'delete', error))
    }
  }

  // ── Vendor actions ───────────────────────────────────────────────────────────

  function addVendor(vendor) {
    setVendors(prev => [...prev, vendor])
    if (dbReadyRef.current) {
      const row = {
        id:           vendor.id,
        name:         vendor.name,
        category:     vendor.category    ?? '',
        total_cost:   vendor.totalCost   ?? 0,
        deposit_paid: vendor.depositPaid ?? 0,
        due_date:     vendor.dueDate     || null,
        assigned_to:  vendor.assignedTo  ?? 'Both',
        from_ai:      vendor.fromAI      ?? false,
        ai_updated:   vendor.aiUpdated   ?? false,
        position:     vendorsRef.current.length,
        user_id:      userId,
      }
      console.log('[Vowed] WRITE vendors (add):', vendor.name)
      supabase.from('vendors').insert(row)
        .then(({ error }) => logWrite('vendors', 'add', error))
    }
  }

  function updateVendor(id, changes) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...changes } : v))
    if (dbReadyRef.current) {
      const db = {}
      if (changes.name        !== undefined) db.name         = changes.name
      if (changes.category    !== undefined) db.category     = changes.category
      if (changes.totalCost   !== undefined) db.total_cost   = changes.totalCost
      if (changes.depositPaid !== undefined) db.deposit_paid = changes.depositPaid
      if (changes.dueDate     !== undefined) db.due_date     = changes.dueDate || null
      if (changes.assignedTo  !== undefined) db.assigned_to  = changes.assignedTo
      if (changes.aiUpdated   !== undefined) db.ai_updated   = changes.aiUpdated
      if (Object.keys(db).length) {
        console.log('[Vowed] WRITE vendors (update):', id, db)
        supabase.from('vendors').update(db).eq('id', id)
          .then(({ error }) => logWrite('vendors', 'update', error))
      }
    }
  }

  function removeVendor(id) {
    setVendors(prev => prev.filter(v => v.id !== id))
    if (dbReadyRef.current) {
      console.log('[Vowed] WRITE vendors (delete):', id)
      supabase.from('vendors').delete().eq('id', id)
        .then(({ error }) => logWrite('vendors', 'delete', error))
    }
  }

  function reorderVendors(orderedVendors) {
    const withPositions = orderedVendors.map((v, i) => ({ ...v, position: i }))
    setVendors(withPositions)
    if (dbReadyRef.current) {
      console.log('[Vowed] WRITE vendors (reorder):',
        withPositions.map(v => `${v.id}→${v.position}`).join(', '))
      Promise.all(
        withPositions.map(v =>
          supabase.from('vendors').update({ position: v.position }).eq('id', v.id)
            .then(({ error }) => {
              if (error) console.error('[Vowed] WRITE vendors (reorder) ❌:', v.id, error.message)
            })
        )
      )
    }
  }

  // ── Account actions ───────────────────────────────────────────────────────────

  function signOut() {
    return supabase.auth.signOut()
  }

  // Explicit save — used by SettingsPanel for immediate confirmation
  async function saveProfile(changes) {
    if (!profileIdRef.current) return { error: new Error('No profile loaded yet') }
    const payload = {}
    if (changes.brideName       !== undefined) payload.bride_name       = changes.brideName       || null
    if (changes.groomName       !== undefined) payload.groom_name       = changes.groomName       || null
    if (changes.weddingDate     !== undefined) payload.wedding_date     = changes.weddingDate     || null
    if (changes.weddingLocation !== undefined) payload.wedding_location = changes.weddingLocation || null
    if (changes.guestCount      !== undefined) payload.guest_count      = changes.guestCount
    if (changes.weddingStyle    !== undefined) payload.wedding_style    = changes.weddingStyle
    if (changes.budget          !== undefined) payload.budget           = changes.budget
    console.log('[Vowed] WRITE couple_profile (explicit save):', payload)
    const { error } = await supabase.from('couple_profile').update(payload).eq('id', profileIdRef.current)
    logWrite('couple_profile', 'explicit save', error)
    return { error }
  }

  // Re-authenticate then update password
  async function changePassword(currentPassword, newPassword) {
    if (!userEmail) return { error: new Error('No email on session') }
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email:    userEmail,
      password: currentPassword,
    })
    if (reAuthErr) return { error: { message: 'Invalid login credentials' } }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    if (updateErr) console.error('[Vowed] changePassword update error:', updateErr.message)
    return { error: updateErr }
  }

  // ── Alert actions ─────────────────────────────────────────────────────────────

  function dismissAlert(id) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a))
  }

  async function syncAlerts(allMessages) {
    if (allMessages.length < 2) return { count: 0 }

    const transcript = allMessages
      .filter(m => !m.isError)
      .slice(-20)
      .map(m => `${m.sender ?? 'AI'}: ${m.content}`)
      .join('\n\n')

    const wCtx = weddingDate ? `\nWedding date: ${weddingDate}` : ''

    const prompt = `Extract upcoming deadlines, payment reminders, and urgent action items from this wedding planning conversation. Return ONLY valid JSON — no markdown, no explanation.

{
  "alerts": [
    {
      "title": "short actionable title (max 8 words)",
      "detail": "one sentence of context",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "urgent|warning|info"
    }
  ]
}

Priority:
- urgent: payments or decisions needed within 30 days
- warning: tasks or decisions needed within 60-90 days
- info: general reminders and follow-ups

Only extract real actionable items the couple needs to act on. Return empty array if nothing specific.${wCtx}

Conversation:
${transcript}`

    try {
      const client = getClient()
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw   = response.content[0]?.text ?? ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return { count: 0 }

      const { alerts: newAlerts = [] } = JSON.parse(match[0])

      newAlerts.forEach(a => {
        if (!a.title) return
        const validDate = a.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate)
        setAlerts(prev => {
          const dup = prev.some(x => x.title.toLowerCase() === a.title.toLowerCase())
          if (dup) return prev
          return [...prev, {
            id:        `alert-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            title:     a.title,
            detail:    a.detail || '',
            dueDate:   validDate ? a.dueDate : null,
            priority:  ['urgent','warning','info'].includes(a.priority) ? a.priority : 'info',
            dismissed: false,
            fromAI:    true,
            createdAt: Date.now(),
          }]
        })
      })

      return { count: newAlerts.length }
    } catch (err) {
      console.warn('[Vowed] syncAlerts failed:', err.message)
      return { count: 0 }
    }
  }

  // ── Checklist actions ─────────────────────────────────────────────────────────

  function toggleItem(categoryId, itemId) {
    const cat     = categoriesRef.current.find(c => c.id === categoryId)
    const item    = cat?.items.find(i => i.id === itemId)
    if (!item) return
    const newDone = !item.done

    setCategories(prev =>
      prev.map(c =>
        c.id !== categoryId ? c : {
          ...c,
          items: c.items.map(i => i.id === itemId ? { ...i, done: newDone } : i),
        }
      )
    )

    if (dbReadyRef.current) {
      console.log('[Vowed] WRITE checklist_items (toggle done):', itemId, '->', newDone)
      supabase.from('checklist_items').update({ done: newDone }).eq('id', itemId)
        .then(({ error }) => logWrite('checklist_items', 'toggle', error))
    }
  }

  function markItemsDone(itemIds) {
    if (!itemIds?.length) return
    setCategories(prev =>
      prev.map(cat => ({
        ...cat,
        items: cat.items.map(item =>
          itemIds.includes(item.id) ? { ...item, done: true } : item
        ),
      }))
    )
    if (dbReadyRef.current) {
      console.log('[Vowed] WRITE checklist_items (markDone):', itemIds)
      supabase.from('checklist_items').update({ done: true }).in('id', itemIds)
        .then(({ error }) => logWrite('checklist_items', 'markDone', error))
    }
  }

  function addItem(categoryId, item) {
    const position = categoriesRef.current.find(c => c.id === categoryId)?.items.length ?? 0
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, items: [...cat.items, item] } : cat
      )
    )
    if (dbReadyRef.current) {
      const row = {
        id:            item.id,
        category_id:   categoryId,
        title:         item.title,
        done:          item.done          ?? false,
        months_before: item.monthsBefore != null ? Math.round(item.monthsBefore) : null,
        due_date:      item.dueDate       ?? null,
        assigned_to:   item.assignedTo    ?? 'Both',
        from_ai:       item.fromAI        ?? false,
        sub_questions: item.subQuestions  ?? [],
        item_note:     item.itemNote      ?? null,
        sub_q_notes:   item.subQNotes     ?? {},
        position,
        user_id:       userId,
      }
      console.log('[Vowed] WRITE checklist_items (add):', item.title, 'in', categoryId)
      supabase.from('checklist_items').insert(row)
        .then(({ error }) => logWrite('checklist_items', 'add', error))
    }
  }

  function updateItem(categoryId, itemId, changes) {
    setCategories(prev =>
      prev.map(cat =>
        cat.id !== categoryId ? cat : {
          ...cat,
          items: cat.items.map(item =>
            item.id === itemId ? { ...item, ...changes } : item
          ),
        }
      )
    )
    if (dbReadyRef.current) {
      const db = {}
      if (changes.title        !== undefined) db.title         = changes.title
      if (changes.done         !== undefined) db.done          = changes.done
      if (changes.dueDate      !== undefined) db.due_date      = changes.dueDate
      if (changes.assignedTo   !== undefined) db.assigned_to   = changes.assignedTo
      if (changes.monthsBefore !== undefined) db.months_before = changes.monthsBefore
      if (changes.itemNote     !== undefined) db.item_note     = changes.itemNote
      if (changes.subQNotes    !== undefined) db.sub_q_notes   = changes.subQNotes
      if (Object.keys(db).length) {
        console.log('[Vowed] WRITE checklist_items (update):', itemId, db)
        supabase.from('checklist_items').update(db).eq('id', itemId)
          .then(({ error }) => logWrite('checklist_items', 'update', error))
      }
    }
  }

  function deleteItem(categoryId, itemId) {
    setCategories(prev =>
      prev.map(cat =>
        cat.id !== categoryId ? cat : {
          ...cat,
          items: cat.items.filter(item => item.id !== itemId),
        }
      )
    )
    if (dbReadyRef.current) {
      console.log('[Vowed] WRITE checklist_items (delete):', itemId)
      supabase.from('checklist_items').delete().eq('id', itemId)
        .then(({ error }) => logWrite('checklist_items', 'delete', error))
    }
  }

  function addCategory(category) {
    const position = categoriesRef.current.length
    setCategories(prev => [...prev, category])
    if (dbReadyRef.current) {
      const row = {
        id:       category.id,
        label:    category.label,
        icon:     category.icon  ?? null,
        color:    category.color ?? null,
        position,
        user_id:  userId,
      }
      console.log('[Vowed] WRITE checklist_categories (add):', category.label)
      supabase.from('checklist_categories').insert(row)
        .then(({ error }) => logWrite('checklist_categories', 'add', error))
    }
  }

  function deleteCategory(categoryId) {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId))
    if (dbReadyRef.current) {
      console.log('[Vowed] WRITE checklist_categories (delete):', categoryId)
      supabase.from('checklist_categories').delete().eq('id', categoryId)
        .then(({ error }) => logWrite('checklist_categories', 'delete', error))
    }
  }

  function renameCategory(categoryId, newLabel) {
    setCategories(prev =>
      prev.map(cat => cat.id === categoryId ? { ...cat, label: newLabel.trim() } : cat)
    )
    if (dbReadyRef.current) {
      console.log('[Vowed] WRITE checklist_categories (rename):', categoryId, '->', newLabel)
      supabase.from('checklist_categories').update({ label: newLabel.trim() }).eq('id', categoryId)
        .then(({ error }) => logWrite('checklist_categories', 'rename', error))
    }
  }

  // ── Checklist suggestion actions ──────────────────────────────────────────────

  function acceptChecklistSuggestion(suggestionId) {
    const s = checklistSugRef.current.find(x => x.id === suggestionId)
    if (!s) return

    const newItem = {
      id:           `ai-task-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title:        s.title,
      dueDate:      s.dueDate    || null,
      monthsBefore: null,
      assignedTo:   s.assignedTo || 'Both',
      done:         false,
      subQuestions: [],
      fromAI:       true,
    }

    addItem(s.categoryId, newItem)
    setChecklistSuggestions(prev => prev.filter(x => x.id !== suggestionId))
  }

  function dismissChecklistSuggestion(suggestionId) {
    setChecklistSuggestions(prev => prev.filter(x => x.id !== suggestionId))
  }

  // ── Cross-panel navigation ────────────────────────────────────────────────────

  function discussWithAI(question) {
    setPendingQuestion(question)
    setActiveSection('ai-coach')
  }

  // ── AI extraction ─────────────────────────────────────────────────────────────

  async function extractAndUpdate(allMessages) {
    if (allMessages.length < 3) return

    const recentContext = allMessages
      .slice(-6)
      .filter(m => !m.isError)
      .map(m => `${m.sender ?? 'AI'}: ${m.content}`)
      .join('\n\n')

    const weddingCtx = weddingDate ? `\nKnown wedding date for year context: ${weddingDate}` : ''

    const prompt = `You are extracting structured wedding planning data from a coaching conversation to update a checklist and calendar app. Return ONLY valid JSON — no markdown, no explanation.

{
  "weddingDate": "YYYY-MM-DD or null (only if a specific date or month+year was explicitly stated)",
  "weddingLocation": "city, country, or venue name — or null",
  "guestCount": null_or_integer,
  "weddingStyle": ["style words the couple used: outdoor, indoor, garden, beach, rustic, modern, intimate, grand, romantic, etc"],
  "topicsDiscussed": ["category IDs where the couple expressed real preferences or made decisions — use ONLY: venue, cocktail, reception, photography, videography, florals, catering, music, beauty, attire, guests, honeymoon, logistics"],
  "decisions": [{"topic": "short topic", "detail": "what was decided or expressed"}],
  "calendarEvents": [
    {"title": "brief event name", "date": "YYYY-MM-DD", "type": "vendor|deadline|task|wedding"}
  ],
  "paymentUpdates": [
    {"vendorKeyword": "one-word vendor identifier", "newDepositPaid": 0}
  ],
  "newChecklistItems": [
    {
      "categoryId": "one of: venue|photography|videography|florals|catering|music|beauty|attire|guests|honeymoon|logistics",
      "title": "specific actionable task title (max 10 words)",
      "dueDate": "YYYY-MM-DD or null",
      "assignedTo": "${brideName || 'Bride'}|${groomName || 'Groom'}|Both",
      "reason": "one sentence explaining why this task is relevant"
    }
  ]
}

Rules:
- weddingDate: ONLY if a specific date, month, or year was stated
- topicsDiscussed: ONLY if the couple expressed a preference or made a decision
- decisions: concrete things the couple said they want, prefer, or have decided
- calendarEvents: ONLY if a specific date was given. Type guide: vendor=meetings/tastings/viewings, deadline=payments/deposits/RSVPs due, task=things they need to do by a date, wedding=ceremony/rehearsal/reception/honeymoon
- calendarEvents titles should be short (max 5 words)
- paymentUpdates: ONLY if the couple explicitly says they paid or deposited money to a specific vendor
- newChecklistItems: suggest NEW tasks ONLY when the conversation reveals something specific and actionable. Do NOT suggest generic tasks. Return empty array if nothing specific.${weddingCtx}

Recent conversation:
${recentContext}`

    try {
      const client   = getClient()
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw   = response.content[0]?.text ?? ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return

      const insights = JSON.parse(match[0])
      applyInsights(insights)

    } catch (err) {
      console.warn('[Vowed] extractAndUpdate failed:', err.message)
    }
  }

  // ── applyInsights ─────────────────────────────────────────────────────────────

  function applyInsights(insights) {
    const now       = Date.now()
    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (insights.weddingDate) {
      const parsed = new Date(insights.weddingDate + 'T00:00:00')
      if (!isNaN(parsed)) setWeddingDate(insights.weddingDate)
    }
    if (insights.weddingLocation) setWeddingLocation(insights.weddingLocation)
    if (insights.guestCount)      setGuestCount(insights.guestCount)

    if (insights.weddingStyle?.length) {
      setWeddingStyle(prev => [...new Set([...prev, ...insights.weddingStyle])])
    }

    if (insights.decisions?.length) {
      setKeyDecisions(prev => {
        const next = [...prev]
        insights.decisions.forEach(d => {
          const idx   = next.findIndex(e => e.topic === d.topic)
          const entry = { topic: d.topic, detail: d.detail, timestamp: now }
          if (idx >= 0) next[idx] = entry
          else next.push(entry)
        })
        return next
      })
    }

    // Calendar events — read from ref, compute additions, then setState + persist
    if (insights.calendarEvents?.length) {
      const validTypes  = new Set(['wedding','vendor','deadline','task'])
      const currentEvts = calendarEventsRef.current
      const toAdd       = []

      insights.calendarEvents.forEach(ev => {
        if (!ev.title || !ev.date || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) return
        const dup = currentEvts.some(
          e => e.title.toLowerCase() === ev.title.toLowerCase() && e.date === ev.date
        )
        if (!dup) {
          toAdd.push({
            id:         `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title:      ev.title,
            date:       ev.date,
            type:       validTypes.has(ev.type) ? ev.type : 'task',
            assignedTo: 'Both',
            fromAI:     true,
          })
        }
      })

      if (toAdd.length) {
        setCalendarEvents(prev => [...prev, ...toAdd])
        if (dbReadyRef.current) {
          console.log('[Vowed] WRITE calendar_events (AI added', toAdd.length, ')')
          supabase.from('calendar_events').insert(
            toAdd.map(e => ({
              id:          e.id,
              title:       e.title,
              event_date:  e.date,
              event_type:  e.type,
              assigned_to: e.assignedTo,
              from_ai:     true,
              user_id:     userId,
            }))
          ).then(({ error }) => logWrite('calendar_events', 'AI batch add', error))
        }
      }
    }

    // Vendor payment updates — read from ref, compute deltas
    if (insights.paymentUpdates?.length) {
      const currentVendors = vendorsRef.current
      const updates        = []

      insights.paymentUpdates.forEach(({ vendorKeyword, newDepositPaid }) => {
        if (!vendorKeyword || newDepositPaid == null) return
        const kw = vendorKeyword.toLowerCase()
        const v  = currentVendors.find(
          v => v.name.toLowerCase().includes(kw) || v.category.toLowerCase().includes(kw)
        )
        if (!v) return
        const clamped = Math.min(Number(newDepositPaid), v.totalCost)
        if (clamped > v.depositPaid) updates.push({ id: v.id, depositPaid: clamped })
      })

      if (updates.length) {
        setVendors(prev => {
          const next = [...prev]
          updates.forEach(({ id, depositPaid }) => {
            const i = next.findIndex(v => v.id === id)
            if (i >= 0) next[i] = { ...next[i], depositPaid, aiUpdated: true }
          })
          return next
        })
        if (dbReadyRef.current) {
          updates.forEach(({ id, depositPaid }) => {
            console.log('[Vowed] WRITE vendors (AI payment update):', id, depositPaid)
            supabase.from('vendors').update({ deposit_paid: depositPaid, ai_updated: true }).eq('id', id)
              .then(({ error }) => logWrite('vendors', 'AI payment', error))
          })
        }
      }
    }

    // New checklist item suggestions
    if (insights.newChecklistItems?.length) {
      const validCatIds = new Set([
        'venue','photography','videography','florals','catering',
        'music','beauty','attire','guests','honeymoon','logistics',
      ])
      setChecklistSuggestions(prev => {
        const next = [...prev]
        insights.newChecklistItems.forEach(item => {
          if (!item.title || !item.categoryId || !validCatIds.has(item.categoryId)) return
          const dup = next.some(x => x.title.toLowerCase() === item.title.toLowerCase())
          if (!dup) {
            next.push({
              id:         `sug-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              categoryId: item.categoryId,
              title:      item.title,
              dueDate:    item.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) ? item.dueDate : null,
              assignedTo: item.assignedTo || 'Both',
              reason:     item.reason || '',
            })
          }
        })
        return next
      })
    }

    // Annotate checklist items in discussed categories
    const discussedCatIds = new Set(insights.topicsDiscussed ?? [])
    if (discussedCatIds.size === 0 &&
        !insights.guestCount &&
        !insights.weddingStyle?.length &&
        !insights.weddingLocation) return

    const itemsToUpdate = []

    setCategories(prev =>
      prev.map(cat => {
        const isMentioned = discussedCatIds.has(cat.id)
        return {
          ...cat,
          items: cat.items.map((item, itemIdx) => {
            if (item.done) return item

            const shouldHighlight = isMentioned && itemIdx < 2
            const itemNote = shouldHighlight
              ? { note: `Mentioned in chat · ${dateLabel}`, updatedAt: now }
              : (item.itemNote ?? null)

            const subQNotes = { ...(item.subQNotes ?? {}) }

            item.subQuestions.forEach((q, idx) => {
              const ql = q.toLowerCase()
              if (insights.guestCount &&
                  (ql.includes('guest') || ql.includes('how many') || ql.includes('numbers'))) {
                subQNotes[idx] = { note: `Discussed in chat · ${dateLabel} (${insights.guestCount} guests)`, updatedAt: now }
              }
              const styleKws = ['outdoor','indoor','garden','beach','rustic','modern','intimate','grand','romantic','vibe','feel','style','setting']
              if (insights.weddingStyle?.length && isMentioned && styleKws.some(kw => ql.includes(kw))) {
                subQNotes[idx] = { note: `Discussed in chat · ${dateLabel}`, updatedAt: now }
              }
              if (insights.weddingLocation &&
                  (ql.includes('destination') || ql.includes('location') || ql.includes('where') || ql.includes('local') || ql.includes('city'))) {
                subQNotes[idx] = { note: `Discussed in chat · ${dateLabel} (${insights.weddingLocation})`, updatedAt: now }
              }
            })

            const noteChanged  = JSON.stringify(itemNote)  !== JSON.stringify(item.itemNote)
            const notesChanged = JSON.stringify(subQNotes) !== JSON.stringify(item.subQNotes)
            if ((noteChanged || notesChanged) && dbReadyRef.current) {
              itemsToUpdate.push({ id: item.id, item_note: itemNote, sub_q_notes: subQNotes })
            }

            return { ...item, itemNote, subQNotes }
          }),
        }
      })
    )

    if (itemsToUpdate.length && dbReadyRef.current) {
      console.log('[Vowed] WRITE checklist_items (AI annotations):', itemsToUpdate.length, 'rows')
      itemsToUpdate.forEach(({ id, item_note, sub_q_notes }) => {
        supabase.from('checklist_items').update({ item_note, sub_q_notes }).eq('id', id)
          .then(({ error }) => logWrite('checklist_items', 'AI annotate', error))
      })
    }
  }

  // ── Provider ──────────────────────────────────────────────────────────────────
  return (
    <WeddingContext.Provider
      value={{
        loading,
        activeSection, setActiveSection,
        activeUser,    setActiveUser,
        messages,        setMessages,
        pendingQuestion, setPendingQuestion,
        brideName,       setBrideName,
        groomName,       setGroomName,
        weddingDate,     setWeddingDate,
        weddingLocation, setWeddingLocation,
        guestCount,      setGuestCount,
        weddingStyle,    setWeddingStyle,
        keyDecisions,
        categories,    setCategories,
        toggleItem,    markItemsDone,  addItem,
        updateItem,    deleteItem,     addCategory,
        deleteCategory, renameCategory,
        checklistSuggestions, acceptChecklistSuggestion, dismissChecklistSuggestion,
        calendarEvents, addCalendarEvent, removeCalendarEvent,
        budget, setBudget,
        vendors, addVendor, updateVendor, removeVendor, reorderVendors,
        alerts, dismissAlert, syncAlerts,
        discussWithAI,
        extractAndUpdate,
        persistMessage,
        userEmail,
        signOut,
        saveProfile,
        changePassword,
      }}
    >
      {children}
    </WeddingContext.Provider>
  )
}

export function useWedding() {
  const ctx = useContext(WeddingContext)
  if (!ctx) throw new Error('useWedding must be used inside <WeddingProvider>')
  return ctx
}
