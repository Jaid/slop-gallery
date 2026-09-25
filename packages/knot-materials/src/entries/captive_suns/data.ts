import type {KnotData} from '../../types.ts'

// Mage run: IBraVE33noBp60D; original ID: velvet_eclipse.
export default {
  id: 'captive_suns',
  candidateId: 'gpt_sol',
  title: 'Captive Suns',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A procession of captive suns wears the darkness like velvet, their coronas breathing against the night.',
  placeholder: {
    color: '#341020',
    shading: 'fabric',
  },
} as const satisfies KnotData
