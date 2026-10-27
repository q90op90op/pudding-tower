import { definitionFor } from '../data/puddingDefinitions';
import type { ExpressionId, PuddingDefinition, PuddingIdentity, ShapeId, StyleId } from '../types';

export const ART_PAD = 28;
export const OUTLINE = '#a45d49';
const cache = new Map<string, HTMLCanvasElement>();
const bodyPaths: Record<ShapeId, string> = {
  classic: 'M-34 -23 C-31 -29 29 -29 34 -23 C37 -13 43 10 44 18 Q46 27 31 27 Q0 30 -32 27 Q-46 26 -44 17 Z',
  tall: 'M-19 -39 Q-16 -44 0 -43 Q17 -43 20 -39 L24 35 Q25 43 16 43 L-16 43 Q-25 43 -24 35 Z',
  flat: 'M-49 -14 Q-45 -19 0 -17 Q44 -19 49 -14 L62 10 Q66 17 48 17 Q0 20 -48 17 Q-66 16 -62 9 Z',
  tilted: 'M-17 -30 Q-12 -35 1 -30 L35 -22 Q40 -21 38 -12 L27 27 Q26 34 14 33 L-32 31 Q-44 29 -38 17 Z',
  double: 'M-28 -38 Q-23 -45 0 -42 Q25 -43 29 -37 L36 -6 Q37 -1 30 1 Q44 5 45 18 L47 31 Q49 41 33 42 Q0 46 -34 42 Q-49 40 -47 31 L-42 12 Q-41 3 -30 1 Q-39 -1 -36 -8 Z',
  mushroom: 'M-22 -37 Q0 -48 23 -37 Q42 -27 48 -12 Q54 0 40 0 L24 -1 L27 31 Q29 41 16 42 L-17 42 Q-29 40 -27 31 L-24 -1 L-40 0 Q-55 0 -48 -12 Q-40 -29 -22 -37 Z',
  longface: 'M-9 -48 Q0 -55 15 -47 Q20 -44 18 -32 Q17 -5 22 29 Q28 47 14 51 L-15 51 Q-29 49 -22 29 Q-15 12 -17 -9 Q-18 -34 -9 -48 Z',
  burst: 'M-30 -24 Q-10 -31 21 -26 Q35 -22 38 -9 Q39 -3 46 2 Q49 8 45 12 Q57 12 56 20 Q54 28 35 27 L17 26 Q7 19 4 26 Q-6 30 -36 28 Q-59 28 -55 18 Q-55 10 -48 5 Q-48 -14 -30 -24 Z',
  platform: 'M-49 -19 Q-43 -24 0 -22 Q43 -24 50 -19 L57 -3 Q60 3 52 4 Q66 3 69 10 Q75 21 58 22 L-57 22 Q-75 21 -70 11 Q-67 3 -53 4 Q-61 1 -57 -5 Z',
  oddball: 'M-19 -33 Q-6 -42 7 -34 Q12 -38 21 -31 Q31 -24 29 -18 Q42 -19 40 -6 Q37 1 43 9 Q49 18 39 22 Q44 34 25 36 Q13 43 5 34 Q-6 42 -18 36 Q-45 39 -42 24 Q-49 18 -40 10 Q-45 -4 -31 -7 Q-36 -20 -25 -22 Q-28 -29 -19 -33 Z',
};
const ctxFor = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext('2d'); if (!context) throw new Error('無法建立角色畫布'); return context;
};
function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string): void {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}
function line(c: CanvasRenderingContext2D, points: number[][], color = OUTLINE, width = 1.8): void {
  c.beginPath(); c.strokeStyle = color; c.lineWidth = width; points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
}
export function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#ffe7a0'): void {
  c.save(); c.translate(x, y); c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2; const radius = i % 2 ? r * 0.32 : r; const px = Math.cos(a) * radius, py = Math.sin(a) * radius; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.closePath(); c.fillStyle = color; c.fill(); c.restore();
}
function berry(c: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  c.save(); c.translate(x, y); c.scale(scale, scale); c.lineWidth = 1.7;
  c.beginPath(); c.moveTo(0, 13); c.bezierCurveTo(-21, 4, -14, -12, -4, -11); c.bezierCurveTo(10, -20, 20, 2, 0, 13); c.fillStyle = '#e89a9f'; c.fill(); c.strokeStyle = OUTLINE; c.stroke();
  ellipse(c, -3, -13, 3, 8, '#91ad75', OUTLINE); c.rotate(0.7); ellipse(c, 5, -12, 3, 7, '#a5bb79', OUTLINE); c.rotate(-0.7);
  for (const [px, py] of [[-7, -4], [3, -5], [-3, 3], [6, 2], [0, 8]]) ellipse(c, px, py, 0.9, 1.3, '#ffe8b7'); c.restore();
}
function paintBody(c: CanvasRenderingContext2D, d: PuddingDefinition, style: StyleId): void {
  const { width: w, height: h, shapeId } = d;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const path = new Path2D(bodyPaths[shapeId]);
  let fill: string | CanvasGradient = '#f8dbab';
  if (style === 'soft3d') { const g = c.createRadialGradient(-w * 0.2, -h * 0.16, 2, w * 0.13, h * 0.12, Math.max(w * 0.85, h * 0.85)); g.addColorStop(0, '#fff4d3'); g.addColorStop(0.42, '#ffe3a3'); g.addColorStop(0.8, '#e9b56e'); g.addColorStop(1, '#d19158'); fill = g; }
  c.fillStyle = fill; c.fill(path);
  c.save(); c.clip(path);
  c.fillStyle = style === 'weird' ? '#f5c783' : '#efbd83'; c.globalAlpha = style === 'soft3d' ? 0.32 : 0.35;
  c.beginPath(); c.ellipse(w * 0.21, h * 0.42, w * 0.62, h * 0.16, -0.08, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  const top = -h / 2 + 5;
  let syrup: string | CanvasGradient = '#bf7b54';
  if (style === 'soft3d') { const g = c.createLinearGradient(0, top - 4, 0, top + 22); g.addColorStop(0, '#ba6e45'); g.addColorStop(0.45, '#995330'); g.addColorStop(1, '#d39762'); syrup = g; }
  c.fillStyle = syrup; c.beginPath(); c.moveTo(-w, -h); c.lineTo(w, -h); c.lineTo(w, top + 4);
  c.bezierCurveTo(w * 0.3, top + 6, w * 0.32, top + 14, w * 0.2, top + 10);
  c.bezierCurveTo(w * 0.16, top + 7, w * 0.18, top + 24, w * 0.08, top + 21);
  c.bezierCurveTo(0, top + 21, w * 0.04, top + 8, -w * 0.09, top + 10);
  c.bezierCurveTo(-w * 0.18, top + 9, -w * 0.08, top + 19, -w * 0.24, top + 14);
  c.lineTo(-w, top + 8); c.closePath(); c.fill();
  c.globalAlpha = 0.55; ellipse(c, -w * 0.08, top - 2, w * 0.27, Math.min(4.5, h * 0.1), '#f5c69a'); c.globalAlpha = 1;
  // Warm hand-painted highlights and tiny custard flecks.
  ellipse(c, -w * 0.3, h * 0.09, Math.max(2, w * 0.025), h * 0.2, style === 'soft3d' ? '#fff7dc' : '#ffecc8');
  for (const [x, y, r] of [[0.31, 0.22, 1.8], [0.22, 0.32, 2.1], [-0.32, 0.34, 1.3]]) ellipse(c, x * w, y * h, r, r * 0.7, '#e9b77d');
  c.restore(); c.strokeStyle = style === 'soft3d' ? '#af714b' : OUTLINE; c.lineWidth = style === 'soft3d' ? 1.8 : 2.6; c.stroke(path);
  if (style === 'cute') { c.globalAlpha = 0.16; c.lineWidth = 0.7; c.translate(0.6, -0.4); c.stroke(path); c.translate(-0.6, 0.4); c.globalAlpha = 1; }
  if (shapeId === 'double' || shapeId === 'platform') {
    c.save(); c.clip(path); c.fillStyle = '#bb7854'; c.beginPath(); c.ellipse(0, shapeId === 'double' ? 0 : 2, w * 0.49, 4.5, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke(); c.restore();
    if (shapeId === 'double') { ellipse(c, -12, -20, 2, 2.7, OUTLINE); ellipse(c, 12, -20, 2, 2.7, OUTLINE); line(c, [[-2, -14], [2, -14]], OUTLINE, 1.4); }
  }
  if (shapeId === 'mushroom') {
    const cap = new Path2D('M-22 -37 Q0 -48 23 -37 Q42 -27 48 -12 Q54 0 40 0 Q0 -5 -40 0 Q-55 0 -48 -12 Q-40 -29 -22 -37 Z');
    c.fillStyle = '#c58c69'; c.fill(cap); c.strokeStyle = OUTLINE; c.lineWidth = 2.6; c.stroke(cap); c.save(); c.clip(cap);
    for (const [x, y, r] of [[-23, -23, 9], [9, -32, 8], [30, -12, 7], [-5, -9, 6]]) ellipse(c, x, y, r, r * 0.8, '#fbe0b3'); c.restore();
  }
  if (shapeId === 'burst') { const ooze = new Path2D('M7 14 Q17 7 18 17 Q30 13 30 22 Q49 19 50 26 Q36 33 22 27 Q8 32 7 23 Z'); c.fillStyle = '#ffebb1'; c.fill(ooze); c.lineWidth = 1.8; c.strokeStyle = '#ce9960'; c.stroke(ooze); }
  if (shapeId === 'oddball') { berry(c, 10, -h / 2 - 2, 0.55); ellipse(c, -w * 0.32, -4, 4, 5, '#fff6db', OUTLINE); ellipse(c, -w * 0.32, -4, 1.7, 2.5, OUTLINE); }
  if (style === 'cute' && (shapeId === 'classic' || shapeId === 'flat')) berry(c, w * 0.18, -h / 2 - 3, 0.58);
  if (style === 'weird') {
    // A deliberately silly little shark hat, kept separate from the collision silhouette.
    c.save(); c.translate(5, -h / 2 - 2); c.rotate(0.12); const hat = new Path2D('M-23 1 Q-26 -7 -8 -14 L-2 -23 L5 -15 Q20 -15 24 -2 Q8 5 -23 1 Z'); c.fillStyle = '#a9bdcd'; c.fill(hat); c.strokeStyle = OUTLINE; c.lineWidth = 2; c.stroke(hat); ellipse(c, 11, -8, 1.7, 1.7, OUTLINE); line(c, [[15, -2], [19, 0], [21, -2]], '#fff7e9', 2); c.restore();
    line(c, [[-w * 0.47, 3], [-w * 0.6, 9], [-w * 0.56, 0]], OUTLINE, 2);
  }
  if (style === 'soft3d') { c.globalAlpha = 0.65; ellipse(c, -w * 0.17, -h * 0.27, w * 0.13, 2, '#fff7e8'); c.globalAlpha = 1; }
  c.restore();
}
function paintFace(c: CanvasRenderingContext2D, style: StyleId, expression: ExpressionId): void {
  c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 1.5;
  const weird = style === 'weird', gap = weird ? 12 : 10;
  for (const side of [-1, 1]) {
    const x = side * gap, y = weird && side === 1 ? -2 : 0;
    if (expression === 'dizzy') {
      c.beginPath(); for (let i = 0; i < 35; i++) { const a = i * 0.38, r = i / 9; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.strokeStyle = OUTLINE; c.stroke();
    } else {
      const r = expression === 'surprised' ? 4.8 : weird ? 4.4 : 3.6;
      ellipse(c, x, y, r, expression === 'nervous' ? 4.3 : r * 0.9, '#fff7e5', OUTLINE);
      ellipse(c, x + (weird && side === 1 ? 1.2 : 0), y + 0.2, r * 0.44, r * 0.48, OUTLINE);
    }
    ellipse(c, x + side * 4.5, y + 6.5, 3.8, 1.5, '#eaa3a1');
    if (expression === 'angry') line(c, [[x - side * 4, -6], [x + side * 3, -3]], OUTLINE, 2);
    if (expression === 'crying') { line(c, [[x, 4], [x + side * 2, 9], [x + side, 13]], '#9cb9dc', 3); ellipse(c, x + side, 13, 2, 2.2, '#a9c4e6'); }
  }
  if (expression === 'surprised') ellipse(c, 0, 8, 2.7, 3.3, '#c77f6b', OUTLINE);
  else if (expression === 'nervous' || expression === 'crying' || expression === 'angry') { c.beginPath(); c.moveTo(-3, 9); c.quadraticCurveTo(0, 5, 3, 9); c.strokeStyle = OUTLINE; c.lineWidth = 1.7; c.stroke(); }
  else if (weird) { c.beginPath(); c.moveTo(-4, 7); c.quadraticCurveTo(0, 15, 4, 7); c.strokeStyle = OUTLINE; c.fillStyle = '#e59ba3'; c.fill(); c.stroke(); }
  else line(c, [[-2.3, 7.5], [2.3, 7.5]], OUTLINE, 1.7);
  if (expression === 'nervous') { c.fillStyle = '#aecddd'; c.beginPath(); c.moveTo(18, -7); c.bezierCurveTo(12, 0, 24, 2, 18, -7); c.fill(); }
  if (expression === 'surprised') line(c, [[18, -8], [20, -13]], '#bc7663', 2);
}
function makeCanvas(width: number, height: number, style: StyleId, painter: (context: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const resolution = style === 'pixel' ? 0.4 : 3;
  const source = document.createElement('canvas'); source.width = Math.ceil(width * resolution); source.height = Math.ceil(height * resolution);
  const c = ctxFor(source); c.scale(source.width / width, source.height / height); c.translate(width / 2, height / 2); painter(c);
  if (style !== 'pixel') return source;
  const out = document.createElement('canvas'); out.width = Math.ceil(width * 3); out.height = Math.ceil(height * 3); const o = ctxFor(out); o.imageSmoothingEnabled = false; o.drawImage(source, 0, 0, out.width, out.height); return out;
}
export function bodyCanvas(d: PuddingDefinition, style: StyleId): HTMLCanvasElement {
  const key = `body-${d.shapeId}-${style}`;
  if (!cache.has(key)) cache.set(key, makeCanvas(d.width + ART_PAD * 2, d.height + ART_PAD * 2, style, c => paintBody(c, d, style)));
  return cache.get(key)!;
}
export function faceCanvas(style: StyleId, expression: ExpressionId): HTMLCanvasElement {
  const key = `face-${style}-${expression}`;
  if (!cache.has(key)) cache.set(key, makeCanvas(48, 36, style, c => paintFace(c, style, expression)));
  return cache.get(key)!;
}
export function drawCharacter(c: CanvasRenderingContext2D, identity: Pick<PuddingIdentity, 'shapeId' | 'styleId' | 'expressionId'>): void {
  const d = definitionFor(identity.shapeId); c.save(); c.imageSmoothingEnabled = identity.styleId !== 'pixel';
  c.drawImage(bodyCanvas(d, identity.styleId), -(d.width / 2 + ART_PAD), -(d.height / 2 + ART_PAD), d.width + ART_PAD * 2, d.height + ART_PAD * 2);
  c.drawImage(faceCanvas(identity.styleId, identity.expressionId), d.face.x - 24 * d.face.scale, d.face.y - 18 * d.face.scale, 48 * d.face.scale, 36 * d.face.scale); c.restore();
}
export function characterCanvas(identity: Pick<PuddingIdentity, 'shapeId' | 'styleId' | 'expressionId'>): HTMLCanvasElement {
  const d = definitionFor(identity.shapeId); return makeCanvas(d.width + ART_PAD * 2, d.height + ART_PAD * 2, identity.styleId === 'pixel' ? 'cute' : identity.styleId, c => drawCharacter(c, identity));
}