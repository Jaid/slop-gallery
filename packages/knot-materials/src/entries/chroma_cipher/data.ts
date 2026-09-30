import type {KnotData} from '../../types.ts'

// Mage run: 42qNahiwSEZ3v90; fixture: knot-material-shaders; result: success.
export default {
  id: 'chroma_cipher',
  candidateId: 'gpt_sol',
  title: 'Chroma Cipher',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A secret engraved in light, legible only while moving. Every departure opens a different spectrum.',
  placeholder: {
    color: '#152b38',
    shading: 'metal',
  },
} as const satisfies KnotData
