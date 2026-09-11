import type {ActSegment, Arrayable, Modifier, Text} from './types.ts'

const modifiers = new Set<Modifier>(['soft', 'whisper', 'loud', 'build-intensity', 'decrease-intensity', 'higher-pitch', 'lower-pitch', 'slow', 'fast', 'sing-song', 'singing', 'emphasis'])
const actions = new Set<ActSegment['action']>(['pause', 'long-pause', 'hum-tune', 'laugh', 'chuckle', 'giggle', 'cry', 'tsk', 'tongue-click', 'lip-smack', 'breath', 'inhale', 'exhale', 'sigh'])
const array = <T>(value: Arrayable<T>): ReadonlyArray<T> => {
  return Array.isArray(value) ? value : [value as T]
}

/** Strings are native Grok text, including any intentionally supplied inline markup. */
export default function serializeText(text: Text) {
  const result = array(text).map(segment => {
    if (typeof segment === 'string') {
      return segment
    }
    if (typeof segment !== 'object' || Object.is(segment, null)) {
      throw new TypeError('Expected a speech or action segment.')
    }
    if ('action' in segment) {
      if (!actions.has(segment.action) || 'text' in segment) {
        throw new TypeError('Invalid action segment.')
      }
      return `[${segment.action}]`
    }
    if (typeof segment.text !== 'string') {
      throw new TypeError('Speech segments require text.')
    }
    return array(segment.modifier).reduceRight((value, modifier) => {
      if (!modifiers.has(modifier)) {
        throw new TypeError('Invalid speech modifier.')
      }
      return `<${modifier}>${value}</${modifier}>`
    }, segment.text)
  }).join(' ')
  if (!result.trim() || result.length > 15_000) {
    throw new RangeError('Speech must contain 1–15 000 characters, including tags and separators.')
  }
  return result
}
