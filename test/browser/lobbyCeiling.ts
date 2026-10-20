import {AmbientLight, DataUtils, DirectionalLight, HalfFloatType, Mesh, MeshStandardNodeMaterial, PerspectiveCamera, PlaneGeometry, RenderTarget, Scene, SphereGeometry, Vector3, WebGPURenderer} from 'three/webgpu'

import LobbyCeilingGeometry from '../../src/lib/gallery/LobbyCeilingGeometry.ts'
import ClearGlassMaterial from '../../src/lib/materials/ClearGlassMaterial.ts'
import DaylightSkyMaterial, {gallerySunDirection} from '../../src/lib/materials/DaylightSkyMaterial.ts'

/** Detached HDR regression of the real roof, clear glass and procedural sky, including sunlight through the crown. No downloaded assets or game renderer to hide failed pixels. */
export default async function verifyLobbyCeiling() {
  const renderer = new WebGPURenderer({canvas: document.createElement('canvas')})
  const target = new RenderTarget(512, 384, {type: HalfFloatType})
  const geometry = new LobbyCeilingGeometry
  const plaster = new MeshStandardNodeMaterial({
    color: '#e5dfcf',
    roughness: 0.86,
  })
  const glass = new ClearGlassMaterial({
    absorption: 0.025,
    ior: 1.52,
    envMapIntensity: 0.22,
    name: 'test-lobby-glass',
  })
  const skyMaterial = new DaylightSkyMaterial
  const skyGeometry = new SphereGeometry(180, 32, 16)
  const floorGeometry = new PlaneGeometry(16, 40)
  const floorMaterial = new MeshStandardNodeMaterial({
    color: '#ffffff',
    roughness: 1,
  })
  const sky = new Mesh(skyGeometry, skyMaterial)
  const pane = new Mesh(geometry.glass, glass)
  const shell = new Mesh(geometry.plaster, plaster)
  const ribs = new Mesh(geometry.ribs, plaster)
  const floor = new Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  shell.castShadow = true
  ribs.castShadow = true
  const scene = new Scene
  const camera = new PerspectiveCamera(62, 512 / 384, 0.1, 400)
  const sunlight = new DirectionalLight('#ffffff', 2.3)
  sunlight.position.copy(gallerySunDirection).multiplyScalar(50)
  sunlight.castShadow = true
  Object.assign(sunlight.shadow.camera, {
    left: -24,
    right: 24,
    top: 28,
    bottom: -28,
    far: 100,
  })
  sunlight.shadow.mapSize.set(2048, 2048)
  sunlight.shadow.normalBias = 0.02
  scene.add(sky, shell, ribs, pane, floor, sunlight, sunlight.target, new AmbientLight('#ffffff', 0.18))
  const errors: Array<string> = []
  try {
    await renderer.init()
    const {device} = renderer.backend as typeof renderer.backend & {device: GPUDevice}
    device.addEventListener('uncapturederror', event => errors.push(event.error.message))
    renderer.setRenderTarget(target)
    const read = async () => {
      renderer.render(scene, camera)
      const raw = await renderer.readRenderTargetPixelsAsync(target, 0, 0, 512, 384) as Uint16Array
      const pixels = Float32Array.from(raw, value => DataUtils.fromHalfFloat(value))
      assert(pixels.every(value => Number.isFinite(value) && value >= 0), 'The vault/sky produced invalid HDR pixels.')
      return pixels
    }
    const pixel = (pixels: Float32Array, x: number, y: number) => {
      const offset = (Math.round(y) * 512 + Math.round(x)) * 4
      return pixels.slice(offset, offset + 3)
    }
    const center = (pixels: Float32Array) => pixel(pixels, 256, 192)
    const luminance = (rgb: Float32Array) => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    // Frame a clear patch of crown, away from the sun, to measure actual backdrop transmission.
    camera.position.set(0.4, 2, 2)
    camera.lookAt(0.4, 16, 2)
    const glazed = center(await read())
    pane.visible = false
    const bare = center(await read())
    pane.visible = true
    assert(glazed[2] > glazed[0] * 1.1, `The glazed crown lost its blue sky: ${[...glazed].join(',')}`)
    const transmission = luminance(glazed) / luminance(bare)
    assert(transmission > 0.7 && transmission < 0.98, `Clear glass must transmit, not replace, the sky: ${transmission}`)
    // From the east aisle, the real solar disk is visible through the curved crown.
    camera.position.set(5, 1.7, -1.5)
    camera.lookAt(camera.position.clone().add(gallerySunDirection))
    const solar = center(await read())
    assert(luminance(solar) > luminance(bare) * 3, `The procedural sun is missing behind the glass: ${[...solar].join(',')}`)
    // The actual opaque roof, not an extra fake slab, shades the west aisle while the glazed crown admits the same sun.
    renderer.shadowMap.enabled = true
    camera.position.set(0, 4.5, 15)
    camera.lookAt(0, 0, 1.5)
    const floorPixels = await read()
    const atFloor = (x: number) => {
      const point = new Vector3(x, 0, 1.5)
      point.project(camera)
      return pixel(floorPixels, (point.x + 1) * 256, (1 - point.y) * 192)
    }
    const lit = luminance(atFloor(5))
    const shaded = luminance(atFloor(-5))
    assert(lit > shaded * 2, `Sunlight does not respect the roof apertures: lit=${lit}, shaded=${shaded}`)
    // Recompile the same materials with shadows off and back on, as graphics switching does.
    renderer.shadowMap.enabled = false
    await read()
    renderer.shadowMap.enabled = true
    await read()
    await device.queue.onSubmittedWorkDone()
    assert(errors.length === 0, errors.join('\n'))
    return {
      transmission,
      glazed: [...glazed],
      bare: [...bare],
      solar: [...solar],
      lit,
      shaded,
      errors,
    }
  } finally {
    renderer.setRenderTarget(null)
    geometry.dispose()
    sunlight.dispose()
    sunlight.shadow.dispose()
    skyGeometry.dispose()
    floorGeometry.dispose()
    plaster.dispose()
    glass.dispose()
    skyMaterial.dispose()
    floorMaterial.dispose()
    target.dispose()
    await renderer.dispose()
  }
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message)
  }
}
