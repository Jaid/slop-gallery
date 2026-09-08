import {Euler, Quaternion, Vector2} from 'three/webgpu'

const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))

class InspectionSpring {
  value = 0
  velocity = 0

  update(error: number, force: number, delta: number) {
    const tension = 40 * error * error
    const frequency = 16 + tension
    // Include the tension gradient in damping. Merely increasing spring stiffness
    // can fling the view past the target when that stiffness falls on the way back.
    const damping = 16 + 2 * tension
    const equilibrium = force / (frequency * frequency)
    const displacement = error - equilibrium
    const root = Math.sqrt(damping * damping - frequency * frequency)
    if (root < 0.0001) {
      const decay = Math.exp(-frequency * delta)
      const slope = this.velocity + frequency * displacement
      this.value = equilibrium + (displacement + slope * delta) * decay
      this.velocity = (this.velocity - frequency * slope * delta) * decay
    } else {
      const fast = damping + root
      const slow = frequency * frequency / fast
      const a = (this.velocity + fast * displacement) / (fast - slow)
      const b = displacement - a
      const slowDecay = Math.exp(-slow * delta)
      const fastDecay = Math.exp(-fast * delta)
      this.value = equilibrium + a * slowDecay + b * fastDecay
      this.velocity = -slow * a * slowDecay - fast * b * fastDecay
    }
    return this.value
  }
}

export class InspectionLook {
  readonly rotation: Quaternion
  private readonly angles = new Euler(0, 0, 0, 'YXZ')
  private readonly targetAngles = new Euler(0, 0, 0, 'YXZ')
  private readonly pitch = new InspectionSpring
  private readonly yaw = new InspectionSpring
  private readonly pending = new Vector2

  constructor(rotation: Quaternion) {
    this.rotation = rotation.clone()
    this.angles.setFromQuaternion(rotation)
  }

  addInput(yaw: number, pitch: number) {
    if (Number.isFinite(yaw) && Number.isFinite(pitch)) {
      this.pending.x += pitch
      this.pending.y += yaw
    }
  }

  update(target: Quaternion, delta: number, motion = true) {
    if (!motion) {
      this.pending.set(0, 0)
      this.pitch.velocity = 0
      this.yaw.velocity = 0
      this.angles.setFromQuaternion(target)
      return this.rotation.copy(target)
    }
    if (!Number.isFinite(delta) || delta <= 0) {
      return this.rotation
    }
    const dt = Math.min(delta, 0.06)
    // Treat the accumulated mouse displacement as a force, not a camera rotation.
    // Bound extreme input rates so a fast swipe cannot build up a hidden full turn.
    this.pending.multiplyScalar(1 / delta).clampLength(0, 6).multiplyScalar(16)
    this.targetAngles.setFromQuaternion(target)
    const steps = Math.max(1, Math.ceil(dt * 240))
    const step = dt / steps
    for (let i = 0; i < steps; i++) {
      const pitchError = this.angles.x - this.targetAngles.x
      const yawError = wrapAngle(this.angles.y - this.targetAngles.y)
      this.angles.x = this.targetAngles.x + this.pitch.update(pitchError, this.pending.x, step)
      this.angles.y = wrapAngle(this.targetAngles.y + this.yaw.update(yawError, this.pending.y, step))
      const pitch = Math.max(-Math.PI / 2 + 0.0001, Math.min(Math.PI / 2 - 0.0001, this.angles.x))
      if (pitch !== this.angles.x) {
        this.angles.x = pitch
        this.pitch.velocity = 0
      }
    }
    this.pending.set(0, 0)
    this.angles.z = 0
    return this.rotation.setFromEuler(this.angles)
  }
}
