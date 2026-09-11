import type {KnotEntry} from './types.ts'

export function knotCreatorSlug(item: KnotEntry) {
  const slug = item.author.model.slug?.split('/').at(-1)?.split(':')[0]
    ?? item.modelTitle.toLowerCase().replaceAll(/[^.0-9a-z]+/g, '-').replaceAll(/^-|-$/g, '')
  if (!/^[0-9a-z][-.0-9a-z_]*$/i.test(slug) || slug.includes('..')) {
    throw new Error('Invalid Knot creator slug.')
  }
  return slug
}

export function knotAnnouncementPaths(item: KnotEntry) {
  return {
    creator: `${item.model}/slug/${knotCreatorSlug(item)}`,
    item: `${item.model}/items/${item.sourceId}`,
  }
}

export function knotAnnouncements(items: ReadonlyArray<KnotEntry>) {
  const entries = new Map<string, {id: string
    text: string}>
  for (const item of items) {
    const paths = knotAnnouncementPaths(item)
    entries.set(paths.creator, {
      id: paths.creator,
      text: item.modelTitle,
    })
    entries.set(paths.item, {
      id: paths.item,
      text: item.title,
    })
  }
  return [...entries.values()]
}
