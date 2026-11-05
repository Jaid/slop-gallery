import GuillocheGoldMaterial from './GuillocheGoldMaterial.ts'

const shared = new Map<number, GuillocheGoldMaterial>

/**
 * The engine-turned gold of switch plates with `buttons` buttons, one instance per count shared by every such plate, so all of them reuse a single compiled pipeline.
 *
 * Like the shared gold, it lives as long as the page and is never disposed.
 */
export default function guillocheGold(buttons: number) {
  let material = shared.get(buttons)
  if (!material) {
    material = new GuillocheGoldMaterial(buttons)
    shared.set(buttons, material)
  }
  return material
}
