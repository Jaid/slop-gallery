import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'dragon_opal',
  candidateId: 'kimi',
  title: 'Dragon Opal',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  flavorText: 'A sleeping creature turns once beneath a shell of shifting fire.',
  placeholder: {
    color: '#ff9df0',
    shading: 'glass',
  },
} as const satisfies KnotData
