export type VocabWord = {
  id: string
  word: string
  group: number
  partOfSpeech: string
  definition: string
  example: string
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export type ReviewState = {
  interval: number
  ease: number
  repetitions: number
  due: string
  lastReviewed: string
  lapses: number
}

export type Progress = Record<string, ReviewState>

export type DailyActivity = Record<string, number>
