import type {KnotData} from '../../types.ts'

// Mage run: KKRUCJSg0WdighD; fixture: knot-material-shaders.
export default {
  id: 'glacial_heart',
  candidateId: 'claude_fable',
  title: 'Glacial Heart',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'high',
    },
  },
  flavorText: 'Ten thousand winters pressed into blue glass. Air that last touched the sky before any city was built still waits in its bubbles, and something warm keeps time deep inside.',
  placeholder: {
    color: '#b9d8f0',
    shading: 'glass',
  },
} as const satisfies KnotData
