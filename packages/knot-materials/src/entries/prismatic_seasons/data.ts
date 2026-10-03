import type {KnotData} from '../../types.ts'

// Mage run: HU72JSGdKyp7pBO; fixture: knot-material-shaders; result: success.
export default {
  id: 'prismatic_seasons',
  candidateId: 'gpt_sol',
  title: 'Prismatic Seasons',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Three impossible gardens share one skin. A step to the side changes the season; a closer look reveals the machinery of light.',
  placeholder: {
    color: '#65c6a9',
    shading: 'smooth',
  },
} as const satisfies KnotData
