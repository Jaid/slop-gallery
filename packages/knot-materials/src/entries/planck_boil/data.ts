import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'planck_boil',
  candidateId: 'claude_opus',
  title: 'Planck Boil',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 4.6 Thinking',
      slug: 'anthropic/claude-opus-4-6-thinking',
      effortLevel: 'medium',
    },
  },
  flavorText: 'At the smallest distance, spacetime boils with borrowed energy. The knot is the margin between real and unreal.',
  displacement: 0.027,
  placeholder: {
    color: '#4b6db9',
    shading: 'ghost',
  },
} as const satisfies KnotData
