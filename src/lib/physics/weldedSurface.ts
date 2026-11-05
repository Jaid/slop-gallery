/**
 * How far a welded surface, whose triangles Rapier fixes the inner edges of so nothing catches on them, keeps what touches it off its triangles, in meters.
 * Rapier’s fix goes wrong with whatever sinks into such a surface: a ball rolling across it moves only a fraction of what its velocity says, the less the finer the triangles, down to a fifth across 6 cm ones, as though it rolled through mud.
 * Resting under gravity, a ball sinks about 7 mm into what it rests on at 60 steps a second, so a centimeter of skin keeps it off the triangles altogether, a few millimeters over the surface.
 */
export const weldedSurfaceSkin = 0.01
