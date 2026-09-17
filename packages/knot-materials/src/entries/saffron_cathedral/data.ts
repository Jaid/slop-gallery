import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'saffron_cathedral',
  candidateId: 'gpt_astra',
  title: 'Saffron Cathedral',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'Golden warmth fills a small sanctuary carved from the colors of spice.',
  placeholder: {
    color: '#ffc25c',
    shading: 'smooth',
  },
} as const satisfies KnotData
