import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_void',
  candidateId: 'kimi',
  title: 'Kintsugi Void',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  flavorText: 'Bright seams hold together pieces of an otherwise unbroken darkness.',
  placeholder: {
    color: '#ffd75e',
    shading: 'stone',
  },
  archived: true,
} as const satisfies KnotData
