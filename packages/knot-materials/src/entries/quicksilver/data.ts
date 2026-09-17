import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quicksilver',
  candidateId: 'glm',
  title: 'Quicksilver',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: 'Every reflection finds a different route across this slippery silver skin.',
  placeholder: {
    color: '#dfe8f2',
    shading: 'liquid',
  },
} as const satisfies KnotData
