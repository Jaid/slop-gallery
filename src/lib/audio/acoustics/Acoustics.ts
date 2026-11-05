/**
 * How a room transforms every sound of the world heard in it, like its walls ringing on: wires `input` to `output` through nodes of its own, the dry sound included, returning how to disconnect them again.
 * It is built anew for every stay in the room, so it may keep state, but `input` belongs to the caller.
 */
export type RoomAcoustics = (context: BaseAudioContext, input: AudioNode, output: AudioNode) => () => void

/** one room’s acoustics as the listener entered it, fed through a send of its own */
type Stay = {
  release: () => void
  send: GainNode
  /** the timer that releases the stay once the listener has left and its last echo has died */
  timer?: ReturnType<typeof setTimeout>
}

/** the time constant in seconds of the crossfade between two rooms’ acoustics, which is through after about 0.4 s */
const crossfade = 0.12
/** how long a room’s acoustics stay built after the listener left it, in seconds: long enough for any echo to die and for stepping back through the doorway to find them still there */
const linger = 8
/** No transformation at all: the sound passes dry. */
const dry: RoomAcoustics = (_context, input, output) => {
  input.connect(output)
  return () => input.disconnect()
}

/**
 * Hears the world through the acoustics of the room the listener is in, crossfading as they walk from room to room: what was sounding in the room they left keeps ringing out there, while everything new rings in the room they entered.
 * Before the listener entered any room, and in rooms without acoustics of their own, the world sounds dry.
 */
export default class Acoustics {
  /** the room the listener is in, or undefined before they entered any */
  private room?: string
  private readonly stays = new Map<string | undefined, Stay>

  constructor(private readonly context: BaseAudioContext, private readonly input: AudioNode, private readonly output: AudioNode) {
    this.stays.set(undefined, this.stay(dry, 1))
  }

  /** Hears the world in `room`, through `acoustics` if it has any, fading over from the room the listener was in; nothing happens while they stay in the same room. */
  enter(room: string, acoustics: RoomAcoustics | undefined) {
    if (room === this.room) {
      return
    }
    const now = this.context.currentTime
    const left = this.stays.get(this.room)
    if (left) {
      left.send.gain.cancelAndHoldAtTime(now)
      left.send.gain.setTargetAtTime(0, now, crossfade)
      left.timer = setTimeout(() => this.release(left), linger * 1000)
    }
    this.room = room
    let stay = this.stays.get(room)
    if (stay) {
      clearTimeout(stay.timer)
      stay.timer = undefined
    } else {
      stay = this.stay(acoustics ?? dry, 0)
      this.stays.set(room, stay)
    }
    stay.send.gain.cancelAndHoldAtTime(now)
    stay.send.gain.setTargetAtTime(1, now, crossfade)
  }

  private release(stay: Stay) {
    for (const [room, candidate] of this.stays) {
      if (candidate === stay) {
        this.stays.delete(room)
      }
    }
    stay.release()
    this.input.disconnect(stay.send)
    stay.send.disconnect()
  }

  private stay(acoustics: RoomAcoustics, gain: number): Stay {
    const send = this.context.createGain()
    send.gain.value = gain
    this.input.connect(send)
    return {
      send,
      release: acoustics(this.context, send, this.output),
    }
  }
}
