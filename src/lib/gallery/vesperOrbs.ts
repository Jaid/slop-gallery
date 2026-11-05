import {environmentPick} from '../environmentSeed.ts'
import {randomOrbs} from './orbs/index.ts'
import {vesperOrbPedestals} from './vesper.ts'

/**
 * The orbs standing on the Vesper’s pedestals in the environment of `seed`, in the order of the pedestals: every pedestal rolls its own among the {@link randomOrbs}, so a seed alone decides them all. Each is a prop of its own, the first of a kind by the orb’s own prop id and every further one numbered from 2.
 */
export function vesperOrbs(seed: number) {
  const picked = vesperOrbPedestals.map((_, index) => environmentPick(seed, `vesper-orb:${index}`, randomOrbs))
  return picked.map((orb, index) => {
    const count = picked.slice(0, index + 1).filter(other => other === orb).length
    return {
      id: count === 1 ? orb.propId : `${orb.propId}-${count}`,
      orb,
    }
  })
}
