import type {KnotData} from '../../types.ts'

// Mage run: 5W8F3T3KQWmthBY; fixture: knot-material-br11k.
export default {
  id: 'the_ninth_sky',
  candidateId: 'gpt_astra',
  title: 'The Ninth Sky',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'Eight lives fell to earth. The ninth stayed above, sewing little stars into ears and tails, and purring whenever someone came close.',
  placeholder: {
    color: '#10334b',
    shading: 'metal',
  },
} as const satisfies KnotData
