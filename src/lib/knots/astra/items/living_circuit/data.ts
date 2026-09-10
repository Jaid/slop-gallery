import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'living_circuit',
  number: 2,
  title: 'Photon Lattice',
  author: {
    model: {
      title: 'GPT-6 Astra'
    }
  },
  accent: '#55f4dc',
  highlighted: false,
  archived: true
} as const satisfies KnotData
