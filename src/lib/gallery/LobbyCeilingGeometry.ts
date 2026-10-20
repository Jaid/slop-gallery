import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, QuadraticBezierCurve3, Shape, SphereGeometry, TorusGeometry, TubeGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import lobby from './lobby.ts'
import lobbyCeiling, {lobbyChandeliers, lobbyVaultCoffers, transverseRibZs} from './lobbyCeiling.ts'

const halfDepth = (lobby.southZ - lobby.northZ) / 2
const arcSegments = 48
/**
 * Builds an arch band in the XY plane centered at (0, springY), extruded from `z1` to `z2`.
 * Angles are measured from the crown (0 rad = straight up, +π/2 = +x east wall, −π/2 = −x west wall).
 */
function archBand(innerR: number, outerR: number, fromAngle: number, toAngle: number, z1: number, z2: number, segments = arcSegments) {
  const shape = new Shape
  const steps = Math.max(4, Math.ceil(Math.abs(toAngle - fromAngle) / Math.PI * segments))
  for (let i = 0; i <= steps; i++) {
    const a = fromAngle + (toAngle - fromAngle) * i / steps
    const x = innerR * Math.sin(a)
    const y = lobbyCeiling.springY + innerR * Math.cos(a)
    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  }
  for (let i = steps; i >= 0; i--) {
    const a = fromAngle + (toAngle - fromAngle) * i / steps
    const x = outerR * Math.sin(a)
    const y = lobbyCeiling.springY + outerR * Math.cos(a)
    shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, {
    depth: z2 - z1,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  })
  return geometry.translate(0, 0, z1)
}
/**
 * Builds a single curved glass surface along the cylinder of radius `r`, spanning `[fromAngle, toAngle]` and `[z1, z2]`,
 * with inward-facing normals and metric UVs (u in meters along the arch, v in meters along z).
 */
function curvedGlassSheet(r: number, fromAngle: number, toAngle: number, z1: number, z2: number, segments = 36) {
  const steps = Math.max(4, Math.ceil(Math.abs(toAngle - fromAngle) / (Math.PI / 3) * segments))
  const positions: Array<number> = []
  const normals: Array<number> = []
  const uvs: Array<number> = []
  const indices: Array<number> = []
  for (let i = 0; i <= steps; i++) {
    const a = fromAngle + (toAngle - fromAngle) * i / steps
    const sin = Math.sin(a)
    const cos = Math.cos(a)
    const x = r * sin
    const y = lobbyCeiling.springY + r * cos
    const u = (a - fromAngle) * r
    for (const [j, z] of [z1, z2].entries()) {
      positions.push(x, y, z)
      normals.push(-sin, -cos, 0)
      uvs.push(u, j === 0 ? 0 : z2 - z1)
    }
    if (i === steps) {
      continue
    }
    const base = i * 2
    // Wind inward so FrontSide faces the Lobby below.
    indices.push(base, base + 3, base + 1, base, base + 2, base + 3)
  }
  const template = new BoxGeometry(1, 1, 1)
  template.dispose()
  const result = template.clone()
  result.setAttribute('position', new Float32BufferAttribute(positions, 3))
  result.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  result.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  result.setIndex(indices)
  return result
}
/**
 * Positions a longitudinal bar of cross-section `width × radialDepth` at angle `angle` and radius `r`, running from `z1` to `z2`.
 */
function longitudinalBar(r: number, angle: number, width: number, radialDepth: number, z1: number, z2: number) {
  const box = new BoxGeometry(width, radialDepth, z2 - z1)
  box.rotateZ(-angle)
  box.translate(r * Math.sin(angle), lobbyCeiling.springY + r * Math.cos(angle), (z1 + z2) / 2)
  return box
}
/**
 * Builds the semicircular lunette tympanum closing one end of the barrel vault above the north or south wall,
 * decorated with a radial wheel-rose window, classical pilaster panels and stepped archivolt rings.
 */
function tympanumParts(zCenter: number, inwardSign: -1 | 1) {
  const {radius, springY} = lobbyCeiling
  const thickness = 0.24
  const z1 = zCenter - thickness / 2
  const plaster: Array<BufferGeometry> = []
  const gilt: Array<BufferGeometry> = []
  const bars: Array<BufferGeometry> = []
  // Main semicircular tympanum wall with a circular rose oculus of radius 2.15 m centered at (0, springY + 4.35).
  const roseY = springY + 4.35
  const roseR = 2.15
  const wallShape = new Shape
  wallShape.moveTo(-radius, springY)
  wallShape.lineTo(radius, springY)
  for (let i = 0; i <= arcSegments; i++) {
    const a = Math.PI / 2 - i / arcSegments * Math.PI
    wallShape.lineTo(radius * Math.sin(a), springY + radius * Math.cos(a))
  }
  wallShape.closePath()
  const roseHole = new Shape
  for (let i = 0; i <= 48; i++) {
    const a = i / 48 * Math.PI * 2
    const x = Math.cos(a) * roseR
    const y = roseY + Math.sin(a) * roseR
    if (i === 0) {
      roseHole.moveTo(x, y)
    } else {
      roseHole.lineTo(x, y)
    }
  }
  wallShape.holes.push(roseHole)
  const wallExtrusion = new ExtrudeGeometry(wallShape, {
    depth: thickness,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  })
  plaster.push(wallExtrusion.translate(0, 0, z1))
  // Molded stone cornice baseline across the bottom of the tympanum and stepped archivolt around the rose oculus.
  const baseLedge = new BoxGeometry(radius * 2, 0.24, 0.38)
  plaster.push(baseLedge.translate(0, springY + 0.12, zCenter + inwardSign * 0.08))
  const outerArchivolt = new TorusGeometry(roseR + 0.28, 0.14, 8, 36)
  plaster.push(outerArchivolt.translate(0, roseY, zCenter + inwardSign * 0.08))
  const innerArchivolt = new TorusGeometry(roseR + 0.1, 0.11, 8, 36)
  plaster.push(innerArchivolt.translate(0, roseY, zCenter + inwardSign * 0.11))
  const giltOuterRing = new TorusGeometry(roseR + 0.42, 0.042, 6, 36)
  gilt.push(giltOuterRing.translate(0, roseY, zCenter + inwardSign * 0.11))
  const giltInnerRing = new TorusGeometry(roseR - 0.02, 0.05, 6, 36)
  gilt.push(giltInnerRing.translate(0, roseY, zCenter + inwardSign * 0.1))
  const innerHub = new TorusGeometry(0.54, 0.06, 6, 24)
  gilt.push(innerHub.translate(0, roseY, zCenter + inwardSign * 0.08))
  const hubBoss = new SphereGeometry(0.24, 12, 8)
  gilt.push(hubBoss.scale(1, 1, 0.48).translate(0, roseY, zCenter + inwardSign * 0.08))
  // 12 radial wheel colonnettes with cusped outer rings in bronze inside the rose window.
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6
    const spokeLen = roseR - 0.54
    const midR = 0.54 + spokeLen / 2
    const spoke = new CylinderGeometry(0.03, 0.03, spokeLen, 6)
    spoke.rotateZ(a - Math.PI / 2)
    spoke.translate(Math.cos(a) * midR, roseY + Math.sin(a) * midR, zCenter)
    bars.push(spoke)
    // Cusped trefoil ringlet at the outer end of each spoke sector.
    const lobeAngle = a + Math.PI / 12
    const lobeR = roseR - 0.34
    const lobe = new TorusGeometry(0.26, 0.024, 6, 12)
    lobe.translate(Math.cos(lobeAngle) * lobeR, roseY + Math.sin(lobeAngle) * lobeR, zCenter)
    bars.push(lobe)
  }
  const innerWheel = new TorusGeometry(1.32, 0.035, 6, 28)
  bars.push(innerWheel.translate(0, roseY, zCenter))
  // Framed classical relief panels and pilaster strips flanking the rose window on the tympanum.
  for (const side of [-1, 1] as const) {
    for (const [xAbs, width] of [[3.35, 0.34], [5.45, 0.3]] as const) {
      const x = side * xAbs
      const maxH = springY + Math.sqrt(Math.max(0, radius ** 2 - (xAbs + width / 2) ** 2)) - 0.32
      const h = maxH - (springY + 0.24)
      if (h <= 0.5) {
        continue
      }
      const pilaster = new BoxGeometry(width, h, 0.14)
      plaster.push(pilaster.translate(x, springY + 0.24 + h / 2, zCenter + inwardSign * 0.11))
      const cap = new BoxGeometry(width + 0.1, 0.12, 0.18)
      plaster.push(cap.translate(x, springY + 0.24 + h, zCenter + inwardSign * 0.12))
    }
    // Ornate 8-petal gilt rosette medallion in each spandrel of the tympanum, matching the side coffers.
    const spandrelX = side * 4.4
    const spandrelY = springY + 2.25
    const spandrelZ = zCenter + inwardSign * 0.12
    const medallion = new TorusGeometry(0.68, 0.055, 6, 20)
    gilt.push(medallion.translate(spandrelX, spandrelY, spandrelZ))
    const centerBoss = new SphereGeometry(0.22, 8, 6)
    gilt.push(centerBoss.scale(1, 1, 0.45).translate(spandrelX, spandrelY, spandrelZ))
    for (let p = 0; p < 8; p++) {
      const pa = p * Math.PI / 4
      const petal = new SphereGeometry(0.14, 6, 4)
      petal.scale(0.65, 1.9, 0.38)
      petal.rotateZ(-pa)
      petal.translate(spandrelX + Math.sin(pa) * 0.36, spandrelY + Math.cos(pa) * 0.36, spandrelZ)
      gilt.push(petal)
    }
  }
  // Circular glass pane filling the rose window so the sky dome shines through the end lunettes as well.
  const roseGlassPositions: Array<number> = [0, roseY, zCenter]
  const roseGlassNormals: Array<number> = [0, 0, inwardSign]
  const roseGlassUvs: Array<number> = [roseR, roseR]
  const roseGlassIndices: Array<number> = []
  const roseSteps = 48
  for (let i = 0; i <= roseSteps; i++) {
    const a = i / roseSteps * Math.PI * 2
    const cx = Math.cos(a) * roseR
    const cy = Math.sin(a) * roseR
    roseGlassPositions.push(cx, roseY + cy, zCenter)
    roseGlassNormals.push(0, 0, inwardSign)
    roseGlassUvs.push(roseR + cx, roseR + cy)
    if (i < roseSteps) {
      if (inwardSign > 0) {
        roseGlassIndices.push(0, i + 1, i + 2)
      } else {
        roseGlassIndices.push(0, i + 2, i + 1)
      }
    }
  }
  const template = new BoxGeometry(1, 1, 1)
  template.dispose()
  const rosePane = template.clone()
  rosePane.setAttribute('position', new Float32BufferAttribute(roseGlassPositions, 3))
  rosePane.setAttribute('normal', new Float32BufferAttribute(roseGlassNormals, 3))
  rosePane.setAttribute('uv', new Float32BufferAttribute(roseGlassUvs, 2))
  rosePane.setIndex(roseGlassIndices)
  return {
    plaster,
    gilt,
    bars,
    glass: [rosePane],
  }
}
/**
 * Builds one grand two-tier cathedral chandelier centered at (0, hubY, zOffset) and reaching up to `anchorY`.
 */
function buildGrandChandelier(zOffset: number) {
  const {hubY, anchorY, outerRadius, innerRadius} = lobbyChandeliers
  const gilt: Array<BufferGeometry> = []
  const candles: Array<BufferGeometry> = []
  const flames: Array<BufferGeometry> = []
  const stemHeight = anchorY - (hubY - 0.55)
  const stemCenterY = (anchorY + (hubY - 0.55)) / 2
  const stem = new CylinderGeometry(0.038, 0.038, stemHeight, 8)
  gilt.push(stem.translate(0, stemCenterY, zOffset))
  // Gilt ceiling rosette boss where the chandelier’s suspension rod meets the central spine rib.
  const mountBoss = new SphereGeometry(0.24, 12, 8)
  gilt.push(mountBoss.scale(1.2, 0.65, 1.2).translate(0, anchorY + 0.01, zOffset))
  const mountRing = new TorusGeometry(0.28, 0.045, 6, 18)
  gilt.push(mountRing.rotateX(Math.PI / 2).translate(0, anchorY + 0.01, zOffset))
  // Ornamental turned nodes along the suspension rod (the ceiling boss at anchorY already crowns the top).
  for (const fraction of [0.22, 0.5, 0.78]) {
    const y = hubY + (anchorY - hubY) * fraction
    const orb = new SphereGeometry(0.14, 10, 8)
    gilt.push(orb.scale(1, 1.35, 1).translate(0, y, zOffset))
    const collar = new TorusGeometry(0.16, 0.028, 6, 14)
    gilt.push(collar.rotateX(Math.PI / 2).translate(0, y, zOffset))
  }
  // Central baluster hubs and finial pendant.
  const crownBell = new CylinderGeometry(0.09, 0.28, 0.26, 14)
  gilt.push(crownBell.translate(0, hubY + 1.15, zOffset))
  const upperHub = new SphereGeometry(0.24, 14, 10)
  gilt.push(upperHub.scale(1, 1.45, 1).translate(0, hubY + 0.75, zOffset))
  const lowerHub = new SphereGeometry(0.32, 16, 12)
  gilt.push(lowerHub.scale(1, 1.5, 1).translate(0, hubY - 0.1, zOffset))
  const pendant = new SphereGeometry(0.17, 12, 8)
  gilt.push(pendant.scale(1, 1.65, 1).translate(0, hubY - 0.82, zOffset))
  const finialTip = new CylinderGeometry(0.055, 0.008, 0.28, 8)
  gilt.push(finialTip.translate(0, hubY - 1.12, zOffset))
  // Two ornate wheel rings: upper tier (8 candles) and lower tier (12 candles).
  const tiers = [
    {
      y: hubY + 0.58,
      hubOriginY: hubY + 0.72,
      radius: innerRadius,
      tube: 0.044,
      count: 8,
    },
    {
      y: hubY - 0.18,
      hubOriginY: hubY - 0.05,
      radius: outerRadius,
      tube: 0.054,
      count: 12,
    },
  ] as const
  for (const tier of tiers) {
    const mainRing = new TorusGeometry(tier.radius, tier.tube, 6, 28)
    gilt.push(mainRing.rotateX(Math.PI / 2).translate(0, tier.y, zOffset))
    const crestRing = new TorusGeometry(tier.radius, tier.tube * 0.5, 5, 28)
    gilt.push(crestRing.rotateX(Math.PI / 2).translate(0, tier.y + 0.08, zOffset))
    const armCurve = new QuadraticBezierCurve3(
      new Vector3(0.2, tier.hubOriginY, 0),
      new Vector3(tier.radius * 0.58, tier.y - 0.36, 0),
      new Vector3(tier.radius, tier.y + 0.04, 0),
    )
    const stayCurve = new QuadraticBezierCurve3(
      new Vector3(0.08, tier.hubOriginY + 0.85, 0),
      new Vector3(tier.radius * 0.48, tier.y + 0.45, 0),
      new Vector3(tier.radius * 0.92, tier.y + 0.05, 0),
    )
    for (let i = 0; i < tier.count; i++) {
      const angle = i / tier.count * Math.PI * 2
      const arm = new TubeGeometry(armCurve, 8, 0.025, 5, false)
      arm.rotateY(angle).translate(0, 0, zOffset)
      gilt.push(arm)
      if (i % 2 === 0) {
        const stay = new TubeGeometry(stayCurve, 6, 0.015, 4, false)
        stay.rotateY(angle).translate(0, 0, zOffset)
        gilt.push(stay)
      }
      const cx = Math.cos(angle) * tier.radius
      const cz = zOffset - Math.sin(angle) * tier.radius
      const cup = new CylinderGeometry(0.145, 0.068, 0.085, 8)
      gilt.push(cup.translate(cx, tier.y + 0.08, cz))
      // Hanging drop finial beneath each candle station on the wheel ring.
      const drop = new SphereGeometry(0.055, 6, 4)
      gilt.push(drop.scale(0.85, 1.65, 0.85).translate(cx, tier.y - 0.11, cz))
      const candle = new CylinderGeometry(0.048, 0.055, 0.28, 8)
      candles.push(candle.translate(cx, tier.y + 0.26, cz))
      const flame = new SphereGeometry(0.075, 6, 4)
      flames.push(flame.scale(0.78, 1.55, 0.78).translate(cx, tier.y + 0.47, cz))
    }
  }
  return {
    gilt,
    candles,
    flames,
  }
}

/**
 * Merged meshes of the Lobby’s cathedral barrel vault, bronze skylight muntins, curved glass, ornate chandeliers and sky dome,
 * all in room-local coordinates centered at (0, 0, −12).
 */
export default class LobbyCeilingGeometry {
  readonly bars: BufferGeometry
  readonly candles: BufferGeometry
  readonly flames: BufferGeometry
  readonly gilt: BufferGeometry
  readonly glass: BufferGeometry
  readonly plaster: BufferGeometry
  readonly sky: BufferGeometry

  constructor() {
    const {bar, cofferStep, glazedAngle, glassOffset, longitudinalAngles, pane, radius, rib, shellThickness, skyDome, springY} = lobbyCeiling
    const plaster: Array<BufferGeometry> = []
    const bars: Array<BufferGeometry> = []
    const glass: Array<BufferGeometry> = []
    const gilt: Array<BufferGeometry> = []
    const candles: Array<BufferGeometry> = []
    const flames: Array<BufferGeometry> = []
    // 1. Solid outer masonry shell on the lower haunches (−90° to −60° and +60° to +90°) along the entire 40 m hall.
    for (const side of [-1, 1] as const) {
      const a1 = side < 0 ? -Math.PI / 2 : glazedAngle
      const a2 = side < 0 ? -glazedAngle : Math.PI / 2
      plaster.push(archBand(radius, radius + shellThickness, a1, a2, -halfDepth, halfDepth, 24))
      // Molded springing impost cornice along the east and west wall tops.
      const impost = new BoxGeometry(0.46, 0.22, halfDepth * 2)
      plaster.push(impost.translate(side * (radius - 0.16), springY + 0.06, 0))
      const giltCorniceBead = new BoxGeometry(0.065, 0.065, halfDepth * 2)
      gilt.push(giltCorniceBead.translate(side * (radius - 0.38), springY - 0.015, 0))
    }
    // 2. Transverse arch ribs at every 4 m bay line (11 arches total), with a wider soffit lip, gilt boss and scrolled corbels.
    const ribInner = radius - rib.depth
    const lipInner = ribInner - rib.lipDepth
    for (const z of transverseRibZs) {
      plaster.push(
        archBand(ribInner, radius + 0.06, -Math.PI / 2, Math.PI / 2, z - rib.width / 2, z + rib.width / 2, arcSegments),
        archBand(lipInner, ribInner, -Math.PI / 2, Math.PI / 2, z - rib.lipWidth / 2, z + rib.lipWidth / 2, arcSegments),
      )
      // Gilt bosses at every rib intersection along the transverse arch: 0° (crown), ±32° (purlins) and ±60° (curb ribs).
      const [, midAngle] = longitudinalAngles
      for (const bossAngle of [0, -midAngle, midAngle, -glazedAngle, glazedAngle]) {
        const bx = (lipInner - 0.01) * Math.sin(bossAngle)
        const by = springY + (lipInner - 0.01) * Math.cos(bossAngle)
        const rBoss = bossAngle === 0 ? 0.25 : 0.18
        const rRing = bossAngle === 0 ? 0.29 : 0.21
        const boss = new SphereGeometry(rBoss, 8, 6)
        boss.scale(1.2, 0.65, 1.2).rotateZ(-bossAngle).translate(bx, by, z)
        gilt.push(boss)
        const bossRing = new TorusGeometry(rRing, 0.045, 5, 12)
        bossRing.rotateX(Math.PI / 2).rotateZ(-bossAngle).translate(bx, by, z)
        gilt.push(bossRing)
      }
      // Molded stone corbel brackets under each transverse rib at the east and west springing line.
      for (const side of [-1, 1] as const) {
        const corbelDepth = Math.abs(z) > halfDepth - 0.5 ? 0.26 : 0.42
        const corbel = new BoxGeometry(0.28, 0.24, corbelDepth)
        plaster.push(corbel.translate(side * (radius - 0.22), springY + 0.12, z))
      }
    }
    // 3. Longitudinal ribs at 0° (crown spine), ±32° (intermediate purlins) and ±60° (skylight curb beams).
    const uniqueLongAngles = [0, ...longitudinalAngles.slice(1).flatMap(a => [-a, a])]
    for (const angle of uniqueLongAngles) {
      const bodyR = radius - rib.depth / 2
      const lipR = radius - rib.depth - rib.lipDepth / 2
      plaster.push(
        longitudinalBar(bodyR, angle, rib.width, rib.depth + 0.06, -halfDepth, halfDepth),
        longitudinalBar(lipR, angle, rib.lipWidth, rib.lipDepth, -halfDepth, halfDepth),
      )
    }
    // 4. Haunch coffers (solid carved steps with gilt inner frame & rosette medallion) and glazed skylight bays with bronze muntin bars.
    const glassR = radius - glassOffset
    const barR = glassR - bar.depth / 2
    const stepInnerR = radius - cofferStep.depth
    for (const coffer of lobbyVaultCoffers()) {
      const [a1, a2] = coffer.clearAngles
      const [z1, z2] = coffer.clearZ
      const zMid = (z1 + z2) / 2
      const zSpan = z2 - z1
      // Stepped stone frame around every compartment (both solid haunch coffers and glazed skylight bays).
      const frameA1 = coffer.angles[0] + lobbyCeiling.rib.width / (2 * radius)
      const frameA2 = coffer.angles[1] - lobbyCeiling.rib.width / (2 * radius)
      const frameZ1 = coffer.z[0] + lobbyCeiling.rib.width / 2
      const frameZ2 = coffer.z[1] - lobbyCeiling.rib.width / 2
      plaster.push(
        archBand(stepInnerR, radius + 0.02, frameA1, frameA2, frameZ1, z1, 10),
        archBand(stepInnerR, radius + 0.02, frameA1, frameA2, z2, frameZ2, 10),
        longitudinalBar((stepInnerR + radius) / 2, (frameA1 + a1) / 2, cofferStep.width, cofferStep.depth + 0.02, z1, z2),
        longitudinalBar((stepInnerR + radius) / 2, (a2 + frameA2) / 2, cofferStep.width, cofferStep.depth + 0.02, z1, z2),
      )
      if (!coffer.laylight) {
        // Solid lower-haunch coffer: substantial gilt frame moldings and an ornate 8-petal classical rosette medallion.
        const beadInner = stepInnerR - 0.045
        const beadOuter = stepInnerR + 0.015
        gilt.push(
          archBand(beadInner, beadOuter, a1, a2, z1 - 0.035, z1 + 0.035, 10),
          archBand(beadInner, beadOuter, a1, a2, z2 - 0.035, z2 + 0.035, 10),
          longitudinalBar(stepInnerR - 0.015, a1, 0.07, 0.06, z1, z2),
          longitudinalBar(stepInnerR - 0.015, a2, 0.07, 0.06, z1, z2),
        )
        const aMid = (a1 + a2) / 2
        const medR = radius - 0.03
        const mx = medR * Math.sin(aMid)
        const my = springY + medR * Math.cos(aMid)
        const outerWreath = new TorusGeometry(0.42, 0.048, 5, 14)
        outerWreath.rotateX(Math.PI / 2).rotateZ(-aMid).translate(mx, my, zMid)
        gilt.push(outerWreath)
        const centerButton = new SphereGeometry(0.16, 6, 4)
        centerButton.scale(1, 0.5, 1).rotateZ(-aMid).translate(mx, my, zMid)
        gilt.push(centerButton)
        for (let p = 0; p < 6; p++) {
          const pa = p * Math.PI / 3
          const petal = new CylinderGeometry(0.08, 0.04, 0.34, 5)
          petal.scale(1, 1, 0.42)
          petal.rotateX(Math.PI / 2)
          petal.rotateY(pa)
          petal.translate(Math.sin(pa) * 0.23, 0, Math.cos(pa) * 0.23)
          petal.rotateZ(-aMid)
          petal.translate(mx, my, zMid)
          gilt.push(petal)
        }
        continue
      }
      // Glazed skylight compartment: bronze perimeter rim and curved muntin grid.
      bars.push(
        archBand(barR - bar.depth / 2, glassR + 0.01, a1, a2, z1, z1 + bar.rim, 10),
        archBand(barR - bar.depth / 2, glassR + 0.01, a1, a2, z2 - bar.rim, z2, 10),
        longitudinalBar(barR, a1 + bar.rim / (2 * glassR), bar.rim, bar.depth, z1 + bar.rim, z2 - bar.rim),
        longitudinalBar(barR, a2 - bar.rim / (2 * glassR), bar.rim, bar.depth, z1 + bar.rim, z2 - bar.rim),
      )
      // Transverse curved muntin bars dividing the bay along z.
      const zPanes = Math.max(2, Math.round(zSpan / pane))
      for (let i = 1; i < zPanes; i++) {
        const bz = z1 + zSpan * i / zPanes
        bars.push(archBand(barR - bar.depth / 2, glassR, a1, a2, bz - bar.width / 2, bz + bar.width / 2, 10))
      }
      // Longitudinal muntin bars dividing the bay along the arch.
      const arcLength = (a2 - a1) * glassR
      const arcPanes = Math.max(2, Math.round(arcLength / pane))
      for (let i = 1; i < arcPanes; i++) {
        const ba = a1 + (a2 - a1) * i / arcPanes
        bars.push(longitudinalBar(barR, ba, bar.width, bar.depth, z1 + bar.rim, z2 - bar.rim))
      }
      // Beaux-Arts ornamental bronze ring medallion at the center of each skylight bay.
      const aMid = (a1 + a2) / 2
      const ringlet = new TorusGeometry(0.34, 0.022, 6, 16)
      ringlet.rotateX(Math.PI / 2).rotateZ(-aMid)
      ringlet.translate(barR * Math.sin(aMid), springY + barR * Math.cos(aMid), zMid)
      bars.push(ringlet)
    }
    // Continuous curved glass sheet across the glazed skylight zone (−60° to +60°, north to south).
    glass.push(curvedGlassSheet(glassR, -glazedAngle, glazedAngle, -halfDepth, halfDepth, 48))
    // 5. North and south lunette tympanums with wheel-rose windows.
    for (const [zEnd, inwardSign] of [[-halfDepth, 1], [halfDepth, -1]] as const) {
      const tympanum = tympanumParts(zEnd, inwardSign)
      plaster.push(...tympanum.plaster)
      gilt.push(...tympanum.gilt)
      bars.push(...tympanum.bars)
      glass.push(...tympanum.glass)
    }
    // 6. Three grand two-tier cathedral chandeliers suspended along the central nave.
    for (const zOffset of lobbyChandeliers.offsets) {
      const chandelier = buildGrandChandelier(zOffset)
      gilt.push(...chandelier.gilt)
      candles.push(...chandelier.candles)
      flames.push(...chandelier.flames)
    }
    // 7. Upper hemisphere sky dome enclosing the Lobby vault so every sightline through the glass sees the procedural sky and sun.
    const sky = new SphereGeometry(skyDome.radius, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.48)
    sky.translate(0, springY - 1.2, 0)
    sky.computeBoundingBox()
    sky.computeBoundingSphere()
    this.plaster = mergeParts(plaster)
    this.bars = mergeParts(bars)
    this.glass = mergeParts(glass)
    this.gilt = mergeParts(gilt)
    this.candles = mergeParts(candles)
    this.flames = mergeParts(flames)
    this.sky = sky
  }

  dispose() {
    this.plaster.dispose()
    this.bars.dispose()
    this.glass.dispose()
    this.gilt.dispose()
    this.candles.dispose()
    this.flames.dispose()
    this.sky.dispose()
  }
}
