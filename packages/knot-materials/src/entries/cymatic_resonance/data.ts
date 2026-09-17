import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cymatic_resonance',
  candidateId: 'qwen_max',
  title: 'Cymatic Resonance',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'An inaudible chord draws its signature across the surface.',
  placeholder: {
    color: '#d4af37',
    shading: 'smooth',
  },
} as const satisfies KnotData
