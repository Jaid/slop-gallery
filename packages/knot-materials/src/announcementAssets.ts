const recordings = import.meta.glob<string>([
  './candidates/*/candidate/announce.opus',
  './candidates/*/slug/*/announce.opus',
  './entries/*/announce.opus',
], {
  eager: true,
  query: '?url',
  import: 'default',
})
const knotAnnouncementUrl = (id: string) => recordings[`./${id}/announce.opus`]

export default knotAnnouncementUrl
