import type {Vec3} from './types.ts'

import {bastionMouth, bastionPassages} from './bastion.ts'
import {fortressLinkStart, fortressPassages} from './fortress.ts'
import PassageRoute from './passages/PassageRoute.ts'
import RoutedPassage from './passages/RoutedPassage.ts'

const {point, heading, y} = fortressLinkStart
const width = 2.2
// A narrow vaulted link slips between the Oculus and Lodge, then follows
// the strip south of Lodge before turning into the west bridge’s passage.
const westZ = -28.5
const firstRadius = 3
const cornerRadius = 4
const lastRadius = 2.5
const westX = point[0] + firstRadius * (1 - Math.sin(heading)) - cornerRadius
const endX = bastionMouth.path[1][0]
const turn = {
  radius: firstRadius,
  angle: Math.PI / 2 - heading,
}
const south = {length: westZ - point[1] - firstRadius * Math.cos(heading) - cornerRadius}
const west = {length: westX - (endX + lastRadius)}
const neck = 0.25
const route = new PassageRoute([point[0] - Math.cos(heading) * neck, point[1] - Math.sin(heading) * neck], heading, y, bastionMouth.height, [
  {length: neck},
  {
    y: bastionMouth.floorY,
    steps: [turn, south, {
      radius: cornerRadius,
      angle: Math.PI / 2,
    }, west, {
      radius: lastRadius,
      angle: -Math.PI / 2,
    }],
  },
])
export const fortressLink = new RoutedPassage('link', 'fortress', route, width)
export const fortressLinkLanterns = [fortressLink.ribGap(4), fortressLink.ribGap(route.length - 5)]
export const fortressNetwork = [...fortressPassages, ...bastionPassages, fortressLink]

/** All floors under a point, including the upper run where it crosses the lower passages. */
export function fortressFloors(x: number, z: number) {
  return fortressNetwork.flatMap(passage => passage.floorAt(x, z) ?? [])
}

/** Whether the position lies between any Fortress passage’s floor and vault. */
export function insideFortress(position: Vec3) {
  return fortressNetwork.some(passage => passage.contains(position))
}
