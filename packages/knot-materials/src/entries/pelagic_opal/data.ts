import type {KnotData} from '../../types.ts'

// Mage run: 0CPX47Y7FuE0PTN.
export default {
  id: 'pelagic_opal',
  candidateId: 'gpt_sol',
  title: 'Pelagic Opal',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'An ocean folds itself inside each pearl; walk past and the buried tides change from arctic blue to tropical fire.',
  placeholder: {
    color: '#127b85',
    shading: 'glass',
  },
  displacement: 0.002,
} as const satisfies KnotData
