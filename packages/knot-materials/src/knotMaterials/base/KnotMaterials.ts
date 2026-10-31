import type {KnotResourceEntry} from '../../KnotResources.ts'
import type KnotMaterial from '../../lib/KnotMaterial.ts'
import type {KnotMaterialConstructor, KnotMaterialLoader} from '../../types.ts'
import type {Texture} from 'three/webgpu'

import KnotResources from '../../KnotResources.ts'
import StudioEnvironment from '../../StudioEnvironment.ts'

/** how far an entry’s shader got: not asked for yet, still downloading, built into its full material or broken */
type LoadState = 'failed' | 'idle' | 'loaded' | 'loading'

/**
 * The materials of the knots a scene shows, with the geometry they share and the environment they reflect.
 * Each entry’s shader only loads once asked for, so a scene downloads the shaders of the knots it holds and no others. What a knot wears until then and how it takes its full material is up to the subclass.
 */
export default abstract class KnotMaterials<Entry extends KnotResourceEntry = KnotResourceEntry> {
  protected readonly entries: ReadonlyArray<Entry>
  protected readonly environment: Texture
  /** the full materials of the knots whose shaders have arrived, by entry index */
  readonly fullMaterials: Array<KnotMaterial | undefined>
  readonly resources: KnotResources
  private disposal?: Promise<void>
  private disposed = false
  /** the studio this instance made and disposes, absent when the caller passed an environment of its own */
  private readonly ownEnvironment?: StudioEnvironment
  private readonly states: Array<LoadState>

  /** `load` hands out each entry’s material class, `environment` replaces the knots’ own studio; the caller keeps owning it. */
  constructor(entries: ReadonlyArray<Entry>, private readonly load: KnotMaterialLoader, environment?: Texture) {
    this.entries = entries
    this.resources = new KnotResources(entries)
    this.ownEnvironment = environment ? undefined : new StudioEnvironment
    this.environment = environment ?? this.ownEnvironment!
    this.fullMaterials = Array.from<KnotMaterial | undefined>({length: entries.length})
    this.states = entries.map(() => 'idle')
  }

  dispose() {
    if (!this.disposal) {
      this.disposed = true
      this.disposal = this.release()
      this.disposal.catch(error => console.error('Knot material disposal failed:', error))
    }
  }

  async disposeAsync() {
    this.dispose()
    await this.disposal
  }

  /** whether the entry’s shader was asked for and is still downloading */
  protected isLoading(index: number) {
    return this.states[index] === 'loading'
  }

  protected async release() {
    this.resources.dispose()
    for (const material of this.fullMaterials) {
      material?.dispose()
    }
    this.ownEnvironment?.dispose()
  }

  /** Asks for the entry’s shader once; a class at hand builds right away, one still downloading once it arrives, unless this was disposed meanwhile. */
  protected request(index: number) {
    if (this.states[index] !== 'idle' || this.disposed) {
      return
    }
    this.states[index] = 'loading'
    const fail = (error: unknown) => {
      this.states[index] = 'failed'
      console.error('Knot material could not be loaded:', this.entries[index].id, error)
    }
    let loaded: ReturnType<KnotMaterialLoader>
    try {
      loaded = this.load(this.entries[index])
    } catch (error) {
      fail(error)
      return
    }
    if (!(loaded instanceof Promise)) {
      this.build(index, loaded, fail)
      return
    }
    loaded.then(Material => {
      if (!this.disposed) {
        this.build(index, Material, fail)
      }
    }).catch(fail)
  }

  /** Lets the knot take its full material, which is built and named after its entry by now. */
  protected abstract wear(index: number, material: KnotMaterial): void

  /** Creates the entry’s full material from its class and hands it to {@link wear}. */
  private build(index: number, Material: KnotMaterialConstructor, fail: (error: unknown) => void) {
    try {
      const material = new Material(this.environment)
      material.name = this.entries[index].id
      this.fullMaterials[index] = material
      this.states[index] = 'loaded'
      this.wear(index, material)
    } catch (error) {
      fail(error)
    }
  }
}
