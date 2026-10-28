export interface SupportBody { id: number; y: number; x?: number; minX?: number; maxX?: number }
export interface SupportContact { a: number; b: number; normalY: number }

/** Follow upward load-bearing contacts from the plate. An isolated or side-only contact cannot score. */
export function supportedBodies(plate: SupportBody, bodies: readonly SupportBody[], contacts: readonly SupportContact[]): Set<number> {
  const byId = new Map([plate, ...bodies].map(body => [body.id, body]));
  const heights = new Map([plate, ...bodies].map(body => [body.id, body.y]));
  const supports = new Map<number, number[]>();
  for (const contact of contacts) {
    if (Math.abs(contact.normalY) < 0.35) continue;
    const ay = heights.get(contact.a), by = heights.get(contact.b);
    if (ay === undefined || by === undefined || Math.abs(ay - by) < 4) continue;
    const [lower, upper] = ay > by ? [contact.a, contact.b] : [contact.b, contact.a];
    supports.set(upper, [...(supports.get(upper) ?? []), lower]);
  }
  const supported = new Set([plate.id]);
  // Lower bodies are resolved first. Multiple real, plate-connected contacts
  // can support a bridge even when neither lower body contains its center alone.
  for (const child of [...bodies].sort((a, b) => b.y - a.y)) {
    const bases = (supports.get(child.id) ?? []).filter(id => supported.has(id)).map(id => byId.get(id)!);
    if (!bases.length) continue;
    const knownBounds = bases.every(base => base.minX !== undefined && base.maxX !== undefined);
    if (child.x !== undefined && knownBounds) {
      const minX = Math.min(...bases.map(base => base.minX!));
      const maxX = Math.max(...bases.map(base => base.maxX!));
      if (child.x < minX - 3 || child.x > maxX + 3) continue;
    }
    supported.add(child.id);
  }
  return supported;
}

export function outsideWorld(x: number, y: number, plateY: number, margins: { left: number; right: number; bottom: number }): boolean {
  return x < margins.left || x > margins.right || y > plateY + margins.bottom;
}

export function cameraTarget(top: number, targetScreenY: number): number {
  return Math.min(0, top - targetScreenY);
}