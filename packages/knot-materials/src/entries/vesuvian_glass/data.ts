import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'vesuvian_glass',
  candidateId: 'glm',
  title: 'Vesuvian Glass',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'A volcanic night has cooled into a vessel that still seems warm inside.',
  placeholder: {
    color: '#ff7a41',
    shading: 'glass',
  },
  archived: true,
} as const satisfies KnotData
