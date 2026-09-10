import type {Portrait} from '#src/lib/gallery.ts'

import clsx from 'clsx'
import {useEffect, useState} from 'react'

import ArtworkThumb from '#component/ArtworkThumb'
import Icon from '#component/Icon'
import {download} from '#src/lib/download.ts'
import {loadBlob, narrate, notify, roomAt, rooms, useGallery, viewPortrait} from '#src/lib/gallery.ts'
import {imageFilename} from '#src/lib/gallery/imagePolicy.ts'

import css from './style.module.sass'

export default function ArtworkDetail({portrait: p, back}: {back: () => void
  portrait: Portrait}) {
  const ready = useGallery(s => s.ready)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [draft, setDraft] = useState({
    title: p.title,
    creator: p.creator,
    year: p.year === undefined ? '' : String(p.year),
    description: p.description,
  })
  useEffect(() => {
    if (!editing) {
      setDraft({
        title: p.title,
        creator: p.creator,
        year: p.year === undefined ? '' : String(p.year),
        description: p.description,
      })
    }
  }, [p.title, p.creator, p.year, p.description, editing])
  const save = () => {
    if (!draft.title.trim() || !draft.creator.trim()) {
      notify('Every masterpiece deserves a title and an artist.')
      return
    }
    const year = draft.year.trim() ? Number(draft.year) : undefined
    if (year !== undefined && !Number.isSafeInteger(year)) {
      notify('Enter a whole-number year or leave it undated.')
      return
    }
    const s = useGallery.getState()
    s.commit(s.portraits.map(work => work.id === p.id ? {...work, title: draft.title.trim(), creator: draft.creator.trim(), year, description: draft.description.trim(), pending: false, narration: undefined} : work))
    setEditing(false)
    notify('The label is yours now.')
  }
  return <div className={css.container} data-testid="art-detail">
    <button className={css.textButton} onClick={back}>← Back to the collection</button>
    <div className={css.image}><ArtworkThumb source={p.source} title={p.title}/></div>
    <div className={css.eyebrow}>{p.hung ? rooms.find(room => room.id === roomAt(p.position))?.title : 'WAITING TO BE HUNG'}{p.pending ? ' · THE CURATOR IS WRITING…' : ''}</div>
    {editing ? <form onSubmit={event => {
      event.preventDefault()
      save()
    }}>
      <label>Title<input value={draft.title} maxLength={300} onChange={event => setDraft({
        ...draft,
        title: event.target.value,
      })} autoFocus required/></label>
      <label>Artist<input value={draft.creator} maxLength={200} onChange={event => setDraft({
        ...draft,
        creator: event.target.value,
      })} required/></label>
      <label>Year<input type="number" step={1} value={draft.year} placeholder="Undated" onChange={event => setDraft({
        ...draft,
        year: event.target.value,
      })}/></label>
      <label>The story<textarea value={draft.description} maxLength={5000} onChange={event => setDraft({
        ...draft,
        description: event.target.value,
      })} rows={5}/></label>
      <div className={css.actions}><button className={css.primaryButton} type="submit">Save label</button><button className={css.textButton} type="button" onClick={() => setEditing(false)}>Cancel</button></div>
    </form> : <><h3>{p.title}</h3><p className={css.byline}>{p.creator} · {p.year ?? 'Undated'}</p><p className={css.story}>{p.description}</p></>}
    <div className={css.actions}>
      <button className={css.primaryButton} onClick={() => viewPortrait(p.id)} disabled={!ready || !p.hung || p.merging}>Visit this work <Icon name="arrow" size={17}/></button>
      <button className={css.textButton} onClick={() => narrate(p.id)}><Icon name="sound" size={16}/> Hear the story</button>
      <button className={css.textButton} disabled={p.merging || p.reserved} onClick={() => setEditing(!editing)}>Edit label</button>
    </div>
    <div className={css.secondary}>
      <button className={css.textButton} onClick={() => {
        void loadBlob(p.source).then(blob => download(blob, imageFilename(p.title, blob.type))).catch(() => notify('The image could not be downloaded.'))
      }}>Download image ↗</button>
      <button className={clsx(css.textButton, css.danger)} disabled={p.merging || p.reserved} onClick={() => {
        if (confirm) {
          useGallery.getState().remove(p.id)
          back()
          notify('Removed from the collection. Undo will bring it back.')
        } else {
          setConfirm(true)
        }
      }}>{confirm ? 'Confirm removal' : 'Remove work'}</button>
    </div>
  </div>
}
