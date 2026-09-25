import type {KnotData} from '../../types.ts'

// Mage run: ActJg0bLJQHug14; original ID: liquid_mercury.
export default {
  id: 'mercury_sea',
  candidateId: 'space_bunny',
  title: 'Liquid Mercury',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A chrome sea remembers every orbit, then forgets it into a perfect reflection.',
  placeholder: {
    color: '#aebac5',
    shading: 'liquid',
  },
  displacement: 0.004,
} as const satisfies KnotData
