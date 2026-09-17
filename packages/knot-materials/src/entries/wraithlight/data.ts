import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'wraithlight',
  candidateId: 'deepseek',
  title: 'Wraithlight',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  flavorText: 'A wandering glow lingers where a solid object ought to be.',
  placeholder: {
    color: '#c8f0ff',
    shading: 'ghost',
  },
} as const satisfies KnotData
