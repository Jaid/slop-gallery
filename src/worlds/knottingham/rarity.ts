import {knots} from 'knot-materials'
import KnotRarityEditor from 'knot-materials/KnotRarityEditor.ts'

/** the rarities of the exhibited Knots for this page session, which `?rarity=edit` lets their nameplates change */
export const knotRarityEditor = new KnotRarityEditor(knots)
