const recordings = import.meta.glob<string>('./*/{items,slug}/*/announce.opus', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const knotAnnouncementUrl = (id: string) => recordings[`./${id}/announce.opus`]
