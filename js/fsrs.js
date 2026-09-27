// FSRS-6 zamanlayıcı (open-spaced-repetition/awesome-fsrs wiki'deki formüller, varsayılan ağırlıklar).
// Not: 1 = tekrar (yanlış), 2 = zor (küçük hata), 3 = iyi (doğru), 4 = kolay.
(function (root) {
  'use strict';

  const W = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
    0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
  const DAY = 86400000;
  const DECAY = -W[20];
  const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

  const clampD = d => Math.min(10, Math.max(1, d));
  const initS = g => Math.max(W[g - 1], 0.01);
  const initD = g => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);

  function retrievability(elapsedDays, S) {
    return Math.pow(1 + FACTOR * elapsedDays / S, DECAY);
  }

  function intervalDays(S, retention) {
    const i = S / FACTOR * (Math.pow(retention, 1 / DECAY) - 1);
    return Math.min(3650, Math.max(1, Math.round(i)));
  }

  function nextD(D, g) {
    const delta = -W[6] * (g - 3);
    const dp = D + delta * (10 - D) / 9;
    return clampD(W[7] * initD(4) + (1 - W[7]) * dp);
  }

  function sRecall(D, S, R, g) {
    const hard = g === 2 ? W[15] : 1;
    const easy = g === 4 ? W[16] : 1;
    return S * (1 + Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) *
      (Math.exp(W[10] * (1 - R)) - 1) * hard * easy);
  }

  function sForget(D, S, R) {
    const s = W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R));
    return Math.min(s, S / Math.exp(W[17] * W[18]));
  }

  function sShortTerm(S, g) {
    let s = S * Math.exp(W[17] * (g - 3 + W[18])) * Math.pow(S, -W[19]);
    if (g >= 3) s = Math.max(s, S);
    return s;
  }

  // card: {S, D, last (ms), due (ms), reps, lapses}
  // gibt eine neue Karte zurück; die alte bleibt unverändert.
  function review(card, g, now, retention) {
    retention = retention || 0.9;
    const c = Object.assign({ reps: 0, lapses: 0 }, card);
    if (!c.S) {
      c.S = initS(g);
      c.D = initD(g);
    } else {
      const elapsed = (now - c.last) / DAY;
      if (elapsed < 1) {
        c.S = sShortTerm(c.S, g);
      } else {
        const R = retrievability(elapsed, c.S);
        c.S = g === 1 ? sForget(c.D, c.S, R) : sRecall(c.D, c.S, R, g);
      }
      c.D = nextD(c.D, g);
    }
    c.reps += 1;
    if (g === 1) c.lapses += 1;
    c.last = now;
    // Yanlış: aynı gün tekrar (10 dk sonra); diğerleri: FSRS aralığı
    c.due = g === 1 ? now + 10 * 60000 : now + intervalDays(c.S, retention) * DAY;
    c.lastG = g;
    return c;
  }

  function currentR(card, now) {
    if (!card || !card.S) return 0;
    return retrievability(Math.max(0, (now - card.last) / DAY), card.S);
  }

  const api = { review, currentR, retrievability, intervalDays, W, DAY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FSRS = api;
})(this);
