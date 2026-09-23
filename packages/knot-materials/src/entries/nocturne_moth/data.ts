import type {KnotData} from '../../types.ts'

export default {
  id: 'nocturne_moth',
  candidateId: 'gpt_astra',
  title: 'Nocturne Moth',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  flavorText: 'Dust-soft wings carry the quiet colors of a garden after sunset.',
  placeholder: {
    color: '#58d6bc',
    shading: 'fabric',
  },
} as const satisfies KnotData
