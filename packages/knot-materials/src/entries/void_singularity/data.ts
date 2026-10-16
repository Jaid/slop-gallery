import type {KnotData} from '../../types.ts'

// Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.
export default {
  id: 'void_singularity',
  candidateId: 'gemini_argon',
  title: 'Void Singularity',
  createdAt: 1792017078,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A relativistic accretion disk spirals into a dark event horizon. Orbit the knot and gravitational lensing bends starlight from Doppler blue to redshift crimson.',
  placeholder: {
    color: '#70727b',
    shading: 'smooth',
  },
} as const satisfies KnotData
