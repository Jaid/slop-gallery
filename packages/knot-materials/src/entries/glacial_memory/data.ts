import type {KnotData} from '../../types.ts'

export default {
  id: 'glacial_memory',
  candidateId: 'gpt_astra',
  title: 'Glacial Memory',
  createdAt: 1789075137,
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
