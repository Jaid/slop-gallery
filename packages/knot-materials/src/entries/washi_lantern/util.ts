import type {Node} from 'three/webgpu'

export const wrap = (x: Node<'float'>) => x.sub(x.add(0.5).floor())
