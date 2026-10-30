import {useMemo} from 'react'

import KnotLabels from '#component/KnotLabels'
import KnotShowcase from '#component/KnotShowcase'
import {narrate, useEnvironmentSeed} from '#src/lib/gallery.ts'
import oculusKnot, {oculusKnotLabel, oculusKnotPosition, oculusKnotSign} from '#src/rooms/oculus/knot.ts'

/** The Oculus’ Knot, which the environment’s seed picks, floating between the tower and the balcony, with its nameplate on the tower’s deck. */
export default function OculusKnot() {
  const seed = useEnvironmentSeed()
  const knots = useMemo(() => [{
    entry: oculusKnot(seed),
    position: oculusKnotPosition,
  }], [seed])
  const signs = useMemo(() => knots.map(({entry}) => ({
    entry: {
      ...entry,
      label: oculusKnotLabel,
    },
    ...oculusKnotSign,
  })), [knots])
  return <group name='oculus-knot'>
    <KnotShowcase knots={knots} />
    <KnotLabels signs={signs} onActivate={entry => narrate(`prop-knot-${entry.id}`)} />
  </group>
}
