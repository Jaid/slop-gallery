// Session-local attachment bookkeeping. Re-grabbing a loose leaf cannot count twice.
export default class PlantAttachment {
  canGrabPot = () => this.remaining === 0
  potAttached = true
  recoverLeafAsDynamic = () => !this.potAttached

  setPotAttached = (attached: boolean) => {
    this.potAttached = attached
  }

  private readonly attached: Set<string>
  private readonly leaves: Set<string>

  constructor(ids: Iterable<string>) {
    this.leaves = new Set(ids)
    this.attached = new Set(this.leaves)
  }

  get remaining() {
    return this.attached.size
  }
  setLeafAttached(id: string, attached: boolean) {
    if (!this.leaves.has(id)) {
      return
    }
    if (attached) {
      this.attached.add(id)
    } else {
      this.attached.delete(id)
    }
  }
}
