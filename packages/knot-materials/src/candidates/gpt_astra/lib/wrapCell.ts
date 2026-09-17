import type {Node} from 'three/webgpu'

export function wrapCell(cell: Node<'vec2'>, period: Node<'vec2'>) {
  return cell.mod(period).add(period).mod(period)
}
