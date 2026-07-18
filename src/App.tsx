import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import vocabData from './data/vocab.json'
import { formatNextInterval, getDueQueue, scheduleReview } from './srs'
import type { DailyActivity, Progress, Rating, VocabWord } from './types'
import './App.css'

const words = vocabData as VocabWord[]
const groups = Array.from({ length: 37 }, (_, index) => index + 1)
type View = 'home' | 'review' | 'groups' | 'browse'

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function calculateStreak(activity: DailyActivity) {
  let streak = 0
  const cursor = new Date()
  if (!activity[localDateKey(cursor)]) cursor.setDate(cursor.getDate() - 1)
  while (activity[localDateKey(cursor)]) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function App() {
  const [view, setView] = useState<View>('home')
  const [progress, setProgress] = useState<Progress>(() =>
    loadStored('lexiloop-progress-v1', {}),
  )
  const [activity, setActivity] = useState<DailyActivity>(() =>
    loadStored('lexiloop-activity-v1', {}),
  )
  const [queue, setQueue] = useState<VocabWord[]>([])
  const [cursor, setCursor] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sessionReviewed, setSessionReviewed] = useState(0)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  useEffect(() => {
    localStorage.setItem('lexiloop-progress-v1', JSON.stringify(progress))
  }, [progress])

  useEffect(() => {
    localStorage.setItem('lexiloop-activity-v1', JSON.stringify(activity))
  }, [activity])

  const dueQueue = getDueQueue(words, progress)
  const learned = Object.keys(progress).length
  const mastered = Object.values(progress).filter((state) => state.interval >= 21).length
  const currentCard = queue[cursor]
  const searchResults = deferredQuery
    ? words.filter(
        (word) =>
          word.word.toLowerCase().includes(deferredQuery) ||
          word.definition.toLowerCase().includes(deferredQuery),
      )
    : words

  const navigate = (next: View) => startTransition(() => setView(next))

  const beginSession = (cards: VocabWord[]) => {
    setQueue(cards)
    setCursor(0)
    setFlipped(false)
    setSessionReviewed(0)
    navigate('review')
  }

  const rateCard = (rating: Rating) => {
    if (!currentCard) return
    const now = new Date()
    setProgress((existing) => ({
      ...existing,
      [currentCard.id]: scheduleReview(existing[currentCard.id], rating, now),
    }))
    setActivity((existing) => ({
      ...existing,
      [localDateKey(now)]: (existing[localDateKey(now)] ?? 0) + 1,
    }))
    setSessionReviewed((count) => count + 1)
    if (rating === 'again') setQueue((cards) => [...cards, currentCard])
    setFlipped(false)
    setCursor((index) => index + 1)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="wordmark" onClick={() => navigate('home')}>
          Lexi<span>loop</span>
        </button>
        <span className="streak">{calculateStreak(activity)} day streak</span>
      </header>

      {view === 'home' && (
        <section className="view home-view">
          <div className="hero-copy">
            <p className="eyebrow">GRE vocabulary, remembered</p>
            <h1>Make every word stick.</h1>
            <p className="hero-subtitle">
              Short daily sessions adapt to your memory, so difficult words return
              before you forget them.
            </p>
            <button
              className="primary-action"
              onClick={() => beginSession(dueQueue)}
              disabled={dueQueue.length === 0}
            >
              {dueQueue.length ? `Review ${dueQueue.length} words` : 'All caught up'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="progress-section">
            <div className="progress-heading">
              <h2>Your vocabulary</h2>
              <span>{Math.round((learned / words.length) * 100)}%</span>
            </div>
            <div className="progress-track" aria-label={`${learned} of ${words.length} learned`}>
              <div style={{ width: `${(learned / words.length) * 100}%` }} />
            </div>
            <div className="stat-line">
              <div><strong>{learned}</strong><span>seen</span></div>
              <div><strong>{mastered}</strong><span>mastered</span></div>
              <div><strong>{words.length - learned}</strong><span>new</span></div>
            </div>
          </div>
        </section>
      )}

      {view === 'review' && (
        <section className="view review-view">
          {currentCard ? (
            <>
              <div className="session-meta">
                <button className="text-button" onClick={() => navigate('home')}>End</button>
                <span>{cursor + 1} / {queue.length}</span>
                <span>Group {currentCard.group}</span>
              </div>
              <div className="session-progress">
                <div style={{ width: `${((cursor + 1) / queue.length) * 100}%` }} />
              </div>
              <button
                className={`flashcard ${flipped ? 'is-flipped' : ''}`}
                onClick={() => setFlipped(true)}
                aria-label={flipped ? `${currentCard.word}: ${currentCard.definition}` : `Reveal ${currentCard.word}`}
              >
                <div className="card-face card-front">
                  <span>{currentCard.partOfSpeech || 'vocabulary'}</span>
                  <h1>{currentCard.word}</h1>
                  <p>Tap to reveal</p>
                </div>
                <div className="card-face card-back">
                  <span>{currentCard.partOfSpeech || 'vocabulary'}</span>
                  <h2>{currentCard.word}</h2>
                  <p className="definition">{currentCard.definition}</p>
                  <blockquote>“{currentCard.example}”</blockquote>
                </div>
              </button>
              {flipped ? (
                <div className="rating-area">
                  <p>How well did you remember?</p>
                  <div className="rating-grid">
                    {(['again', 'hard', 'good', 'easy'] as Rating[]).map((rating) => (
                      <button key={rating} onClick={() => rateCard(rating)}>
                        <strong>{rating}</strong>
                        <span>{formatNextInterval(progress[currentCard.id], rating)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button className="reveal-button" onClick={() => setFlipped(true)}>
                  Show answer
                </button>
              )}
            </>
          ) : (
            <div className="complete-state">
              <span className="complete-mark">✓</span>
              <p className="eyebrow">Session complete</p>
              <h1>{sessionReviewed} reviews done.</h1>
              <p>Your schedule has been updated. Come back tomorrow to keep the loop going.</p>
              <button className="primary-action" onClick={() => navigate('home')}>
                Back home <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </section>
      )}

      {view === 'groups' && (
        <section className="view list-view">
          <div className="section-intro">
            <p className="eyebrow">Focused practice</p>
            <h1>Study by group.</h1>
            <p>Pick a GregMat group for an unscheduled practice session.</p>
          </div>
          <div className="group-list">
            {groups.map((group) => {
              const groupWords = words.filter((word) => word.group === group)
              const groupSeen = groupWords.filter((word) => progress[word.id]).length
              return (
                <button key={group} onClick={() => beginSession(groupWords)}>
                  <span className="group-number">{String(group).padStart(2, '0')}</span>
                  <span className="group-copy">
                    <strong>Group {group}</strong>
                    <small>{groupSeen} of {groupWords.length} seen</small>
                  </span>
                  <span className="group-arrow">→</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {view === 'browse' && (
        <section className="view list-view">
          <div className="section-intro browse-intro">
            <p className="eyebrow">All {words.length} words</p>
            <h1>Browse the library.</h1>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search words or definitions"
              aria-label="Search vocabulary"
            />
          </div>
          <div className="word-list">
            {searchResults.map((word) => (
              <details key={word.id}>
                <summary>
                  <span><strong>{word.word}</strong><small>Group {word.group}</small></span>
                  <span className="detail-plus">+</span>
                </summary>
                <div>
                  <p>{word.definition}</p>
                  <blockquote>“{word.example}”</blockquote>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {view !== 'review' && (
        <nav className="bottom-nav" aria-label="Main navigation">
          <button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}>
            <span aria-hidden="true">⌂</span>Today
          </button>
          <button className={view === 'groups' ? 'active' : ''} onClick={() => navigate('groups')}>
            <span aria-hidden="true">▦</span>Groups
          </button>
          <button className={view === 'browse' ? 'active' : ''} onClick={() => navigate('browse')}>
            <span aria-hidden="true">⌕</span>Browse
          </button>
        </nav>
      )}
    </main>
  )
}

export default App
