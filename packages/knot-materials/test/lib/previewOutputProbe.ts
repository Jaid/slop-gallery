import {vec3} from 'three/tsl'
import {ACESFilmicToneMapping, Mesh, MeshBasicNodeMaterial, NoToneMapping, OrthographicCamera, PlaneGeometry, Scene, SRGBColorSpace, WebGPURenderer} from 'three/webgpu'

import {createOutputTarget} from '../../scripts/lib/createOutputTarget.ts'

/** Browser-only calibration through the same output-target/readback path as previews. */
export async function previewOutputProbe() {
  const renderer = new WebGPURenderer({antialias: false})
  const scene = new Scene
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2)
  camera.position.z = 1
  const geometry = new PlaneGeometry(2, 2)
  const material = new MeshBasicNodeMaterial
  const mesh = new Mesh(geometry, material)
  scene.add(mesh)
  const correct = createOutputTarget(4)
  const doubleEncoded = createOutputTarget(4)
  doubleEncoded.texture.colorSpace = SRGBColorSpace
  const samples: Array<{
    bytes: Array<number>
    value: number
  }> = []
  try {
    await renderer.init()
    renderer.setSize(4, 4, false)
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = NoToneMapping
    for (const value of [0, 0.003, 0.01, 0.1, 0.18, 0.5, 1]) {
      material.colorNode = vec3(value)
      material.needsUpdate = true
      renderer.setOutputRenderTarget(correct)
      renderer.setRenderTarget(correct)
      renderer.render(scene, camera)
      const pixels = await renderer.readRenderTargetPixelsAsync(correct, 0, 0, 4, 4)
      samples.push({
        value,
        bytes: [...pixels.slice(0, 4)],
      })
    }
    material.colorNode = vec3(0.1)
    material.needsUpdate = true
    renderer.toneMapping = ACESFilmicToneMapping
    const aces: Array<number> = []
    for (const target of [correct, doubleEncoded]) {
      renderer.setOutputRenderTarget(target)
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
      const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, 4, 4)
      aces.push(pixels[0])
    }
    return {
      samples,
      aces,
    }
  } finally {
    renderer.setOutputRenderTarget(null)
    renderer.setRenderTarget(null)
    correct.dispose()
    doubleEncoded.dispose()
    material.dispose()
    geometry.dispose()
    await renderer.dispose()
  }
}
