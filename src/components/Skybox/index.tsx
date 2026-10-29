import type {SkyboxId} from '#src/rooms/index.ts'

import {useThree} from '@react-three/fiber'
import {useLayoutEffect} from 'react'

import {useGallery} from '#src/lib/gallery.ts'
import world from '#src/worlds/current.ts'

/**
 * Shows the skybox of the room the player is in behind the world, as the world resolves its id, or with `null` none at all, leaving the renderer’s clear color.
 * Entering a room that names no skybox keeps the one showing. A start room without one of its own takes the default room’s, as if the player had come from there, and if that names none either, the scene’s background stays as the world set it.
 */
export default function Skybox() {
  const scene = useThree(state => state.scene)
  // Set before the first frame, like the environment, so the loading screen already lifts over the start room’s skybox.
  useLayoutEffect(() => {
    const previous = scene.backgroundNode
    const show = (id: SkyboxId | null | undefined) => {
      if (id !== undefined) {
        // eslint-disable-next-line react-hooks/immutability -- the scene background belongs to the world’s rooms; the cleanup restores it.
        scene.backgroundNode = id === null ? null : world.skybox(id)
      }
    }
    let {room} = useGallery.getState()
    const start = world.roomById(room)?.skybox
    show(start === undefined ? world.room(world.defaultRoom).skybox : start)
    const unsubscribe = useGallery.subscribe(state => {
      if (state.room === room) {
        return
      }
      room = state.room
      show(world.roomById(room)?.skybox)
    })
    return () => {
      unsubscribe()
      scene.backgroundNode = previous
    }
  }, [scene])
  return null
}
