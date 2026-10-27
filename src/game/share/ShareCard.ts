import { drawCharacter, star } from '../art/puddingArt';
import { logoCanvas, plateCanvas } from '../art/uiArt';
import { WORLD } from '../config';
import type { TowerSnapshot } from '../types';

export function titleFor(score: number): string {
  return score >= 30 ? '傳說中的布丁塔王' : score >= 20 ? '布丁建築師' : score >= 10 ? '焦糖平衡大師' : score >= 5 ? '軟爛甜點王' : score > 0 ? '今日最抖布丁塔' : '布丁見習生';
}
export function gameUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_GAME_URL as string | undefined;
  try { const url = new URL(configured || import.meta.env.BASE_URL, location.href); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid URL'); url.search = ''; url.hash = ''; return url.href; }
  catch { return new URL('./', location.href).href; }
}
function panel(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 32): void {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = '#fff6e9'; c.fill(); c.strokeStyle = '#c69a86'; c.lineWidth = 3; c.stroke();
}
export function renderShareCard(snapshot: TowerSnapshot | null, score: number, best: number, url: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const c = canvas.getContext('2d'); if (!c) throw new Error('此瀏覽器無法建立分享圖片');
  const gradient = c.createLinearGradient(0, 0, 0, 1350); gradient.addColorStop(0, '#d9c5e7'); gradient.addColorStop(0.64, '#eddfed'); gradient.addColorStop(1, '#fff1df'); c.fillStyle = gradient; c.fillRect(0, 0, 1080, 1350);
  c.strokeStyle = '#fff6e9'; c.lineWidth = 5; c.beginPath(); c.roundRect(22, 22, 1036, 1306, 44); c.stroke();
  for (let i = 0; i < 26; i++) star(c, 55 + i * 137 % 960, 60 + i * 191 % 1020, i % 3 === 0 ? 17 : 9, i % 2 ? '#fff6e9' : '#ffe5a0');
  c.drawImage(logoCanvas(), 170, 32, 740, 249);
  c.textAlign = 'center'; c.fillStyle = '#815049'; c.font = '600 25px "Microsoft JhengHei", sans-serif'; c.fillText('一層一點小幸福，這是我的甜甜紀錄。', 540, 302);
  c.save(); c.translate(162, 439); c.rotate(-0.08); c.textAlign = 'left'; c.fillStyle = '#a17a98'; c.font = '500 23px "Microsoft JhengHei", sans-serif';
  c.fillText(score >= 5 ? '一層一層，' : '小小的開始，', 0, 0); c.fillText(score >= 5 ? '堆出甜蜜的高度。' : '也是大大的幸福。', 0, 36); c.restore();
  // Bounds include rotated character artwork, offsets from mass centers, and the original plate.
  let minX = 55, maxX = 335, minY = 736, maxY = 798;
  for (const p of snapshot?.puddings ?? []) {
    for (const dx of [-p.width / 2 - 28, p.width / 2 + 28]) for (const dy of [-p.height / 2 - 28, p.height / 2 + 28]) {
      const x = p.x + Math.cos(p.angle) * (dx + p.offsetX) - Math.sin(p.angle) * (dy + p.offsetY);
      const y = p.y + Math.sin(p.angle) * (dx + p.offsetX) + Math.cos(p.angle) * (dy + p.offsetY);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const scale = Math.min(2.35, 790 / (maxX - minX), 595 / (maxY - minY));
  c.save(); c.translate(540 - (minX + maxX) / 2 * scale, 918 - maxY * scale); c.scale(scale, scale);
  c.drawImage(plateCanvas(), WORLD.plateX - 140, 736, 280, 62);
  for (const p of snapshot?.puddings ?? []) { c.save(); c.translate(p.x, p.y); c.rotate(p.angle); c.translate(p.offsetX, p.offsetY); c.scale(p.scaleX, p.scaleY); drawCharacter(c, p); c.restore(); }
  c.restore();
  if (!score) { c.fillStyle = '#9875a7'; c.font = '600 33px "Microsoft JhengHei", sans-serif'; c.fillText('下一次，一定疊得更高。', 540, 630); }
  panel(c, 73, 950, 934, 148);
  c.strokeStyle = '#e6cec0'; c.lineWidth = 2; c.beginPath(); c.moveTo(540, 975); c.lineTo(540, 1076); c.stroke();
  c.fillStyle = '#815049'; c.font = '600 25px "Microsoft JhengHei", sans-serif'; c.fillText('本次成功堆疊', 310, 991); c.fillText('最高紀錄', 770, 991);
  c.font = 'bold 70px Trebuchet MS, sans-serif'; c.fillText(String(score), 310, 1067); c.fillStyle = '#9871aa'; c.fillText(String(best), 770, 1067);
  panel(c, 175, 1120, 730, 65, 30); c.fillStyle = '#9e6551'; c.font = 'bold 32px "Microsoft JhengHei", sans-serif'; c.fillText(`✦ ${titleFor(score)} ✦`, 540, 1164);
  c.fillStyle = '#815049'; c.font = '600 26px "Microsoft JhengHei", sans-serif'; c.fillText('換你挑戰！你能疊出幾層幸福？', 540, 1230);
  c.fillStyle = '#8b6d97'; let fontSize = 23; c.font = `${fontSize}px sans-serif`; while (c.measureText(url).width > 920 && fontSize > 11) { c.font = `${--fontSize}px sans-serif`; }
  if (c.measureText(url).width <= 920) c.fillText(url, 540, 1274);
  else { const half = Math.ceil(url.length / 2); c.fillText(url.slice(0, half), 540, 1265, 920); c.fillText(url.slice(half), 540, 1287, 920); }
  return canvas;
}
export interface PreparedCard { file: File; url: string; gameUrl: string; score: number; title: string }
export async function prepareShareCard(snapshot: TowerSnapshot | null, score: number, best: number): Promise<PreparedCard> {
  const url = gameUrl(), canvas = renderShareCard(snapshot, score, best, url);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('無法產生 PNG，請再試一次')), 'image/png'));
  return { file: new File([blob], `pudding-tower-${score}.png`, { type: 'image/png' }), url: URL.createObjectURL(blob), gameUrl: url, score, title: titleFor(score) };
}