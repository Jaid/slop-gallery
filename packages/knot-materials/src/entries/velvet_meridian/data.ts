import type {KnotData} from '../../types.ts'

// Mage run: 1UqvleKScECZs6l.
export default {
  id: 'velvet_meridian',
  candidateId: 'space_bunny',
  title: 'Velvet Meridian',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Midnight silk folds around an invisible horizon, its woven threads catching a violet dawn.',
  placeholder: {
    color: '#241338',
    shading: 'fabric',
  },
  displacement: 0.016,
} as const satisfies KnotData
