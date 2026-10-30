/** the mean of a `#rrggbb` color’s channels, from 0 to 255 */
export default function lightness(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  return ((value >> 16 & 255) + (value >> 8 & 255) + (value & 255)) / 3
}
