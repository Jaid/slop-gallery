import type {KnotData} from '../../types.ts'

// Mage run: 9YA8kP6cid9wkS5; fixture: knot-material-shaders.
// Original identity: kintsugi (Kintsugi).
export default {
  id: 'kintsugi_twilight',
  candidateId: 'space_bunny',
  title: 'Kintsugi Twilight',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'The dark remembers its breaking; gold is the light that chooses to stay.',
  placeholder: {
    color: '#24233b',
    shading: 'smooth',
  },
} as const satisfies KnotData
