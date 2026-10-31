import type {ThrownOrb} from './types.ts'

/** an orb’s kind; its prop is `prop-orb-<id>` */
export type OrbKind = Omit<ThrownOrb, 'id'> & {
  id: string
}

/** the radius of every orb’s ball, in meters */
export const orbRadius = 0.14

export const halloweenOrb: OrbKind = {
  id: 'halloween',
  title: 'Halloween Orb',
  color: '#6a1fd0',
  prompt: 'Turn it into a Halloween version of itself. Keep its subject, composition and painting style recognizable, but let Halloween take over: jack-o’-lanterns, bats, cobwebs, candlelight, a full moon, costumes and a spooky glow in orange, violet and black, wherever they fit. Characters may wear Halloween costumes or become their spooky counterparts. Keep it playful and charming rather than gory.',
}
