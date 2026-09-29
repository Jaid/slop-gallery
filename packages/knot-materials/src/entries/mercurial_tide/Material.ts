import type {Node, Texture} from 'three/webgpu'

import {cameraPosition, float, Fn, mix, modelWorldMatrixInverse, mx_noise_float, positionWorld, time, transformNormalToView, uv, varying, vec2, vec3, vec4} from 'three/tsl'

import {droplets} from '../../candidates/claude_fable/lib/droplets.ts'
import {environmentHighlight, studioSheen, toWorldDirection} from '../../candidates/claude_fable/lib/environmentHighlight.ts'
import {glints} from '../../candidates/claude_fable/lib/glints.ts'
import {knotFrame} from '../../candidates/claude_fable/lib/knotFrame.ts'
import {proceduralNormal} from '../../candidates/claude_fable/lib/proceduralNormal.ts'
import {tubeLattice} from '../../candidates/claude_fable/lib/tubeCoordinates.ts'
import {viewerFrame} from '../../candidates/claude_fable/lib/viewerFrame.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import knotData from './data.ts'

/** Mercury's reflectance is a little dimmer and cooler than silver. */
const mercury = vec3(0.74, 0.75, 0.78)
/**
 * Surface height of the liquid in object units. Runs in the vertex stage, so it is free of screen-space derivatives.
 * A slow slosh from drifting noise, two crossing swells, and rings that race away from the point nearest the viewer –
 * the closer the viewer stands, the stronger the rings.
 */
const liquidHeight = (tube: Node<'vec2'>, p: Node<'vec3'>) => {
  const t = time
  const cameraLocal = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz
  const distance = cameraLocal.sub(p).length()
  const proximity = distance.smoothstep(0.7, 5).oneMinus()
  const rings = distance.mul(34).sub(t.mul(7)).sin().mul(distance.sub(0.6).max(0).mul(-0.5).exp()).mul(proximity).mul(0.012)
  const capillary = p.dot(vec3(57, 31, -44)).add(t.mul(2.2)).sin().mul(p.dot(vec3(-23, 49, 38)).add(t.mul(-1.7)).sin()).mul(0.0009)
  const slosh = mx_noise_float(p.mul(2.6).add(vec3(t.mul(0.11), t.mul(-0.07), t.mul(0.05)))).mul(0.016)
  const swellA = tube.x.mul(Math.PI * 2 * 11).add(t.mul(0.9)).add(tube.y.mul(Math.PI * 2).sin().mul(0.6)).sin().mul(0.005)
  const swellB = p.dot(vec3(9, -4, 7)).add(t.mul(-1.3)).sin().mul(0.004)
  return rings.add(slosh).add(swellA).add(swellB).add(capillary)
}
const liquidSurface = Fn(([tube]: [Node<'vec2'>]) => {
  const {position: p, normal} = knotFrame(tube)
  return p.add(normal.mul(liquidHeight(tube, p)))
})
/**
 * Quicksilver. A liquid mirror whose skin is displaced in the vertex stage – rings emanate from wherever the viewer
 * stands, so the piece visibly notices whoever walks up to it. Beads of mercury roll along the tube on top of the swell,
 * and every lamp in the room is drawn as a crisp, distorted image in the metal. A dark floor and bright ceiling are
 * folded into the reflectance so the mirror keeps its contrast in soft gallery light.
 */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 1.1)
    this.name = knotData.id
    const tube = uv()
    const {facing, grazing, near} = viewerFrame()
    this.positionNode = liquidSurface(tube)
// Displaced normal from vertex-stage finite differences, interpolated as a varying.
    const epsilon = 0.0004
    const du = liquidSurface(tube.add(vec2(epsilon, 0))).sub(liquidSurface(tube.sub(vec2(epsilon, 0))))
    const dv = liquidSurface(tube.add(vec2(0, epsilon))).sub(liquidSurface(tube.sub(vec2(0, epsilon))))
    const objectNormal = vec3(varying(du.cross(dv).normalize())).normalize()
    const liquidNormal = vec3(varying(transformNormalToView(du.cross(dv).normalize()))).normalize()
// Rolling droplets: beads on a lattice that slides along the tube; the lattice is square in physical units.
    const {lattice, period} = tubeLattice(6, tube)
    const {mask: droplet, cap, random} = droplets(lattice.sub(vec2(time.mul(0.18), 0)), period, 3)
    const dropletHeight = cap.mul(droplet).mul(random.z.mul(0.5).add(0.5)).mul(0.005)
    const surfaceNormal = proceduralNormal(dropletHeight, 1.4, liquidNormal)
    this.normalNode = surfaceNormal
// A light tent folded into the reflectance: mirrors read as metal through the contrast between floor and ceiling.
    const incident = positionWorld.sub(cameraPosition).normalize()
    const reflected = incident.reflect(toWorldDirection(objectNormal))
// A photographer's light tent folded into the reflectance: a dark floor, a bright ceiling and two rows of softboxes on
// the walls. Any tilt of the surface sweeps the reflection across a box edge, so the ripples read even in soft rooms.
    const azimuth = reflected.x.atan(reflected.z)
    const boxColumns = azimuth.mul(5).cos().smoothstep(0.3, 0.5)
    const boxRows = reflected.y.mul(6).cos().smoothstep(0.1, 0.4).mul(reflected.y.abs().smoothstep(0.85, 0.75))
    const softboxes = boxColumns.mul(boxRows)
    const ceiling = reflected.y.smoothstep(-0.2, 0.9)
    const tent = ceiling.mul(0.45).add(softboxes.mul(0.55)).add(0.1)
    this.colorNode = mercury.mul(tent)
    this.metalness = 1
    this.roughnessNode = float(0.03).add(droplet.mul(0.02)).add(grazing.mul(0.02))
// Crisp images of the studio lights in the mirror.
    const highlight = environmentHighlight(environment, objectNormal, 0.03).mul(mercury).mul(0.8)
    const sheen = studioSheen(objectNormal).mul(mercury).mul(0.1)
    const dropletShine = glints(surfaceNormal, 220).mul(droplet).mul(0.6)
// Lamps streaking over the ripples: broad enough to read as liquid, sharp enough to move.
    const streaks = glints(surfaceNormal, 70).mul(mercury).mul(0.35)
    this.emissiveNode = highlight.add(sheen).add(dropletShine).add(streaks).add(mix(vec3(0), mercury, facing.pow(3)).mul(near).mul(0.02))
  }
}
