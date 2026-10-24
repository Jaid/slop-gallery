import type Node from 'three/src/nodes/core/Node.js'
import type {CubeTexture, LightShadow, Texture} from 'three/webgpu'

import {abs, cross, cubeTexture, float, Fn, int, interleavedGradientNoise, Loop, normalize, reference, screenCoordinate, texture, vec3, vogelDiskSample} from 'three/tsl'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'
import {useShallow} from 'zustand/react/shallow'

import {isDevelopmentMode} from '../developmentMode.ts'
import {useCustomGraphics} from './customGraphics.ts'
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
/**
 * Like {@link createPcfShadowFilter} and {@link createPointShadowFilter}, but looping over `shadow.filterSamples` lookups, a uniform the tuning panel changes live: three builds a light’s shadow with its filter only once.
 */
function createTunableShadowFilter(isPoint: boolean) {
  return Fn((inputs: PointShadowFilterInputs & ShadowFilterInputs) => {
    const {depthLayer, depthTexture, shadow} = inputs
    const count = reference('filterSamples', 'int', shadow)
    const spread = reference('radius', 'float', shadow).div(reference('mapSize', 'vec2', shadow).x)
    const phi = rotation()
    const sum = float(0).toVar()
    if (isPoint) {
      const {bd3D, dp} = inputs
      const absolute = abs(bd3D)
      const tangent = normalize(cross(bd3D, absolute.x.greaterThan(absolute.z).select(vec3(0, 1, 0), vec3(1, 0, 0))))
      const bitangent = cross(bd3D, tangent)
      Loop(count, ({i}) => {
        const offset = vogelDiskSample(i, count, phi)
        sum.addAssign(cubeTexture(depthTexture, bd3D.add(tangent.mul(offset.x).add(bitangent.mul(offset.y)).mul(spread))).compare(dp))
      })
    } else {
      const {shadowCoord} = inputs
      Loop(count, ({i}) => {
        let depth = texture(depthTexture, shadowCoord.xy.add(vogelDiskSample(i, count, phi).mul(spread)))
        if (depthTexture.isArrayTexture) {
          depth = depth.depth(depthLayer!)
        }
        sum.addAssign(depth.compare(shadowCoord.z))
      })
    }
    return sum.div(float(count))
  })
}
const tunableFilters = {
  pcf: createTunableShadowFilter(false),
  point: createTunableShadowFilter(true),
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
 * In heavy graphics with `?development`, the tuning panel sets the lookups and the radius.
 */
export function useShadowProps(mapSize: number, {isPoint = false, radius = 1}: {
  isPoint?: boolean
  radius?: number
} = {}) {
  const isHeavy = useGraphicsMode()
  const {lampShadowRadius, shadowMapScale, shadowSamples} = useGraphicsModeValue(getGraphicsProfile)
  const tuned = useCustomGraphics(useShallow(state => ({
    radius: state.lampShadowRadius,
    samples: state.lampShadowSamples,
  })))
  if (isDevelopmentMode && isHeavy) {
    return {
      'shadow-filterNode': isPoint ? tunableFilters.point : tunableFilters.pcf,
      'shadow-filterSamples': tuned.samples,
      'shadow-mapSize': [mapSize * shadowMapScale, mapSize * shadowMapScale] as const,
      'shadow-radius': radius * tuned.radius,
    }
  }
  return getShadowProps({
    isPoint,
    mapSize: mapSize * shadowMapScale,
    radius: radius * (lampShadowRadius ?? shadowMapScale),
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
