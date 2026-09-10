import type {Attributes} from 'telemethree'

import {useThree} from '@react-three/fiber/webgpu'
import {useMemo} from 'react'
import {useEgoTelemetry} from 'telemethree-ego/react'
import {useThreeTelemetry} from 'telemethree/react'
import {useGraphicsQuality} from 'use-graphics-quality'

import {AimInspector} from '#src/lib/development/AimInspector.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'
import {playerTelemetry, telemetry} from '#src/lib/telemetry/index.ts'

function Collectors() {
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const inspector = useMemo(() => new AimInspector(scene, camera), [scene, camera])
  const isQuality = useGraphicsQuality()
  const profile = getGraphicsProfile(isQuality)
  useThreeTelemetry({
    telemetry: telemetry!,
    getAttributes: () => {
      const {room, locked} = useGallery.getState()
      return {
        room,
        locked,
        'graphics.profile': useGraphicsQuality.getName(isQuality),
        'graphics.shadows': profile.shadows,
        'graphics.postprocessing': profile.postprocessing,
        'graphics.floor_reflections': profile.floorReflections,
        'graphics.noise_textures': profile.noiseTextures,
      }
    },
    getTraceContext: () => telemetry!.getContext(),
    getHitchAttributes: (): Attributes => {
      const player = playerTelemetry.read?.()
      return player ? {'ego.speed': Math.hypot(player.velocity.x, player.velocity.y, player.velocity.z)} : {}
    },
  })
  useEgoTelemetry({
    telemetry: telemetry!,
    read: () => {
      const player = playerTelemetry.read?.()
      return player ? {
        ...player,
        aim: inspector.getAim(),
      } : null
    },
  })
  return null
}
function TelemetryBridge() {
  return telemetry ? <Collectors/> : null
}
export default TelemetryBridge
