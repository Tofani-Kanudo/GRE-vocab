import { readFile, writeFile } from 'node:fs/promises'
import natural from 'natural'

const input = new URL('../src/data/vocab.json', import.meta.url)
const words = JSON.parse(await readFile(input, 'utf8'))
const wordnet = new natural.WordNet()

const lookup = (word) =>
  new Promise((resolve) => wordnet.lookup(word, (results) => resolve(results)))

const partNames = {
  a: 'adjective',
  n: 'noun',
  r: 'adverb',
  s: 'adjective',
  v: 'verb',
}

const overrides = {
  abate: ['verb', 'To become less intense or widespread.', 'The winds finally began to abate after midnight.'],
  commensurate: ['adjective', 'Corresponding in size or degree; proportionate.', 'The salary should be commensurate with the responsibility of the role.'],
  flummoxed: ['adjective', 'Completely bewildered or perplexed.', 'The unexpected question left even the expert flummoxed.'],
  tempestuous: ['adjective', 'Marked by strong, turbulent, or conflicting emotion.', 'Their tempestuous partnership produced both brilliant work and bitter arguments.'],
  supplicate: ['verb', 'To ask or beg for something humbly and earnestly.', 'The villagers came to supplicate the governor for emergency aid.'],
  conflagration: ['noun', 'A large, destructive fire.', 'The drought turned a small spark into a vast conflagration.'],
  extemporize: ['verb', 'To speak or perform without preparation; improvise.', 'When her notes vanished, she had to extemporize the closing remarks.'],
  finicky: ['adjective', 'Excessively particular and difficult to please.', 'The finicky editor rejected every draft over minor details.'],
  intertwined: ['adjective', 'Twisted together or closely connected.', 'The region’s economic and political problems are deeply intertwined.'],
  recant: ['verb', 'To formally withdraw a previously stated belief or claim.', 'Under pressure, the witness refused to recant her testimony.'],
  'all-ecompassing': ['adjective', 'Including or affecting everything; all-encompassing.', 'The report offered an all-encompassing account of the crisis.'],
  harrowing: ['adjective', 'Acutely distressing or painful.', 'The survivor gave a harrowing account of the expedition.'],
  'stem from': ['verb', 'To originate in or be caused by something.', 'Many of the delays stem from outdated procedures.'],
  warranted: ['adjective', 'Justified or necessary in the circumstances.', 'Given the new evidence, further investigation was warranted.'],
}

const sentenceFor = (word, part) => {
  if (part === 'verb') {
    return `After careful debate, the committee decided to ${word} the original proposal.`
  }
  if (part === 'adjective') {
    return `Her ${word} response changed the tone of the entire discussion.`
  }
  if (part === 'adverb') {
    return `The witness spoke ${word}, revealing more than the question required.`
  }
  if (part === 'noun') {
    return `The unexpected ${word} soon became the central issue in the discussion.`
  }
  return `The context made the meaning of “${word}” clear to every careful reader.`
}

let misses = 0
for (const [index, item] of words.entries()) {
  const override = overrides[item.word]
  if (override) {
    ;[item.partOfSpeech, item.definition, item.example] = override
    continue
  }
  const results = await lookup(item.word)
  const result = results[0]
  if (result) {
    const part = partNames[result.pos] ?? ''
    const gloss = result.def.replace(/\s+/g, ' ').trim()
    const exampleMatch = gloss.match(/;\s*["“](.+?)["”]\s*$/)
    const definition = gloss
      .replace(/;\s*["“].+?["”]\s*$/, '')
      .replace(/^[a-z]/, (letter) => letter.toUpperCase())

    item.partOfSpeech = part
    item.definition = definition
    item.example = exampleMatch?.[1] ?? sentenceFor(item.word, part)
  } else {
    misses += 1
    item.partOfSpeech = ''
    item.definition = 'A word used to express a precise idea or quality in formal English.'
    item.example = sentenceFor(item.word, '')
  }

  if ((index + 1) % 100 === 0) {
    process.stdout.write(`Enriched ${index + 1}/${words.length}\r`)
  }
}

await writeFile(input, `${JSON.stringify(words, null, 2)}\n`)
console.log(`Enriched ${words.length} words with ${misses} WordNet misses.`)
