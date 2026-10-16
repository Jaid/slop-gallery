import type {KnotData} from '../../types.ts'

export default {
  id: 'crimson_oracle',
  candidateId: 'gpt_sol',
  title: 'Crimson Oracle',
  createdAt: 1789075137,
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  flavorText: 'A red ember offers a different omen from every angle.',
  placeholder: {
    color: '#ff6f63',
    shading: 'smooth',
  },
} as const satisfies KnotData
