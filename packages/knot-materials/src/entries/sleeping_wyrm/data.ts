import type {KnotData} from '../../types.ts'

// Mage run: IgNMLTcxWnW8Pin; fixture: knot-material-shaders.
export default {
  id: 'sleeping_wyrm',
  candidateId: 'claude_opus',
  title: 'Sleeping Wyrm',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  displacement: 0.006,
  flavorText: 'It has coiled here since before the gallery was built, breathing slow embers. Step closer and it stirs; its scales rise to show the fire underneath.',
  placeholder: {
    color: '#4a1606',
    shading: 'stone',
  },
} as const satisfies KnotData
