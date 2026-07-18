import type { Progress, Rating, ReviewState, VocabWord } from './types'

export const NEW_CARDS_PER_DAY = 20

const DAY_MS = 86_400_000

export function scheduleReview(
  previous: ReviewState | undefined,
  rating: Rating,
  now = new Date(),
): ReviewState {
  const current = previous ?? {
    interval: 0,
    ease: 2.5,
    repetitions: 0,
    due: now.toISOString(),
    lastReviewed: '',
    lapses: 0,
  }

  let { interval, ease, repetitions, lapses } = current
  let dueInMs: number

  if (rating === 'again') {
    interval = 0
    repetitions = 0
    ease = Math.max(1.3, ease - 0.2)
    lapses += 1
    dueInMs = 10 * 60 * 1000
  } else if (rating === 'hard') {
    interval = repetitions === 0 ? 1 : Math.max(1, Math.round(interval * 1.2))
    repetitions += 1
    ease = Math.max(1.3, ease - 0.15)
    dueInMs = interval * DAY_MS
  } else if (rating === 'easy') {
    interval =
      repetitions === 0 ? 4 : Math.max(4, Math.round(interval * ease * 1.3))
    repetitions += 1
    ease = Math.min(3, ease + 0.15)
    dueInMs = interval * DAY_MS
  } else {
    interval =
      repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.max(1, Math.round(interval * ease))
    repetitions += 1
    dueInMs = interval * DAY_MS
  }

  return {
    interval,
    ease,
    repetitions,
    lapses,
    lastReviewed: now.toISOString(),
    due: new Date(now.getTime() + dueInMs).toISOString(),
  }
}

export function getDueQueue(
  words: VocabWord[],
  progress: Progress,
  newLimit = NEW_CARDS_PER_DAY,
  now = new Date(),
): VocabWord[] {
  const dueReviews = words
    .filter((word) => progress[word.id] && new Date(progress[word.id].due) <= now)
    .sort(
      (a, b) =>
        new Date(progress[a.id].due).getTime() - new Date(progress[b.id].due).getTime(),
    )

  const newWords = words
    .filter((word) => !progress[word.id])
    .sort((a, b) => a.group - b.group || a.word.localeCompare(b.word))
    .slice(0, newLimit)

  return [...dueReviews, ...newWords]
}

export function formatNextInterval(
  previous: ReviewState | undefined,
  rating: Rating,
): string {
  const next = scheduleReview(previous, rating)
  const minutes = Math.round(
    (new Date(next.due).getTime() - Date.now()) / 60_000,
  )
  if (minutes < 60) return `${minutes}m`
  const days = Math.round(minutes / 1440)
  return `${days}d`
}
