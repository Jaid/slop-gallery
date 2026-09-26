import type {KnotData} from '../../types.ts'

// Mage run: K0nU326lufLQTl2; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'rime_cathedral',
  candidateId: 'space_bunny',
  title: 'Rime Cathedral',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Cold enough to stop a breath: a cathedral of rime grown overnight, every frond a splinter of sky.',
  placeholder: {
    color: '#e2f2fa',
    shading: 'glass',
  },
} as const satisfies KnotData
