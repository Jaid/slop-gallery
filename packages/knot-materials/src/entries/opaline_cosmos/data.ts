import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'opaline_cosmos',
  candidateId: 'gpt_sol',
  title: 'Opaline Cosmos',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  flavorText: 'Whole constellations seem to drift beneath this pale, milky sky.',
  placeholder: {
    color: '#c6b6ff',
    shading: 'glass',
  },
} as const satisfies KnotData
