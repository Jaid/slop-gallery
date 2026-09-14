import {HalfFloatType, Mesh, MeshBasicNodeMaterial, OrthographicCamera, PlaneGeometry, RenderTarget, Scene, WebGPURenderer} from 'three/webgpu'

/** Detached rendering only; reproduces Three #34301 without touching the visible game. */
export default async function verifyRenderTargetRecreation() {
  const renderer = new WebGPURenderer({
    canvas: document.createElement('canvas'),
    antialias: false,
  })
  await renderer.init()
  const backend = renderer.backend as typeof renderer.backend & {device: GPUDevice}
  const errors: Array<string> = []
  backend.device.addEventListener('uncapturederror', event => errors.push(event.error.message))
  const target = new RenderTarget(32, 24, {type: HalfFloatType})
  const geometry = new PlaneGeometry(1, 1)
  const material = new MeshBasicNodeMaterial({color: '#ffffff'})
  const mesh = new Mesh(geometry, material)
  const scene = new Scene
  scene.add(mesh)
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 2
  const render = async () => {
    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    await backend.device.queue.onSubmittedWorkDone()
  }
  try {
    await render()
    const size = [target.width, target.height] as const
    target.texture.needsUpdate = true
    await render()
    if (target.width !== size[0] || target.height !== size[1]) {
      throw new Error('Regression changed target dimensions instead of recreating the same-size GPU texture.')
    }
    if (errors.length > 0) {
      throw new Error(errors.join('\n'))
    }
    return {
      errors,
      height: target.height,
      textureVersion: target.texture.version,
      width: target.width,
    }
  } finally {
    target.dispose()
    geometry.dispose()
    material.dispose()
    await renderer.dispose()
  }
}
