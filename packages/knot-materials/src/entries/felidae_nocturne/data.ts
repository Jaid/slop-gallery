import type {KnotData} from '../../types.ts'

// Mage run: DyugOIRGq3AJL3h; fixture: knot-material-br11k.
export default {
  id: 'felidae_nocturne',
  candidateId: 'gpt_sol',
  title: 'Felidae Nocturne',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'An atlas of small, impossible hunters: each life is a handful of lights, held together by the dark between them.',
  placeholder: {
    color: '#193459',
    shading: 'smooth',
  },
} as const satisfies KnotData
