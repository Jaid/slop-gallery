import type {Lamp} from '../base/Room.ts'

export default {
  // The passage keeps only the first of its evenly spaced lanterns, by the elbow toward the Oculus, hung low, stronger than the corridor’s and fading more gently.
  pendant: {
    position: [0, 2.5, 1.265],
    strength: 30,
    tint: '#ffcd8a',
    range: 7,
    decay: 1.75,
    shadow: true,
  },
} satisfies Record<string, Lamp>
