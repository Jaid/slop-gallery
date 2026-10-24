import type Node from 'three/src/nodes/core/Node.js'
import type {CubeTexture, LightShadow, Texture} from 'three/webgpu'

import {abs, cross, cubeTexture, Fn, int, interleavedGradientNoise, normalize, reference, screenCoordinate, texture, vec3, vogelDiskSample} from 'three/tsl'
import {useGraphicsModeValue} from 'use-graphics-mode'

import {getGraphicsProfile} from './graphicsMode.ts'

type ShadowFilterInputs = {
  depthLayer?: Node<'int'>
  depthTexture: Texture & {isArrayTexture?: boolean}
  shadow: LightShadow
  shadowCoord: Node<'vec3'>
}
type PointShadowFilterInputs = {
  bd3D: Node<'vec3'>
  depthTexture: CubeTexture
  dp: Node<'float'>
  shadow: LightShadow
}

const average = (samples: Array<Node<'float'>>) => samples.reduce((sum, sample) => sum.add(sample)).div(samples.length)
/** the per-pixel rotation of the sampling disk, which the temporal resolve averages out */
const rotation = () => interleavedGradientNoise(screenCoordinate.xy).mul(Math.PI * 2)
/**
 * Three’s PCF filter for directional and spot lights with any number of samples instead of 5, on the same Vogel disk of `shadow.radius` texels.
 *
 * More samples resolve the penumbra’s gradient in a single frame instead of leaving noise for the temporal resolve.
 */
function createPcfShadowFilter(count: number) {
  return Fn(({depthLayer, depthTexture, shadow, shadowCoord}: ShadowFilterInputs) => {
    const mapSize = reference('mapSize', 'vec2', shadow)
    const radius = reference('radius', 'float', shadow)
    const spread = radius.div(mapSize.x)
    const phi = rotation()
    return average(Array.from({length: count}, (_, index) => {
      let depth = texture(depthTexture, shadowCoord.xy.add(vogelDiskSample(int(index), int(count), phi).mul(spread)))
      if (depthTexture.isArrayTexture) {
        depth = depth.depth(depthLayer!)
      }
      return depth.compare(shadowCoord.z) as unknown as Node<'float'>
    }))
  })
}
/** Three’s point light shadow filter with any number of samples instead of 5, see {@link createPcfShadowFilter}. */
function createPointShadowFilter(count: number) {
  return Fn(({bd3D, depthTexture, dp, shadow}: PointShadowFilterInputs) => {
    const mapSize = reference('mapSize', 'vec2', shadow)
    const radius = reference('radius', 'float', shadow)
    const spread = radius.div(mapSize.x)
    // A tangent frame around the direction to offset the samples in
    const absolute = abs(bd3D)
    const tangent = normalize(cross(bd3D, absolute.x.greaterThan(absolute.z).select(vec3(0, 1, 0), vec3(1, 0, 0))))
    const bitangent = cross(bd3D, tangent)
    const phi = rotation()
    return average(Array.from({length: count}, (_, index) => {
      const offset = vogelDiskSample(int(index), int(count), phi)
      return cubeTexture(depthTexture, bd3D.add(tangent.mul(offset.x).add(bitangent.mul(offset.y)).mul(spread))).compare(dp) as unknown as Node<'float'>
    }))
  })
}
/** Three’s own filters take this many samples. */
const defaultSamples = 5
const filters = new Map<string, ReturnType<typeof createPcfShadowFilter> | ReturnType<typeof createPointShadowFilter>>
const getFilter = (count: number, isPoint: boolean) => {
  const key = `${isPoint ? 'point' : 'pcf'}:${count}`
  let filter = filters.get(key)
  if (!filter) {
    filter = isPoint ? createPointShadowFilter(count) : createPcfShadowFilter(count)
    filters.set(key, filter)
  }
  return filter
}

/**
 * Shadow props for a light whose map is `mapSize` texels wide in heavy graphics, scaled to the graphics mode.
 * The filter radius grows with the map, so a larger map keeps the penumbra’s width and only resolves it finer.
 */
export function useShadowProps(mapSize: number, {isPoint = false, radius = 1}: {
  isPoint?: boolean
  radius?: number
} = {}) {
  const {shadowMapScale, shadowSamples} = useGraphicsModeValue(getGraphicsProfile)
  return getShadowProps({
    isPoint,
    mapSize: mapSize * shadowMapScale,
    radius: radius * shadowMapScale,
    samples: shadowSamples,
  })
}
/** Shadow props for a map of `mapSize` texels along each axis, filtered by `samples` lookups on a disk of `radius` texels. */
export function getShadowProps({isPoint = false, mapSize, radius, samples}: {
  isPoint?: boolean
  mapSize: number
  radius: number
  samples: number
}) {
  return {
    'shadow-filterNode': samples === defaultSamples ? null : getFilter(samples, isPoint),
    'shadow-mapSize': [mapSize, mapSize] as const,
    'shadow-radius': radius,
  }
}
