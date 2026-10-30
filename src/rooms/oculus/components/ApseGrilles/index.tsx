import type {Material} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import BarredOpeningGeometry from '#src/lib/gallery/BarredOpeningGeometry.ts'
import {apseOpenings, fortressClearance} from '#src/lib/gallery/fortress.ts'
import {mergeParts} from '#src/lib/geometry.ts'
import slopGallery from '#src/worlds/gallery/index.ts'

/** the apse’s walls by the arc they stand on, west to east */
const apseWalls = ['oculus-northwest', 'oculus-north', 'oculus-northeast'] as const
/** The apse’s barred gate and windows onto the Fortress: their iron bars and the stone that lines them through the gap between the apse’s wall and the Fortress’. */
export default function ApseGrilles({stone}: {stone: Material}) {
  const {reveal, bars, collision} = useDisposable(useMemo(createGrilles, []))
  const iron = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#2a2724',
    metalness: 0.75,
    roughness: 0.5,
    envMapIntensity: 0.3,
  }), []))
  return <RigidBody colliders={false} name='oculus-apse-grilles' type='fixed'>
    {collision.map((args, i) => <TrimeshCollider key={i} args={args} />)}
    <mesh castShadow geometry={reveal} material={stone} name='oculus-apse-reveals' receiveShadow />
    <mesh castShadow geometry={bars} material={iron} name='oculus-apse-bars' receiveShadow />
  </RigidBody>
}

function createGrilles() {
  const openings = apseOpenings.map(opening => {
    const wall = slopGallery.walls.find(value => value.id === apseWalls[opening.arc])!
    const hole = wall.holes!.find(value => value.name === opening.name)!
    return new BarredOpeningGeometry(wall, hole, {
      bands: opening.bands,
      depth: fortressClearance,
    })
  })
  const reveal = mergeParts(openings.map(opening => opening.reveal))
  const bars = mergeParts(openings.map(opening => opening.bars))
  return {
    reveal,
    bars,
    collision: [reveal, bars].map(colliderGeometry),
    dispose() {
      reveal.dispose()
      bars.dispose()
    },
  }
}
