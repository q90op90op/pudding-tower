const KEY = 'pudding-tower.best.v1';

export class Records {
  best = 0;
  available = true;

  constructor() {
    try {
      const value = Number(localStorage.getItem(KEY));
      if (Number.isSafeInteger(value) && value >= 0) this.best = value;
    } catch { this.available = false; }
  }

  record(score: number): void {
    if (score <= this.best) return;
    this.best = score;
    try { localStorage.setItem(KEY, String(score)); }
    catch { this.available = false; }
  }
}