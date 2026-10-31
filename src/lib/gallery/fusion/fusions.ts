import type {Vec3} from '../types.ts'
import type {FusionSpec} from './Fusion.ts'

import {create} from 'zustand'

import world from '#src/worlds/current.ts'

import {holdArtworkTexture} from '../../useArtworkTexture.ts'
import Fusion from './Fusion.ts'
import {portalFrame} from './portalFrame.ts'

/** the fusions whose portals are open, which `Fusions` draws */
export const useFusions = create<{fusions: ReadonlyArray<Fusion>}>(() => ({fusions: []}))

/** how far out from the work the room’s sides are measured, clear of the work’s own wall */
const sideProbe = 0.3

/** Opens a fusion’s portal in front of its work, sized to the room around it, until the fusion closes. */
export function openFusion(spec: FusionSpec) {
  const {position, rotation} = spec.work
  const normal: Vec3 = [Math.sin(rotation), 0, Math.cos(rotation)]
  const tangent: Vec3 = [normal[2], 0, -normal[0]]
  const probe: Vec3 = [position[0] + normal[0] * sideProbe, position[1], position[2] + normal[2] * sideProbe]
  const fusion = new Fusion(spec, {
    frame: portalFrame(spec.work, {
      floor: world.floorHeight(position),
      room: world.wallDistance(position, normal),
      sides: [world.wallDistance(probe, [-tangent[0], 0, -tangent[2]]), world.wallDistance(probe, tangent)],
    }),
    hold: image => {
      const {texture, release} = holdArtworkTexture(image)
      return {
        ready: texture,
        release,
      }
    },
    onClose: closed => useFusions.setState(state => ({fusions: state.fusions.filter(candidate => candidate !== closed)})),
  })
  useFusions.setState(state => ({fusions: [...state.fusions, fusion]}))
  return fusion
}
