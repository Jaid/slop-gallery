import type {Node, Texture} from 'three/webgpu'

import {bitangentView, color, float, Fn, mix, mx_noise_float, tangentView, time, uv, vec2, vec3, wgslFn} from 'three/tsl'

import {tubeRay} from '../../lib/atelier.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {starfield} from '../../lib/starfield.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import {wrapCell} from '../../lib/wrapCell.ts'
import data from './data.ts'

/** Hand-drawn stellar anatomy. Coordinates are local to a periodic, unit-square sky cell. */
const catStars = [
  [0, -0.11], // 0: nose tip
  [0, -0.315], // 1: chin
  [-0.185, -0.245],
  [-0.29, -0.095],
  [-0.285, 0.13], // 2–4: left cheek
  [-0.305, 0.385],
  [-0.12, 0.235],
  [0, 0.205], // 5–7: ears and crown
  [0.12, 0.235],
  [0.305, 0.385],
  [0.285, 0.13], // 8–10
  [0.29, -0.095],
  [0.185, -0.245], // 11–12: right cheek
  [-0.07, -0.175],
  [0.07, -0.175], // 13–14: muzzle
  [-0.23, 0.035],
  [-0.155, 0.075],
  [-0.065, 0.018],
  [-0.145, -0.02], // 15–18: left eye
  [0.065, 0.018],
  [0.155, 0.075],
  [0.23, 0.035],
  [0.145, -0.02], // 19–22: right eye
  [-0.17, 0.16],
  [0.17, 0.16],
  [0, 0.11], // 23–25: brow diamond
  [-0.15, -0.11],
  [0.15, -0.11], // 26–27: whisker roots
  [-0.445, -0.015],
  [-0.465, -0.125],
  [-0.415, -0.25], // 28–30
  [0.445, -0.015],
  [0.465, -0.125],
  [0.415, -0.25], // 31–33
  [-0.25, 0.25],
  [0.25, 0.25], // 34–35: inner ear jewels
  [-0.028, -0.075],
  [0.028, -0.075], // 36–37: nose leather
] as const satisfies ReadonlyArray<readonly [number, number]>
const catLinks = [
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [12, 1],
  [5, 34],
  [34, 6],
  [9, 35],
  [35, 8],
  [6, 23],
  [23, 25],
  [25, 24],
  [24, 8],
  [7, 25],
  [15, 16],
  [16, 17],
  [17, 18],
  [18, 15],
  [16, 23],
  [21, 20],
  [20, 19],
  [19, 22],
  [22, 21],
  [20, 24],
  [17, 0],
  [19, 0],
  [0, 13],
  [0, 14],
  [3, 26],
  [26, 13],
  [11, 27],
  [27, 14],
  [26, 28],
  [26, 29],
  [26, 30],
  [27, 31],
  [27, 32],
  [27, 33],
  [36, 37],
  [37, 0],
  [0, 36],
] as const satisfies ReadonlyArray<readonly [number, number]>
const scalar = (value: number) => (Number.isInteger(value) ? `${value}.0` : String(value))
const vertices = catStars.map(([x, y], i) => `vec4f(${scalar(x)}, ${scalar(y)}, ${scalar(Math.sin(i * 7.1))}, ${scalar(Math.cos(i * 4.7))})`).join(',\n')
const edges = catLinks.map(([a, b]) => `vec2u(${a}u, ${b}u)`).join(',\n')
/** A compact GPU graph, not a texture: shared moving endpoints keep every connection attached. */
const stellarGraph = wgslFn(`
fn stellarGraph(point: vec2f, footprint: f32, clock: f32, identity: f32, gaze: vec2f, intimacy: f32, angleLight: f32, visibility: f32) -> vec3f {
  // Coherent empty-space rejection; all derivatives are supplied by the caller before this branch.
  if (visibility <= 0.0 || dot(point, point) > 0.36) { return vec3f(0.0); }
  let anatomy = array<vec4f, ${catStars.length}>(
    ${vertices}
  );
  let links = array<vec2u, ${catLinks.length}>(
    ${edges}
  );
  var stars: array<vec2f, ${catStars.length}>;
  let phase = identity * 6.2831853;
  let breath = sin(clock * 1.35 + phase);
  let blinkCycle = fract(clock / 6.8 + identity * 0.79);
  let blink = 1.0 - 0.94 * exp(-pow(abs((blinkCycle - 0.83) / 0.022), 2.0));
  let earFlick = pow(max(sin(clock * 0.83 + phase), 0.0), 18.0);
  let wake = 0.5 + 0.5 * sin(clock * 0.64 + phase);
  let dream = pow(max(sin(clock * 0.57 + phase), 0.0), 16.0);
  // Hoist trigonometry out of the landmark loop; per-star motion coefficients are baked in anatomy.zw.
  let drift = vec2f(sin(clock * 0.7 + phase), cos(clock * 0.9 + phase));
  let whiskerWave = vec2f(sin(clock * 2.0 + phase), cos(clock * 2.0 + phase));
  let dreamWave = vec2f(sin(phase), cos(phase));
  let whiskerReach = 0.96 + 0.035 * sin(clock * 0.9 + phase);
  var nearest = 10.0;
  var closest = vec2f(0.0);
  var starId = 0.0;
  for (var i = 0u; i < ${catStars.length}u; i++) {
    var a = anatomy[i].xy;
    let motion = anatomy[i].zw;
    a *= vec2f(1.0 + breath * 0.018, 1.0 + breath * 0.025);
    if (i >= 15u && i <= 22u) {
      a.y = 0.028 + (a.y - 0.028) * blink;
    }
    if (a.y > 0.24) {
      a.x += sign(a.x) * earFlick * (a.y - 0.24) * 0.24;
    }
    if (i >= 28u && i <= 33u) {
      a.y += dot(whiskerWave, motion) * 0.0085;
      a.x *= whiskerReach;
    }
    // The starlight never quite settles, even when the animal is asleep.
    a += drift * motion * 0.0025;
    // A short dream loosens the stellar anatomy, then the same connected stars find their places again.
    let swirl = dream * 0.113 * dot(dreamWave, motion);
    a += vec2f(-a.y, a.x) * swirl + motion * dream * 0.028;
    // A circular support bound survives every head tilt and leaves room for glow before a tile seam.
    a *= min(1.0, 0.485 / max(length(a), 0.000001));
    stars[i] = a;
    let delta = point - a;
    let d = dot(delta, delta);
    if (d < nearest) {
      nearest = d;
      closest = delta;
      starId = f32(i);
    }
  }
  var lineDistance = 10.0;
  var along = 0.0;
  var edgeId = 0.0;
  var edgeRole = vec3f(0.0);
  for (var i = 0u; i < ${catLinks.length}u; i++) {
    let a = stars[links[i].x];
    let b = stars[links[i].y];
    let ab = b - a;
    let h = clamp(dot(point - a, ab) / max(dot(ab, ab), 0.000001), 0.0, 1.0);
    let delta = point - a - ab * h;
    let d = dot(delta, delta);
    if (d < lineDistance) {
      lineDistance = d;
      along = h;
      edgeId = f32(i);
      edgeRole = vec3f(select(0.0, 1.0, i < 12u), select(0.0, 1.0, links[i].y >= 28u && links[i].y <= 33u), select(0.0, 1.0, links[i].x >= 15u && links[i].x <= 22u && links[i].y >= 15u && links[i].y <= 22u));
    }
  }
  let aa = max(footprint * 0.6, 0.0002);
  let distance = sqrt(nearest);
  let line = sqrt(lineDistance);
  let flicker = 0.72 + 0.28 * sin(clock * (1.8 + fract(starId * 0.618)) + starId * 2.399 + phase);
  let tide = exp(-pow(abs((point.y - 0.43 + fract(clock * 0.16 + identity) * 0.86) / 0.11), 2.0));
  let eyeStar = step(14.5, starId) * (1.0 - step(22.5, starId));
  let radius = (0.009 + 0.005 * fract(starId * 0.754877 + identity)) * (1.0 - eyeStar * 0.42);
  let core = (1.0 - smoothstep(max(radius - aa, 0.0), radius + aa, distance)) * min(1.0, radius * radius / (aa * aa));
  let halo = exp(-nearest / 0.00048) * (0.6 + tide);
  let lineWidth = 0.0011;
  let thread = (1.0 - smoothstep(lineWidth, lineWidth + aa, line)) * min(1.0, 2.0 * lineWidth / aa);
  let lineHalo = exp(-lineDistance / 0.00010);
  let travel = fract(clock * (0.45 + 0.12 * sin(edgeId)) + edgeId * 0.3819 + identity);
  let packet = exp(-pow(abs((along - travel) / 0.085), 2.0));
  let spectral = 0.5 + 0.5 * sin(phase + angleLight * 2.4 + point.y * 3.0);
  let ice = mix(vec3f(0.10, 0.64, 0.92), vec3f(0.38, 0.95, 0.73), spectral);
  let honey = vec3f(1.0, 0.49, 0.13);
  let isEyeStar = step(14.5, starId) * (1.0 - step(22.5, starId));
  let starColor = mix(ice, honey, max(isEyeStar, smoothstep(0.55, 0.95, fract(starId * 0.618 + identity))));
  let contour = edgeRole.x;
  let whisker = edgeRole.y;
  let eyeLink = edgeRole.z;
  let threadColor = mix(ice, honey, eyeLink * 0.72);
  var light = threadColor * (thread * (0.09 + contour * 0.27 + whisker * 0.10 + tide * 0.25 + packet * 0.6) + lineHalo * 0.014) * (1.0 - dream * 0.45);
  light += starColor * halo * 0.42 * (1.0 - eyeStar * 0.8);
  light += mix(starColor, vec3f(1.0, 0.94, 0.82), 0.56) * core * (1.0 - eyeStar * 0.6) * (4.2 + tide * 4.0 + dream * 2.0) * flicker;
  // Restrained four-point diffraction spikes on only the brightest stellar joints.
  let spike = exp(-abs(closest.x) / 0.0017 - abs(closest.y) / 0.024) + exp(-abs(closest.y) / 0.0017 - abs(closest.x) / 0.024);
  light += starColor * spike * (1.0 - eyeStar) * pow(flicker, 8.0) * intimacy * min(1.0, 0.003 / aa) * 0.7;

  // Golden lenticular eyes, living pupils and tiny eye-shine points, all below the same glass.
  for (var side = -1.0; side <= 1.0; side += 2.0) {
    let eyeCenter = vec2f(side * 0.146, 0.029);
    let eye = point - eyeCenter;
    let eyeHeight = 0.038 * blink;
    let lens = abs(eye.y) / max(eyeHeight, 0.002) + pow(abs(eye.x / 0.084), 2.0);
    let irisMask = 1.0 - smoothstep(0.65, 1.12 + aa * 10.0, lens);
    let pupilPoint = eye - gaze * vec2f(0.022, 0.01) * intimacy;
    let pupil = 1.0 - smoothstep(0.004, 0.009 + aa, abs(pupilPoint.x));
    let iris = exp(-pow(abs(pupilPoint.x / 0.032), 2.0));
    light += honey * irisMask * (0.06 + iris * 0.85) * (1.0 - pupil * 0.92) * blink * (1.0 - dream * 0.8);
    let glint = length(pupilPoint - vec2f(-0.008, 0.007 * blink));
    light += vec3f(0.76, 1.0, 0.87) * (1.0 - smoothstep(0.003, 0.006 + aa, glint)) * blink * (1.0 - dream * 0.8) * 2.2;
  }
  // A wandering stellar companion leaves a broken, very faint orbital arc.
  let orbitPoint = (point - vec2f(0.0, 0.015)) * vec2f(1.0, 1.15);
  let orbitRadius = length(orbitPoint);
  let theta = atan2(orbitPoint.y, orbitPoint.x);
  let orbitPhase = theta - clock * 0.22 - phase;
  let arc = exp(-pow(abs((orbitRadius - 0.444) / (0.001 + aa)), 2.0));
  let broken = smoothstep(0.4, 0.8, sin(theta * 19.0 + phase)) * pow(0.5 + 0.5 * cos(orbitPhase), 8.0);
  light += honey * arc * broken * 0.055 * min(1.0, 0.003 / aa) * intimacy;
  let satellite = vec2f(cos(clock * 0.22 + phase), sin(clock * 0.22 + phase)) * 0.444;
  let companionDistance = length(orbitPoint - satellite);
  light += honey * exp(-pow(companionDistance / 0.013, 2.0)) * (0.6 + wake);
  return light * visibility;
}
`)

/** Living star maps at three optical depths inside a polished, midnight labradorite. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.18)
    this.name = data.id
    const {p, view, facing, grazing, intimate, objectDistance} = viewerFrame()
    const ray = tubeRay()
    const proximity = objectDistance.smoothstep(1.4, 5.8).oneMinus()
    const phase = p.dot(vec3(2.8, -1.7, 3.2)).add(grazing.mul(3.6))
    const opal = mix(color('#020811'), color('#0e0516'), phase.sin().mul(0.5).add(0.5))
    this.colorNode = opal
    this.metalness = 0.72
    this.roughness = 0.27
    this.specularIntensity = 0.18
    this.clearcoat = 0.055
    this.clearcoatRoughness = 0.24
    this.ior = 1.47
    this.iridescence = 0.15
    this.iridescenceIOR = 1.32
    this.iridescenceThicknessNode = phase.sin().mul(80).add(360)
    const emissive = Fn(() => {
      // Shift the unwrapped sky before identifying cells: stars travel continuously through both UV seams.
      const sky = uv().sub(ray.mul(0.014)).mul(vec2(12, 3)).toVar()
      const q = vec2(sky.x.add(sky.y.floor().mod(3).mul(1 / 3)), sky.y).toVar()
      const random = cellNoiseVec3(vec3(wrapCell(q.floor(), vec2(12, 3)), 19.7)).toVar()
      const local = q.fract().sub(0.5).toVar()
      const tilt = random.y.sub(0.5).mul(0.3).add(time.mul(0.37).add(random.x.mul(6.28)).sin().mul(0.028))
      const c = tilt.cos()
      const s = tilt.sin()
      // These are watchful creatures, not decals: the stellar heads turn upright toward the viewer.
      const projected = tangentView.normalize().xy.mul(local.x).mul(1.62).add(vec3(bitangentView as unknown as Node<'vec3'>).normalize().xy.mul(local.y)).toVar()
      const point = vec2(projected.x.mul(c).sub(projected.y.mul(s)), projected.x.mul(s).add(projected.y.mul(c))).div(random.z.mul(0.04).add(0.72)).toVar()
      // Do not differentiate fract(), floor() or random identities at a cell boundary.
      const footprint = sky.fwidth().length().mul(1.62 / 0.72).max(0.0001).toVar()
      const gaze = ray.mul(vec2(8, 1.2)).clamp(-1, 1)
      const cellWindow = local.abs().x.max(local.abs().y).smoothstep(0.475, 0.499).oneMinus()
      const visibility = cellWindow.mul(facing.smoothstep(0.35, 0.7))
      const cats = (stellarGraph({
        point,
        footprint,
        clock: time,
        identity: random.x,
        gaze,
        intimacy: proximity,
        angleLight: grazing,
        visibility,
      }) as Node<'vec3'>).toVar()
      // Smooth, deep auroral folds, not a second competing diagram. Object-space noise is seam-free.
      const deep = p.sub(view.mul(0.095)).toVar()
      const drift = vec3(time.mul(0.024), time.mul(-0.015), 0)
      const cloud = mx_noise_float(deep.mul(4.8).add(drift)).toVar()
      const folds = mx_noise_float(deep.mul(12).add(vec3(cloud.mul(2.8), 0, time.mul(0.018)))).toVar()
      const veil = folds.abs().smoothstep(0.04, 0.34).oneMinus().mul(cloud.smoothstep(-0.55, 0.5))
      const auroraTint = mix(color('#193bd1'), color('#008d8a'), cloud.mul(1.6).add(grazing).clamp())
      const nebula = auroraTint.mul(veil).mul(0.045).add(color('#71216e').mul(cloud.smoothstep(0.05, 0.7)).mul(0.045))
      const deepStars = starfield(p.sub(view.mul(0.065)), 105, 0.83).mul(0.38)
      const foregroundStars = starfield(p.sub(view.mul(0.004)), 190, 0.94).mul(intimate).mul(0.3)
      const rim = mix(color('#13437c'), color('#297b73'), phase.cos().mul(0.5).add(0.5)).mul(grazing.pow(3)).mul(0.23)
      return cats.add(nebula).add(deepStars).add(foregroundStars).add(rim).mul(float(0.95))
    })()
    this.emissiveNode = emissive.mul(proximity.mul(0.001).add(0.999))
  }
}
