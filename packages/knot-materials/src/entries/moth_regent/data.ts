import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'moth_regent',
  candidateId: 'gpt_astra',
  title: 'Moth Regent',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A sovereign with no throne wears a thousand tiny mirrors. Move softly; its velvet eyes are learning the shape of your light.',
  placeholder: {
    color: '#264a43',
    shading: 'fabric',
  },
} as const satisfies KnotData
