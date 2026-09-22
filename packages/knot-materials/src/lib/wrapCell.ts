import type {Node} from 'three/webgpu'

/** Wrap a lattice cell index into its periodic domain so random identities survive the UV seam. */
export function wrapCell(cell: Node<'vec2'>, period: Node<'vec2'>) {
  return cell.mod(period).add(period).mod(period)
}
