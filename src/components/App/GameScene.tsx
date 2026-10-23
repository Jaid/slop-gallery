import type {GameWrapperProps} from 'three-fiber-game'

import Branch from 'branch-component'
import {useMemo, useState} from 'react'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'

import Postprocessing from '#component/Postprocessing'
import TelemetryBridge from '#component/TelemetryBridge'
import WebgpuCaptureBridge from '#component/WebgpuCaptureBridge'
import WireframeVision from '#component/WireframeVision'
import {isDevelopmentMode} from '#src/lib/developmentMode.ts'
import {getAntiAliasing, readAntiAliasing} from '#src/lib/rendering/antiAliasing.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import {getRenderPipelineSettings} from '#src/lib/rendering/renderPipelineSettings.ts'
import {readVisionMode} from '#src/lib/rendering/visionMode.ts'

/** Gallery integrations stay outside the physics subtree and share the WebGPU Canvas. */
export default function GameScene({children}: GameWrapperProps) {
  const isHeavy = useGraphicsMode()
  const profile = useGraphicsModeValue(getGraphicsProfile)
  const [visionMode] = useState(() => readVisionMode())
  const [requestedAntiAliasing] = useState(() => readAntiAliasing())
  const antiAliasing = getAntiAliasing(isHeavy, requestedAntiAliasing)
  const settings = useMemo(() => getRenderPipelineSettings(profile, antiAliasing), [profile, antiAliasing])
  return <>
    <WebgpuCaptureBridge />
    <TelemetryBridge />
    {children}
    <Branch if={visionMode === 'wireframe'} then={WireframeVision} else={<Branch if={profile.postprocessing || antiAliasing !== false}><Postprocessing focus={profile.postprocessing} heavy={profile.postprocessing} settings={settings} tunable={isDevelopmentMode && isHeavy} /></Branch>} />
  </>
}
