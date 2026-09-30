import type {KnotData} from '../../types.ts'

// Mage run: 2tmj6W7XIniDLsB; fixture: knot-material-shaders; result: success.
export default {
  id: 'opal_oracle',
  candidateId: 'gpt_sol',
  title: 'Opal Oracle',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A pale stone answers without words. Buried shards trade lilac, sea-green and apricot fire as you move, revealing a different omen to every gaze.',
  placeholder: {
    color: '#d6dcdf',
    shading: 'glass',
  },
} as const satisfies KnotData
