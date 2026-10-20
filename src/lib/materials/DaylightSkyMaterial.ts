import {cameraPosition, color, float, max, mix, mx_noise_float, positionWorld, smoothstep, vec3} from 'three/tsl'
import {BackSide, MeshBasicNodeMaterial, Vector3} from 'three/webgpu'

/** Shared by the visible sun and the gallery’s shadow-casting directional light. */
export const gallerySunDirection = new Vector3(-3, 9, 4)
gallerySunDirection.normalize()

/** Asset-free, direction-only sky: blue Rayleigh-like gradient, warm solar disk, broad halo and soft layered cloud banks. No per-frame simulation or texture downloads. */
export default class DaylightSkyMaterial extends MeshBasicNodeMaterial {
  constructor() {
    super({
      side: BackSide,
      depthWrite: false,
      fog: false,
    })
    this.name = 'procedural-daylight-sky'
    const ray = positionWorld.sub(cameraPosition).normalize()
    const elevation = ray.y.max(0)
    const sky = mix(color('#d9eafa'), color('#68b4ee'), elevation.pow(0.45))
    const solar = ray.dot(vec3(gallerySunDirection.x, gallerySunDirection.y, gallerySunDirection.z)).clamp(0, 1)
    const disk = smoothstep(Math.cos(0.016), Math.cos(0.012), solar)
    const halo = solar.pow(256).mul(0.16).add(solar.pow(24).mul(0.045))
    // Clouds live on a distant horizontal layer: perspective naturally stretches them at the horizon.
    const cloudPoint = ray.div(max(ray.y, 0.12)).mul(vec3(2.2, 0, 2.2))
    const broad = mx_noise_float(cloudPoint.add(vec3(13, 0, 7)))
    const detail = mx_noise_float(cloudPoint.mul(2.7).add(vec3(5, 3, 19)))
    const wisps = mx_noise_float(cloudPoint.mul(7.3))
    const cloud = smoothstep(0.02, 0.48, broad.mul(0.75).add(detail.mul(0.2)).add(wisps.mul(0.05)))
      .mul(smoothstep(0.01, 0.2, ray.y)).mul(float(1).sub(solar.pow(128).mul(0.7)))
    const cloudColor = mix(color('#d4dfeb'), color('#fffaf1'), broad.mul(0.6).add(0.5).clamp(0, 1))
    this.colorNode = mix(sky, cloudColor, cloud.mul(0.87)).add(color('#fff0ce').mul(halo)).add(vec3(5, 4.5, 3.4).mul(disk))
  }
}
