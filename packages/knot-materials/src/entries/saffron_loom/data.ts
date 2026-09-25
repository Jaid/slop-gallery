import type {KnotData} from '../../types.ts'

// Mage run: IBraVE33noBp60D.
export default {
  id: 'saffron_loom',
  candidateId: 'gpt_sol',
  title: 'Saffron Loom',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Every thread crosses another life, weaving a midnight tapestry with fire caught in its seams.',
  placeholder: {
    color: '#1b5070',
    shading: 'fabric',
  },
} as const satisfies KnotData
