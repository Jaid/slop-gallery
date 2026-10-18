import type {KnotData} from '../../types.ts'

// Mage run: AGJuTzPywIFbk5N; fixture: knot-material-shaders; result: success.
export default {
  id: 'gilded_fault',
  candidateId: 'deepseek',
  title: 'Gilded Fault',
  createdAt: 1_792_262_029,
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  displacement: 0.012,
  flavorText: 'The stone broke once. Someone poured the sun into the wound, let it cool, and called the scar a crown.',
  placeholder: {
    color: '#3a332a',
    shading: 'stone',
  },
} as const satisfies KnotData
