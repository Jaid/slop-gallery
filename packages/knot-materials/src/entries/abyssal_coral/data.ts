import type {KnotData} from '../../types.ts'

// Mage run: 9YA8kP6cid9wkS5; fixture: knot-material-shaders.
export default {
  id: 'abyssal_coral',
  candidateId: 'space_bunny',
  title: 'Abyssal Coral',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'In the midnight garden, small hearts answer the current with cold fire.',
  placeholder: {
    color: '#0b303b',
    shading: 'stone',
  },
  displacement: 0.0023,
} as const satisfies KnotData
