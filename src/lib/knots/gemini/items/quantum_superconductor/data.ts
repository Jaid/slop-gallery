import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'quantum_superconductor',
  number: 83,
  title: 'Quantum Superconductor',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high'
    }
  },
  accent: '#a78bfa',
  highlighted: false
} as const satisfies KnotData
