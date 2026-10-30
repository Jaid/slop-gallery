import {useMemo} from 'react'

import KnotShowcase from '#component/KnotShowcase'
import Pedestal, {usePedestal} from '#component/Pedestal'
import {useEnvironmentSeed} from '#src/lib/gallery.ts'
import salonKnot, {salonKnotPosition} from '#src/rooms/salon/knot.ts'

const [x, , z] = salonKnotPosition

/** The Salon’s Knot, one of the collection’s prime ones the environment’s seed picks, showcased over its pedestal. */
export default function SalonKnot() {
  const seed = useEnvironmentSeed()
  const knots = useMemo(() => [{
    entry: salonKnot(seed),
    position: salonKnotPosition,
  }], [seed])
  const pedestal = usePedestal()
  return <group name='salon-knot'>
    <Pedestal {...pedestal} position={[x, 0, z]} />
    <KnotShowcase knots={knots} />
  </group>
}
