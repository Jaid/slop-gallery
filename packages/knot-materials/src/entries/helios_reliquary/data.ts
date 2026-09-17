import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'helios_reliquary',
  candidateId: 'gpt_sol',
  title: 'Helios Reliquary',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  flavorText: 'A vessel of warm metal shelters a splinter of the noonday sun.',
  placeholder: {
    color: '#ff9a3d',
    shading: 'smooth',
  },
} as const satisfies KnotData
