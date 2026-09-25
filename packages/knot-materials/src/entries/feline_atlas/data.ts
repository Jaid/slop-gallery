import type {KnotData} from '../../types.ts'

// Mage run: 0CPX47Y7FuE0PTN.
export default {
  id: 'feline_atlas',
  candidateId: 'gpt_sol',
  title: 'Feline Atlas',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Across a midnight sky, entire families of star-cats wake in golden threads, following your footsteps from constellation to constellation.',
  placeholder: {
    color: '#152947',
    shading: 'smooth',
  },
} as const satisfies KnotData
