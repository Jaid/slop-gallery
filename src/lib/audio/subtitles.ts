import type {NarrationCursor, NarrationTiming} from 'use-narrator/core'

/** what the subtitles show at once: words `first` up to `last` (exclusive), spanning characters `from` to `to` of the text */
export type SubtitleGroup = Range & {
  first: number
  last: number
}
export type SubtitleWordState = 'current' | 'spoken' | 'upcoming'
type Range = {
  from: number
  to: number
}

/** How long a word stays current after its end, so the highlight doesn’t flicker between words spoken in one breath. */
const wordHold = 0.12

/**
 * Splits a narration into what the subtitles show at once: one sentence at a time, or several short sentences in a row while they fit `maximumLength` characters together.
 * `words` are the text’s words, see `narrationWords`.
 */
export function subtitleGroups(text: string, words: ReadonlyArray<Range>, maximumLength = 56): Array<SubtitleGroup> {
  const groups: Array<SubtitleGroup> = []
  const segmenter = new Intl.Segmenter('en', {granularity: 'sentence'})
  let first = 0
  for (const sentence of segmenter.segment(text)) {
    const end = sentence.index + sentence.segment.length
    let last = first
    while (last < words.length && words[last].from < end) {
      last++
    }
    if (last === first) {
      continue
    }
    const group = {
      first,
      last,
      from: words[first].from,
      to: words[last - 1].to,
    }
    const previous = groups.at(-1)
    if (previous && group.to - previous.from <= maximumLength) {
      previous.last = group.last
      previous.to = group.to
    } else {
      groups.push(group)
    }
    first = last
  }
  return groups
}

/** How far the current word’s yellow fill has come at `progress` through the word: the inverse of a sine ease-in-out, so the edge leaps off at the start, lingers mid-word and hurries to the end. */
export function easeFill(progress: number) {
  return Math.acos(1 - 2 * Math.min(1, Math.max(0, progress))) / Math.PI
}

/** the group holding `word`: the first one before speech starts, the last one after it ends */
export function subtitleGroupAt(groups: ReadonlyArray<SubtitleGroup>, word: number) {
  const index = groups.findIndex(group => word < group.last)
  return index === -1 ? groups.length - 1 : index
}

/** whether a word is already spoken, being spoken or still to come */
export function subtitleWordState(index: number, cursor: NarrationCursor, timing: NarrationTiming | undefined, ended: boolean): SubtitleWordState {
  if (ended || index < cursor.word) {
    return 'spoken'
  }
  if (index > cursor.word) {
    return 'upcoming'
  }
  const end = timing?.words[index]?.end
  return cursor.seconds !== undefined && end !== undefined && cursor.seconds > end + wordHold ? 'spoken' : 'current'
}

/**
 * When each character of the text starts being spoken, for letter-exact highlighting, or `undefined` without character spans.
 * Characters without a span of their own, like punctuation, start with the letter before them, or with their word.
 */
export function letterStarts(timing: NarrationTiming | undefined, length: number): Float32Array | undefined {
  if (!timing) {
    return
  }
  const {characters} = timing
  if (characters?.length !== length) {
    return
  }
  const starts = new Float32Array(length)
  let word = 0
  let previous = Number.NaN
  for (let index = 0; index < length; index++) {
    while (word < timing.words.length - 1 && timing.words[word].to <= index) {
      word++
      previous = Number.NaN
    }
    const own = characters[index]?.[0]
    starts[index] = own ?? (Number.isNaN(previous) ? timing.words[word]?.start ?? 0 : previous)
    previous = starts[index]!
  }
  return starts
}
