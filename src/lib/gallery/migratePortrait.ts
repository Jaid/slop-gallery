// Resolve renamed defaults when loading existing collections and backups.
const aliases = [
  ['goose', 'goose', 'work-0.webp'],
  ['orange', 'orange', 'work-1.webp'],
  ['doge', 'dog', 'doge-velvet.webp'],
  ['doge-neon', 'wolf', 'doge-neon.webp'],
  ['dog-neon', 'wolf', 'dog-neon.webp'],
  ['cloud', 'tree', 'work-3.webp'],
  ['pigeon', 'pigeon', 'pigeon-mona.png'],
  ['golden', 'toast', 'golden-crispness.webp', 'golden-crispness.opus'],
  ['catgalaxy', 'cat', 'cat-galaxy.webp', 'cat-galaxy.opus'],
  ['fruit', 'fruit', 'algorithm-fruit.webp'],
  ['ghosts', 'ghosts', 'ghost-banquet.avif'],
  ['shrimpman', 'shrimp', 'shrimpman.webp', 'shrimpman.opus'],
  ['rubberduck', 'duck', 'rubber-duck-ascension.webp', 'rubber-duck-ascension.opus'],
  ['sourdough', 'bread', 'sourdough-soliloquy.webp', 'sourdough-soliloquy.opus'],
  ['frogmona', 'frog', 'frog-mona.webp', 'frog-mona.opus'],
  ['petalroom', 'flower', 'petal-room.webp', 'petal-room.opus'],
  ['lobster', 'lobster', 'work-2.webp'],
] as const
const ids = new Map<string, string>
const images = new Map<string, string>
const narrations = new Map<string, string>
for (const [oldId, id, image, narration] of aliases) {
  ids.set(oldId, id)
  images.set(`/art/${image}`, `/art/${id}${image.slice(image.lastIndexOf('.'))}`)
  if (narration) {
    narrations.set(`/audio/${narration}`, `/audio/${id}.opus`)
  }
}

export function migratePortrait(portrait: Record<string, unknown>) {
  return {
    ...portrait,
    wallId: typeof portrait.wallId === 'string' ? portrait.wallId.replace(/^secret-(east|north|south|west)$/u, 'antechamber-$1') : portrait.wallId,
    id: typeof portrait.id === 'string' ? ids.get(portrait.id) ?? portrait.id : portrait.id,
    source: typeof portrait.source === 'string' ? images.get(portrait.source) ?? portrait.source : portrait.source,
    narration: typeof portrait.narration === 'string' ? narrations.get(portrait.narration) ?? portrait.narration : portrait.narration,
  }
}
