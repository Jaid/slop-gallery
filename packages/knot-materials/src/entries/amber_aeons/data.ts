import type {KnotData} from '../../types.ts'

// Mage run: IBraVE33noBp60D.
export default {
  id: 'amber_aeons',
  candidateId: 'gpt_sol',
  title: 'Amber Aeons',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'In honey-colored time, the vanished sea keeps its spiral souls suspended just beneath the surface.',
  placeholder: {
    color: '#e39235',
    shading: 'glass',
  },
} as const satisfies KnotData
