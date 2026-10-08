// Tarayıcı duman testi (isteğe bağlı, Playwright gerekir): node tests/e2e_smoke.js
// Gün 1: Çalış (tek akış, ara etkinlikler dahil), bir paket baştan sona (odak), gün 2: yeniden açılış + Çalış. Sayfa hatası olursa çıkış kodu 1.
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  try { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
  catch (e2) { console.log('Playwright yok, atlandı.'); process.exit(0); }
}
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const DAY = 86400000;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts/, r => r.abort());
  // saat kaydırma + 4× hızlı zamanlayıcılar
  await p.addInitScript(() => {
    const now = Date.now.bind(Date);
    Date.now = () => now() + (+localStorage.getItem('__off') || 0);
    const st = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) * 0.25, ...a);
  });
  await p.goto(URL);
  const bump = ms => p.evaluate(ms => localStorage.setItem('__off', String((+localStorage.getItem('__off') || 0) + ms)), ms);
  const st = () => p.evaluate(() => {
    const a = window.__tekrar.aktuell; if (!a) return {};
    return { typ: a.typ, id: a.id, uid: a.uid, mc: !!a.mc, art: !!a.artFrage, input: !!a.input, done: !!a.done, wartet: !!a.wartet,
      ziel: a.ziel, abschreib: a.abschreib, schritt: a.schritt, warte: !!a.warte, ok: a.optionen ? a.optionen.findIndex(o => o.ok) : -1 };
  });
  const wait = ms => p.waitForTimeout(ms);
  let k = 0;
  async function schritt() {
    const s = await st();
    if (s.typ === 'leer' || s.typ === 'pause') return s.typ;
    if (s.typ === 'akt') {
      const a = await p.evaluate(() => { const q = window.__tekrar.aktuell; return { art: q.art, wartet: !!q.wartet, blanks: q.blanks ? q.blanks.map(b => b.form) : null, ids: q.ids || null, satz: q.satz ? q.satz.de : null, order: q.toks ? q.toks.map((t, i) => [t.i, i]).sort((x, y) => x[0] - y[0]).map(x => x[1]) : null }; });
      if (a.wartet) { await p.keyboard.press('Enter'); }
      else if (a.art === 'angebot') await p.keyboard.press('0');
      else {
        if (a.art === 'luecke') { for (let i = 0; i < a.blanks.length; i++) await p.fill(`.u-luecke[data-al="${i}"]`, a.blanks[i]); await p.click('[data-akt="pruef"]'); }
        else if (a.art === 'match') { for (const id of a.ids) { await p.click(`[data-am="L${id}"]`); await p.click(`[data-am="R${id}"]`); } }
        else if (a.art === 'diktat') { await p.fill('#cevap', a.satz); await p.press('#cevap', 'Enter'); }
        else if (a.art === 'ordnen') { for (const i of a.order) await p.click(`[data-ao="${i}"]`); await p.click('[data-akt="pruef"]'); }
        await wait(60); await p.keyboard.press('Enter');
      }
      await wait(80);
      return 'akt-' + a.art;
    }
    if (s.typ === 'licht') { await bump(2500); await p.keyboard.press('Enter'); }
    else if (s.typ === 'einf') { await p.fill('#cevap', s.abschreib); await p.keyboard.press('Enter'); }
    else if (s.typ === 'paket') {
      if (s.schritt === 'luecke' && !s.warte) {
        const f = await p.evaluate(() => { const a = window.__tekrar.aktuell; return window.__tekrar.pById[a.pid].luecken[a.i].form; });
        await p.fill('#cevap', f);
      } else await bump(16000);
      await p.keyboard.press('Enter');
    } else if (s.mc) {
      await p.waitForFunction(() => { const a = window.__tekrar.aktuell; return !a.mc || a.offen || a.done; });
      await wait(520);
      if (s.typ === 'pretest' && k++ % 3 === 0) await p.keyboard.press('0'); else await p.keyboard.press(String(s.ok + 1));
      await wait(350);
      const s2 = await st(); if (s2.mc && s2.wartet) await p.keyboard.press('Enter');
    } else if (s.art) {
      await wait(600);
      const a = await p.evaluate(id => window.__tekrar.byId[id].art, s.id);
      await p.keyboard.press(String(['der', 'die', 'das'].indexOf(a) + 1));
      await wait(450);
    } else if (s.input) {
      let ans = s.ziel;
      if (s.uid.endsWith(':abr')) ans = await p.evaluate(() => { const a = window.__tekrar.aktuell; const v = window.__tekrar.VERBEN.find(v => v.id === a.id); return v.anz.replace('sich(D)', 'sich').split(' ').map(w => { const o = v.obj.find(o => o.p === w); return o ? w + ' ' + o.k : w; }).join(' '); });
      await p.fill('#cevap', ans); await p.keyboard.press('Enter'); await wait(60); await p.keyboard.press('Enter');
    }
    await wait(80);
    return s.typ || 'soru';
  }
  async function bolum(m, n) {
    await p.selectOption('#odak', m); await wait(100);
    let r = '';
    for (let i = 0; i < n; i++) { r = await schritt(); if (r === 'leer' || r === 'pause') break; }
    const d = await p.evaluate(m => { const S = window.__tekrar.S; const t = Object.keys(S.tage).sort().pop(); return S.tage[t].modi[m]; }, m);
    console.log(m.padEnd(7), `${d.n} soru, ${d.neu} yeni, son: ${r}`);
    return d;
  }
  const plan = await p.evaluate(() => document.querySelector('#plan').innerText);
  const akis = await bolum('akis', 140);
  const paket = await bolum('paket', 40);
  await bump(DAY); await p.reload(); await wait(200);
  const akis2 = await bolum('akis', 60);
  const fehler = [];
  if (!/Çalış/.test(plan)) fehler.push('plan şeridinde Çalış yok');
  if (akis.n < 40) fehler.push('Çalış akışı 40 cevaba ulaşmadı');
  if (akis2.n < 20) fehler.push('2. gün Çalış akışı ilerlemedi');
  if (paket.n < 10) fehler.push('paket tamamlanmadı');
  if (errs.length) fehler.push('sayfa hataları: ' + errs.join(' | '));
  await b.close();
  if (fehler.length) { console.log('HATA:', fehler.join('; ')); process.exit(1); }
  console.log('duman testi geçti');
})();
