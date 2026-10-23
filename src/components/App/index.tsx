import Branch from 'branch-component'
import {useState} from 'react'

import Dropzone from '#component/Dropzone'
import GraphicsTuning from '#component/GraphicsTuning'
import Hud from '#component/Hud'
import Map from '#component/Map'
import Menu from '#component/Menu'
import Panel from '#component/Panel'
import RenderBoundary from '#component/RenderBoundary'
import RenderError from '#component/RenderError'
import Toast from '#component/Toast'
import {galleryEvents, useGallery} from '#src/lib/gallery.ts'
import {useHiddenUi} from '#src/lib/hiddenUi.ts'
import {galleryTitle} from '#src/lib/level.ts'
import {isCustomGraphics} from '#src/lib/rendering/graphicsMode.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'
import useSlopGalleryTelemetry from '#src/lib/telemetry/useSlopGalleryTelemetry.ts'
import useGalleryAI from '#src/lib/useGalleryAI.ts'
import useGalleryCommands from '#src/lib/useGalleryCommands.ts'

import GraphicsMode from './GraphicsMode.tsx'
import World from './World.tsx'

import css from './style.module.sass'

export default function App() {
  useSlopGalleryTelemetry(telemetry, useGallery, galleryEvents)
  const settings = useGalleryAI()
  useGalleryCommands()
  const s = useGallery()
  const uiHidden = useHiddenUi(state => state.hidden)
  const [renderFailed, setRenderFailed] = useState(false)
  // lib.dom types navigator.gpu as always present, but browsers without WebGPU leave it undefined.
  const gpu = (navigator.gpu as GPU | undefined) !== undefined && globalThis.isSecureContext
  if (!gpu) {
    return <RenderError><h2>WebGPU is unavailable.</h2><p>{galleryTitle} requires native WebGPU. Open it in current Chrome or Edge with hardware acceleration enabled, using HTTPS or localhost.</p></RenderError>
  }
  return <GraphicsMode><Dropzone>
    <main className={css.viewport} aria-label='Interactive 3D gallery'>
      <RenderBoundary onFailure={() => setRenderFailed(true)}><World /></RenderBoundary>
    </main>
    {/* Hidden with O, the paused scene stays in full view, e.g. while tweaking values in an editor; O brings the menu back. */}
    <Branch none={[s.locked, s.panel, s.dragging, renderFailed, uiHidden]}><Menu {...settings} /></Branch>
    <Branch not={uiHidden} then={Hud} />
    {/* Stays while O hides the menu, so the paused scene can be tuned in full view. */}
    <Branch if={isCustomGraphics} none={[s.locked, s.panel, s.dragging, renderFailed]} then={GraphicsTuning} />
    <Branch if={s.notice} none={[s.panel, uiHidden]}><Toast>{s.notice}</Toast></Branch>
    <Branch if={s.panel === 'map'}><Panel title='Floor plan'><Map /></Panel></Branch>
  </Dropzone></GraphicsMode>
}
