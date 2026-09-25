import type {KnotData} from '../../types.ts'

// Mage run: 0CPX47Y7FuE0PTN.
export default {
  id: 'winter_palace',
  candidateId: 'gpt_sol',
  title: 'Winter Palace',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Six-fold frost blossoms beneath an impossible glacier; each step reveals a new blue depth between its glass-clear and snow-soft layers.',
  placeholder: {
    color: '#a6dfe7',
    shading: 'glass',
  },
} as const satisfies KnotData
