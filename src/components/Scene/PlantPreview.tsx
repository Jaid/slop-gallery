import {useEffect, useMemo} from 'react'

import CanvasText from '#component/CanvasText'
import DestructiblePlant from '#component/DestructiblePlant'
import PlantDecoration from '#component/PlantDecoration'
import {useGallery} from '#src/lib/gallery.ts'
import {destructiblePreviewKind} from '#src/lib/gallery/destructiblePlants/preview.ts'
import {plantCombinations} from '#src/lib/gallery/plantDecorations/catalog.ts'
import {PreviewLabels} from '#src/lib/gallery/plantDecorations/PreviewLabels.ts'

import {Box} from './primitives.tsx'

/** Temporary, pot-major selection matrix. Removing this component removes every review sign. */
export default function PlantPreview() {
  const resetEpoch = useGallery(s => s.resetEpoch)
  const labels = useMemo(() => new PreviewLabels, [])
  useEffect(() => () => labels.dispose(), [labels])
  return <group name="plant-combination-preview" userData={{combinationCount: plantCombinations.length}}>
    {plantCombinations.map((combination, i) => <group key={combination.number} position={combination.position} name={`combination-${combination.number}`} userData={{
      combination: combination.number,
      pot: combination.pot,
      plant: combination.plant,
    }}>
      <mesh position={[0, 0.018, 0]} receiveShadow><cylinderGeometry args={[0.47, 0.49, 0.036, 64]}/><meshStandardNodeMaterial color="#c4bca7" roughness={0.83}/></mesh>
      {destructiblePreviewKind(combination.number) ? <DestructiblePlant key={resetEpoch} id={`prop-specimen-${combination.number}`} kind={destructiblePreviewKind(combination.number)!} pot={combination.pot} position={[0, 0.036, 0]}/> : <PlantDecoration pot={combination.pot} plant={combination.plant} position={[0, 0.036, 0]}/>}
      <group position={[0, 0.22, 0.64]} rotation={[-0.32, 0, 0]}>
        <Box size={[0.986, 0.314, 0.034]} color="#a28d5b" metalness={0.65} roughness={0.4}/>
        <mesh name={`number-sign-${combination.number}`} userData={labels.complexities[i]} geometry={labels.geometry[i]} material={labels.material} position={[0, 0, 0.018]} dispose={null}/>
      </group>
      <Box size={[0.026, 0.17, 0.026]} position={[0, 0.085, 0.64]} color="#a28d5b" metalness={0.65}/>
    </group>)}
    <group position={[0, 0.045, 4.55]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow><planeGeometry args={[6.8, 0.92]}/><meshStandardNodeMaterial color="#304b40" roughness={0.9}/></mesh>
      <CanvasText position={[0, 0.16, 0.003]} text="THE BOTANICAL EDIT" width={6.1} height={0.32} color="#efe7cf" fontFamily="Georgia" fontSize={0.8}/>
      <CanvasText position={[0, -0.18, 0.003]} text="4 vessels  /  8 botanicals  /  32 possibilities     •     Choose your numbers" width={6.1} height={0.2} color="#c6cbb6"/>
    </group>
  </group>
}
