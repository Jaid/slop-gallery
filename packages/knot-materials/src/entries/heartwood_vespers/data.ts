import type {KnotData} from '../../types.ts'

// Mage run: 1UqvleKScECZs6l.
export default {
  id: 'heartwood_vespers',
  candidateId: 'space_bunny',
  title: 'Heartwood Vespers',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'The old tree keeps its final light within rings cut long before the gallery existed.',
  placeholder: {
    color: '#542014',
    shading: 'smooth',
  },
} as const satisfies KnotData
