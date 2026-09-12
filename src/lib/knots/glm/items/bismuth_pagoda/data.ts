import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'bismuth_pagoda',
  number: 138,
  title: 'Bismuth Pagoda',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  accent: '#ff9de2',
  highlighted: false,
  displacement: 0.045,
} as const satisfies KnotData
