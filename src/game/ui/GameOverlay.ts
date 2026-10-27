import { prepareShareCard, titleFor, type PreparedCard } from '../share/ShareCard';
import type { GameState, TowerSnapshot } from '../types';

interface Actions { start(): void; toggleSound(): boolean; soundEnabled(): boolean }
const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;
export class GameOverlay {
  private readonly root = document.querySelector<HTMLDivElement>('#overlay')!;
  private readonly abort = new AbortController();
  private readonly modal: HTMLElement;
  private readonly score: HTMLElement;
  private readonly best: HTMLElement;
  private readonly hint: HTMLElement;
  private card?: PreparedCard;
  private version = 0;
  private result?: { snapshot: TowerSnapshot | null; score: number; best: number };
  private previousFocus?: HTMLElement;
  get cardReady(): boolean { return !!this.card; }

  constructor(actions: Actions) {
    this.root.innerHTML = `
      <header class="masthead">
        <img class="game-logo" src="${asset('ui/logo.png')}" alt="PUDDING TOWER" width="380" height="128">
        <p class="subtitle">疊 布 丁 · 一 層 一 點 小 幸 福</p>
        <div class="scoreboard" aria-label="遊戲分數"><div><span>SCORE · 層數</span><strong id="score">0</strong></div><b aria-hidden="true">✧</b><div><span>BEST · 最高</span><strong id="best">0</strong></div></div>
      </header>
      <button id="sound" class="sound-toggle" aria-label="音效開關" aria-pressed="${actions.soundEnabled()}" title="音效開關">${actions.soundEnabled() ? '♪' : '♫̸'}</button>
      <p id="next" class="next-label"></p><p id="hint" class="hint" aria-live="polite"></p>
      <section id="modal" class="modal" aria-label="遊戲選單"></section>
      <p class="edition">軟軟的布丁，也能疊出大大的成就。</p>
      <div id="share-dialog" class="share-backdrop" role="dialog" aria-modal="true" aria-labelledby="share-heading" hidden>
        <section class="share-panel"><button id="close-share" class="close" aria-label="關閉分享預覽">×</button>
          <h2 id="share-heading">把這份幸福帶走。</h2><p class="small-note">分享你的布丁塔，邀朋友一起挑戰！</p>
          <img id="share-image" alt="本局真實布丁塔成績卡" width="1080" height="1350">
          <div class="share-actions"><button id="native-share" class="primary">分享 PNG</button><button id="download" class="secondary">下載 PNG</button></div>
          <button id="copy-link" class="quiet">複製遊戲連結</button><input id="game-url" readonly aria-label="遊戲網址">
          <p id="share-status" class="share-status" role="status"></p>
        </section>
      </div>`;
    this.modal = this.root.querySelector('#modal')!; this.score = this.root.querySelector('#score')!; this.best = this.root.querySelector('#best')!; this.hint = this.root.querySelector('#hint')!;
    this.root.addEventListener('click', event => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button'); if (!button) return; event.stopPropagation();
      switch (button.id) {
        case 'start': case 'restart': this.clearCard(); actions.start(); break;
        case 'sound': { const enabled = actions.toggleSound(); button.setAttribute('aria-pressed', String(enabled)); button.textContent = enabled ? '♪' : '♫̸'; break; }
        case 'share': if (this.card) void this.share(); else void this.buildCard(); break;
        case 'preview-card': this.openPreview(); break;
        case 'close-share': this.closePreview(); break;
        case 'native-share': void this.share(); break;
        case 'download': this.download(); break;
        case 'copy-link': void this.copyLink(); break;
      }
    }, { signal: this.abort.signal });
    this.root.addEventListener('keydown', event => this.handleDialogKey(event), { signal: this.abort.signal });
    this.root.addEventListener('pointerdown', event => event.stopPropagation(), { signal: this.abort.signal });
  }

  menu(best: number): void {
    this.update(0, best, 'MENU'); this.modal.hidden = false;
    this.modal.innerHTML = `<p class="tag">一 指 就 能 玩 的 甜 點 挑 戰</p>
      <div class="hero-stack" aria-hidden="true"><img src="${asset('puddings/flat/cute.png')}" alt=""><img src="${asset('puddings/classic/cute.png')}" alt=""><img src="${asset('puddings/tall/cute.png')}" alt=""><i>✦</i></div>
      <h2>今天，也疊一點快樂。</h2><p class="description">抓住晃悠悠的時機，<br>讓小布丁穩穩落在一起。</p>
      <button id="start" class="primary">開始遊戲 <span aria-hidden="true">→</span></button><p class="small-note">點一下，放下一顆布丁</p>`;
  }
  update(score: number, best: number, state: GameState, storageAvailable = true): void {
    this.score.textContent = String(score); this.best.textContent = String(best);
    this.hint.textContent = state === 'READY' ? (score === 0 ? '輕點畫面，放下一顆布丁' : '瞄準塔頂 · 輕點放下') : state === 'COLLAPSING' ? '啊，幸福晃了一下…' : state === 'FALLING' || state === 'CONFIRMING' ? '晃一晃，讓幸福站穩…' : '';
    this.root.dataset.state = state; this.best.title = storageAvailable ? '此瀏覽器的最高紀錄' : '瀏覽器不允許儲存，最高紀錄僅保留於本次頁面';
  }
  next(name: string, style: string): void { this.root.querySelector('#next')!.textContent = `${name} · ${style}`; }
  playing(): void { this.modal.hidden = true; this.clearCard(); }

  gameOver(score: number, best: number, isNewBest: boolean, storageAvailable: boolean, snapshot: TowerSnapshot | null): void {
    this.update(score, best, 'GAME_OVER', storageAvailable); this.modal.hidden = false; this.root.querySelector('#next')!.textContent = '';
    this.result = { snapshot: snapshot ? structuredClone(snapshot) : null, score, best };
    this.modal.innerHTML = `<p class="tag">${isNewBest ? '✦ 新 的 最 高 紀 錄 ✦' : '今 天 的 甜 甜 成 績'}</p><h2>布丁休息一下。</h2>
      <div class="result-summary"><p class="result-score">${score}<span>層</span></p><button id="preview-card" class="card-thumb" aria-label="預覽分享卡" disabled><span>製作中…</span></button></div>
      <p class="result-title">✦ ${titleFor(score)} ✦</p><p class="description">${score ? '每一點搖晃，都是努力的形狀。' : '沒關係，下一顆會更穩。'}<br>最高紀錄 ${best} 層</p>
      <button id="restart" class="primary">再玩一次 <span aria-hidden="true">↻</span></button><button id="share" class="secondary" disabled>製作分享卡…</button>
      <p class="small-note">${storageAvailable ? '把甜甜的紀錄，分享給朋友吧' : '無法永久儲存紀錄，本頁仍可繼續遊玩'}</p>`;
    void this.buildCard();
    this.root.querySelector<HTMLButtonElement>('#restart')!.focus({ preventScroll: true });
  }

  private async buildCard(): Promise<void> {
    if (!this.result) return;
    const version = ++this.version, share = this.root.querySelector<HTMLButtonElement>('#share'); if (share) { share.disabled = true; share.textContent = '製作分享卡…'; }
    try {
      const { snapshot, score, best } = this.result; const card = await prepareShareCard(snapshot, score, best);
      if (version !== this.version) { URL.revokeObjectURL(card.url); return; }
      if (this.card) URL.revokeObjectURL(this.card.url); this.card = card;
      if (share) { share.disabled = false; share.textContent = '分享成績 ↗'; }
      const thumb = this.root.querySelector<HTMLButtonElement>('#preview-card'); if (thumb) { thumb.disabled = false; thumb.replaceChildren(Object.assign(new Image(), { src: card.url, alt: '本局成績卡預覽' })); }
    } catch {
      if (version !== this.version) return;
      if (share) { share.disabled = false; share.textContent = '重試製作分享卡'; }
    }
  }
  private canNativeShare(): boolean {
    try { return !!this.card && typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [this.card.file] }); } catch { return false; }
  }
  private async share(): Promise<void> {
    if (!this.card) return;
    if (!this.canNativeShare()) { this.openPreview(); return; }
    const version = this.version;
    try {
      // PNG is already prepared. This call stays in the user's click activation.
      await navigator.share({ files: [this.card.file], title: 'PUDDING TOWER · 疊布丁', text: `我疊出了 ${this.card.score} 層！${this.card.title}，換你挑戰！ ${this.card.gameUrl}` });
    } catch (error) {
      if (version !== this.version || (error instanceof DOMException && error.name === 'AbortError')) return;
      this.openPreview(); this.status('原生分享未能完成，仍可下載 PNG 或長按圖片儲存。');
    }
  }
  private openPreview(): void {
    if (!this.card) return;
    const dialog = this.root.querySelector<HTMLElement>('#share-dialog')!; this.previousFocus = document.activeElement as HTMLElement;
    this.root.querySelector<HTMLImageElement>('#share-image')!.src = this.card.url;
    this.root.querySelector<HTMLInputElement>('#game-url')!.value = this.card.gameUrl;
    this.root.querySelector<HTMLButtonElement>('#native-share')!.hidden = !this.canNativeShare();
    dialog.hidden = false; this.status('PNG 圖片 · 1080 × 1350，也可長按圖片儲存。'); this.root.querySelector<HTMLButtonElement>('#close-share')!.focus({ preventScroll: true });
  }
  private closePreview(): void { this.root.querySelector<HTMLElement>('#share-dialog')!.hidden = true; this.previousFocus?.focus({ preventScroll: true }); }
  private download(): void {
    if (!this.card) return;
    const anchor = document.createElement('a'); anchor.href = this.card.url; anchor.download = this.card.file.name; document.body.append(anchor); anchor.click(); anchor.remove(); this.status('已送出 PNG 下載；也可長按圖片儲存。');
  }
  private async copyLink(): Promise<void> {
    if (!this.card) return;
    try { if (!navigator.clipboard) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(this.card.gameUrl); this.status('遊戲連結已複製。'); }
    catch { const input = this.root.querySelector<HTMLInputElement>('#game-url')!; input.focus(); input.select(); input.setSelectionRange(0, input.value.length); this.status('請長按已選取的網址，選擇複製。'); }
  }
  private status(text: string): void { this.root.querySelector('#share-status')!.textContent = text; }
  private clearCard(): void {
    this.version++; if (this.card) URL.revokeObjectURL(this.card.url); this.card = undefined; this.result = undefined;
    this.root.querySelector<HTMLElement>('#share-dialog')!.hidden = true; this.root.querySelector<HTMLImageElement>('#share-image')!.removeAttribute('src');
  }
  private handleDialogKey(event: KeyboardEvent): void {
    const dialog = this.root.querySelector<HTMLElement>('#share-dialog')!; if (dialog.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); this.closePreview(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([hidden]),input')].filter(el => !(el as HTMLButtonElement).disabled);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  destroy(): void { this.clearCard(); this.abort.abort(); this.root.replaceChildren(); }
}