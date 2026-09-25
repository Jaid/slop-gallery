import type {KnotData} from '../../types.ts'

// Mage run: 1UqvleKScECZs6l.
export default {
  id: 'pawlight_atlas',
  candidateId: 'space_bunny',
  title: 'Pawlight Atlas',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Tiny stars gather into purring silhouettes, mapping a kingdom that exists only after dark.',
  placeholder: {
    color: '#111936',
    shading: 'smooth',
  },
} as const satisfies KnotData
