import type {FrescoPanel} from '../gallery/cinnabar.ts'
import type {Node} from 'three/webgpu'

import {color, float, max, mix, mx_noise_float, normalLocal, positionLocal, select, vec3} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {cinnabarFresco} from '../gallery/cinnabar.ts'
import {heightNormal, inside, line, visibleDetail} from './filters.ts'

type Float = Node<'float'>

const palette = {
  deep: '#7a2217',
  light: '#a63a29',
  black: '#1a1615',
  blackLight: '#2b2422',
  ochre: '#d4a44c',
}

/**
 * Lime fresco in the Pompeian manner, painted on one wall: a black socle under a field of cinnabar red, black bands dividing the field into panels, an ochre fillet along the socle, an ochre stalk down every band and an ochre line framing every panel, and a black frieze under the cornice.
 *
 * It is painted in the wall’s own coordinates, so a wall’s bands and panels are laid out around its doorways, see `frescoLayout`; only the face into the room is painted, the reveals of its doorways stay plain red. The red is burnished lime: soft clouds of two reds under a fine grain, with a little sheen. Lines are filtered against the pixel footprint and thin to their average before they could shimmer.
 */
export default class CinnabarWallMaterial extends MeshStandardNodeMaterial {
  constructor({bands, panels}: {
    /** where the black bands stand along the wall, from its center */
    bands: ReadonlyArray<number>
    panels: ReadonlyArray<FrescoPanel>
  }) {
    super({
      roughness: 0.5,
      metalness: 0,
      envMapIntensity: 0.35,
    })
    const {socle, fillet, band, stalk, frieze, frameInset, frameRise, frameLine} = cinnabarFresco
    const u = positionLocal.x.toVar('frescoU')
    const y = positionLocal.y.toVar('frescoY')
    const face = normalLocal.z.greaterThan(0.5).toVar('frescoFace')
    const footprint = max(u.fwidth(), y.fwidth()).toVar('frescoFootprint')
    const fineDetail = visibleDetail(footprint, 0.02)
    // Lime wash: soft clouds at two scales and a fine grain.
    const clouds = mx_noise_float(vec3(u.mul(0.45), y.mul(0.45), 2.3)).mul(0.6).add(mx_noise_float(vec3(u.mul(1.9), y.mul(1.9), 5.1)).mul(0.4)).mul(0.5).add(0.5).toVar('frescoClouds')
    const grain = mx_noise_float(vec3(u.mul(45), y.mul(45), 8.8)).toVar('frescoGrain')
    const red = mix(color(palette.deep), color(palette.light), clouds.smoothstep(0.15, 0.9)).mul(grain.mul(0.03).mul(fineDetail).add(1))
    const black = mix(color(palette.black), color(palette.blackLight), clouds)
    // The field between the socle’s fillet and the frieze, where the bands, stalks and frames are painted
    const fieldBottom = socle + fillet
    const inField = y.greaterThan(fieldBottom).and(y.lessThan(frieze[0]))
    const isSocle = y.lessThan(socle)
    const isFrieze = y.greaterThan(frieze[0]).and(y.lessThan(frieze[1]))
    let inBand: Float = float(0)
    let stalks: Float = float(0)
    for (const at of bands) {
      inBand = max(inBand, inside(u.sub(at).abs().sub(band / 2)))
      stalks = max(stalks, line(u.sub(at), stalk / 2))
    }
    // A line along the socle’s top, along both edges of the frieze and round every panel
    const socleFillet = inside(y.sub(socle + fillet / 2).abs().sub(fillet / 2))
    const friezeFillets = max(line(y.sub(frieze[0] + 0.03), 0.004), line(y.sub(frieze[1] - 0.03), 0.004))
    let frames: Float = float(0)
    const frameBottom = fieldBottom + frameRise
    const frameTop = frieze[0] - frameRise
    for (const {u: [start, end], pierced} of panels) {
      if (pierced || end - start < frameInset * 2 + 0.3) {
        continue
      }
      const halfWidth = (end - start) / 2 - frameInset
      const halfHeight = (frameTop - frameBottom) / 2
      const edge = max(u.sub((start + end) / 2).abs().sub(halfWidth), y.sub((frameBottom + frameTop) / 2).abs().sub(halfHeight))
      frames = max(frames, line(edge, frameLine / 2))
    }
    const dark = select(isSocle.or(isFrieze), float(1), inBand.mul(select(inField, float(1), float(0))))
    const ochre = max(max(socleFillet, select(isFrieze, friezeFillets, float(0))), select(inField, max(stalks.mul(inBand), frames), float(0)))
    // Hand-painted: the lines lie a little thinner in places.
    const wear = mx_noise_float(vec3(u.mul(2.7), y.mul(2.7), 11.4)).mul(0.5).add(0.5).smoothstep(0.1, 0.9).mul(0.25).add(0.75)
    const painted = mix(mix(red, black, dark), color(palette.ochre), ochre.mul(wear))
    this.colorNode = select(face, painted, red)
    // Burnished lime: the red a little glossier where the clouds are light, the black socle duller, the ochre lines matte.
    this.roughnessNode = select(face, mix(float(0.56).sub(clouds.mul(0.12)), float(0.62), max(dark.mul(0.6), ochre)), float(0.5))
    this.normalNode = heightNormal(grain.mul(0.00006).mul(fineDetail))
  }
}
