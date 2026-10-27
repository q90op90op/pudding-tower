import { PUDDINGS, STYLES, EXPRESSIONS } from './game/data/puddingDefinitions';
import { bodyCanvas, faceCanvas, characterCanvas, drawCharacter } from './game/art/puddingArt';
import { logoCanvas, backgroundCanvas, plateCanvas } from './game/art/uiArt';

const exports: { path: string; data: string }[] = [];
const add = (path: string, canvas: HTMLCanvasElement) => exports.push({ path, data: canvas.toDataURL('image/png').split(',')[1] });
for (const d of PUDDINGS) for (const style of STYLES) {
  add(`public/assets/puddings/${d.shapeId}/${style}-body.png`, bodyCanvas(d, style));
  add(`public/assets/puddings/${d.shapeId}/${style}.png`, characterCanvas({ shapeId: d.shapeId, styleId: style, expressionId: 'blank' }));
}
for (const style of STYLES) for (const expression of EXPRESSIONS) add(`public/assets/faces/${style}/${expression}.png`, faceCanvas(style, expression));
add('public/assets/ui/logo.png', logoCanvas()); add('public/assets/ui/background.png', backgroundCanvas()); add('public/assets/ui/plate.png', plateCanvas());
const sheet = document.createElement('canvas'); sheet.width = 1200; sheet.height = 1780;
const c = sheet.getContext('2d')!; c.fillStyle = '#e8d9ec'; c.fillRect(0, 0, 1200, 1780); c.textAlign = 'center'; c.fillStyle = '#815049'; c.font = 'bold 29px sans-serif'; c.fillText('PUDDING TOWER · 10 SHAPES × 4 STYLES', 600, 48);
['可愛療癒', '荒謬搞怪', '復古像素', '3D 軟 Q'].forEach((name, i) => { c.font = 'bold 23px sans-serif'; c.fillText(name, 210 + i * 277, 97); });
PUDDINGS.forEach((d, row) => {
  c.font = '17px sans-serif'; c.fillStyle = '#815049'; c.fillText(d.name, 76, 198 + row * 161);
  STYLES.forEach((style, col) => {
    const x = 210 + col * 277, y = 185 + row * 161;
    c.fillStyle = '#fff6e9'; c.beginPath(); c.roundRect(x - 102, y - 67, 204, 143, 23); c.fill();
    c.save(); c.translate(x, y + 2); c.scale(1.25, 1.25); drawCharacter(c, { shapeId: d.shapeId, styleId: style, expressionId: EXPRESSIONS[(row + col) % 6] }); c.restore();
  });
});
add('docs/mvp-character-catalog.png', sheet);
document.querySelector('#gallery')!.append(sheet);
(window as unknown as { __ART_EXPORT__: typeof exports }).__ART_EXPORT__ = exports;