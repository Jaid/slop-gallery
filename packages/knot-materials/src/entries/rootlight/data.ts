import type {KnotData} from '../../types.ts'

// Mage run: HU72JSGdKyp7pBO; fixture: knot-material-shaders; result: success.
export default {
  id: 'rootlight',
  candidateId: 'gpt_sol',
  title: 'Rootlight',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  displacement: 0.006,
  flavorText: 'Beneath the world, a patient choir trades tiny suns through roots of ivory. Nothing here is alone.',
  placeholder: {
    color: '#826d48',
    shading: 'fabric',
  },
} as const satisfies KnotData
