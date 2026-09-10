import {lazy, Suspense, useState} from 'react'

import Collection from '#component/Collection'
import Dropzone from '#component/Dropzone'
import Help from '#component/Help'
import Hud from '#component/Hud'
import Map from '#component/Map'
import Menu from '#component/Menu'
import Panel from '#component/Panel'
import RecoveryTools from '#component/RecoveryTools'
import RenderBoundary from '#component/RenderBoundary'
import RenderError from '#component/RenderError'
import Settings from '#component/Settings'
import Toast from '#component/Toast'
import {galleryEvents, useGallery} from '#src/lib/gallery.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'
import {useSlopGalleryTelemetry} from '#src/lib/telemetry/useSlopGalleryTelemetry.ts'
import useGalleryAI from '#src/lib/useGalleryAI.ts'
import useGalleryCommands from '#src/lib/useGalleryCommands.ts'

import GraphicsQuality from './GraphicsQuality.tsx'

import css from './style.module.sass'

const World = lazy(() => import('./World.tsx'))
const panelComponents = {
  collection: Collection,
  settings: Settings,
  help: Help,
  map: Map,
}
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
  const PanelContent = s.panel ? panelComponents[s.panel] : null
  const [renderFailed, setRenderFailed] = useState(false)
  const gpu = navigator.gpu !== undefined && globalThis.isSecureContext
  if (!gpu) {
    return <RenderError><h2>WebGPU is unavailable.</h2><p>Slop Gallery requires native WebGPU. Open it in current Chrome or Edge with hardware acceleration enabled, using HTTPS or localhost.</p></RenderError>
  }
  return <GraphicsQuality><Dropzone>
    <main className={css.viewport} aria-label="Interactive 3D gallery">
      <RenderBoundary onFailure={() => setRenderFailed(true)}><Suspense fallback={null}><World/></Suspense></RenderBoundary>
    </main>
    {!s.locked && !s.panel && !s.dragging && !renderFailed && <Menu {...settings}/>}
    {renderFailed && <RecoveryTools/>}
    <Hud/>
    {s.notice && !s.panel && <Toast>{s.notice}</Toast>}
    {s.panel && PanelContent && <Panel key={s.panel} title={panelTitles[s.panel]}><PanelContent/></Panel>}
  </Dropzone></GraphicsQuality>
}
