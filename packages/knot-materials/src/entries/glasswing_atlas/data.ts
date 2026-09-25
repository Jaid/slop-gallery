import type {KnotData} from '../../types.ts'

// Mage run: ActJg0bLJQHug14.
export default {
  id: 'glasswing_atlas',
  candidateId: 'space_bunny',
  title: 'Glasswing Atlas',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Transparent wings carry whole climates within every trembling pane.',
  placeholder: {
    color: '#9bd4d8',
    shading: 'glass',
  },
} as const satisfies KnotData
