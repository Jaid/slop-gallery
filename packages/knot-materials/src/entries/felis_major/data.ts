import type {KnotData} from '../../types.ts'

// Mage run: IBraVE33noBp60D.
export default {
  id: 'felis_major',
  candidateId: 'gpt_sol',
  title: 'Felis Major',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Beyond the last known stars, whole constellations of cats wake and trace their stories in light.',
  placeholder: {
    color: '#213858',
    shading: 'smooth',
  },
} as const satisfies KnotData
