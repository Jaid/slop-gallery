import type {KnotData} from '../../types.ts'

export default {
  id: 'tiger_iron',
  candidateId: 'gpt_astra',
  title: 'Tiger Iron',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  flavorText: 'Warm bands of iron and gold hold the watchful patience of a sleeping animal.',
  placeholder: {
    color: '#edaa47',
    shading: 'metal',
  },
} as const satisfies KnotData
