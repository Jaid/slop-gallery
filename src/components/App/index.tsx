import {lazy, Suspense, useState} from 'react'

import Dropzone from '#component/Dropzone'
import Hud from '#component/Hud'
import Map from '#component/Map'
import Menu from '#component/Menu'
import Panel from '#component/Panel'
import RenderBoundary from '#component/RenderBoundary'
import RenderError from '#component/RenderError'
import Toast from '#component/Toast'
import {galleryEvents, useGallery} from '#src/lib/gallery.ts'
import {galleryTitle} from '#src/lib/level.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'
import {useSlopGalleryTelemetry} from '#src/lib/telemetry/useSlopGalleryTelemetry.ts'
import useGalleryAI from '#src/lib/useGalleryAI.ts'
import useGalleryCommands from '#src/lib/useGalleryCommands.ts'

import GraphicsQuality from './GraphicsQuality.tsx'

import css from './style.module.sass'

const World = lazy(() => import('./World.tsx'))

export default function App() {
  useSlopGalleryTelemetry(telemetry, useGallery, galleryEvents)
  const settings = useGalleryAI()
  useGalleryCommands()
  const s = useGallery()
  const [renderFailed, setRenderFailed] = useState(false)
  const gpu = navigator.gpu !== undefined && globalThis.isSecureContext
  if (!gpu) {
    return <RenderError><h2>WebGPU is unavailable.</h2><p>{galleryTitle} requires native WebGPU. Open it in current Chrome or Edge with hardware acceleration enabled, using HTTPS or localhost.</p></RenderError>
  }
  return <GraphicsQuality><Dropzone>
    <main className={css.viewport} aria-label="Interactive 3D gallery">
      <RenderBoundary onFailure={() => setRenderFailed(true)}><Suspense fallback={null}><World/></Suspense></RenderBoundary>
    </main>
    {!s.locked && !s.panel && !s.dragging && !renderFailed && <Menu {...settings}/>}
    <Hud/>
    {s.notice && !s.panel && <Toast>{s.notice}</Toast>}
    {s.panel === 'map' && <Panel title="Floor plan"><Map/></Panel>}
  </Dropzone></GraphicsQuality>
}
