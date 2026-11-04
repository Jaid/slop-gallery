import type {ShowcasedKnot} from '#src/lib/gallery/showcasedKnots.ts'

import {ConvexHullCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import DirectKnotMaterials from 'knot-materials/knotMaterials/DirectKnotMaterials.ts'
import loadKnotMaterial from 'knot-materials/materials.ts'
import {useEffect, useMemo, useSyncExternalStore} from 'react'

import InteractiveObject from '#component/InteractiveObject'
import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import KnotNarration from '#src/lib/audio/KnotNarration.ts'
import {narrator} from '#src/lib/audio/narration.ts'
import {galleryEvents, narrateModel, useGallery} from '#src/lib/gallery.ts'
import showcasedKnots from '#src/lib/gallery/showcasedKnots.ts'
import {trackLoadingItems} from '#src/lib/loadingItems.ts'
import {knotStandingRoll, standKnot} from '#src/lib/physics/standingKnot.ts'
import {getPmremEnvironment} from '#src/lib/rendering/pmrem.ts'

const propId = ({entry}: ShowcasedKnot) => `prop-knot-${entry.id}`
/** A core sits inside its shell, which takes every hit. */
const ignoreRaycast = () => {}

/**
 * Knots the gallery showcases, each standing on its own as a loose prop on the bridge between two of its lobes, scaled to its height, to be knocked over, grabbed and thrown like any other; inspecting one announces its title and its model.
 * Their materials and the announcements only load with them. A Knot only enters once its shader has arrived and then wears its full material right away, leaving it to the renderer to stream it in like the rest of the gallery.
 * `knots` must keep its identity while it stays the same, since a new one builds every material anew.
 */
export default function KnotShowcase({knots}: {knots: ReadonlyArray<ShowcasedKnot>}) {
  const materials = useDisposable(useMemo(() => new DirectKnotMaterials(knots.map(knot => knot.entry), loadKnotMaterial, getPmremEnvironment()), [knots]))
  const worn = useSyncExternalStore(materials.subscribe, materials.getSnapshot, materials.getSnapshot)
  useEffect(() => trackLoadingItems(() => materials.pendingMaterials.map(material => `knot-material:${material}`)), [materials])
  const {resources} = materials
  // The collider vertices are scaled copies, which must keep their identity, or every render rebuilds the colliders.
  const stances = useMemo(() => knots.map((knot, index) => standKnot(resources.items[index].colliderVertices, knot.height)), [knots, resources])
  useEffect(() => {
    const ids = knots.map(knot => {
      const id = propId(knot)
      showcasedKnots.set(id, {
        id: knot.entry.id,
        name: knot.entry.title,
        position: knot.position,
        rarity: knot.entry.rarity,
      })
      return id
    })
    return () => {
      for (const id of ids) {
        showcasedKnots.delete(id)
      }
    }
  }, [knots])
  // Inspecting a Knot announces it, as does asking for its narration or its model’s; the announcements’ voices only download once the first one plays.
  useEffect(() => {
    const owner = new AbortController
    const entries = new Map(knots.map(knot => [propId(knot), knot.entry]))
    let announcements: Promise<KnotNarration> | undefined
    const announce = (event: Event, play: (narration: KnotNarration, id: string, entry: ShowcasedKnot['entry']) => void) => {
      const id = (event as CustomEvent<string>).detail
      const entry = entries.get(id)
      if (!entry || !useGallery.getState().sound) {
        return
      }
      announcements ??= import('knot-materials/announcementAssets.ts').then(({default: url}) => new KnotNarration(narrator, url))
      announcements.then(narration => {
        if (!owner.signal.aborted) {
          play(narration, id, entry)
        }
      }).catch((error: unknown) => {
        console.warn('The Knots’ announcements could not be loaded:', error)
      })
    }
    const inspect = (event: Event) => announce(event, (narration, id, entry) => narration.enqueue(entry, {
      id,
      signal: owner.signal,
    }))
    const narrate = (event: Event) => announce(event, (narration, id, entry) => narration.enqueue(entry, {
      id,
      repeat: true,
      signal: owner.signal,
    }))
    const model = (event: Event) => announce(event, (narration, id, entry) => narration.enqueueModel(entry, {
      id,
      signal: owner.signal,
    }))
    galleryEvents.addEventListener('inspect', inspect)
    galleryEvents.addEventListener('narrate', narrate)
    galleryEvents.addEventListener('narrate-model', model)
    return () => {
      galleryEvents.removeEventListener('inspect', inspect)
      galleryEvents.removeEventListener('narrate', narrate)
      galleryEvents.removeEventListener('narrate-model', model)
      owner.abort()
    }
  }, [knots])
  return <>
    {knots.map((knot, index) => {
      const material = worn[index]
      if (!material) {
        return null
      }
      const {entry, position: [x, y, z], rotation: yaw = 0} = knot
      const {geometry} = resources.items[index]
      const {lift, scale, vertices} = stances[index]
      // The shader’s displacement reaches out by as much at the Knot’s scale.
      const skin = (entry.displacement ?? 0) * scale
      const {coreMaterial} = material
      const id = propId(knot)
      return <GrabbableProp key={id} id={id} colliders={false} orbit={{radius: geometry.boundingSphere!.radius * scale}} position={[x, y + lift + skin, z]} rotation={[0, yaw, knotStandingRoll]} title={`${entry.title} · ${entry.modelTitle}`} type='dynamic'>
        <ConvexHullCollider args={[vertices]} contactSkin={skin} />
        <InteractiveObject id={id} action='Listen' inspectable title={entry.title} onActivate={() => narrateModel(id)}>
          <mesh castShadow material={material} name={`knot-${entry.id}`} raycast={resources.raycast} receiveShadow scale={scale}>
            <primitive attach='geometry' object={geometry} />
            {coreMaterial && <mesh castShadow material={coreMaterial} name={`knot-${entry.id}-core`} raycast={ignoreRaycast} receiveShadow>
              <primitive attach='geometry' object={geometry} />
            </mesh>}
          </mesh>
        </InteractiveObject>
      </GrabbableProp>
    })}
  </>
}
