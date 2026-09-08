// Session-local attachment bookkeeping. Re-grabbing a loose leaf cannot count twice.
export class PlantAttachment {
  private readonly leaves: Set<string>
  private readonly attached: Set<string>
  potAttached = true

  constructor(ids: Iterable<string>) {
    this.leaves = new Set(ids)
    this.attached = new Set(this.leaves)
  }

  get remaining() {return this.attached.size}
  canGrabPot = () => this.remaining === 0

  setLeafAttached(id: string, attached: boolean) {
    if (!this.leaves.has(id)) return
    if (attached) this.attached.add(id)
    else this.attached.delete(id)
  }

  setPotAttached = (attached: boolean) => {this.potAttached = attached}
  recoverLeafAsDynamic = () => !this.potAttached
}
