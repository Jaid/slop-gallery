import type {Portrait} from '#src/lib/gallery.ts'

import {useEffect, useState} from 'react'

import {loadBlob, narrate, notify, roomAt, rooms, useGallery, viewPortrait} from '#src/lib/gallery.ts'

import ArtworkThumb from './ArtworkThumb.tsx'
import Icon from './Icon.tsx'

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.hidden = true
  ;
  (document.querySelector('dialog[open]') ?? document.body).append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export default function Collection() {
  const portraits = useGallery(s => s.portraits)
  const [query, setQuery] = useState('')
  const [room, setRoom] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const detail = portraits.find(p => p.id === selected)
  const filtered = portraits.filter(p => (room === 'all' || room === 'loose' ? room !== 'loose' || !p.hung : roomAt(p.position) === room) && `${p.title} ${p.creator} ${p.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  if (detail) {
    return <ArtworkDetail key={detail.id} portrait={detail} back={() => setSelected(null)}/>
  }
  return <>
    <p className="panel-intro">{portraits.length} works. Not a single sensible explanation.</p>
    <div className="collection-tools"><label className="search-field"><Icon name="search" size={17}/><input type="search" placeholder="Find a work or an artist…" aria-label="Search collection" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="Filter by room" value={room} onChange={event => setRoom(event.target.value)}><option value="all">All rooms</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.title}</option>)}<option value="loose">Waiting to be hung</option></select></div>
    <div className="collection-grid">{filtered.map((p, i) => <article className="art-card" key={p.id}>
      <button className="art-image" onClick={() => setSelected(p.id)} aria-label={`Open ${p.title}`}><ArtworkThumb source={p.source} title={p.title}/><span>Look a little closer ↗</span></button>
      <div className="art-card-meta"><small>{String(i + 1).padStart(2, '0')} / {p.merging ? 'ALCHEMY IN PROGRESS' : p.pending ? 'WORK IN PROGRESS' : !p.hung ? 'WAITING TO BE HUNG' : 'COLLECTION'}</small><h3>{p.title}</h3><p>{p.creator}</p><button className="text-button" onClick={() => narrate(p.id)}><Icon name="sound" size={15}/> Hear the story</button></div>
    </article>)}</div>
    {!filtered.length && <div className="empty-state"><h3>Nothing on this wall.</h3><p>Try another search. The good taste is still missing, too.</p><button className="text-button" onClick={() => {
      setQuery('')
      setRoom('all')
    }}>Clear filters</button></div>}
  </>
}

function ArtworkDetail({portrait: p, back}: {back: () => void
  portrait: Portrait}) {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [draft, setDraft] = useState({
    title: p.title,
    creator: p.creator,
    description: p.description,
  })
  useEffect(() => {
    if (!editing) {
      setDraft({
        title: p.title,
        creator: p.creator,
        description: p.description,
      })
    }
  }, [p.title, p.creator, p.description, editing])
  const save = () => {
    if (!draft.title.trim() || !draft.creator.trim()) {
      notify('Every masterpiece deserves a title and an artist.')
      return
    }
    const s = useGallery.getState()
    s.commit(s.portraits.map(work => work.id === p.id ? {...work, title: draft.title.trim(), creator: draft.creator.trim(), description: draft.description.trim(), pending: false, narration: undefined} : work))
    setEditing(false)
    notify('The label is yours now.')
  }
  return <div className="art-detail">
    <button className="text-button" onClick={back}>← Back to the collection</button>
    <div className="detail-image"><ArtworkThumb source={p.source} title={p.title}/></div>
    <div className="eyebrow">{p.hung ? rooms.find(room => room.id === roomAt(p.position))?.title : 'WAITING TO BE HUNG'}{p.pending ? ' · THE CURATOR IS WRITING…' : ''}</div>
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
      <label>The story<textarea value={draft.description} maxLength={5000} onChange={event => setDraft({
        ...draft,
        description: event.target.value,
      })} rows={5}/></label>
      <div className="detail-actions"><button className="primary-button" type="submit">Save label</button><button className="text-button" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
    </form> : <><h3>{p.title}</h3><p className="artist-byline">{p.creator}</p><p className="detail-story">{p.description}</p></>}
    <div className="detail-actions">
      <button className="primary-button" onClick={() => viewPortrait(p.id)} disabled={!p.hung || p.merging}>Visit this work <Icon name="arrow" size={17}/></button>
      <button className="text-button" onClick={() => narrate(p.id)}><Icon name="sound" size={16}/> Hear the story</button>
      <button className="text-button" disabled={p.merging || p.reserved} onClick={() => setEditing(!editing)}>Edit label</button>
    </div>
    <div className="detail-secondary">
      <button className="text-button" onClick={() => {
        void loadBlob(p.source).then(blob => download(blob, `${p.title.replaceAll(/[^\p{L}\p{N} -]/gu, '').slice(0, 70) || 'artwork'}.${blob.type.includes('avif') ? 'avif' : 'webp'}`)).catch(() => notify('The image could not be downloaded.'))
      }}>Download image ↗</button>
      <button className="text-button danger" disabled={p.merging || p.reserved} onClick={() => {
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
