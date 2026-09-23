import type {KnotData} from '../../types.ts'

export default {
  id: 'mycelium_bloom',
  candidateId: 'deepseek',
  title: 'Mycelium Bloom',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  flavorText: 'The hidden garden flowers wherever its threads find one another.',
  placeholder: {
    color: '#44ffdd',
    shading: 'fabric',
  },
} as const satisfies KnotData
