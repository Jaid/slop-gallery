import type {Modifier, Text} from '../src/main.ts'

import {describe, expect, test} from 'bun:test'

import GrokSpeaker, {serializeText} from '../src/main.ts'

describe('text', () => {
  test('supports single strings, nested modifiers and inline actions', () => {
    expect(serializeText('Hello.')).toBe('Hello.')
    expect(serializeText([
      {
        text: 'Abyssal Lantern.',
        modifier: ['loud', 'slow'],
      },
      {action: 'giggle'},
      'GPT-6 Astra.',
    ])).toBe('<loud><slow>Abyssal Lantern.</slow></loud> [giggle] GPT-6 Astra.')
    expect(serializeText({
      text: 'Hello.',
      modifier: 'loud',
    })).toBe('<loud>Hello.</loud>')
    expect(serializeText({action: 'long-pause'})).toBe('[long-pause]')
    expect(serializeText({
      text: 'Hello.',
      modifier: [],
    })).toBe('Hello.')
  })
  test('preserves native markup, punctuation, accents and Unicode', () => {
    expect(serializeText('<loud>Quantum Moiré & 🪢.</loud>')).toBe('<loud>Quantum Moiré & 🪢.</loud>')
  })
  test.each(['soft', 'whisper', 'loud', 'build-intensity', 'decrease-intensity', 'higher-pitch', 'lower-pitch', 'slow', 'fast', 'sing-song', 'singing', 'emphasis'] as Array<Modifier>)('supports %s', modifier => {
    expect(serializeText({
      text: 'Test.',
      modifier,
    })).toBe(`<${modifier}>Test.</${modifier}>`)
  })
  test.each([
    '', ' ', [], null, 3, {text: 'a'}, {action: 'dance'}, {
      text: 'a',
      modifier: 'shout',
    }, {
      action: 'pause',
      text: 'a',
    },
  ].map(value => [value]))('rejects invalid text %j', text => {
    expect(() => serializeText(text as Text)).toThrow()
  })
  test('enforces the serialized request limit before contacting a provider', () => {
    expect(serializeText('a'.repeat(15_000))).toHaveLength(15_000)
    expect(() => serializeText('a'.repeat(15_001))).toThrow(RangeError)
    expect(() => serializeText({
      text: 'a'.repeat(14_999),
      modifier: 'loud',
    })).toThrow(RangeError)
    using speaker = new GrokSpeaker({key: 'xai-test'})
    expect(() => speaker.generate('')).toThrow(RangeError)
  })
})
describe('options', () => {
  test.each([['xai-testMixed123', 'xai'], ['sk-or-v1-a123', 'openrouter']] as const)('detects %s without network probing', (key, provider) => {
    using speaker = new GrokSpeaker({key})
    expect(speaker.provider).toBe(provider)
    expect(JSON.stringify(speaker)).not.toContain(key)
    expect(Bun.inspect(speaker)).not.toContain(key)
  })
  test('allows explicit routing of unrecognized keys but not contradictory prefixes', () => {
    using speaker = new GrokSpeaker({
      key: 'new-key-format',
      provider: 'xai',
    })
    expect(speaker.provider).toBe('xai')
    expect(() => new GrokSpeaker({key: 'unknown'})).toThrow('Set provider explicitly')
    expect(() => new GrokSpeaker({
      key: 'xai-test',
      provider: 'openrouter',
    })).toThrow('different provider')
    expect(() => new GrokSpeaker({
      key: 'sk-or-test',
      provider: 'xai',
    })).toThrow('different provider')
  })
  test.each(['', ' xai-test', 'xai-test\n'])('rejects invalid keys', key => {
    expect(() => new GrokSpeaker({key})).toThrow()
  })
  test.each([0, -1, Number.NaN, Infinity, 1.5, 2 ** 32])('rejects invalid resource limits %s', value => {
    expect(() => new GrokSpeaker({
      key: 'xai-test',
      timeoutMs: value,
    })).toThrow(RangeError)
    expect(() => new GrokSpeaker({
      key: 'xai-test',
      maxBufferedBytes: value,
    })).toThrow(RangeError)
  })
})
