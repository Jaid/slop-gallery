import type {Node} from 'three/webgpu'

import {mx_noise_float} from 'three/tsl'

export const hash1 = (lattice: Node<'vec3'>) => mx_noise_float(lattice)
