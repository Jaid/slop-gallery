import type {KnotData} from '../../types.ts'

// Mage run: 77fsRvmePazcbTS; fixture: knot-material-shaders; result: success.
export default {
  id: 'cloisonne_lotus',
  candidateId: 'gemini_argon',
  title: 'Cloisonné Lotus',
  createdAt: 1791968199,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'low',
    },
  },
  flavorText: 'Filigree brass wires bent by hand contain pools of vitrified cobalt, turquoise and Imperial ruby glass over a foil-stamped guilloché core.',
  placeholder: {
    color: '#79786c',
    shading: 'glass',
  },
} as const satisfies KnotData
