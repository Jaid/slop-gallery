import {enterGallery} from '#src/lib/gallery.ts'

import Icon from './Icon.tsx'

export default function Help() {
  return <>
    <p className="panel-intro">A museum where the curator is you, and the insurance policy is imaginary. A mouse and keyboard are recommended for the full tour.</p>
    <div className="help-list">{[
      ['01', 'Take a wander', 'Step inside to capture the cursor. WASD or arrows move, Shift sprints, Space jumps and C crouches. Esc gives your cursor back. Tab opens the floor plan; G opens the collection.'],
      ['02', 'Please touch the art', 'Hold the left mouse button on a frame. Aim at an empty wall: green means the frame and sign fit, red means it is blocked. A faint preview is out of reach; move closer. Release to hang. Invalid placement or Esc leaves the original untouched. E toggles grabbing without holding a mouse button.'],
      ['03', 'Bring your own strange', 'Drop or paste an image, or use Add artwork. Dragging over a wall previews its place. Images that do not fit land in front of you. Ground frames can always be picked up again.'],
      ['04', 'An artistic collision', 'While holding a frame, right-click or press Q to throw. Hitting a hanging artwork fuses the pair. Offline, this makes a gold-joined collage. With AI connected, the image model reimagines them. Failed fusions preserve both originals.'],
      ['05', 'Listen. Look. Linger.', 'Right-click or press R to hear a story. Hold V to square up to an artwork. Narration waits for unfinished labels. M toggles all sound.'],
      ['06', 'Second thoughts welcome', 'Ctrl+Z undoes curation, Ctrl+Shift+Z or Ctrl+Y redoes it. Collection lets you inspect, edit, download or remove works. Changes save locally; Settings can export a portable backup.'],
      ['07', 'Read between the rooms', 'The arches lead to the side salons. The Amber Room is through the rear arch in the Cabinet of Curiosities. Sculptures can be picked up and thrown. So can individual plant leaves: hold LMB or press E to pluck one, then right-click or press Q to throw. Esc cancels a pluck. Remove every leaf from a plant to pick up and throw its pot, remaining stems and all. The Good Taste Department is through the rear doorway. The book on its pedestal can be picked up and thrown, too.'],
    ].map(([number, title, description]) => <div key={number}><span>{number}</span><section><h3>{title}</h3><p>{description}</p></section></div>)}</div>
    <button className="primary-button" onClick={enterGallery}>I’m ready to curate <Icon name="arrow"/></button>
  </>
}
