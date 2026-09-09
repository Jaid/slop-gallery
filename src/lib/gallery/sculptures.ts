import type {TorusKnotGeometry} from 'three/webgpu'

// Preserve the knot’s radius, tube thickness and winding; only tessellation changes.
export const knotGeometryArgs = [0.45, 0.13, 128, 32, 2, 3] satisfies ConstructorParameters<typeof TorusKnotGeometry>
