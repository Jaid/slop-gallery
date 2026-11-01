import type {NarrationTiming, NarrationWord, RecognizedWord} from './types.ts'
import type {AudioProgress} from 'use-audio-queue/core'

type Range = Pick<NarrationWord, 'from' | 'to'>

/** the whitespace-separated words of a narration’s text as character ranges, the units every timing refers to */
export function narrationWords(text: string): Array<Range> {
  return text.matchAll(/\S+/g).map(match => ({
    from: match.index,
    to: match.index + match[0].length,
  })).toArray()
}

/** A character as speech recognition would spell it: lowercase without diacritics, or nothing for punctuation and spaces. */
const fold = (character: string) => character.normalize('NFD').toLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, '')
export type NarrationCursor = {
  /** how far into the current word speech is, from 0 to 1; always 1 without a timeline */
  progress: number
  /** seconds into the audio, if playback has a timeline */
  seconds?: number
  /** the word being spoken or, in a pause, the last one spoken; -1 before the first */
  word: number
}

/**
 * Projects recognized words (speech-to-text output with timestamps) onto the narration’s own text through a character-level edit alignment, so split, merged or misheard words only cost the characters they get wrong.
 * Every word of the text gets a span; words the recognizer missed entirely sit between their neighbors. No character spans: interpolated letters within a recognized word would only pretend to be exact.
 */
export function timingFromWords(text: string, recognized: ReadonlyArray<RecognizedWord>): NarrationTiming {
  const ranges = narrationWords(text)
  const reference: Array<{
    character: string
    word: number
  }> = []
  for (const [word, range] of ranges.entries()) {
    for (const character of fold(text.slice(range.from, range.to))) {
      reference.push({
        character,
        word,
      })
    }
  }
  const hypothesis: Array<{
    character: string
    end: number
    start: number
  }> = []
  for (const token of recognized) {
    const characters = fold(token.word)
    const duration = Math.max(0, token.end - token.start)
    for (let index = 0; index < characters.length; index++) {
      const character = characters[index]
      hypothesis.push({
        character,
        start: token.start + index / characters.length * duration,
        end: token.start + (index + 1) / characters.length * duration,
      })
    }
  }
  const columns = hypothesis.length + 1
  const cost = new Uint32Array((reference.length + 1) * columns)
  for (let row = 0; row <= reference.length; row++) {
    cost[row * columns] = row
  }
  for (let column = 0; column < columns; column++) {
    cost[column] = column
  }
  for (let row = 1; row <= reference.length; row++) {
    for (let column = 1; column < columns; column++) {
      const substitution = cost[(row - 1) * columns + column - 1] + Number(reference[row - 1].character !== hypothesis[column - 1].character)
      cost[row * columns + column] = Math.min(substitution, cost[(row - 1) * columns + column] + 1, cost[row * columns + column - 1] + 1)
    }
  }
  const starts: Array<number | undefined> = Array.from({length: ranges.length})
  const ends: Array<number | undefined> = Array.from({length: ranges.length})
  let row = reference.length
  let column = hypothesis.length
  while (row > 0 && column > 0) {
    const here = cost[row * columns + column]
    // Walking back from the end, ties skip a letter of the text first, so recognized letters attach as early as they can. Otherwise a recognizer that stopped short would spread its last letters over far later words.
    if (here === cost[(row - 1) * columns + column] + 1) {
      row--
    } else if (here === cost[(row - 1) * columns + column - 1] + Number(reference[row - 1].character !== hypothesis[column - 1].character)) {
      // A misheard letter is still spoken at that moment, so substitutions keep their timing.
      const {word} = reference[row - 1]
      starts[word] = hypothesis[column - 1].start
      ends[word] ??= hypothesis[column - 1].end
      row--
      column--
    } else {
      column--
    }
  }
  return {words: fillWords(ranges, starts, ends)}
}

/** Builds a timing from one span per character of the text (`null` for characters without one), as forced aligners and some speech providers report them. */
export function timingFromCharacters(text: string, characters: ReadonlyArray<readonly [start: number, end: number] | null>): NarrationTiming {
  if (characters.length !== text.length) {
    throw new RangeError(`Expected ${text.length} character spans, got ${characters.length}.`)
  }
  const ranges = narrationWords(text)
  const spans = ranges.map(range => characters.slice(range.from, range.to).filter(span => span !== null))
  return {
    words: fillWords(ranges, spans.map(own => own[0]?.[0]), spans.map(own => own.at(-1)?.[1])),
    characters,
  }
}

/**
 * A rough timing for audio without one: the duration spread over the letters, with pauses weighted in at punctuation. Good enough to pace sentences, not to follow words exactly.
 */
export function estimateTiming(text: string, duration: number): NarrationTiming {
  const ranges = narrationWords(text)
  const letters = (range: Range) => Math.max(1, fold(text.slice(range.from, range.to)).length)
  const pause = (range: Range) => {
    const last = text[range.to - 1] ?? ''
    if (/[!.?…]/.test(last)) {
      return 8
    }
    return /[,:;–—]/.test(last) ? 4 : 1
  }
  const total = ranges.reduce((sum, range, index) => sum + letters(range) + (index < ranges.length - 1 ? pause(range) : 0), 0)
  let cursor = 0
  return {
    words: ranges.map((range, index) => {
      const start = cursor / total * duration
      cursor += letters(range)
      const end = cursor / total * duration
      if (index < ranges.length - 1) {
        cursor += pause(range)
      }
      return {
        ...range,
        start,
        end,
      }
    }),
  }
}

/** Where speech is within `words` (the text’s words, see `narrationWords`), from a playback progress and, for timelines, the narration’s timing. */
export function narrationCursor(words: ReadonlyArray<Range>, progress: AudioProgress | undefined, timing?: NarrationTiming): NarrationCursor {
  if (!progress) {
    return {
      word: -1,
      progress: 0,
    }
  }
  if ('character' in progress) {
    return {
      word: words.findLastIndex(word => word.from <= progress.character),
      progress: 1,
    }
  }
  const timed: ReadonlyArray<NarrationWord> = timing?.words ?? []
  const word = timed.findLastIndex(span => span.start <= progress.seconds)
  if (word === -1) {
    return {
      word,
      seconds: progress.seconds,
      progress: 0,
    }
  }
  const span = timed[word]
  return {
    word,
    seconds: progress.seconds,
    progress: Math.min(1, Math.max(0, (progress.seconds - span.start) / Math.max(0.05, span.end - span.start))),
  }
}

/** Gives words without any time of their own the end of the previous timed word and the start of the next one, then makes starts non-decreasing. */
function fillWords(ranges: ReadonlyArray<Range>, starts: ReadonlyArray<number | undefined>, ends: ReadonlyArray<number | undefined>): Array<NarrationWord> {
  const words: Array<NarrationWord> = []
  for (const [index, range] of ranges.entries()) {
    let start = starts[index]
    let end = ends[index]
    if (start === undefined || end === undefined) {
      const previous = words.at(-1)?.end
      const next = starts.slice(index + 1).find(value => value !== undefined)
      start = previous ?? next ?? 0
      end = next ?? previous ?? start
    }
    start = Math.max(start, words.at(-1)?.start ?? 0)
    words.push({
      ...range,
      start,
      end: Math.max(start, end),
    })
  }
  return words
}
