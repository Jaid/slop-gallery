import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'imperial_porcelain',
  candidateId: 'gpt_astra',
  title: 'Imperial Porcelain',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  flavorText: 'A flawless glaze preserves the calm of an empty ceremonial hall.',
  placeholder: {
    color: '#426cda',
    shading: 'stone',
  },
} as const satisfies KnotData
