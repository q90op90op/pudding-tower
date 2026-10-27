import { drawCharacter, star } from './puddingArt';
const make = (w: number, h: number, paint: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
  const canvas = document.createElement('canvas'); canvas.width = w * 3; canvas.height = h * 3;
  const c = canvas.getContext('2d')!; c.scale(3, 3); paint(c); return canvas;
};
export function logoCanvas(): HTMLCanvasElement {
  return make(380, 128, c => {
    c.textAlign = 'center'; c.lineJoin = 'round'; c.font = '1000 49px Trebuchet MS, sans-serif';
    c.lineWidth = 9; c.strokeStyle = '#a45d49'; c.fillStyle = '#ffe9b3';
    c.save(); c.translate(169, 51); c.rotate(-0.035); c.strokeText('PUDDING', 0, 0); c.fillText('PUDDING', 0, 0); c.restore();
    c.save(); c.translate(181, 106); c.rotate(0.025); c.fillStyle = '#f4b8c0'; c.strokeText('TOWER', 0, 0); c.fillText('TOWER', 0, 0); c.restore();
    c.save(); c.translate(328, 87); c.rotate(0.17); c.scale(0.63, 0.63); drawCharacter(c, { shapeId: 'classic', styleId: 'cute', expressionId: 'blank' }); c.restore();
    star(c, 22, 84, 8, '#fff6e9'); star(c, 338, 29, 9, '#fff6e9'); star(c, 63, 111, 5, '#edb988');
  });
}
export function backgroundCanvas(): HTMLCanvasElement {
  return make(390, 844, c => {
    const gradient = c.createLinearGradient(0, 0, 0, 844); gradient.addColorStop(0, '#e4d3ec'); gradient.addColorStop(0.62, '#f0e3ee'); gradient.addColorStop(1, '#f9e5dc'); c.fillStyle = gradient; c.fillRect(0, 0, 390, 844);
    for (let i = 0; i < 45; i++) { c.fillStyle = i % 2 ? '#fff5e84d' : '#b98ab40b'; c.beginPath(); c.arc((i * 97 + 18) % 390, (i * 173 + 21) % 844, i % 3 + 0.7, 0, Math.PI * 2); c.fill(); }
    for (const [x, y, s] of [[-12, 370, 1], [306, 420, 0.8], [36, 660, 0.6]]) {
      c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#fff7ed70'; c.beginPath(); c.ellipse(35, 0, 50, 12, 0, 0, Math.PI * 2); c.ellipse(17, -10, 19, 15, 0, 0, Math.PI * 2); c.ellipse(45, -13, 24, 18, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    for (const [x, y, r] of [[29, 266, 6], [354, 318, 8], [41, 495, 5], [343, 608, 7], [66, 700, 4]]) star(c, x, y, r, '#fff6de');
    c.fillStyle = '#c6b3cf60';
    for (let i = 0; i < 11; i++) { const h = 18 + ((i * 13) % 47), x = i * 40 - 13; c.beginPath(); c.roundRect(x, 816 - h, 27, h + 35, [8, 8, 0, 0]); c.fill(); c.fillStyle = '#ffe6a5a0'; c.fillRect(x + 7, 823 - h, 4, 6); c.fillRect(x + 17, 836 - h, 4, 6); c.fillStyle = '#c6b3cf60'; }
    c.fillStyle = '#c7c6b980'; c.beginPath(); c.ellipse(195, 852, 260, 37, 0, 0, Math.PI * 2); c.fill();
  });
}
export function plateCanvas(): HTMLCanvasElement {
  return make(280, 62, c => {
    c.fillStyle = '#a47ca62b'; c.beginPath(); c.ellipse(140, 46, 131, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff8ed'; c.strokeStyle = '#a45d49'; c.lineWidth = 2.4; c.beginPath(); c.ellipse(140, 28, 128, 21, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = '#d1a188'; c.lineWidth = 1.3; c.beginPath(); c.ellipse(140, 28, 111, 13, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff8ed'; c.strokeStyle = '#a45d49'; c.lineWidth = 2; c.beginPath(); c.roundRect(32, 6, 216, 16, 7); c.fill(); c.stroke();
    c.fillStyle = '#d7ac8a'; for (const x of [44, 236]) { c.beginPath(); c.ellipse(x, 33, 3, 1.4, 0, 0, Math.PI * 2); c.fill(); }
  });
}