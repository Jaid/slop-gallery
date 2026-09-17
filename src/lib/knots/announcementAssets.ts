const recordings = import.meta.glob<string>([
  './candidates/*/candidate/announce.opus',
  './candidates/*/{items,slug}/*/announce.opus',
], {
  eager: true,
  query: '?url',
  import: 'default',
})
const knotAnnouncementUrl = (id: string) => recordings[`./candidates/${id}/announce.opus`]

export default knotAnnouncementUrl
