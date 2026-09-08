import './style.css'

import {lazy, Suspense, useEffect, useState} from 'react'

import Dropzone from '#component/Dropzone'
import {intro} from '#src/lib/audio/Narrator.ts'
import {enterGallery, notify, openPanel, redo, rooms, setApiKey, stopNarration, undo, upload, useGallery} from '#src/lib/gallery.ts'
import useGalleryAI from '#src/lib/useGalleryAI.ts'

import Collection from './Collection.tsx'
import Help from './Help.tsx'
import Icon from './Icon.tsx'
import Map from './Map.tsx'
import NarrationBars from './NarrationBars.tsx'
import Panel from './Panel.tsx'
import RenderBoundary from './RenderBoundary.tsx'
import Settings from './Settings.tsx'

const World = lazy(() => import('./World.tsx'))
const panelTitles = {
  collection: 'A collection of curiosities.',
  settings: 'Make yourself at home.',
  help: 'A guide to beautiful chaos.',
  map: 'A little sense of direction.',
}
export default function App() {
  const settings = useGalleryAI()
  const {params, setParams} = settings
  const s = useGallery()
  const [prompt, setPrompt] = useState(params.ai && !s.apiKey)
  const [key, setKey] = useState(s.apiKey)
  const [started, setStarted] = useState(false)
  const gpu = navigator.gpu !== undefined && globalThis.isSecureContext
  const active = s.portraits.find(p => p.id === s.active)
  const room = rooms.find(room => room.id === s.room)!
  const speaking = s.narration?.id === '__intro' ? intro : s.portraits.find(p => p.id === s.narration?.id)
  const shown = active && !s.held ? active : s.narration && s.locked ? speaking : null
  const busy = s.portraits.filter(p => p.merging).length
  useEffect(() => {
    if (s.locked) {
      setStarted(true)
      setPrompt(false)
    }
  }, [s.locked])
  useEffect(() => {
    document.documentElement.dataset.motion = s.motion ? 'on' : 'off'
  }, [s.motion])
  const connect = () => {
    if (!key.trim()) {
      notify('Enter your OpenRouter key or explore without AI.')
      return
    }
    setApiKey(key.trim())
    void setParams({ai: true})
    setPrompt(false)
    notify('AI studio connected. Images are sent only for imports and fusions.')
  }
  const offline = () => {
    void setParams({ai: false})
    setPrompt(false)
  }
  return <Dropzone>
    <a className="skip-link" href="#collection-access" onClick={event => {
      event.preventDefault()
      openPanel('collection')
    }}>Skip to the collection</a>
    <header className="header">
      <button className="brand" onClick={() => openPanel(null)} aria-label="Slop Gallery home"><span className="brand-mark"><i/><i/><i/></span><span>slop<span className="brand-light">gallery</span><small>A SPACE FOR HAPPY ACCIDENTS</small></span></button>
      <div className="exhibition"><span className="status-dot"/> THE PERMANENTLY UNFINISHED COLLECTION <span className="edition">VOL. 002</span></div>
      <nav aria-label="Gallery">
        <button id="collection-access" aria-label="Open collection" className={`nav-button ${s.panel === 'collection' ? 'selected' : ''}`} onClick={() => openPanel('collection')}><Icon name="grid"/><span>Collection</span><em>{s.portraits.length.toString().padStart(2, '0')}</em></button>
        <button className="icon-button map-button" title="Floor plan (Tab)" aria-label="Open floor plan" onClick={() => openPanel('map')}><Icon name="map"/></button>
        <span className="nav-divider"/>
        <button className="import-button" onClick={upload} aria-label="Add artwork" disabled={!s.ready}><Icon name="plus"/>Add artwork</button>
        <button className="icon-button" title={s.sound ? 'Mute sound (M)' : 'Enable sound (M)'} aria-label="Toggle sound" aria-pressed={s.sound} onClick={() => useGallery.setState({sound: !s.sound})}><Icon name={s.sound ? 'sound' : 'mute'}/></button>
        <button className={`icon-button ${s.panel === 'settings' ? 'selected' : ''}`} title="Gallery settings" aria-label="Gallery settings" onClick={() => openPanel('settings')}><Icon name="settings"/></button>
      </nav>
    </header>
    <main className={`viewport ${s.locked ? 'exploring' : ''}`} aria-label="Interactive 3D gallery">
      {gpu ? <RenderBoundary><Suspense fallback={null}><World lite={params.lite}/></Suspense></RenderBoundary> : <div className="render-error"><span className="eyebrow">A MODERN MUSEUM</span><h2>A little more GPU, please.</h2><p>This gallery uses WebGPU. Open it in current Chrome or Edge, enable hardware acceleration and use HTTPS or localhost. The collection browser is still available.</p><button className="primary-button" onClick={() => openPanel('collection')}>Browse the art instead</button></div>}
    </main>
    <div className="room-label"><span className="room-number">{room.number}</span><div>{room.title.toUpperCase()}<small>{room.subtitle}</small></div></div>
    <div className="gallery-tag"><span className="status-dot"/>{busy ? 'ALCHEMY IN PROGRESS' : params.ai && s.apiKey ? 'AI STUDIO CONNECTED' : 'LOCAL GALLERY. LIMITLESS CURIOSITY.'}</div>
    {!s.locked && !s.panel && !s.dragging && gpu && <section className={`welcome ${started ? 'compact' : ''}`}>
      <div className="eyebrow"><span/>A LITTLE CULTURE. A LITTLE CHAOS.</div>
      <h1>{started ? 'Stay curious.' : <>Good taste.<i>Questionable art.</i></>}</h1>
      <p>{started ? 'Your next masterpiece is one happy accident away.' : 'An art gallery with a mind of its own. Wander, rearrange and make something wonderfully unexpected.'}</p>
      <div className="welcome-actions"><button className="primary-button" id="enter-gallery" disabled={!s.ready} onClick={enterGallery}>{!s.ready ? 'Hanging the exhibition…' : started ? 'Back to the gallery' : 'Step inside'}<Icon name="arrow"/></button><button className="text-button" onClick={() => openPanel('help')}>A quick introduction <span>↗</span></button></div>
      <div className="local-note"><span className="status-dot"/>No tickets. No rules. Please touch the art.</div>
    </section>}
    {!s.locked && !s.panel && !s.dragging && !prompt && <div className="exhibit-caption"><span>ON VIEW</span><strong>The art of not making sense.</strong><p>Five rooms. Not a single sensible explanation.</p><button onClick={() => openPanel('collection')}>Meet the collection <span>↗</span></button></div>}
    {s.locked && <>
      <div className={`crosshair ${s.active ? 'targeted' : ''}`}/>
      {shown && !s.inspecting && <div className="art-subtitle"><div className="eyebrow">{'pending' in shown && Boolean(shown.pending) ? 'THE CURATOR IS WRITING…' : 'creator' in shown ? String(shown.creator) : 'YOUR GALLERY GUIDE'}</div><h2>{shown.title}</h2><p>{shown.description}</p>{active && <small><b>HOLD LMB / E</b> Move <span>·</span><b>RMB / R</b> Listen <span>·</span><b>HOLD V</b> Look closer</small>}</div>}
      {s.active?.startsWith('prop-') && !s.held && <div className="prop-hint"><span className="eyebrow">PLEASE TOUCH THE ART</span>{s.active === 'prop-book' ? 'A suspiciously well-read book.' : s.active === 'prop-knot' ? 'A very serious knot.' : s.active.startsWith('prop-leaf-') ? 'A leaf with somewhere else to be.' : s.active.startsWith('prop-pot-') ? 'A pot with nothing left to lose.' : 'The original forbidden download.'}<small>{s.active.startsWith('prop-pot-') && 'Pluck every leaf first · '}{s.active.startsWith('prop-leaf-') ? 'Hold LMB or press E to pluck / pick up' : 'Hold LMB or press E to pick up'} · RMB / Q to throw</small></div>}
      {s.inspecting && <div className="inspect-hint">A little closer. <kbd>Release V</kbd> to return</div>}
      {s.held && <div className={`grab-instruction ${s.placement?.valid ? 'valid' : ''}`}><span className="status-dot"/>{s.held.startsWith('prop-leaf-') ? 'A small act of botanical rebellion.' : s.held.startsWith('prop-') ? 'Culture, in the palm of your hand.' : s.placement?.valid ? 'A rather good spot.' : s.placement?.reason || 'Find a little wall space.'}<small>{s.held.startsWith('prop-') ? 'Release to set down' : 'Release to hang'} · Right-click / Q to throw · Esc to cancel</small></div>}
    </>}
    {s.narration && speaking && <div className="now-playing" role="status"><NarrationBars status={s.narration.status}/><div><small>{s.narration.status === 'preparing' ? 'PREPARING YOUR STORY' : 'THE AUDIO GUIDE'}</small><span>{speaking.title}</span></div><button aria-label="Stop narration" className="icon-button" onClick={stopNarration}><Icon name="close" size={16}/></button></div>}
    <footer className="footer"><div className="controls-guide"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Walk</span><i/><span><span className="mouse-glyph"/>Look around</span><i/><span><kbd>LMB</kbd> Hold & move art</span><i/><span><kbd>RMB</kbd> Narrate / throw</span></div>
      <div className="footer-right"><div className="history-controls"><button aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!s.past.length} onClick={() => {
        if (undo()) {
          notify('Undone. Second thoughts welcome.')
        }
      }}>↶</button><button aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!s.future.length} onClick={() => {
        if (redo()) {
          notify('Redone.')
        }
      }}>↷</button></div><span className="save-indicator" data-state={s.saveStatus}>{s.saveStatus === 'error' ? 'SAVE UNAVAILABLE' : s.saveStatus === 'saving' ? 'SAVING…' : s.saveStatus === 'loading' ? 'OPENING COLLECTION…' : 'SAVED ON THIS DEVICE'}</span><button aria-label="Controls and help" onClick={() => openPanel('help')}><Icon name="help" size={18}/></button><span className="escape-hint"><kbd>ESC</kbd> Release cursor</span></div>
    </footer>
    {s.notice && <div className="toast" role="status"><Icon name="spark" size={17}/>{s.notice}</div>}
    {prompt && !s.panel && !s.locked && !s.dragging && <aside className="ai-prompt" aria-label="OpenRouter connection"><button className="close-button" aria-label="Continue without AI" onClick={offline}><Icon name="close" size={17}/></button><div className="eyebrow"><Icon name="spark" size={15}/>A LITTLE EXTRA IMAGINATION</div><h2>Give your gallery a voice.</h2><p>Connect OpenRouter for witty titles, narrated stories and AI-reimagined artwork fusions.</p><input type="password" autoComplete="off" aria-label="OpenRouter API key" placeholder="Your OpenRouter API key" value={key} onChange={event => setKey(event.target.value)} onKeyDown={event => {
      if (event.key === 'Enter') {
        connect()
      }
    }}/><div className="prompt-actions"><button className="primary-button" onClick={connect}>Connect studio <Icon name="arrow" size={16}/></button><button className="text-button" onClick={offline}>Explore without AI</button></div><small>Your key stays in this tab. AI sends images to OpenRouter and may incur charges. Local mode needs no connection.</small></aside>}
    {s.panel && <Panel key={s.panel} title={panelTitles[s.panel]}>{s.panel === 'collection' ? <Collection/> : s.panel === 'settings' ? <Settings {...settings}/> : s.panel === 'map' ? <Map/> : <Help/>}</Panel>}
  </Dropzone>
}
