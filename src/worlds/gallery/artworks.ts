import type {Artwork} from '#src/lib/gallery/types.ts'

import breadImage from '#root/assets/art/bread.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import catImage from '#root/assets/art/cat.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import dogImage from '#root/assets/art/dog.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import duckImage from '#root/assets/art/duck.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import frogImage from '#root/assets/art/frog.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import fruitImage from '#root/assets/art/fruit.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import ghostsImage from '#root/assets/art/ghosts.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import gleanersImage from '#root/assets/art/gleaners.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import gnomesImage from '#root/assets/art/gnomes.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import gooseImage from '#root/assets/art/goose.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import jatteImage from '#root/assets/art/jatte.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import lobsterImage from '#root/assets/art/lobster.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import orangeImage from '#root/assets/art/orange.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import pigeonImage from '#root/assets/art/pigeon.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import toastImage from '#root/assets/art/toast.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import treeImage from '#root/assets/art/tree.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import venusImage from '#root/assets/art/venus.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import waveImage from '#root/assets/art/wave.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import wolfImage from '#root/assets/art/wolf.jxl' with {distance: '3', format: 'jxl', maximumLong: '2048'}
import breadNarration from '#root/assets/audio/bread.opus'
import catNarration from '#root/assets/audio/cat.opus'
import dogNarration from '#root/assets/audio/dog.opus'
import duckNarration from '#root/assets/audio/duck.opus'
import frogNarration from '#root/assets/audio/frog.opus'
import fruitNarration from '#root/assets/audio/fruit.opus'
import ghostsNarration from '#root/assets/audio/ghosts.opus'
import gooseNarration from '#root/assets/audio/goose.opus'
import lobsterNarration from '#root/assets/audio/lobster.opus'
import orangeNarration from '#root/assets/audio/orange.opus'
import pigeonNarration from '#root/assets/audio/pigeon.opus'
import toastNarration from '#root/assets/audio/toast.opus'
import treeNarration from '#root/assets/audio/tree.opus'
import wolfNarration from '#root/assets/audio/wolf.opus'

const artworks: Array<Artwork> = [
  {
    id: 'goose',
    title: 'His Unbothered Majesty',
    creator: 'Cornelius van Honk',
    description: 'A ruler of impeccable breeding and absolutely no qualifications. His foreign policy consists primarily of hissing.',
    source: gooseImage,
    narration: gooseNarration,
    ratio: '1:1',
  },
  {
    id: 'orange',
    title: 'A Slightly Larger Tomorrow',
    creator: 'The Department of Lobbys',
    description: 'The village had asked for a little more sunshine. The universe, as usual, misunderstood the brief.',
    source: orangeImage,
    narration: orangeNarration,
    ratio: '1:1',
  },
  {
    id: 'dog',
    title: 'The Velvet Doge',
    creator: 'The Department of Good Dogs',
    description: 'A peaceful velvet pup with no appointments, no responsibilities and a deeply held belief that the entire sofa belongs to him.',
    source: dogImage,
    narration: dogNarration,
    ratio: '1:1',
  },
  {
    id: 'wolf',
    title: 'Much Neon. Very Cosmic.',
    creator: 'The Department of Good Dogs',
    description: 'A galactic predator of pure neon fury. His cosmic authority is absolute, provided nobody mentions the vacuum cleaner.',
    source: wolfImage,
    narration: wolfNarration,
    ratio: '1:1',
  },
  {
    id: 'tree',
    title: 'Rooted in Absolutely Nothing',
    creator: 'Sylvia Nimbus',
    description: 'A tree with excellent aspirations and a rather relaxed relationship with the ground. The gardener has requested a ladder.',
    source: treeImage,
    narration: treeNarration,
    ratio: '1:1',
  },
  {
    id: 'pigeon',
    title: 'Mona Coo Lisa',
    creator: 'Leonardo da Birb',
    description: 'Her enigmatic smile hides the fact she just stole your sandwich. A masterpiece of urban elegance and mild menace.',
    source: pigeonImage,
    narration: pigeonNarration,
    ratio: '1:1',
  },
  {
    id: 'toast',
    title: 'His Golden Crispness',
    creator: 'Imperial Court of Toast',
    description: 'The sovereign ruler of breakfast, anointed in salted butter and reigning over four slots of unyielding thermal perfection.',
    source: toastImage,
    narration: toastNarration,
    ratio: '1:1',
  },
  {
    id: 'cat',
    title: 'Cosmic Inconvenience',
    creator: 'Meow-ghelangelo',
    description: 'Proof that given infinite cosmic authority, a feline will still push entire clusters of stars off the counter simply to see them explode into supernovas.',
    source: catImage,
    narration: catNarration,
    ratio: '1:1',
  },
  {
    id: 'fruit',
    title: 'The Algorithm Dreams of Fruit',
    creator: 'Generative Orchard No. 6',
    description: 'Synthetic produce contemplates whether humans can distinguish hunger from engagement. The banana has already accepted cookies.',
    source: fruitImage,
    narration: fruitNarration,
    ratio: '3:2',
  },
  {
    id: 'ghosts',
    title: 'The Last Course Refuses to End',
    creator: 'Ectoplasmic Catering Collective',
    description: 'Dinner ran long. By approximately four centuries. No guest will admit who ordered the bottomless spectral linguine.',
    source: ghostsImage,
    narration: ghostsNarration,
    ratio: '3:2',
  },
  {
    id: 'duck',
    title: 'Apotheosis of the Rubber Duck',
    creator: 'Michelangelo di Slop',
    description: 'The sacred bath toy ascends to the celestial heavens, forever untethered from bathtubs, soapsuds, and mortality.',
    source: duckImage,
    narration: duckNarration,
    ratio: '1:1',
  },
  {
    id: 'bread',
    title: 'The Sourdough Soliloquy',
    creator: 'Jan van der Crumb',
    description: 'Born of wild yeast and existential dread, this loaf contemplated the fleeting cruelty of butter before meeting the serrated knife.',
    source: breadImage,
    narration: breadNarration,
    ratio: '1:1',
  },
  {
    id: 'frog',
    title: 'Mona Ribbit',
    creator: 'Leonardo da Pond',
    description: 'She smiles because she knows something you don’t – mostly where the flies are and why your pond is inferior.',
    source: frogImage,
    narration: frogNarration,
    ratio: '1:1',
  },
  {
    id: 'lobster',
    title: 'An Uninvited Tea Guest',
    creator: 'Salvador Deli',
    description: 'The tea is cold. The guest is shellfish. Nobody is having the afternoon they had imagined.',
    source: lobsterImage,
    narration: lobsterNarration,
    ratio: '1:1',
  },
  {
    id: 'wave',
    title: 'The Great Wave off Breakfast',
    creator: 'Katsushika Hokuspoon',
    description: 'Three fishermen of the flake guild brace themselves as the morning milk rises. The spoon in the distance watches, patient as a mountain.',
    source: waveImage,
    ratio: '3:2',
  },
  {
    id: 'venus',
    title: 'The Birth of Venus Flytrap',
    creator: 'Sandro Botanicelli',
    description: 'Born of sea foam and blown ashore by the winds, the goddess of carnivorous love arrives hungry. The attendant brought a cloak and, wisely, a snack.',
    source: venusImage,
    ratio: '3:2',
  },
  {
    id: 'gleaners',
    title: 'The Gleaners of Lot C',
    creator: 'Jean-François Millepied',
    description: 'Bent beneath the evening sun, the humble gather what the drive-through left behind. Nothing is wasted. Everything is salted.',
    source: gleanersImage,
    ratio: '3:2',
  },
  {
    id: 'gnomes',
    title: 'The Night Watering',
    creator: 'Rembrandt van Rake',
    description: 'The garden militia marches out at dusk to defend the begonias. Their captain has never once explained what they are guarding them from.',
    source: gnomesImage,
    ratio: '3:2',
  },
  {
    id: 'jatte',
    title: 'A Sunday Afternoon on the Island of La Grande Jatte, Mostly Ducks',
    creator: 'Georges Seurquack',
    description: 'Ten thousand patient dots record a perfect afternoon of promenades, parasols and crumbs. One bread roll is out for a walk. Nobody finds this unusual.',
    source: jatteImage,
    ratio: '3:2',
  },
]

export default artworks
