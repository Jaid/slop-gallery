import type {KnotData} from '../../types.ts'

// Mage run: 1o1ree11eGriGjv; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'magnetic_diadem',
  candidateId: 'claude_sonnet',
  title: 'Magnetic Diadem',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  displacement: 0.07,
  flavorText: 'A magnet follows your gaze. Black liquid rises to meet it, spike by spike, and bows toward wherever you walk.',
  placeholder: {
    color: '#16161c',
    shading: 'liquid',
  },
} as const satisfies KnotData
