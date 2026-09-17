import type {Node} from 'three/webgpu'

import {mx_noise_vec3} from 'three/tsl'

export const hash3 = (lattice: Node<'vec3'>) => mx_noise_vec3(lattice)
