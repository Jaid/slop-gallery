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
 * When each character of the text starts being spoken, so the subtitles can turn it yellow, or `undefined` without a timing.
 * Words with character spans keep them, and their characters without one, like punctuation, start with the letter before them. Words without spread their characters over the word’s duration along the inverse of a sine ease-in-out: the yellow sets off quickly, lingers mid-word and hurries to the end.
 */
export function letterStarts(timing: NarrationTiming | undefined, length: number): Float32Array | undefined {
  if (!timing) {
    return
  }
  const characters = timing.characters?.length === length ? timing.characters : undefined
  const starts = new Float32Array(length)
  for (const word of timing.words) {
    if (characters?.slice(word.from, word.to).some(Boolean)) {
      let previous = word.start
      for (let index = word.from; index < word.to; index++) {
        previous = characters[index]?.[0] ?? previous
        starts[index] = previous
      }
      continue
    }
    const count = word.to - word.from
    for (let index = 0; index < count; index++) {
      starts[word.from + index] = word.start + (word.end - word.start) * (1 - Math.cos(Math.PI * index / count)) / 2
    }
  }
  return starts
}
