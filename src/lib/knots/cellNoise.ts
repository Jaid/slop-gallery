import type {Node} from 'three/webgpu'

import * as tsl from 'three/tsl'

// Present in Three.js r186; the installed r185 declarations omit this export.
const cellNoiseVec3 = (tsl as typeof tsl & {mx_cell_noise_vec3: (position: Node<'vec3'>) => Node<'vec3'>}).mx_cell_noise_vec3

export default cellNoiseVec3
