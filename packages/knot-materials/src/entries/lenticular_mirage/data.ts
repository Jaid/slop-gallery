import type {KnotData} from '../../types.ts'

export default {
  id: 'lenticular_mirage',
  candidateId: 'gpt_astra',
  title: 'Lenticular Mirage',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'A step to either side reveals the image that the last angle concealed.',
  placeholder: {
    color: '#a2f4f1',
    shading: 'smooth',
  },
} as const satisfies KnotData
