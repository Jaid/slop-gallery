import type {KnotCandidateData, KnotEntry} from './types.ts'

type AnnouncementCandidate = {
  data: KnotCandidateData
  items: ReadonlyArray<KnotEntry>
}

export function knotModelSlug(item: KnotEntry) {
  const slug = item.author.model.slug?.split('/').at(-1)?.split(':')[0]
    ?? item.modelTitle.toLowerCase().replaceAll(/[^.0-9a-z]+/g, '-').replaceAll(/^-|-$/g, '')
  if (!/^[0-9a-z][-.0-9a-z_]*$/i.test(slug) || slug.includes('..')) {
    throw new Error('Invalid Knot model slug.')
  }
  return slug
}

export function knotAnnouncementPaths(item: KnotEntry) {
  return {
    model: `candidates/${item.candidate.id}/slug/${knotModelSlug(item)}`,
    item: `entries/${item.id}`,
  }
}

export function knotCandidateAnnouncementPath(candidate: KnotCandidateData) {
  return `candidates/${candidate.id}/candidate`
}

export function knotAnnouncements(candidates: ReadonlyArray<AnnouncementCandidate>) {
  const entries = new Map<string, {
    id: string
    text: string
  }>
  for (const candidate of candidates) {
    const candidateId = knotCandidateAnnouncementPath(candidate.data)
    entries.set(candidateId, {
      id: candidateId,
      text: candidate.data.title,
    })
    for (const item of candidate.items) {
      const paths = knotAnnouncementPaths(item)
      entries.set(paths.model, {
        id: paths.model,
        text: item.modelTitle,
      })
      entries.set(paths.item, {
        id: paths.item,
        text: item.title,
      })
    }
  }
  return [...entries.values()]
}
