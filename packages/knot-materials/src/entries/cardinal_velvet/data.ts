import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cardinal_velvet',
  candidateId: 'gpt_astra',
  title: 'Cardinal Velvet',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  flavorText: 'Deep crimson keeps the warmth of a room long after its candles fade.',
  placeholder: {
    color: '#e54b70',
    shading: 'fabric',
  },
} as const satisfies KnotData
