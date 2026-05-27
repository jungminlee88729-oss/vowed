import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Search } from 'lucide-react'
import { getClient } from '../lib/anthropic'
import { useWedding } from '../context/WeddingContext'

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt({ brideName, groomName, weddingDate, weddingLocation, guestCount, weddingStyle, budget }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const bride     = brideName       || 'the bride'
  const groom     = groomName       || 'the groom'
  const names     = brideName && groomName ? `${brideName} and ${groomName}` : 'the couple'
  const location  = weddingLocation || 'their city'
  const guests    = guestCount      || 80
  const style     = weddingStyle?.length ? weddingStyle.join(', ') : 'their vision'
  const budgetFmt = budget ? `$${Number(budget).toLocaleString()}` : '$30,000'
  const dateStr   = weddingDate
    ? new Date(weddingDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'their wedding date'

  return `Today is ${today}.

COUPLE PROFILE — use this in every answer, every search, every recommendation:
Names: ${bride} and ${groom}
Wedding date: ${dateStr}
City / region: ${location}
Guest count: ~${guests}
Reception style: ${style}
Total budget: ${budgetFmt}

You are the Vowed Wedding Coordinator, a warm, knowledgeable wedding planning coach for ${names}. You never make decisions for the couple — you guide them. Every answer must feel tailored to their specific situation: their city, guest count, ${budgetFmt} total budget (which must cover everything — venue, food, flowers, photos, music, attire, and more), and their ${style} vision.

You know that wedding planning has a timeline with dependencies. Venue, photographer, and caterer must be booked 12+ months ahead. Final fittings, seating plans, and vendor confirmations happen 4–6 weeks before. Always tell them not just WHAT to plan but WHEN, given their specific date.

─── RESEARCH AGENT ────────────────────────────────────────────────────

MANDATORY WEB SEARCH — you MUST call web_search before answering any question about:
• Prices, costs, or budget estimates for any wedding element — never quote figures from memory
• Venues, vendors, caterers, photographers, florists, musicians — especially location-specific
• How far in advance to book or plan anything
• What questions to ask vendors before signing
• Day-of timelines, ceremony structure, logistics
• Popular choices (songs, flowers, themes, menus, cakes)
• Seasonal realities (outdoor weddings — weather, permits, backup plans)

The web_search tool is available to you — use it every time one of the above topics comes up. Search first, reason second, respond third. Do NOT answer pricing, vendor, or timing questions from training data alone.

SKIP search only for: simple emotional moments ("we're so excited!"), tasks they've asked you to perform ("add X to the calendar"), or questions fully answered in the last few messages.

RESEARCH RESPONSE STRUCTURE — when you have searched the web:
1. What you found — 1–2 direct sentences stating the key facts
2. 2–3 specific options or real examples with actual details — names, price ranges, timelines
3. "What this means for ${names}" — connect everything to their ${budgetFmt} budget, ${guests} guests, ${location} location, and ${style} style
4. One natural follow-up question woven into prose

ALWAYS EXPLAIN YOUR REASONING — always tell them WHY you are recommending what you are recommending. Be specific: "I'm suggesting these three venues because they can accommodate ${guests} guests, they fall within the budget range that leaves room for your other vendors, and they match the aesthetic you're going for." Never just list options without explaining the reasoning behind the selection.

─── CONVERSATION STYLE ────────────────────────────────────────────────

QUESTION LIMIT: Never ask more than 3 questions in a single response. Prioritise the 3 most important and save the rest for follow-up. Keep it conversational — like a thoughtful friend, not a questionnaire.

QUESTION STYLE: Weave questions naturally into prose. Never present them as a numbered list. Write "What kind of venue are you imagining — church, garden, ballroom? And roughly how many guests?" not "1. What venue? 2. How many guests?"`
}

// ─── Markdown renderer ───────────────────────────────────────────────────────
//
// Handles the subset of markdown Claude commonly outputs:
//   **bold**, *italic*, `inline code`, bullet lists, numbered lists,
//   and paragraph / line-break spacing.

function renderInline(text) {
  const parts = []
  // Priority: **bold** before *italic*, then `code`
  const re = /\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|`([^`\n]+?)`/g
  let cursor = 0
  for (const m of text.matchAll(re)) {
    if (m.index > cursor) parts.push(text.slice(cursor, m.index))
    if (m[1] !== undefined)
      parts.push(<strong key={m.index} style={{ fontWeight: 600 }}>{m[1]}</strong>)
    else if (m[2] !== undefined)
      parts.push(<em key={m.index}>{m[2]}</em>)
    else if (m[3] !== undefined)
      parts.push(
        <code
          key={m.index}
          style={{
            backgroundColor: '#F5EFE9',
            padding:         '1px 4px',
            borderRadius:    '3px',
            fontSize:        '0.85em',
            fontFamily:      'monospace',
          }}
        >
          {m[3]}
        </code>
      )
    cursor = m.index + m[0].length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts.length ? parts : [text]
}

function renderMarkdown(text) {
  if (!text) return null

  // Process line-by-line so mixed content (e.g. intro sentence + bullet list
  // with no blank line between them) renders correctly instead of collapsing
  // the whole block into a single list.
  const lines  = text.split('\n')
  const output = []
  let i = 0

  while (i < lines.length) {
    const line    = lines[i]
    const trimmed = line.trim()

    // Empty line → small vertical gap (acts as paragraph separator)
    if (!trimmed) {
      output.push(<div key={`gap-${i}`} style={{ height: '0.45em' }} />)
      i++
      continue
    }

    // Bullet list — consume every consecutive bullet line into one <ul>
    if (/^[-*•]\s/.test(trimmed)) {
      const start = i
      const items = []
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^[-*•]\s+/, '')
        items.push(
          <li key={i} style={{ marginBottom: '0.15em' }}>
            {renderInline(content)}
          </li>
        )
        i++
      }
      output.push(
        <ul key={`ul-${start}`} style={{ paddingLeft: '1.2em', margin: '0.1em 0', listStyleType: 'disc' }}>
          {items}
        </ul>
      )
      continue
    }

    // Numbered list — consume every consecutive numbered line into one <ol>
    if (/^\d+\.\s/.test(trimmed)) {
      const start = i
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^\d+\.\s+/, '')
        items.push(
          <li key={i} style={{ marginBottom: '0.15em' }}>
            {renderInline(content)}
          </li>
        )
        i++
      }
      output.push(
        <ol key={`ol-${start}`} style={{ paddingLeft: '1.3em', margin: '0.1em 0' }}>
          {items}
        </ol>
      )
      continue
    }

    // Plain text line
    output.push(
      <p key={`p-${i}`} style={{ margin: 0, lineHeight: 'inherit' }}>
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <>{output}</>
}

// ─── Client-side research detector ───────────────────────────────────────────
// Decides immediately (before any API response) whether a message is likely
// to trigger web search — so we can show ResearchingIndicator right away
// instead of waiting for the first streamEvent to arrive.

const RESEARCH_KEYWORDS = [
  'how much', 'how far', 'how early', 'in advance',
  'budget', 'cost', 'price', 'pricing', 'expensive', 'cheap', 'afford', 'average',
  'find', 'recommend', 'suggest', 'best', 'top rated', 'popular',
  'venue', 'caterer', 'catering', 'photographer', 'photography',
  'florist', 'flower', 'musician', 'band', 'dj', 'baker', 'cake',
  'church', 'officiant', 'pre-cana', 'catholic',
  'what should', 'what questions', 'what are', 'what do', 'what does',
  'when should', 'when do', 'when to book', 'when to hire',
  'typical', 'usually', 'normally', 'generally',
  'outdoor wedding', 'garden wedding',
  'nyc', 'new york', 'brooklyn', 'manhattan', 'queens',
  'timeline', 'day-of', 'day of',
]

const NON_RESEARCH_RE = /^(add |create |remove |delete |mark |schedule |we'?re |we are |i'?m |i am |just |we just |we got |yay|congrats|thank)/i

function looksLikeResearch(text) {
  const t = text.trim()
  if (NON_RESEARCH_RE.test(t)) return false
  const lower = t.toLowerCase()
  return RESEARCH_KEYWORDS.some(kw => lower.includes(kw))
}

// ─── Quick-start chips ────────────────────────────────────────────────────────

const CHIPS = [
  "Where do we even start?",
  "Help me think through our venue",
  "What should we be doing right now?",
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <CoachAvatar />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium px-0.5" style={{ color: '#B4627A', fontFamily: 'var(--font-body)' }}>
          Vowed Wedding Coordinator
        </span>
        <div className="rounded-2xl rounded-tl-sm px-4 py-3.5" style={{ backgroundColor: '#fff', border: '1px solid #EDE8E3' }}>
          <div className="flex gap-1.5 items-center h-4">
            <span className="typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="typing-dot" style={{ animationDelay: '180ms' }} />
            <span className="typing-dot" style={{ animationDelay: '360ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ResearchingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <CoachAvatar />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium px-0.5" style={{ color: '#B4627A', fontFamily: 'var(--font-body)' }}>
          Vowed Wedding Coordinator
        </span>
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3.5"
          style={{ backgroundColor: '#fff', border: '1px solid #EDE8E3' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-sm"
              style={{ color: '#8C8480', fontFamily: 'var(--font-body)' }}
            >
              Researching this for you
            </span>
            <div className="flex gap-1.5 items-center">
              <span className="typing-dot" style={{ animationDelay: '0ms' }} />
              <span className="typing-dot" style={{ animationDelay: '180ms' }} />
              <span className="typing-dot" style={{ animationDelay: '360ms' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CoachAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-[22px]"
      style={{ backgroundColor: '#B4627A' }}
    >
      <Sparkles size={13} color="#fff" />
    </div>
  )
}

function UserAvatar({ sender, brideName }) {
  // Bride gets rose, everyone else gets sage
  const color = sender === brideName ? '#B4627A' : '#5A7A6A'
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-[22px] text-xs font-semibold select-none"
      style={{ backgroundColor: color, color: '#fff', fontFamily: 'var(--font-body)' }}
    >
      {sender.charAt(0)}
    </div>
  )
}

function AiMessage({ message, showChips, isStreaming, onChipClick }) {
  return (
    <div className="flex items-start gap-3">
      <CoachAvatar />
      <div className="flex flex-col gap-1.5 min-w-0" style={{ maxWidth: 'min(78%, 560px)' }}>
        <span className="text-xs font-medium px-0.5" style={{ color: '#B4627A', fontFamily: 'var(--font-body)' }}>
          Vowed Wedding Coordinator
        </span>
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed${isStreaming ? ' streaming-cursor' : ''}`}
          style={{
            backgroundColor: message.isError ? '#FFF5F7' : '#fff',
            border:          `1px solid ${message.isError ? '#F2C4CF' : '#EDE8E3'}`,
            fontFamily:      'var(--font-body)',
            color:           '#2C2825',
            wordBreak:       'break-word',
          }}
        >
          {/* Researched-answer badge — shown when web search was actually used */}
          {message.wasResearched && (
            <div
              className="flex items-center gap-1.5 pb-2.5 mb-2.5"
              style={{ borderBottom: '1px solid #EDF4F1' }}
            >
              <Search size={10} style={{ color: '#5A7A6A' }} />
              <span
                className="text-xs font-medium"
                style={{
                  color:         '#6B9E8A',
                  fontFamily:    'var(--font-body)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Researched answer
              </span>
            </div>
          )}
          {renderMarkdown(message.content)}
        </div>
        {showChips && (
          <div className="flex flex-wrap gap-2 mt-0.5 px-0.5">
            {CHIPS.map(chip => (
              <SuggestionChip key={chip} label={chip} onClick={() => onChipClick(chip)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserMessage({ message, brideName }) {
  const color = message.sender === brideName ? '#B4627A' : '#5A7A6A'
  return (
    <div className="flex items-start justify-end gap-3">
      <div className="flex flex-col items-end gap-1.5 min-w-0" style={{ maxWidth: 'min(78%, 560px)' }}>
        <span className="text-xs font-medium px-0.5" style={{ color, fontFamily: 'var(--font-body)' }}>
          {message.sender}
        </span>
        <div
          className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
          style={{ backgroundColor: color, color: '#fff', fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {message.content}
        </div>
      </div>
      <UserAvatar sender={message.sender} />
    </div>
  )
}

function SuggestionChip({ label, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-3.5 py-1.5 rounded-full text-xs transition-all duration-150"
      style={{
        fontFamily:      'var(--font-body)',
        border:          '1px solid #B4627A',
        color:           '#B4627A',
        backgroundColor: hovered ? '#F2E0E5' : 'transparent',
        cursor:          'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AiCoach() {
  const {
    messages, setMessages,
    pendingQuestion, setPendingQuestion,
    brideName, groomName,
    weddingDate, weddingLocation, guestCount, weddingStyle, budget,
    extractAndUpdate,
    persistMessage,
  } = useWedding()

  const activeUser = brideName || 'You'

  const [input,            setInput]            = useState('')
  const [isTyping,         setIsTyping]         = useState(false)
  const [isResearching,    setIsResearching]    = useState(false)
  const [streamingId,      setStreamingId]      = useState(null)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  const bottomRef      = useRef(null)
  const inputRef       = useRef(null)
  const bannerTimerRef = useRef(null)

  const isBusy    = isTyping || isResearching || !!streamingId
  const showChips = messages.length === 1 && !isBusy

  // Auto-scroll when messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Pre-fill input when "Discuss with AI →" is clicked in the Checklist
  useEffect(() => {
    if (pendingQuestion) {
      setInput(pendingQuestion)
      setPendingQuestion(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [pendingQuestion, setPendingQuestion])

  // Clean up the banner dismissal timer on unmount
  useEffect(() => () => clearTimeout(bannerTimerRef.current), [])

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || isBusy) return

    const userMsg = {
      id:      `user-${Date.now()}`,
      role:    'user',
      content: trimmed,
      sender:  activeUser,
    }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    persistMessage(userMsg)
    setInput('')

    // Show the right indicator immediately — don't wait for the first API event
    const isResearchQuery = looksLikeResearch(trimmed)
    if (isResearchQuery) {
      setIsResearching(true)
    } else {
      setIsTyping(true)
    }

    const apiMessages = updatedMessages
      .filter(m => !m.isError)
      .map(({ role, content }) => ({ role, content }))

    try {
      const client = getClient()
      const aiMsgId = `ai-${Date.now()}`
      let firstToken    = true
      let accumulatedContent = ''
      let usedWebSearch = false   // flipped to true when tool_use block is detected

      const stream = client.messages.stream({
        model:      'claude-sonnet-4-5',
        max_tokens: 2048,
        tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
        system:     buildSystemPrompt({ brideName, groomName, weddingDate, weddingLocation, guestCount, weddingStyle, budget }),
        messages:   apiMessages,
      })

      // Confirm web search is actually running — also catches non-research questions
      // where the model independently decides to search (upgrades typing → researching)
      stream.on('streamEvent', (event) => {
        if (
          event.type === 'content_block_start' &&
          event.content_block?.type === 'tool_use'
        ) {
          usedWebSearch = true
          setIsTyping(false)
          setIsResearching(true)
        }
      })

      stream.on('text', (delta) => {
        accumulatedContent += delta
        if (firstToken) {
          firstToken = false
          setIsTyping(false)
          setIsResearching(false)   // search done; response now streaming
          setStreamingId(aiMsgId)
          setMessages(prev => [
            ...prev,
            {
              id:           aiMsgId,
              role:         'assistant',
              content:      delta,
              sender:       'Vowed Wedding Coordinator',
              wasResearched: usedWebSearch,  // stamp the message for the badge
            },
          ])
        } else {
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + delta } : m)
          )
        }
      })

      await stream.finalMessage()
      setStreamingId(null)
      setIsResearching(false)

      // Persist the completed AI message
      persistMessage({
        id:           aiMsgId,
        role:         'assistant',
        content:      accumulatedContent,
        sender:       'Vowed Wedding Coordinator',
        wasResearched: usedWebSearch,
      })

      // Build final message list including the just-completed AI response
      const finalMessages = [
        ...updatedMessages,
        { id: aiMsgId, role: 'assistant', content: accumulatedContent, sender: 'Vowed Wedding Coordinator', wasResearched: usedWebSearch },
      ]

      // Background extraction — fire-and-forget; show banner when it runs
      extractAndUpdate(finalMessages)
        .then(() => {
          if (finalMessages.length >= 3) {
            setShowUpdateBanner(true)
            clearTimeout(bannerTimerRef.current)
            bannerTimerRef.current = setTimeout(() => setShowUpdateBanner(false), 4000)
          }
        })
        .catch(e => console.warn('[Vowed] Extraction skipped:', e.message))

    } catch (err) {
      console.error('Anthropic API error:', err)
      setIsTyping(false)
      setIsResearching(false)
      setStreamingId(null)
      const isKeyMissing =
        !import.meta.env.VITE_ANTHROPIC_API_KEY ||
        import.meta.env.VITE_ANTHROPIC_API_KEY === 'your_api_key_here'
      setMessages(prev => [
        ...prev,
        {
          id:      `error-${Date.now()}`,
          role:    'assistant',
          content: isKeyMissing
            ? "It looks like the API key isn't set yet. Add your Anthropic key to the .env file as VITE_ANTHROPIC_API_KEY, then restart the dev server."
            : `Something went wrong: ${err.message ?? 'Unknown error'}. Please try again.`,
          sender:  'Vowed Wedding Coordinator',
          isError: true,
        },
      ])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeUser, isBusy, brideName, groomName, weddingDate, weddingLocation, guestCount, weddingStyle, budget])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const canSend = input.trim().length > 0 && !isBusy

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Column whisper bar ── */}
      <div
        className="shrink-0 flex items-center gap-2.5 px-6"
        style={{
          backgroundColor: '#1C1410',
          borderBottom:    '1px solid rgba(255,255,255,0.07)',
          height:          '36px',
        }}
      >
        {/* Pulsing live dot */}
        <div className="relative shrink-0 w-1.5 h-1.5">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: '#5A7A6A', opacity: 0.40 }}
          />
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#5A7A6A' }} />
        </div>

        {/* Whisper subtitle */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color:      'rgba(253,250,248,0.32)',
            fontSize:   '11px',
            lineHeight: 1,
            letterSpacing: '0.01em',
          }}
        >
          Updates your checklist, calendar &amp; finance as you chat
        </p>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-7 px-7 space-y-5" style={{ backgroundColor: '#FDFAF8' }}>
        {messages.map(msg =>
          msg.role === 'assistant' ? (
            <AiMessage
              key={msg.id}
              message={msg}
              showChips={msg.id === 'init' && showChips}
              isStreaming={msg.id === streamingId}
              onChipClick={sendMessage}
            />
          ) : (
            <UserMessage key={msg.id} message={msg} brideName={brideName} />
          )
        )}
        {isTyping      && <TypingIndicator />}
        {isResearching && <ResearchingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Sage green update banner (appears after AI syncs data) ── */}
      {showUpdateBanner && (
        <div
          className="shrink-0 flex items-center gap-2 px-6 py-2.5"
          style={{
            backgroundColor: '#E4EDEA',
            borderTop:       '1px solid #C5D9D2',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: '#5A7A6A' }}
          />
          <p
            className="text-xs font-medium"
            style={{ color: '#3B5E50', fontFamily: 'var(--font-body)' }}
          >
            Checklist &amp; calendar updated from this conversation
          </p>
        </div>
      )}

      {/* ── Input area ── */}
      <div
        className="shrink-0 border-t px-7 py-4"
        style={{ borderColor: '#EDE8E3', backgroundColor: '#FDFAF8' }}
      >
        <div
          className="flex items-center gap-3 rounded-2xl border px-4 py-3"
          style={{ borderColor: '#DDD5CC', backgroundColor: '#fff' }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message as ${activeUser}…`}
            disabled={isBusy}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ fontFamily: 'var(--font-body)', color: '#2C2825' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            aria-label="Send message"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: canSend ? '#B4627A' : '#EDE8E3',
              color:           canSend ? '#fff'    : '#B4ABA5',
              cursor:          canSend ? 'pointer' : 'default',
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <p
          className="text-center text-xs mt-2"
          style={{ fontFamily: 'var(--font-body)', color: '#B4ABA5' }}
        >
          Speaking as{' '}
          <span
            className="font-medium"
            style={{ color: '#B4627A' }}
          >
            {activeUser}
          </span>
        </p>
      </div>
    </div>
  )
}
