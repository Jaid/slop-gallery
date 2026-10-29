import {middaySun} from '#src/lib/gallery/sun.ts'
import proceduralSky, {SkyLook} from '#src/lib/materials/ProceduralSky.ts'

/** the uniforms of the gallery’s sky, which its lighting paints with the current preset, so a new weather never recompiles the sky */
export const skyLook = new SkyLook({sunDirection: middaySun})

/** the procedural sky the gallery shows behind rooms whose skybox is `sky` */
const sky = proceduralSky(skyLook)
export default sky
