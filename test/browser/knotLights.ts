import {DataUtils, HalfFloatType, OrthographicCamera, RenderTarget, Scene, WebGPURenderer} from 'three/webgpu'

import KnotLightPanels from '../../packages/knot-materials/src/KnotLightPanels.ts'
import {knotLightFracture} from '../../packages/knot-materials/src/KnotLights.ts'

/** Offscreen WebGPU regression: no player input, camera changes or visible canvas. */
export default async function verifyKnotLights() {
  const panels = new KnotLightPanels([0, 1, 2].map(slot => ({
    id: `0:${slot}`,
    position: [(slot - 1) * 3, 5, 0] as [number, number, number],
    row: 0,
    slot,
  })))
  const scene = new Scene
  scene.add(panels.housings, panels.diffusers)
  const camera = new OrthographicCamera(-4.5, 4.5, 1.5, -1.5, 0.1, 10)
  camera.up.set(0, 0, 1)
  camera.lookAt(0, 5, 0)
  const renderer = new WebGPURenderer({
    canvas: document.createElement('canvas'),
    antialias: false,
  })
  // RGBA16F rows are 256-byte aligned, so readback has no padding between rows.
  const target = new RenderTarget(960, 320, {type: HalfFloatType})
  const errors: Array<string> = []
  try {
    await renderer.init()
    const {device} = renderer.backend as typeof renderer.backend & {device: GPUDevice}
    device.addEventListener('uncapturederror', event => errors.push(event.error.message))
    renderer.setRenderTarget(target)
    const sample = async () => {
      renderer.render(scene, camera)
      const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, 960, 320)
      const red = (x: number, y: number) => {
        const value = pixels[(y * 960 + x) * 4]
        return pixels instanceof Uint16Array ? DataUtils.fromHalfFloat(value) : value
      }
      // Positive local Z is the top of the image.
      return {
        healthy: red(160, 160),
        offsetLive: red(107, 213),
        offsetDead: red(213, 107),
        live: red(427, 213),
        dead: red(533, 107),
        broken: red(800, 160),
      }
    }
    const before = await sample()
    assert(before.healthy > 3 && before.broken > 3, `Healthy faces are not HDR emitters: ${JSON.stringify(before)}`)
    panels.fracture(1, knotLightFracture([0.01, 0.01], [0, 0]))
    panels.break(2)
    const fractured = await sample()
    // Positive X/Z is the dead corner; both samples sit well away from the seam.
    assert(fractured.live > 3 && fractured.dead < 0.2, `Fracture did not split emission: ${JSON.stringify(fractured)}`)
    assert(fractured.broken < 0.2, 'Detached diffuser still emits.')
    panels.setIntensity(1, 0.4)
    const flicker = await sample()
    assert(Math.max(flicker.live, flicker.dead) > 1 && Math.max(flicker.live, flicker.dead) < 2, 'Flicker did not update the GPU instance attribute.')
    assert(flicker.healthy > 3, 'Neighboring intact panel was changed.')
    panels.fracture(0, knotLightFracture([0.01, 0.01], [0, 0]))
    const offset = await sample()
    assert(offset.offsetLive > 3 && offset.offsetDead < 0.2, 'Fracture coordinates drift with instance position.')
    assert(errors.length === 0, errors.join('\n'))
    return {
      before,
      fractured,
      flicker,
      offset,
      errors,
    }
  } finally {
    panels.dispose()
    target.dispose()
    await renderer.dispose()
  }
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message)
  }
}
