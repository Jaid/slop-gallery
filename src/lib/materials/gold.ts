import StudioEnvironment from 'knot-materials/StudioEnvironment.ts'

import GoldMaterial from './GoldMaterial.ts'

/**
 * The one gold material of the gallery, shared by every gilt and golden mesh: the Moonfall stanchions and crater trim, the Salon’s gilt rails, the Lobby’s alcove lamp hoods and the golden props.
 *
 * The gallery’s own environment is a dim, olive-tinted gradient that gold would mirror as khaki. Gold instead mirrors a softly lit studio, whose softboxes draw the long, crisp highlights of polished metal along posts and rails.
 *
 * Sharing one instance lets all of them reuse a single compiled pipeline. It lives as long as the page and is never disposed, so props that remount on a new game do not compile it again.
 */
const gold = new GoldMaterial({
  environment: new StudioEnvironment,
  environmentIntensity: 0.45,
})

export default gold
