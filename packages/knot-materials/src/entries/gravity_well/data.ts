import type {KnotData} from '../../types.ts'

export default {
  id: 'gravity_well',
  candidateId: 'gpt_astra',
  title: 'Gravity Well',
  createdAt: 1789075137,
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'Reflections lean toward a center that offers nothing in return.',
  placeholder: {
    color: '#ffb37a',
    shading: 'ghost',
  },
} as const satisfies KnotData
