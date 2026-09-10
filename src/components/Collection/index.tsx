import {useState} from 'react'

import ArtworkCard from '#component/ArtworkCard'
import ArtworkDetail from '#component/ArtworkDetail'
import CollectionFilters from '#component/CollectionFilters'
import UploadArtwork from '#component/UploadArtwork'
import {roomAt, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

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
    <p className={css.intro}>{portraits.length} works. Not a single sensible explanation.</p>
    <CollectionFilters query={query} room={room} setQuery={setQuery} setRoom={setRoom}/>
    <div className={css.grid}><UploadArtwork/>{filtered.map((p, i) => <ArtworkCard key={p.id} portrait={p} index={i} onSelect={setSelected}/>)}</div>
    {!filtered.length && <div className={css.empty}><h3>Nothing on this wall.</h3><p>Try another search. The good taste is still missing, too.</p><button className={css.textButton} onClick={() => {
      setQuery('')
      setRoom('all')
    }}>Clear filters</button></div>}
  </>
}

