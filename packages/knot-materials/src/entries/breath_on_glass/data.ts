import type {KnotData} from '../../types.ts'

// Mage run: DZoyAbZAQlwnlPj; fixture: knot-material-shaders; result: success.
export default {
  id: 'breath_on_glass',
  candidateId: 'claude_opus',
  title: 'Breath on Glass',
  harness: 'Mage',
  author: {model: {
    title: 'Claude Opus 5.5',
    slug: 'anthropic/claude-opus-5.5',
    effortLevel: 'high',
  }},
  flavorText: 'Frost ferns overgrow a winter window. Lean in and your warmth melts a clearing, and beyond the glass a fire is still burning.',
  placeholder: {
    color: '#8e7f7c',
    shading: 'glass',
  },
} as const satisfies KnotData
