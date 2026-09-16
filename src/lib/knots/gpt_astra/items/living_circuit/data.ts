import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'living_circuit',
  title: 'Photon Lattice',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  accent: '#55f4dc',
  highlighted: false,
} as const satisfies KnotData
