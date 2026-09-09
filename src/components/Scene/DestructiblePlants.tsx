import CanvasText from '#component/CanvasText'
import DestructiblePlant from '#component/DestructiblePlant'
import {destructiblePlants} from '#src/lib/gallery/destructiblePlants/catalog.ts'
import {complexityLabel} from '#src/lib/gallery/plantDecorations/complexity.ts'
import {decorationResources} from '#src/lib/gallery/plantDecorations/DecorationResources.ts'
import {triangleCount} from '#src/lib/geometry.ts'

import {Box} from './primitives.tsx'

export default function DestructiblePlants() {
  const resources = decorationResources()
  return <group name="destructible-plant-specimens">
    {destructiblePlants.map(specimen => {
      const pot = resources.pot(specimen.pot)
      const potTriangles = triangleCount(pot.shell) + triangleCount(pot.soil) + triangleCount(pot.trim)
      const plantTriangles = resources.destructiblePlant(specimen.id).triangles
      const complexity = complexityLabel({
        potTriangles,
        plantTriangles,
        triangles: potTriangles + plantTriangles,
      })
      return <group key={specimen.id} position={specimen.position}>
        <DestructiblePlant id={`prop-specimen-${specimen.number}`} kind={specimen.id} pot={specimen.pot} position={[0, 0, 0]}/>
        <group name={`number-sign-${specimen.number}`} position={[0, 0.22, 0.68]} rotation={[-0.32, 0, 0]} userData={{
          potTriangles,
          plantTriangles,
        }}>
          <Box size={[1.2, 0.32, 0.034]} color="#e5decb"/>
          <CanvasText position={[0, 0.085, 0.019]} text={`${specimen.number} · ${specimen.title}`} width={1.12} height={0.08} color="#294238" fontFamily="Georgia"/>
          <CanvasText position={[0, 0, 0.019]} text="Pluck foliage → pick up pot" width={1.08} height={0.052} color="#526344"/>
          <CanvasText position={[0, -0.085, 0.019]} text={complexity} width={1.12} height={0.05} color="#294238"/>
        </group>
        <Box size={[0.026, 0.17, 0.026]} position={[0, 0.085, 0.68]} color="#a28d5b" metalness={0.65}/>
      </group>
    })}
  </group>
}
