import type {KnotData} from '../../types.ts'

// Mage run: BJsZFlj5mQPSiFo; fixture: knot-material-shaders.
// Original identity: abyssal_nacre (Abyssal Nacre).
export default {
  id: 'oceanic_nacre',
  candidateId: 'space_bunny',
  title: 'Oceanic Nacre',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Pearl grows in the dark by keeping a little ocean inside every layer.',
  placeholder: {
    color: '#123b52',
    shading: 'smooth',
  },
  displacement: 0.000045,
} as const satisfies KnotData
