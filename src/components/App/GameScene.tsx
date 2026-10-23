import type {GameWrapperProps} from 'three-fiber-game'

import Branch from 'branch-component'
import {useState} from 'react'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'

import Postprocessing from '#component/Postprocessing'
import TelemetryBridge from '#component/TelemetryBridge'
import WebgpuCaptureBridge from '#component/WebgpuCaptureBridge'
import WireframeVision from '#component/WireframeVision'
import {isKnottingham} from '#src/lib/level.ts'
import {getAntiAliasing, readAntiAliasing} from '#src/lib/rendering/antiAliasing.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import {readVisionMode} from '#src/lib/rendering/visionMode.ts'

/** Gallery integrations stay outside the physics subtree and share the WebGPU Canvas. */
export default function GameScene({children}: GameWrapperProps) {
  const isHeavy = useGraphicsMode()
  const profile = useGraphicsModeValue(getGraphicsProfile)
  const [visionMode] = useState(() => readVisionMode())
  const [requestedAntiAliasing] = useState(() => readAntiAliasing())
  const antiAliasing = getAntiAliasing(isHeavy, requestedAntiAliasing)
  return <>
    <WebgpuCaptureBridge />
    <TelemetryBridge />
    {children}
    <Branch if={visionMode === 'wireframe'} then={WireframeVision} else={<Branch if={profile.postprocessing || antiAliasing !== false}><Postprocessing ambientOcclusionResolutionScale={profile.ambientOcclusionResolutionScale} ambientOcclusionSamples={profile.ambientOcclusionSamples} antiAliasing={antiAliasing} contactDarkening={isKnottingham} focus={profile.postprocessing} heavy={profile.postprocessing} indirectLight={profile.indirectLight} reflectionResolutionScale={profile.reflectionResolutionScale} volumetricLight={profile.volumetricLight} /></Branch>} />
  </>
}
