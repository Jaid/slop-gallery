import Branch from 'branch-component'
import {useState} from 'react'

import Dropzone from '#component/Dropzone'
import GraphicsTuning from '#component/GraphicsTuning'
import Hud from '#component/Hud'
import LoadingIndicator from '#component/LoadingIndicator'
import Menu from '#component/Menu'
import RenderBoundary from '#component/RenderBoundary'
import RenderError from '#component/RenderError'
import Toast from '#component/Toast'
import TuningBuffer from '#component/TuningBuffer'
import {galleryEvents, useGallery} from '#src/lib/gallery.ts'
import {useHiddenUi} from '#src/lib/hiddenUi.ts'
import {galleryTitle} from '#src/lib/level.ts'
import {useGraphicsTuning} from '#src/lib/rendering/customGraphics.ts'
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
  const tuning = useGraphicsTuning()
  const [renderFailed, setRenderFailed] = useState(false)
  // lib.dom types navigator.gpu as always present, but browsers without WebGPU leave it undefined.
  const gpu = (navigator.gpu as GPU | undefined) !== undefined && globalThis.isSecureContext
  if (!gpu) {
    return <RenderError><h2>WebGPU is unavailable.</h2><p>{galleryTitle} requires native WebGPU. Open it in current Chrome or Edge with hardware acceleration enabled, using HTTPS or localhost.</p></RenderError>
  }
  return <GraphicsMode><Dropzone><div className={css.layout}>
    {/* A column of its own left of the canvas and HUD, so the panel never covers the scene it tunes */}
    <Branch if={tuning.open} then={GraphicsTuning} />
    <div className={css.stage}>
      <main className={css.viewport} aria-label='Interactive 3D gallery'>
        <RenderBoundary onFailure={() => setRenderFailed(true)}><World /></RenderBoundary>
        <Branch if={tuning.open} then={TuningBuffer} />
      </main>
      {/* Hidden with O, the paused scene stays in full view, e.g. while tweaking values in an editor; O brings the menu back. Hovering the tuning panel hides it too. */}
      <Branch none={[s.locked, s.dragging, renderFailed, uiHidden, tuning.hovered]}><Menu {...settings} /></Branch>
      <Branch not={uiHidden} then={Hud} />
      {/* The loading screen covers what loads before Enter; this shows what still streams in after it. */}
      <Branch if={s.ready} not={uiHidden} then={LoadingIndicator} />
      <Branch if={s.notice} not={uiHidden}><Toast>{s.notice}</Toast></Branch>
    </div>
  </div></Dropzone></GraphicsMode>
}
