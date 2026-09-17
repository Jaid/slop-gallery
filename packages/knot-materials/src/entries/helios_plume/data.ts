import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'helios_plume',
  candidateId: 'kimi',
  title: 'Solar Prominence',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  flavorText: 'A golden plume bends beneath the weight of its own radiance.',
  placeholder: {
    color: '#ff7a3c',
    shading: 'liquid',
  },
  archived: true,
} as const satisfies KnotData
