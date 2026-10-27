import type Phaser from 'phaser';
import type { SupportContact } from './rules';

/** Compound parent hulls can cover empty space. Query convex parts, never the parent approximation. */
export function physicalContacts(matter: Phaser.Physics.Matter.MatterPhysics, bodies: MatterJS.BodyType[]): SupportContact[] {
  const contacts: SupportContact[] = [];
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i], b = bodies[j];
    if (a.bounds.max.x < b.bounds.min.x || b.bounds.max.x < a.bounds.min.x || a.bounds.max.y < b.bounds.min.y || b.bounds.max.y < a.bounds.min.y) continue;
    const partsA = a.parts.length > 1 ? a.parts.slice(1) : [a], partsB = b.parts.length > 1 ? b.parts.slice(1) : [b];
    let normalY = 0;
    for (const pa of partsA) for (const pb of partsB) {
      const contact: { normal: { y: number } } | null = matter.collision.collides(pa, pb, null);
      if (contact && Math.abs(contact.normal.y) > Math.abs(normalY)) normalY = contact.normal.y;
    }
    if (normalY) contacts.push({ a: a.id, b: b.id, normalY });
  }
  return contacts;
}