const recordings = import.meta.glob<string>([
  './*/candidate/announce.opus',
  './*/{items,slug}/*/announce.opus',
], {
  eager: true,
  query: '?url',
  import: 'default',
})
const knotAnnouncementUrl = (id: string) => recordings[`./${id}/announce.opus`]

export default knotAnnouncementUrl
