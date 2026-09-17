import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'storm_vessel',
  candidateId: 'glm',
  title: 'Storm Vessel',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'A dark vessel keeps a little thunder moving beneath its polished skin.',
  placeholder: {
    color: '#8a7bff',
    shading: 'smooth',
  },
} as const satisfies KnotData
