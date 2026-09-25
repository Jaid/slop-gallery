import type {KnotData} from '../../types.ts'

// Mage run: IBraVE33noBp60D.
export default {
  id: 'moth_atlas',
  candidateId: 'gpt_sol',
  title: 'Moth Atlas',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'An atlas of impossible moths unfolds its jeweled eyes, following your gaze through the gallery.',
  placeholder: {
    color: '#286e67',
    shading: 'fabric',
  },
} as const satisfies KnotData
