import type {GalleryDocument} from '#src/lib/gallery.ts'
import type useGalleryAI from '#src/lib/useGalleryAI.ts'

import {useRef, useState} from 'react'

import {galleryEvents, notify, resetGallery, setApiKey, useGallery} from '#src/lib/gallery.ts'
import {repository} from '#src/lib/gallery/GalleryRepository.ts'

import {download} from './Collection.tsx'

export default function Settings({params, setParams}: ReturnType<typeof useGalleryAI>) {
  const s = useGallery()
  const input = useRef<HTMLInputElement>(null)
  const [key, setKey] = useState(s.apiKey)
  const [confirmReset, setConfirmReset] = useState(false)
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
    <section className="settings-section"><div className="section-label">01 / THE ATMOSPHERE</div>
      <span className="field-label">Daydream wall palette</span><div className="swatches">{(['ivory', 'sage', 'nocturne'] as const).map(theme => <button aria-pressed={s.theme === theme} className={s.theme === theme ? 'chosen' : ''} onClick={() => useGallery.setState({theme})} key={theme}><i style={{background: theme === 'ivory' ? '#e7dfcc' : theme === 'sage' ? '#a4b7a6' : '#536571'}}/>{theme}</button>)}</div>
      <span className="field-label">Frame finish</span><div className="segmented">{(['gold', 'oak', 'black'] as const).map(frame => <button key={frame} aria-pressed={s.frame === frame} className={s.frame === frame ? 'chosen' : ''} onClick={() => useGallery.setState({frame})}>{frame}</button>)}</div>
      <label className="toggle-row">Narration & ambient sound<input type="checkbox" checked={s.sound} onChange={event => useGallery.setState({sound: event.target.checked})}/></label>
      <label className="toggle-row">Camera motion & animated details<input type="checkbox" checked={s.motion} onChange={event => useGallery.setState({motion: event.target.checked})}/></label>
      <label className="toggle-row">Lightweight rendering<input type="checkbox" checked={params.lite} onChange={event => void setParams({lite: event.target.checked})}/></label>
      <p className="muted">Full-quality WebGPU is the default. Lightweight mode skips ambient occlusion and bloom. No external textures, fonts or environment downloads are needed.</p>
    </section>
    <section className="settings-section"><div className="section-label">02 / THE AI STUDIO</div>
      <label className="toggle-row">Enable OpenRouter<input type="checkbox" checked={params.ai} onChange={event => void setParams({ai: event.target.checked})}/></label>
      <p className="muted">Optional, paid AI. Imports send images for streamed titles and stories. Collisions send the hanging image first, then the thrown image. Without AI, fusion makes a local collage and narration uses recordings or your browser.</p>
      <label htmlFor="settings-key">OpenRouter key</label><div className="key-row"><input id="settings-key" type="password" autoComplete="off" placeholder="sk-or-…" value={key} onChange={event => setKey(event.target.value)}/><button className="primary-button" onClick={() => {
        if (!key.trim()) {
          notify('Enter an OpenRouter key first.')
          return
        }
        setApiKey(key.trim())
        void setParams({ai: true})
        notify('Studio connected. The key stays in this tab.')
      }}>Connect</button></div>
      <button className="text-button" onClick={() => {
        setApiKey('')
        setKey('')
        void setParams({ai: false})
        notify('Key removed. AI is off.')
      }}>Forget key</button>
      <details><summary>Model preferences</summary>{(['text_model', 'image_model', 'audio_model', 'narrator_voice', 'narrator_character', 'text_model_effort'] as const).map(parameter => <label className="model-field" key={parameter}>{parameter.replaceAll('_', ' ')}<input value={params[parameter]} onChange={event => void setParams({[parameter]: event.target.value})}/></label>)}<label className="toggle-row">Prepare custom narration in advance<input type="checkbox" checked={params.eager_audio} onChange={event => void setParams({eager_audio: event.target.checked})}/></label><p className="muted">Model availability depends on your provider. Changing AI settings cancels active jobs without consuming their source artworks. Recorded default stories keep their original voice.</p></details>
    </section>
    <section className="settings-section"><div className="section-label">03 / KEEP YOUR HAPPY ACCIDENTS</div>
      <div className="storage-status"><span className="status-dot"/>{s.saveStatus === 'error' ? 'Local save unavailable – export a backup.' : s.saveStatus === 'saving' ? 'Saving on this device…' : 'Automatically saved on this device.'}</div>
      <p className="muted">Images, labels, artwork placements and preferences stay in this browser’s IndexedDB. No account or cloud storage. Loose frames are saved when they settle. Export a .slop backup before clearing browser data or moving to another device. Keys are never included.</p>
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
        s.commit(incoming.portraits, incoming.secretOpen)
        useGallery.setState(current => ({...incoming.settings, importEpoch: current.importEpoch + 1}))
        setIncoming(null)
        galleryEvents.dispatchEvent(new Event('home'))
        notify('Your collection has arrived safely.')
      }}>Restore collection</button><button className="text-button" onClick={() => setIncoming(null)}>Keep this collection</button></div>}
    </section>
    <section className="settings-section"><div className="section-label">04 / A FRESH START</div><p className="muted">Restore the original art and close the secret room. This is undoable. Your atmosphere preferences stay as they are.</p><button className="reset-button" onClick={() => {
      if (confirmReset) {
        resetGallery()
        setConfirmReset(false)
      } else {
        setConfirmReset(true)
      }
    }}>{confirmReset ? 'Confirm reset · restore the original collection' : 'Reset the collection'}</button>{confirmReset && <button className="text-button" onClick={() => setConfirmReset(false)}>Cancel</button>}</section>
  </>
}
