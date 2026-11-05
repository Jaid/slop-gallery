import type {Orb} from './orbs/index.ts'
import type {Vec3} from './types.ts'

import {helmet, knife, pumpkin} from './curios/index.ts'
import {halloweenOrb, horrorOrb, randomOrbs, spookOrb} from './orbs/index.ts'

/** the rooms an orb released into the Forge’s gutter passes through on its way down to the Bastion’s crater */
export const releaseRooms: ReadonlySet<string> = new Set(['bastion', 'forge'])
/** the props that, lying in the Forge or carried into it, steer its release to an orb of their own, by their ids: the pumpkin to the Halloween Orb, the cleaver to the Horror Orb and the helmet to the Spook Orb */
export const releaseSteering: ReadonlyMap<string, Orb> = new Map<string, Orb>([
  [pumpkin.propId, halloweenOrb],
  [knife.propId, horrorOrb],
  [helmet.propId, spookOrb],
])

type PropPosition = readonly [id: string, position: Vec3]

/** Whether the Forge’s orb release is locked: whether any of the props, by their ids and where they are, is an orb in one of the {@link releaseRooms}, by the room `roomAt` finds there, so orbs never queue up on the way. */
export function releaseLocked(props: Iterable<PropPosition>, roomAt: (position: Vec3) => string | undefined) {
  for (const [id, position] of props) {
    if (id.startsWith('prop-orb-') && releaseRooms.has(roomAt(position) ?? '')) {
      return true
    }
  }
  return false
}

/** The orbs the Forge’s release may give, with the props where they are: those that the props in the Forge steer it to, by {@link releaseSteering}, or, with none of them there, the {@link randomOrbs}. */
export function releaseCandidates(props: Iterable<PropPosition>, roomAt: (position: Vec3) => string | undefined): ReadonlyArray<Orb> {
  const steered = new Set<Orb>
  for (const [id, position] of props) {
    const orb = steeredOrb(id)
    if (orb && roomAt(position) === 'forge') {
      steered.add(orb)
    }
  }
  return steered.size ? [...steered] : randomOrbs
}

/** The orb the Forge’s release gives, picked evenly from its {@link releaseCandidates} by `random`, a number from 0 up to 1. */
export function releasedOrb(props: Iterable<PropPosition>, roomAt: (position: Vec3) => string | undefined, random: number) {
  const candidates = releaseCandidates(props, roomAt)
  return candidates[Math.min(Math.floor(random * candidates.length), candidates.length - 1)]
}

/** the orb the prop steers the release to, if any: by its id, or the id of the first of its kind it is numbered after, like `prop-pumpkin-2` */
function steeredOrb(id: string) {
  const kind = /^(?<kind>.+?)(?:-\d+)?$/.exec(id)!.groups!.kind
  return releaseSteering.get(kind)
}
