import type {Runnel} from './RoutedPassage.ts'

/** how many facets a runnel’s round inside is cut into */
const runnelSegments = 10

/**
 * The cross section of a runnel across the floor, as points of how far right of its middle and how far over the floor, from its left edge down round its inside to its right edge, `across` meters wide and `depth` as deep as it is in full: its round inside, shallower where it narrows, stretched sideways where it opens out wider than its `width`, and squashed where it shallows out.
 */
export default function runnelSection({radius, width}: Pick<Runnel, 'radius' | 'width'>, across = width, depth = 1) {
  const chord = Math.min(across, width)
  const edge = Math.asin(chord / 2 / radius)
  const center = Math.sqrt(radius ** 2 - (chord / 2) ** 2)
  const stretch = across / chord
  return Array.from({length: runnelSegments + 1}, (_, i) => {
    const angle = -edge + edge * 2 * i / runnelSegments
    return [Math.sin(angle) * radius * stretch, (center - Math.cos(angle) * radius) * depth] as const
  })
}
