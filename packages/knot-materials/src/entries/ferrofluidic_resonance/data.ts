import type {KnotData} from '../../types.ts'

export default {
  id: 'ferrofluidic_resonance',
  candidateId: 'qwen_max',
  title: 'Ferrofluidic Resonance',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'An unseen rhythm combs the liquid into trembling order.',
  placeholder: {
    color: '#ff00aa',
    shading: 'liquid',
  },
} as const satisfies KnotData
