import type {KnotData} from '../../types.ts'

// Mage run: IgNMLTcxWnW8Pin; fixture: knot-material-shaders.
export default {
  id: 'amber_vault',
  candidateId: 'claude_opus',
  title: 'Amber Vault',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Forty million summers sleep in the resin: seeds of air, drowned dust and golden spangles that still remember the sun and flash as you pass.',
  placeholder: {
    color: '#9c500d',
    shading: 'glass',
  },
} as const satisfies KnotData
