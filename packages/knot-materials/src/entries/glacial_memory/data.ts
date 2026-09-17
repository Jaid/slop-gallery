import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'glacial_memory',
  candidateId: 'gpt_astra',
  title: 'Glacial Memory',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  flavorText: 'Layers of blue keep winters that the world above has forgotten.',
  placeholder: {
    color: '#b9efff',
    shading: 'glass',
  },
} as const satisfies KnotData
