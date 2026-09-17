import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'magnetic_ink',
  candidateId: 'glm',
  title: 'Magnetic Ink',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'Black strokes rearrange themselves around a message no hand has written.',
  placeholder: {
    color: '#8f7bff',
    shading: 'metal',
  },
  archived: true,
} as const satisfies KnotData
