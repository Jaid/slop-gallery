import type {KnotData} from '../../types.ts'

export default {
  id: 'frozen_lightning',
  candidateId: 'gpt_astra',
  title: 'Frozen Lightning',
  createdAt: 1_789_075_137,
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'One violent instant has been made quiet enough to hold.',
  placeholder: {
    color: '#98baff',
    shading: 'smooth',
  },
} as const satisfies KnotData
