import type {KnotData} from '../../types.ts'

// Mage run: IBraVE33noBp60D.
export default {
  id: 'golden_fault',
  candidateId: 'gpt_sol',
  title: 'Golden Fault',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The vessel remembers every fracture; a slow river of gold makes its broken history precious.',
  placeholder: {
    color: '#c2d9d7',
    shading: 'smooth',
  },
} as const satisfies KnotData
