import type {Portrait} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function ArtworkOverlay({portrait: p}: {portrait: Portrait}) {
  return <section className={css.container} data-testid="artwork-overlay" aria-label="Artwork details">
    <h2>{p.title}</h2>
    <p className={css.description}>{p.description}</p>
    <p className={css.byline}><span>{p.creator}</span><span aria-hidden="true"> · </span><span>{p.year ?? 'Undated'}</span></p>
  </section>
}
