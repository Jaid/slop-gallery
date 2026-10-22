/**
 * Relative brightness of the firelight at a time in seconds, between about 0.64 and 1.16.
 *
 * Incommensurate waves between 0.3 and 6 Hz never visibly repeat: a slow swell as the fire draws, quicker gutters as flames lick and break off.
 */
export default function fireFlicker(time: number) {
  const swell = Math.sin(time * 1.9) * 0.4 + Math.sin(time * 0.31 + 1.7) * 0.6
  const gutter = Math.sin(time * 7.3 + 0.4) * 0.5 + Math.sin(time * 13.7 + 2.1) * 0.3 + Math.sin(time * 37.1 + 4.2) * 0.2
  return 0.9 + swell * 0.09 + gutter * 0.17
}
