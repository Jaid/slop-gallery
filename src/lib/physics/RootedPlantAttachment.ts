import PlantAttachment from './PlantAttachment.ts'

/** Leaves → uprooted trunk → pot. Each canceled pickup restores its own stage. */
export default class RootedPlantAttachment extends PlantAttachment {
  override canGrabPot = () => this.remaining === 0 && !this.rootAttached
  canGrabRoot = () => this.remaining === 0
  override recoverLeafAsDynamic = () => !this.rootAttached || !this.potAttached
  recoverRootAsDynamic = () => !this.potAttached
  rootAttached = true
  setRootAttached = (attached: boolean) => {
    this.rootAttached = attached
  }
}
