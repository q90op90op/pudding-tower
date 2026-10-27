export interface SupportBody { id: number; y: number; x?: number; minX?: number; maxX?: number }
export interface SupportContact { a: number; b: number; normalY: number }

/** Follow upward load-bearing contacts from the plate. An isolated or side-only contact cannot score. */
export function supportedBodies(plate: SupportBody, bodies: readonly SupportBody[], contacts: readonly SupportContact[]): Set<number> {
  const byId = new Map([plate, ...bodies].map(body => [body.id, body]));
  const heights = new Map([plate, ...bodies].map(body => [body.id, body.y]));
  const edges = new Map<number, number[]>();
  for (const contact of contacts) {
    if (Math.abs(contact.normalY) < 0.35) continue;
    const ay = heights.get(contact.a), by = heights.get(contact.b);
    if (ay === undefined || by === undefined || Math.abs(ay - by) < 4) continue;
    const [lower, upper] = ay > by ? [contact.a, contact.b] : [contact.b, contact.a];
    const base = byId.get(lower)!, child = byId.get(upper)!;
    // A center of mass beyond the support footprint is tipping, not a confirmed landing.
    if (child.x !== undefined && base.minX !== undefined && base.maxX !== undefined &&
      (child.x < base.minX - 3 || child.x > base.maxX + 3)) continue;
    edges.set(lower, [...(edges.get(lower) ?? []), upper]);
  }
  const supported = new Set([plate.id]);
  const queue = [plate.id];
  for (let i = 0; i < queue.length; i++) {
    for (const id of edges.get(queue[i]) ?? []) {
      if (!supported.has(id)) { supported.add(id); queue.push(id); }
    }
  }
  return supported;
}

export function outsideWorld(x: number, y: number, plateY: number, margins: { left: number; right: number; bottom: number }): boolean {
  return x < margins.left || x > margins.right || y > plateY + margins.bottom;
}

export function cameraTarget(top: number, targetScreenY: number): number {
  return Math.min(0, top - targetScreenY);
}