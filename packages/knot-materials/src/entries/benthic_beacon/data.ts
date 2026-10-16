import type {KnotData} from '../../types.ts'

export default {
  id: 'benthic_beacon',
  candidateId: 'gpt_astra',
  title: 'Benthic Beacon',
  createdAt: 1_791_852_458,
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'One small beacon keeps watch at the bottom of the world.',
  placeholder: {
    color: '#46d6ff',
    shading: 'glass',
  },
} as const satisfies KnotData
