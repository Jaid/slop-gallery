import type {DestructibleCatalogKind} from './CatalogPlantGeometry.ts'

// Only these numbered specimens are interactive; their other pot combinations stay decorative.
const interactiveSpecimens = new Map<number, DestructibleCatalogKind>([[4, 'snake'], [6, 'calathea']])

export function destructiblePreviewKind(number: number) {
  return interactiveSpecimens.get(number)
}

export function destructionHint(number: number) {
  const kind = destructiblePreviewKind(number)
  if (kind) {
    return 'Leaves → root → pot'
  }
}
