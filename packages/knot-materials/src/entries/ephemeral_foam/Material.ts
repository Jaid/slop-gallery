import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, negateOnBackSide, positionWorld, time, uv, vec2, vec3} from 'three/tsl'

import {viewerFrame} from '../../candidates/gpt_astra/lib/viewerFrame.ts'
import {visibility} from '../../candidates/gpt_astra/lib/visibility.ts'
import BaseKnotMaterial from '../../lib/KnotMaterial.ts'
import {TAU} from '../../lib/TAU.ts'
import knotData from './data.ts'
import {packedCells} from './util.ts'

export default class Material extends BaseKnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.95)
    this.name = knotData.id
    // ---------------------------------------------------------------
    // A packed assembly of soap films and liquid Plateau borders.
    // Two membrane depths separate under parallax. Thin-film colour
    // comes from the physical iridescence model, not a rainbow ramp.
    // ---------------------------------------------------------------
    const tube = uv()
    const {p, N, T, B, near, uvSlope} = viewerFrame()
    const period = vec2(72, 8)
    const q = tube.mul(period)
    const cells = packedCells(q, period)
    const cellVisibility = visibility(q.fwidth().length(), 0.22, 0.95)
    const rawBorder = cells.w.smoothstep(0.016, cells.w.fwidth().add(0.045)).oneMinus()
    const border = mix(float(0.18), rawBorder, cellVisibility)
    const interior = border.oneMinus()
    const backQ = q
      .sub(uvSlope.mul(period).mul(0.03))
      .add(vec2(0.37, 0.19))
    const backCells = packedCells(backQ, period)
    const backBorder = backCells.w.smoothstep(0.012, backCells.w.fwidth().add(0.033)).oneMinus()
      .mul(near)
      .mul(visibility(backQ.fwidth().length(), 0.25, 0.9))
    const capXY = cells.xy.mul(1.22)
    const capZ = float(1)
      .sub(capXY.dot(capXY))
      .max(0.1)
      .sqrt()
    const capNormal = N.mul(capZ)
      .sub(T.mul(capXY.x))
      .sub(B.mul(capXY.y))
      .normalize()
    const foamNormal = mix(N, capNormal, interior.mul(cellVisibility)).normalize()
    const drainage = positionWorld.y.mul(21)
      .sub(time.mul(0.28))
      .add(cells.z.mul(TAU))
      .sin()
    const currents = mx_noise_float(p.mul(12).add(vec3(0, time.mul(-0.03), 0)))
    const filmThickness = cells.z.mul(450)
      .add(drainage.mul(90))
      .add(currents.mul(60))
      .add(210)
      .clamp(80, 1100)
    this.envMapIntensity = 1.2
    this.colorNode = mix(color('#d5ebe4'), color('#ffffff'), border.mul(0.65).add(backBorder.mul(0.25)))
    this.metalness = 0
    this.roughnessNode = float(0.035)
      .add(border.mul(0.11))
      .add(cellVisibility.oneMinus().mul(0.17))
    // Air / water film / air: the low bulk IOR is intentional.
    // Using the same IOR for the film and substrate would largely
    // eliminate the interference responsible for soap colours.
    this.ior = 1.025
    this.iorNode = border.mul(0.308).add(1.025)
    this.iridescence = 1
    this.iridescenceIOR = 1.34
    this.iridescenceNode = interior
      .mul(cellVisibility)
      .mul(0.96)
    this.iridescenceThicknessNode = mix(float(440), filmThickness, cellVisibility)
    this.transmission = 0.92
    this.transmissionNode = border.mul(-0.46).add(0.94)
    this.thicknessNode = interior.mul(0.028).add(0.006)
    this.attenuationColor.set('#e3fff5')
    this.attenuationDistance = 1.3
    this.normalNode = negateOnBackSide(foamNormal)
    this.aoNode = border.mul(-0.12).add(1)
  }
}
