import type {Vec3} from './types.ts'

import forge from './forge.ts'

/** The round opening over the arch between the Forge and its vestibule, on the cannon’s axis, above the arch’s casing and below the cornice. */
export const forgeOpeningCenter: Vec3 = [forge.center[0], 4.57, forge.center[1] - forge.size[1] / 2]
