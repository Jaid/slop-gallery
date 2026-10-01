import type {KnotData} from '../../types.ts'

// Mage run: MDsU2CH3XEff3jd; fixture: knot-material-shaders; result: success.
export default {
  id: 'reticle',
  candidateId: 'space_bunny',
  title: 'Reticle',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  displacement: 0.002,
  flavorText: 'A city laid out for electrons, seen from above at the exact magnification where the streets become logic.',
  placeholder: {
    color: '#7f93b8',
    shading: 'metal',
  },
} as const satisfies KnotData
