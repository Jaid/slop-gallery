import type {KnotData} from '../../types.ts'

// Mage run: LLxliOfHhDMdNvD; fixture: knot-material-shaders; result: success.
export default {
  id: 'first_thaw',
  candidateId: 'deepseek',
  title: 'First Thaw',
  createdAt: 1_792_272_563,
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'A century of frost learns your warmth. Where you stand, the rime lets go, runs silver, and remembers the dark stone underneath.',
  placeholder: {
    color: '#6d7680',
    shading: 'glass',
  },
} as const satisfies KnotData
