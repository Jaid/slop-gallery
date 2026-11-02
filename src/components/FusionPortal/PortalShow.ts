import type Fusion from '#src/lib/gallery/fusion/Fusion.ts'
import type {PortalPalette} from '#src/lib/gallery/fusion/PortalCore.ts'
import type {Texture} from 'three/webgpu'

import {clamp} from 'math'
import {Color, Group, PointLight, Vector3} from 'three/webgpu'

import FusionSound from '#src/lib/audio/FusionSound.ts'
import SoundEngine from '#src/lib/audio/SoundEngine.ts'
import {useGallery} from '#src/lib/gallery.ts'
import {portalEnvelope} from '#src/lib/gallery/fusion/envelope.ts'
import {decorateIntro, introTether, introTrail} from '#src/lib/gallery/fusion/intro.ts'
import {introOrbitRate, orbitAngle} from '#src/lib/gallery/fusion/orbit.ts'
import PortalVisuals, {emberPalette, paletteOf} from '#src/lib/gallery/fusion/PortalVisuals.ts'
import {holdArtworkTexture} from '#src/lib/useArtworkTexture.ts'

import Satellites from './Satellites.ts'

type Stage = 'brewing' | 'climax' | 'emerged' | 'fizzle'
type HeldImage = {
  release: () => void
  texture?: Texture<{
    height: number
    width: number
  }>
}

/** how far the portal’s light reaches, in meters */
const lightRange = 8
const middle = new Vector3

/**
 * One fusion as the scene shows it: its portal, its light, its sound and the choreography of what orbits it, all following the fusion’s clock frame by frame.
 * Disposing it hands back whatever still orbits, stops its sound and lets go of the images it showed.
 */
export default class PortalShow {
  readonly root = new Group
  private readonly embers: PortalPalette
  private readonly fusion: Fusion
  private readonly images = new Map<Blob | string, HeldImage>
  private last?: number
  private readonly light = new PointLight('#ffffff', 0, lightRange, 2)
  private readonly paint: PortalPalette = {
    core: new Color,
    rim: new Color,
    swirl: new Color,
  }
  private readonly palette: PortalPalette
  private phase = 0
  /** whether the recoil of a fusion the player broke off has sounded */
  private recoiled = false
  private readonly satellites: Satellites
  private sound?: FusionSound
  private stage: Stage = 'brewing'
  private turn = -1
  private readonly visuals = new PortalVisuals

  constructor(fusion: Fusion) {
    this.fusion = fusion
    this.satellites = new Satellites(fusion)
    this.palette = paletteOf(fusion.spec.color)
    this.embers = paletteOf()
    this.embers.core.set(emberPalette.core)
    this.embers.swirl.set(emberPalette.swirl)
    this.embers.rim.set(emberPalette.rim)
    this.visuals.place(fusion.frame.center)
    this.light.position.fromArray(fusion.frame.center)
    this.light.name = 'fusion-light'
    this.root.name = `fusion-${fusion.id}`
    this.root.add(this.visuals.root, this.light)
  }

  dispose() {
    this.satellites.dispose()
    this.sound?.stop()
    for (const image of this.images.values()) {
      image.release()
    }
    this.images.clear()
    this.visuals.dispose()
  }

  /** Brings everything to `elapsed` seconds into the fusion. */
  update(elapsed: number) {
    const {fusion, visuals} = this
    const {frame, outcome, timing} = fusion
    const delta = this.last === undefined ? 0 : clamp(elapsed - this.last, 0, 0.1)
    this.last = elapsed
    const envelope = portalEnvelope(elapsed, outcome, fusion.emergedAt, timing, fusion.spec.ingredients.length, fusion.canceledAt)
    this.phase = (this.phase + envelope.spin * delta) % (Math.PI * 2000)
    // Colors die down to embers while it fizzles.
    this.paint.core.lerpColors(this.palette.core, this.embers.core, envelope.embers)
    this.paint.swirl.lerpColors(this.palette.swirl, this.embers.swirl, envelope.embers)
    this.paint.rim.lerpColors(this.palette.rim, this.embers.rim, envelope.embers)
    visuals.paint(this.paint)
    const {uniforms} = visuals.core
    uniforms.radius.value = frame.radius * envelope.size
    uniforms.energy.value = envelope.energy
    uniforms.lens.value = envelope.lens
    uniforms.flash.value = envelope.flash
    uniforms.pulse.value = envelope.pulse
    uniforms.pulseStrength.value = envelope.pulseStrength
    uniforms.phase.value = this.phase
    uniforms.clock.value = elapsed
    this.show(envelope.image)
    const sparks = visuals.sparks.uniforms
    sparks.radius.value = frame.radius
    sparks.clock.value = elapsed
    sparks.energy.value = envelope.size > 0.05 ? envelope.energy * (1 - envelope.embers) : 0
    sparks.burst.value = envelope.burst
    sparks.burstStrength.value = envelope.burstStrength
    decorateIntro(visuals, elapsed, timing, frame.normal)
    this.satellites.update(elapsed)
    middle.fromArray(frame.center)
    for (const [index, tether] of visuals.tethers.entries()) {
      const from = this.satellites.centers[index]
      const held = from && introTether(index, elapsed, timing)
      tether.uniforms.energy.value = held ? held.glow : 0
      if (!held) {
        continue
      }
      tether.uniforms.clock.value = elapsed
      tether.uniforms.flow.value = held.flow
      tether.uniforms.knot.value = held.knot
      tether.uniforms.slack.value = held.slack
      tether.uniforms.width.value = held.width
      tether.uniforms.to.value.copy(middle)
      tether.uniforms.from.value.lerpVectors(middle, from, held.reach)
    }
    for (const [index, trail] of visuals.trails.entries()) {
      const head = this.satellites.centers[index]
      const blazing = head && introTrail(index, elapsed, timing)
      trail.uniforms.energy.value = blazing ? blazing.energy : 0
      if (!blazing) {
        continue
      }
      trail.follow(frame, head, blazing.reach)
      trail.uniforms.clock.value = elapsed
      trail.uniforms.length.value = blazing.length
      trail.uniforms.width.value = blazing.width
    }
    this.light.intensity = envelope.light
    this.light.color.copy(this.paint.swirl).lerp(this.paint.rim, envelope.flash / 2)
    if (!this.sound && this.stage === 'brewing') {
      this.sound = this.listen()
    }
    const orbit = elapsed < timing.intro ? introOrbitRate(elapsed, timing) : (orbitAngle(0, elapsed, this.climax()) - orbitAngle(0, elapsed - 0.01, this.climax())) / 0.01
    this.cue(elapsed, envelope.image && 'turn' in envelope.image ? envelope.image.turn : undefined)
    this.sound?.update({
      energy: envelope.energy,
      orbit,
      spin: envelope.spin,
    })
  }

  private climax() {
    const {outcome, timing} = this.fusion
    return outcome?.kind === 'success' ? {
      at: outcome.at,
      duration: timing.climax,
    } : undefined
  }

  /** Plays the sound of whatever began since the last frame: a new ingredient, the recoil of a fusion the player broke off, the climax, the result or the fizzle. */
  private cue(elapsed: number, turn: number | undefined) {
    const {fusion, sound} = this
    const {outcome, timing} = fusion
    if (fusion.canceledAt !== undefined && !this.recoiled) {
      this.recoiled = true
      sound?.recoil()
    }
    let stage: Stage = 'brewing'
    if (fusion.emergedAt !== undefined) {
      stage = 'emerged'
    } else if (outcome?.kind === 'success' && elapsed > outcome.at) {
      stage = 'climax'
    } else if (outcome?.kind === 'failure' && elapsed > outcome.at) {
      stage = 'fizzle'
    }
    if (stage !== this.stage) {
      this.stage = stage
      if (stage === 'climax') {
        sound?.climax(Math.max(0.1, outcome!.at + timing.climax - elapsed))
      } else if (stage === 'emerged') {
        sound?.emerge()
      } else if (stage === 'fizzle') {
        sound?.fizzle(timing.fizzle)
      }
    }
    if (stage === 'brewing' && turn !== undefined && turn !== this.turn) {
      this.turn = turn
      sound?.surface(turn)
    }
  }

  /** The image, held in the artworks’ shared cache until the portal closes, once it is decoded. */
  private image(source: Blob | string) {
    let image = this.images.get(source)
    if (!image) {
      const {texture, release} = holdArtworkTexture(source)
      const held: HeldImage = {release}
      void texture.then(loaded => {
        held.texture = loaded
      }, () => {})
      image = held
      this.images.set(source, image)
    }
    return image.texture
  }

  /** The portal’s sound, once the player’s first click made the sound engine and while the sound is on; it can only start while the portal still brews. */
  private listen() {
    const engine = SoundEngine.existing()
    if (!engine || !useGallery.getState().sound) {
      return
    }
    const {fusion} = this
    const sound = new FusionSound(engine, fusion.frame.center)
    sound.open(fusion.timing, fusion.elapsed())
    return sound
  }

  /** Shows the ingredient or the result the envelope asks for, once its image is decoded. */
  private show(image: ReturnType<typeof portalEnvelope>['image']) {
    const {core} = this.visuals
    const source = image && ('result' in image ? this.fusion.result : this.fusion.spec.ingredients[image.index])
    const texture = source === undefined ? undefined : this.image(source)
    if (!image || !texture) {
      core.uniforms.clarity.value = 0
      return
    }
    if (core.image.value !== texture) {
      core.image.value = texture
      core.uniforms.aspect.value = texture.image.width / Math.max(1, texture.image.height)
    }
    core.uniforms.clarity.value = image.clarity
  }
}
