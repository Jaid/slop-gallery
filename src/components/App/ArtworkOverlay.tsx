import type {Portrait} from '#src/lib/gallery.ts'

export default function ArtworkOverlay({portrait: p}: {portrait: Portrait}) {
  return <section className="artwork-overlay" aria-label="Artwork details">
    <h2>{p.title}</h2>
    <p className="artwork-description">{p.description}</p>
    <p className="artwork-byline"><span>{p.creator}</span><span aria-hidden="true"> · </span><span>{p.year ?? 'Undated'}</span></p>
  </section>
}
