import type {Light, Scene, WebGPURenderer} from 'three/webgpu'

const ids = new WeakMap<object, number>
let nextId = 1
const id = (value: object | null | undefined) => {
  if (!value) {
    return 0
  }
  let result = ids.get(value)
  if (result === undefined) {
    result = nextId++; ids.set(value, result)
  }
  return result
}
const cache = new WeakMap<WebGPURenderer, WeakMap<Scene, {
  calls: number
  frame: number
  signature: string
}>>

/** One scene scan per renderer/frame, shared by every compiled bundle in that scene. */
export function bundleSignature(scene: Scene, renderer: WebGPURenderer, frame: number) {
  let scenes = cache.get(renderer)
  if (!scenes) {
    scenes = new WeakMap; cache.set(renderer, scenes)
  }
  const previous = scenes.get(scene)
  const calls = renderer.info.calls
  if (previous?.frame === frame && previous.calls === calls) {
    return previous.signature
  }
  const parts: Array<boolean | number | string> = [
    renderer.lighting.enabled,
    renderer.shadowMap.enabled,
    renderer.shadowMap.type,
    renderer.toneMapping,
    renderer.outputColorSpace,
    renderer.xr.isPresenting,
    id(scene.environment),
    scene.environment?.version ?? 0,
    id(scene.environmentNode),
    id(scene.fog),
    id(scene.fogNode),
    id(scene.overrideMaterial),
    scene.overrideMaterial?.version ?? 0,
  ]
  scene.traverseVisible(object => {
    const light = object as Light & {
      castShadow: boolean
      shadow?: {
        map?: {texture?: object}
        mapSize?: {
          x: number
          y: number
        }
      }
    }
    if (!light.isLight) {
      return
    }
    parts.push(light.id, light.type, light.castShadow, light.layers.mask, id(light.shadow?.map?.texture), light.shadow?.mapSize?.x ?? 0, light.shadow?.mapSize?.y ?? 0)
  })
  const signature = parts.join(':')
  scenes.set(scene, {
    frame,
    calls,
    signature,
  })
  return signature
}
