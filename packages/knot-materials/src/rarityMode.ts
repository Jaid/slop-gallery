export type RarityMode = 'edit' | 'false' | 'true'

/** Knottingham-only selection policy. Omission defaults to rarity-aware ordering. */
export default function parseRarityMode(search = ''): RarityMode {
  const queryParameters = new URLSearchParams(search)
  const value = queryParameters.get('rarity') ?? 'true'
  if (value !== 'true' && value !== 'false' && value !== 'edit') {
    throw new Error('Knot rarity URL parameter must be true, false, or edit.')
  }
  return value
}
