import type {GalleryDocument} from '#src/lib/gallery.ts'

import {useRef, useState} from 'react'

import {download} from '#src/lib/download.ts'
import {galleryEvents, notify, useGallery} from '#src/lib/gallery.ts'
import {repository} from '#src/lib/gallery/GalleryRepository.ts'
import {playerSession} from '#src/lib/gallery/PlayerSession.ts'

export default function Settings() {
  const s = useGallery()
  const input = useRef<HTMLInputElement>(null)
  const [recovering, setRecovering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [incoming, setIncoming] = useState<GalleryDocument | null>(null)
  const backup = async () => {
    setBusy(true)
    try {
      download(await repository.export(), `slop-gallery-${(new Date).toISOString().slice(0, 10)}.slop`)
      notify('A portable little museum. Backup exported.')
    } catch {
      notify('The backup could not be created. Your current collection is unchanged.')
    } finally {
      setBusy(false)
    }
  }
  return <>
    <section className="settings-section"><div className="section-label">Atmosphere</div>
      <span className="field-label">Lobby wall palette</span><div className="swatches">{(['ivory', 'sage', 'nocturne'] as const).map(theme => <button aria-pressed={s.theme === theme} className={s.theme === theme ? 'chosen' : ''} onClick={() => useGallery.setState({theme})} key={theme}><i style={{background: theme === 'ivory' ? '#e7dfcc' : (theme === 'sage' ? '#a4b7a6' : '#536571')}}/>{theme}</button>)}</div>
      <span className="field-label">Frame finish</span><div className="segmented">{(['gold', 'oak', 'black'] as const).map(frame => <button key={frame} aria-pressed={s.frame === frame} className={s.frame === frame ? 'chosen' : ''} onClick={() => useGallery.setState({frame})}>{frame}</button>)}</div>
      <label className="toggle-row">Sound<input type="checkbox" checked={s.sound} onChange={event => useGallery.setState({sound: event.target.checked})}/></label>
    </section>
    <section className="settings-section"><div className="section-label">Collection backup</div>
      {s.storageRecoveryRequired && <div className="confirmation"><p>The saved collection could not be read. Automatic saving is paused so the original record stays untouched. Export the current session or restore a backup before deciding to replace it.</p><button className="text-button danger" onClick={() => {
        if (recovering) {
          useGallery.setState({storageRecoveryRequired: false})
          setRecovering(false)
        } else {
          setRecovering(true)
        }
      }}>{recovering ? 'Confirm replacement of unreadable saved collection' : 'Replace unreadable saved collection with this session'}</button>{recovering && <button className="text-button" onClick={() => setRecovering(false)}>Keep the stored record</button>}</div>}
      <div className="storage-status"><span className="status-dot"/>{s.saveStatus === 'loading' ? 'Reading this device’s collection…' : s.saveStatus === 'error' ? 'Local save unavailable – export a backup.' : s.saveStatus === 'saving' ? 'Saving on this device…' : 'Automatically saved on this device.'}</div>
      <p className="muted">Images, labels, artwork placements, preferences and your player pose stay in this browser. The collection uses IndexedDB; a small local checkpoint preserves your latest position and facing when you refresh. No account or cloud storage. Loose frames are saved when they settle. Export a .slop backup before clearing browser data or moving to another device. Keys are never included.</p>
      <div className="detail-actions"><button className="primary-button" disabled={busy} onClick={() => void backup()}>{busy ? 'Working…' : 'Export collection'} <span>↗</span></button><button className="text-button" disabled={busy} onClick={() => input.current?.click()}>Restore a backup</button></div>
      <input ref={input} hidden type="file" accept=".slop" aria-label="Restore gallery backup" onChange={event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) {
          return
        }
        setBusy(true)
        void repository.import(file).then(setIncoming).catch(error => notify(error instanceof Error ? error.message : 'That backup could not be read.')).finally(() => setBusy(false))
      }}/>
      {incoming && <div className="confirmation"><p>Restore this collection of {incoming.portraits.length} works? Your current collection will be replaced. You can undo this.</p><button className="primary-button" onClick={() => {
        s.commit(incoming.portraits)
        playerSession.restore(incoming.player)
        useGallery.setState(current => ({
          ...incoming.settings,
          importEpoch: current.importEpoch + 1,
          playerEpoch: current.playerEpoch + 1,
        }))
        setIncoming(null)
        galleryEvents.dispatchEvent(new Event('cancel-interaction'))
        notify('Your collection has arrived safely.')
      }}>Restore collection</button><button className="text-button" onClick={() => setIncoming(null)}>Keep this collection</button></div>}
    </section>
  </>
}
