import './style.css'

import {lazy, Suspense, useState} from 'react'
import {useSlopGalleryTelemetry} from 'slop-gallery-telemethree/react'

import Dropzone from '#component/Dropzone'
import {galleryEvents, openPanel, useGallery} from '#src/lib/gallery.ts'
import {telemetry} from '#src/lib/telemetry.ts'
import useGalleryAI from '#src/lib/useGalleryAI.ts'
import useGalleryCommands from '#src/lib/useGalleryCommands.ts'

import Collection from './Collection.tsx'
import Help from './Help.tsx'
import Hud from './Hud.tsx'
import Map from './Map.tsx'
import Menu from './Menu.tsx'
import Panel from './Panel.tsx'
import RenderBoundary from './RenderBoundary.tsx'
import Settings from './Settings.tsx'

const World = lazy(() => import('./World.tsx'))
const panelTitles = {
  collection: 'Collection',
  settings: 'Gallery preferences',
  help: 'Controls',
  map: 'Floor plan',
}
export default function App() {
  useSlopGalleryTelemetry(telemetry, useGallery, galleryEvents)
  const settings = useGalleryAI()
  useGalleryCommands()
  const s = useGallery()
  const [renderFailed, setRenderFailed] = useState(false)
  const gpu = navigator.gpu !== undefined && globalThis.isSecureContext
  if (!gpu) {
    return <main className="render-error"><h2>WebGPU is unavailable.</h2><p>Slop Gallery requires native WebGPU. Open it in current Chrome or Edge with hardware acceleration enabled, using HTTPS or localhost.</p></main>
  }
  return <Dropzone>
    <main className="viewport" aria-label="Interactive 3D gallery">
      <RenderBoundary onFailure={() => setRenderFailed(true)}><Suspense fallback={null}><World lite={settings.params.lite}/></Suspense></RenderBoundary>
    </main>
    {!s.locked && !s.panel && !s.dragging && !renderFailed && <Menu {...settings}/>}
    {renderFailed && <nav className="fallback-tools" aria-label="Gallery recovery"><button className="text-button" onClick={() => openPanel('collection')}>Collection</button><button className="text-button" onClick={() => openPanel('settings')}>Preferences & backups</button><button className="text-button" onClick={() => openPanel('help')}>Controls</button></nav>}
    <Hud/>
    {s.notice && !s.panel && <div className="toast" role="status">{s.notice}</div>}
    {s.panel && <Panel key={s.panel} title={panelTitles[s.panel]}>{s.panel === 'collection' ? <Collection/> : s.panel === 'settings' ? <Settings/> : s.panel === 'map' ? <Map/> : <Help/>}</Panel>}
  </Dropzone>
}
