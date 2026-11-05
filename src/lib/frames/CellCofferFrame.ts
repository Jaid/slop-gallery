import {atan, float, select, smoothstep, vec2} from 'three/tsl'

import {legible} from '#src/lib/materials/frames/carving.ts'
import FrameMetalMaterial, {brass} from '#src/lib/materials/frames/FrameMetalMaterial.ts'
import FrameWoodMaterial, {walnut} from '#src/lib/materials/frames/FrameWoodMaterial.ts'
import GiltMaterial from '#src/lib/materials/frames/GiltMaterial.ts'

import PortraitFrame, {frameBack} from './base/PortraitFrame.ts'
import {assembleFrame, corners, place, sweepProfile} from './frameGeometry.ts'
import FrameProfile from './FrameProfile.ts'
import {turned} from './ornaments.ts'

const imageDepth = -0.056
const wood = 0
const gilt = 1
const metal = 2
const frieze = -0.046
/** a walnut ovolo at the sight edge, a flat walnut frieze with two gilt fillets let into it like the ceiling’s coffers, and a walnut ogee to the wall */
const profile = FrameProfile.from([-0.005, imageDepth], wood)
  .line(-0.005, -0.046)
  .arc(0.01, -0.04, 0.3, {steps: 6})
  .line(0.012, frieze)
  .line(0.02, frieze)
  .arc(0.025, frieze, 0.5, {
    steps: 5,
    material: gilt,
  })
  .line(0.07, frieze, {material: wood})
  .arc(0.075, frieze, 0.5, {
    steps: 5,
    material: gilt,
  })
  .line(0.084, frieze, {material: wood})
  .ogee(0.104, -0.028, {
    reverse: true,
    steps: 10,
  })
  .arc(0.116, -0.068, -0.25, {steps: 6})
  .line(0.116, frameBack)
  .line(-0.005, frameBack)

/** The Cell’s: a walnut cassetta with gilt fillets let into its frieze like the coffers overhead, a turned brass boss on every corner. */
export default class CellCofferFrame extends PortraitFrame {
  override readonly description = 'Cut from the same walnut as the Cell’s coffered ceiling: a cassetta whose flat frieze is inlaid with two gilt fillets like the coffers’ overhead, between a walnut ovolo at the sight edge and a walnut ogee at the outside, a turned brass boss with a ribbed rose on every corner.'
  override readonly front = profile.front + 0.012
  override readonly imageDepth = imageDepth
  override readonly impactSound = 'hardwood'
  override readonly reach = profile.reach
  override readonly tint = '#3a2414'
  override readonly title = 'Walnut coffer'

  override createGeometry(width: number, height: number) {
    const halfWidth = width / 2
    const halfHeight = height / 2
    const boss = turned([[0.019, 0], [0.019, 0.003], [0.016, 0.006], [0.012, 0.008], [0.009, 0.007], [0.006, 0.01], [0, 0.012]], 16, {kind: 1})
    return assembleFrame([
      ...sweepProfile(profile, halfWidth, halfHeight),
      [metal, place(boss, corners(halfWidth, halfHeight, 0.0475, frieze))],
    ])
  }

  protected override createMaterials() {
    return [
      new FrameWoodMaterial({
        timber: walnut,
        gloss: 0.5,
        roughness: 0.4,
        grime: 0.3,
      }),
      new GiltMaterial({
        wear: 0.15,
        grime: 0.3,
      }),
      new FrameMetalMaterial({
        metal: brass,
        finish: surface => {
          // The boss’s rose: ribs radiating from a button.
          const p = vec2(surface.along, surface.across)
          const ribs = atan(p.y, p.x).mul(12).cos().mul(0.5).add(0.5).mul(smoothstep(0.004, 0.007, p.length()))
          return {height: select(surface.isOrnament.greaterThan(0.5), legible(surface, ribs, 0.004).mul(0.0006), float(0))}
        },
      }),
    ]
  }
}
