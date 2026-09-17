import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quantum_moire',
  candidateId: 'gpt_sol',
  title: 'Quantum Moiré',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  flavorText: 'Two almost-identical worlds overlap and reveal a third pattern between them.',
  placeholder: {
    color: '#6de9ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
