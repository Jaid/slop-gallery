import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ruby_asterism',
  candidateId: 'deepseek',
  title: 'Ruby Asterism',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A ruby grown around needle-thin silk: turn it and a star of six rays wheels across the dome, leaving as you arrive.',
  placeholder: {
    color: '#7d1220',
    shading: 'glass',
  },
} as const satisfies KnotData
