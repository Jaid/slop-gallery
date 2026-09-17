export type RarityMode = 'edit' | 'false' | 'true'

/** Knottingham-only selection policy. Omission defaults to rarity-aware ordering. */
export default function parseRarityMode(search = ''): RarityMode {
  const value = new URLSearchParams(search).get('rarity') ?? 'true'
  if (value !== 'true' && value !== 'false' && value !== 'edit') {
    throw new Error('Knot rarity URL parameter must be true, false, or edit.')
  }
  return value
}
