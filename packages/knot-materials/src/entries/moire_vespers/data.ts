import type {KnotData} from '../../types.ts'

// Mage run: 7V0v37e8AD5LVut; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'moire_vespers',
  candidateId: 'space_bunny',
  title: 'Moiré Vespers',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Two engravings so nearly alike that neither can be seen; only the silence between them makes a picture.',
  placeholder: {
    color: '#7b4ae0',
    shading: 'metal',
  },
} as const satisfies KnotData
