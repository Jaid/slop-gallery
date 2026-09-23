import type {KnotData} from '../../types.ts'

export default {
  id: 'meteorite_memory',
  candidateId: 'gpt_astra',
  title: 'Meteorite Memory',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  flavorText: 'Dark metal carries the scars of a journey longer than the sky.',
  placeholder: {
    color: '#bdcad5',
    shading: 'smooth',
  },
} as const satisfies KnotData
