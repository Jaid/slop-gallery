import type {KnotData} from '../../types.ts'

// Mage run: 9YA8kP6cid9wkS5; fixture: knot-material-shaders.
export default {
  id: 'amber_echo',
  candidateId: 'space_bunny',
  title: 'Amber Echo',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A drop of ancient sunlight keeps a forest breathing beneath its skin.',
  placeholder: {
    color: '#e18a20',
    shading: 'glass',
  },
} as const satisfies KnotData
