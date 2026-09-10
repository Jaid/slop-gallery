import type {Portrait} from '#src/lib/gallery.ts'

import ArtworkThumb from '#component/ArtworkThumb'
import Icon from '#component/Icon'
import {narrate} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function ArtworkCard({portrait: p, index: i, onSelect}: {index: number
  onSelect: (id: string) => void
  portrait: Portrait}) {
  let status = 'COLLECTION'
  if (p.merging) {
    status = 'ALCHEMY IN PROGRESS'
  } else if (p.pending) {
    status = 'WORK IN PROGRESS'
  } else if (!p.hung) {
    status = 'WAITING TO BE HUNG'
  }
  return <article className={css.container} data-testid="art-card">
    <button className={css.image} data-testid="art-image" onClick={() => onSelect(p.id)} aria-label={`Open ${p.title}`}><ArtworkThumb source={p.source} title={p.title}/><span>Look a little closer ↗</span></button>
    <div className={css.meta}><small>{String(i + 1).padStart(2, '0')} / {status}</small><h3>{p.title}</h3><p>{p.creator}</p><button className={css.textButton} onClick={() => narrate(p.id)}><Icon name="sound" size={15}/> Hear the story</button></div>
  </article>
}
