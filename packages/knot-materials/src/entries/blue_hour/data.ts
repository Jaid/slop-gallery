import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'blue_hour',
  candidateId: 'gpt_astra',
  title: 'Blue Hour',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'An ocean painted before dawn waits beneath the glaze. Gold gathers on its crests whenever someone stops to listen.',
  placeholder: {
    color: '#31557a',
    shading: 'smooth',
  },
} as const satisfies KnotData
