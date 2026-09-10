import GoldMaterial from '#component/levels/gallery/GoldMaterial'
import Pedestal, {usePedestal} from '#component/levels/gallery/Pedestal'
import Prop from '#component/levels/gallery/Prop'
import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import {knotGeometryArgs} from '#src/lib/gallery/sculptures.ts'

export default function Props() {
  const pedestal = usePedestal()
  return <>
    <Pedestal {...pedestal} position={[13.3, 0, 1.4]}/>
    <GrabbableProp id="prop-knot" title="A very serious knot" position={[13.3, 1.9, 1.4]}><mesh castShadow receiveShadow><torusKnotGeometry args={knotGeometryArgs}/><GoldMaterial/></mesh></GrabbableProp>
    {([
      {
        id: 'prop-book',
        // Clear the 1.35 m cap with the bottom cover, 0.0725 m below the center.
        position: [-3.2, 1.43, 6.8],
        kind: 'book',
        title: 'A suspiciously well-read book',
      }, {
        id: 'prop-apple',
        position: [-14, 1.57, 1],
        kind: 'apple',
        title: 'The original forbidden download',
      },
    ] as const).map(prop => <group key={prop.id}>
      <Pedestal {...pedestal} position={[prop.position[0], 0, prop.position[2]]}/>
      <Prop {...prop} position={[...prop.position]}/>
    </group>)}
  </>
}

