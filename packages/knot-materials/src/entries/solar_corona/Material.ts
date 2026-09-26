import type {Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, mx_noise_vec3, normalLocal, positionGeometry, time, vec3} from 'three/tsl'

import {voronoiCells} from '../../candidates/deepseek/lib/voronoiCells.ts'
import {filament} from '../../lib/filament.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** The photosphere. Granulation cells rise and sink in slow convection, dark sunspots drift across them ringed by bright faculae, and magnetic loops arc off the surface in glowing filaments. At the limb the whole thing frays into prominences, so the silhouette is never a clean edge. Almost all of the energy lives in the emissive channel: a star is light, not paint. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.3)
    this.name = knotData.id
    const {p, facing, grazing} = viewerFrame()
// Convection: hot plasma wells up in the middle of every cell and sinks at the walls.
    const boil = mx_noise_vec3(p.mul(1.6).add(vec3(time.mul(0.02), time.mul(-0.015), time.mul(0.01)))).mul(0.05)
    const cells = voronoiCells(p.add(boil).mul(15))
    const lane = cells.edge.smoothstep(0.004, 0.055)
    const churn = mx_noise_float(p.mul(24).add(vec3(time.mul(0.08), 0, time.mul(-0.05)))).mul(0.5).add(0.5)
    const granule = lane.pow(0.5).mul(churn.mul(0.5).add(0.5))
    const granuleFine = mx_noise_float(p.mul(52).add(vec3(time.mul(0.12), time.mul(0.07), 0))).mul(0.5).add(0.5)
// Active regions: broad bright complexes where the magnetic field is tangled.
    const active = mx_noise_float(p.mul(1.7).add(vec3(time.mul(0.012), 0, 0))).mul(0.5).add(0.5)
    const activeMask = active.smoothstep(0.45, 0.85)
// Sunspots and the faculae that ring them.
    const spotField = mx_noise_float(p.mul(2.3).add(vec3(time.mul(0.01), 0, 0)))
    const spot = spotField.smoothstep(0.3, 0.5).mul(activeMask)
    const facula = spotField.smoothstep(0.1, 0.28).mul(spot.oneMinus()).mul(activeMask)
// Magnetic loops: bright filaments that arc above the surface.
    const loopField = mx_noise_float(p.mul(4.6).add(vec3(0, time.mul(0.04), 0)))
    const loops = filament(loopField, 0.02).mul(0.8).add(filament(mx_noise_float(p.mul(9.5).add(vec3(3.1, 0, 0))), 0.014).mul(0.5)).mul(activeMask.mul(0.7).add(0.3))
// Prominences fray the limb.
    const prominence = grazing.pow(3.5).mul(mx_noise_float(p.mul(11).add(vec3(time.mul(0.06), 0, 0))).mul(0.5).add(0.5))
// Dark intergranular lanes give way to blinding white-hot cell centers.
    const plasma = mix(color('#2a0500'), color('#ff7a10'), granule.pow(0.7))
    const whiteHot = mix(plasma, color('#fff8dc'), granule.pow(3).mul(granuleFine.mul(0.35).add(0.65)))
// Limb darkening: the photosphere cools toward the silhouette.
    const limb = facing.mul(0.4).add(0.6)
    const hot = whiteHot.mul(spot.oneMinus().mul(0.94).add(0.06)).mul(limb)
// The vertex stage cannot use derivatives, so the relief uses a fixed width.
    const loopsRelief = loopField.abs().smoothstep(0.02, 0.06).oneMinus()
    const height = lane.mul(0.0016).add(loopsRelief.mul(0.0012)).sub(spot.mul(0.0008))
    this.colorNode = hot.mul(0.04)
    this.metalness = 0
    this.roughnessNode = float(0.92).sub(granule.mul(0.08)).clamp(0.8, 0.95)
    this.specularIntensity = 0.04
    this.normalNode = proceduralNormal(height, 1)
    this.emissiveNode = hot.mul(1.35).add(color('#ffb347').mul(facula).mul(0.9)).add(color('#ff9a2e').mul(loops).mul(1.1)).add(color('#ff6a1a').mul(prominence).mul(1.2)).add(color('#ff3a08').mul(grazing.pow(2)).mul(0.2))
    this.positionNode = positionGeometry.add(normalLocal.mul(height))
  }
}
