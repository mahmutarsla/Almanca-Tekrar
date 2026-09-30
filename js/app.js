// Almanca Tekrar — uygulama: kuyruk, soru tipleri, not verme, log, görünümler.
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const now = () => Date.now();
  const DAY = 86400000;
  const tag = (t = now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ================= Veri =================
  const byId = Object.fromEntries(window.NOMEN.liste.map(n => [n.id, n]));
  // tekrar eden / bölgesel maddeler (skip) öğretilmez
  const NL = window.NOMEN.liste.filter(n => !n.skip);
  const OPTS = {
    personen: window.NOMEN.personen.map(r => Object.assign({}, byId[r.id], r, { person: true })),
    adjSache: window.NOMEN.adjSache.map(a => a.de),
    adjPerson: window.NOMEN.adjPerson.map(a => a.de),
  };
  const ADJ_TR = Object.fromEntries(window.NOMEN.adjSache.concat(window.NOMEN.adjPerson).map(a => [a.de, a.tr]));
  const VERBEN = window.VERBEN.map(v => G.rahmenAufloesen(v, byId));
  const vById = Object.fromEntries(VERBEN.map(v => [v.id, v]));
  const FEEDBACK = window.FEEDBACK || [];

  // Dönüşlü alıştırma: aynı fiilin birden çok anlamı varsa (freuen auf / über) yalnız ilki
  const reflGesehen = new Set();
  VERBEN.forEach(v => {
    const k = v.base + v.pre + v.refl;
    if (v.refl && !G.REFL_AUS.includes(v.base) && !reflGesehen.has(k)) { reflGesehen.add(k); v.reflDrill = true; }
  });
  // çekim sorusu da fiil başına bir kez (freuen auf / freuen über aynı çekim)
  const frmGesehen = new Set();
  VERBEN.forEach(v => { const k = v.inf + v.refl; v.frmDrill = !frmGesehen.has(k); frmGesehen.add(k); });

  // Anlamdaşlar: aynı Türkçe karşılık (ilk anlam) → TR→DE sorularında hangisinin istendiği belli olmaz
  const trKey = t => String(t).split(/[;,]/)[0].replace(/\(.*?\)/g, '').trim().toLowerCase();
  const SYN = new Map();
  const addSyn = (id, t) => { const k = trKey(t); (SYN.get(k) || SYN.set(k, []).get(k)).push(id); };
  VERBEN.forEach(v => addSyn(v.id, v.tr));
  window.NOMEN.liste.filter(n => !n.skip).forEach(n => addSyn(n.id, n.tr));
  const synOf = (id, t) => (SYN.get(trKey(t)) || []).filter(x => x !== id);
  // anlamdaşlardan ayıran en kısa baş (benötigen / brauchen → "be…")
  const kern = id => id[0] === 'v' ? vById[id].anz.replace(/^sich(\(D\))? /, '') : byId[id].lemma;
  function synPraefix(id, syn) {
    const w = kern(id);
    for (let n = 1; n < Math.min(5, w.length); n++) if (!syn.some(x => kern(x).slice(0, n).toLowerCase() === w.slice(0, n).toLowerCase())) return w.slice(0, n);
    return w.slice(0, Math.min(4, w.length));
  }

  // Goethe örneklerinden boşluklar (fiil başına bir kez hesaplanır)
  VERBEN.forEach(v => { v.lueckenListe = (v.bsp || []).map(b => G.luecke(v, b)).filter(Boolean); });

  // Almanca metinde isimleri artikel rengiyle işaretlemek için biçim → artikel
  const FORM = new Map();
  // Aynı biçim hem tekil hem çoğulsa (den Nachbarn) sözlükteki artikel gösterilir
  const addForm = (f, a) => {
    if (!f) return;
    const old = FORM.get(f);
    if (!old || old === a) FORM.set(f, a);
    else if (old === 'pl') FORM.set(f, a);
    else if (a !== 'pl') FORM.set(f, '?');
  };
  NL.forEach(n => {
    if (n.plOnly) { addForm(n.lemma, 'pl'); addForm(n.lemma + 'n', 'pl'); return; }
    addForm(n.lemma, n.art);
    if (n.weak) { addForm(n.lemma + (/(e|Herr|Nachbar|Bauer)$/.test(n.lemma) ? 'n' : 'en'), n.art); }
    if (n.plf && n.plf !== n.lemma) { addForm(n.plf, 'pl'); if (!/[ns]$/.test(n.plf)) addForm(n.plf + 'n', 'pl'); }
  });
  function deHTML(text) {
    return esc(text).replace(/[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?/g, (w, off, full) => {
      const a = FORM.get(w);
      if (!a || a === '?') return w;
      const isStart = off === 0 || /[.!?„]\s*$/.test(full.slice(0, off));
      if (isStart && /^(Die|Der|Das|Sie|Ihr|Ihre|Essen|Leben)$/.test(w)) return w;
      if (/^(Frau|Herr|Herrn)$/.test(w) && /^\s+[A-ZÄÖÜ]/.test(full.slice(off + w.length))) return w;
      return `<span class="n ${a}">${w}<sup>${a === 'pl' ? 'Pl.' : a}</sup></span>`;
    });
  }
  const artHTML = n => n.plOnly ? `<span class="art art-pl">die</span> ${esc(n.lemma)} <span class="soluk">(çoğul)</span>`
    : `<span class="art art-${n.art}">${n.art}</span> ${esc(n.lemma)}`;

  // Tanıtım sırası: seviye → (fiil: kalıplı önce) → (isim: kalıplarda geçen önce)
  const inFrames = new Set();
  VERBEN.forEach(v => (v.rahmen || []).forEach(fr => { (fr.s || []).forEach(n => inFrames.add(n.id)); fr.o.forEach(sl => sl.n.forEach(n => n !== 'P' && inFrames.add(n.id))); }));
  OPTS.personen.forEach(p => inFrames.add(p.id));
  // Seviye içinde sabit karıştırma: benzer kelimeler (abfahren, abholen …) art arda gelmesin
  const mix = id => { let h = 2166136261; for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const VERB_ORDER = VERBEN.slice().sort((a, b) => a.tier - b.tier || (b.rahmen ? 1 : 0) - (a.rahmen ? 1 : 0) || mix(a.id) - mix(b.id));
  const NOUN_ORDER = NL.slice().sort((a, b) => a.tier - b.tier || (inFrames.has(b.id) ? 1 : 0) - (inFrames.has(a.id) ? 1 : 0) || mix(a.id) - mix(b.id));

  // ================= Durum =================
  const KEY = 'almanca-tekrar-v1';
  const DEF = { karten: {}, items: {}, tage: {}, log: [], pending: [], kontext: {},
    einst: { ret: 0.9, modi: {} }, version: 2 };
  // Bölümler: her birinin kendi günlük hedefi (soru) ve yeni öğe sınırı.
  // Varsayılanlar: Anki'nin önerdiği gibi günde ~10 yeni kart; bir fiil 4-5 kart açtığı için fiilde sayı düşük.
  const MODI = {
    normal: { ad: 'Karışık', ziel: 20, neu: 6, neuTr: 'yeni öğe (fiil + isim yarı yarıya)' },
    verben: { ad: 'Fiiller', ziel: 20, neu: 3, neuTr: 'yeni fiil' },
    woerter: { ad: 'Kelimeler (isimler)', ziel: 20, neu: 10, neuTr: 'yeni isim' },
    ndek: { ad: 'n-Deklination', ziel: 15, neu: 5, neuTr: 'yeni n-Deklination ismi' },
    refl: { ad: 'Dönüşlü fiiller', ziel: 15, neu: 3, neuTr: 'yeni dönüşlü fiil' },
    zayif: { ad: 'Zayıflar', ziel: 10, neu: 0, neuTr: '' },
  };
  let S;
  try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = JSON.parse(JSON.stringify(DEF)); }
  S.einst = Object.assign({}, DEF.einst, S.einst);
  S.einst.modi = S.einst.modi || {};
  Object.keys(MODI).forEach(m => { S.einst.modi[m] = Object.assign({ ziel: MODI[m].ziel, neu: MODI[m].neu }, S.einst.modi[m]); });
  const ziel = m => S.einst.modi[m].ziel;
  const neuMax = m => S.einst.modi[m].neu;
  // bugünün bölüm sayacı
  const heuteM = m => { const d = heute(); d.modi = d.modi || {}; return d.modi[m] || (d.modi[m] = { n: 0, richtig: 0, fast: 0, falsch: 0, neu: 0 }); };
  function save() {
    try {
      if (S.log.length > 3000) S.log = S.log.slice(-3000);
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) { console.warn('kaydedilemedi', e); }
  }
  window.addEventListener('pagehide', save);
  const heute = () => { const t = tag(); return S.tage[t] || (S.tage[t] = { n: 0, richtig: 0, fast: 0, falsch: 0, neuV: 0, neuN: 0, satz: 0, wort: 0, anlam: 0 }); };

  // ================= Birimler =================
  // Fiil: abr (TR→DE), bed (DE→TR, yardımsız), frm (çekim), satz (cümle kur / boşluk)
  // İsim: wort (TR → artikel + isim)
  // ndek: n-Deklination · refl: dönüşlü zamir çekimi
  const CAT = { satz: 'satz', abr: 'wort', frm: 'wort', wort: 'wort', bed: 'anlam', ndek: 'wort', refl: 'wort' };
  const CAT_TR = { satz: 'cümle', wort: 'kelime', anlam: 'anlam' };
  const ZIEL_ANTEIL = { satz: 5, wort: 3, anlam: 2 };

  const unitsOf = id => id[0] === 'v'
    ? ['abr', 'bed'].concat(vById[id].frmDrill ? ['frm'] : [], vById[id].rahmen || vById[id].lueckenListe.length ? ['satz'] : [], vById[id].reflDrill ? ['refl'] : [])
    : ['wort'].concat(byId[id].weak || byId[id].falle ? ['ndek'] : []);
  const istNdek = id => id[0] !== 'v' && !!(byId[id].weak || byId[id].falle);
  const istRefl = id => id[0] === 'v' && !!vById[id].refl;
  const itemOf = uid => uid.split(':')[0];
  const typOf = uid => uid.split(':')[1];
  const label = id => id[0] === 'v' ? vById[id].anz : (byId[id].plOnly ? 'die ' : byId[id].art + ' ') + byId[id].lemma;

  function level(card) {
    if (!card || !card.S) return 0;
    if (card.S < 3) return 0;
    if (card.S < 10) return 1;
    if (card.S < 30) return 2;
    return 3;
  }

  function einfuehren(id, bekannt) {
    const t = now();
    S.items[id] = { seit: t };
    const d = heute();
    if (id[0] === 'v') d.neuV++; else d.neuN++;
    heuteM(session.modus).neu++;
    // fiil: önce anlamı hatırla, sonra tam ipuçlu cümle kur, sonra yardımsız anlam
    const us = id[0] === 'v' ? ['abr'].concat(unitsOf(id).includes('satz') ? ['satz'] : [], ['bed']) : unitsOf(id);
    if (bekannt) {
      unitsOf(id).forEach(u => { S.karten[id + ':' + u] = FSRS.review({}, 4, t, S.einst.ret); });
      S.items[id].bekannt = true;
    } else {
      // ilk hatırlama hemen (tanıtımdan sonra), ikinci birim birkaç dakika sonra
      us.forEach((u, i) => { S.karten[id + ':' + u] = { due: t + i * 3 * 60000, neu: true }; });
    }
    save();
  }

  // ================= Oturum / kuyruk =================
  // modus: normal (karışık) · zayif · ndek (n-Deklination odak) · refl (dönüşlü fiiller odak)
  // modus: normal · verben · woerter · ndek · refl · zayif
  const session = { q: 0, cats: { satz: 0, wort: 0, anlam: 0 }, letzte: [], requeue: [], modus: 'normal', zielGesehen: {}, extra: false };
  const NDEK_ORDER = NOUN_ORDER.filter(n => n.weak).concat(NOUN_ORDER.filter(n => n.falle));
  // tuzak isimleri araya serpiştir: 3 n-Deklination, 1 tuzak
  (function () { const w = NDEK_ORDER.filter(n => n.weak), f = NDEK_ORDER.filter(n => n.falle); NDEK_ORDER.length = 0;
    while (w.length || f.length) { NDEK_ORDER.push(...w.splice(0, 3)); if (f.length) NDEK_ORDER.push(f.shift()); } })();
  const REFL_ORDER = VERB_ORDER.filter(v => v.refl);
  const FILTER = {
    verben: u => itemOf(u)[0] === 'v',
    woerter: u => itemOf(u)[0] !== 'v' && typOf(u) === 'wort',
    zayif: u => schwach(itemOf(u)),
    ndek: u => istNdek(itemOf(u)),
    refl: u => istRefl(itemOf(u)),
  };
  // odakta daha önce tanıtılmış ama modül birimi olmayan öğelere birimi ekle
  function modulEinheiten() {
    const t = now();
    Object.keys(S.items).forEach(id => {
      if (!S.items[id] || (id[0] !== 'v' && !byId[id]) || (id[0] === 'v' && !vById[id])) return;
      unitsOf(id).filter(u => u === 'ndek' || u === 'refl').forEach(u => {
        const k = id + ':' + u;
        if (!S.karten[k] && (u === 'ndek' || S.karten[id + ':frm'])) S.karten[k] = { due: t, neu: true };
      });
    });
  }

  function faellig(filterFn) {
    const t = now();
    return Object.keys(S.karten).filter(u => S.karten[u].due <= t && (!filterFn || filterFn(u)));
  }

  // bölümün sırasındaki yeni öğe (bugünkü sınır dolmadıysa)
  function naechsteNeu() {
    const m = session.modus, hm = heuteM(m);
    const max = neuMax(m) + (session.extra ? 5 : 0);
    if (hm.neu >= max) return null;
    const frei = order => { const x = order.find(x => !S.items[x.id]); return x && x.id; };
    if (m === 'verben') return frei(VERB_ORDER);
    if (m === 'woerter') return frei(NOUN_ORDER);
    if (m === 'ndek') return frei(NDEK_ORDER);
    if (m === 'refl') return frei(REFL_ORDER);
    if (m === 'normal') {
      // karışıkta fiil ve isim sırayla
      const v = frei(VERB_ORDER), n = frei(NOUN_ORDER);
      return hm.neu % 2 === 0 ? (v || n) : (n || v);
    }
    return null;
  }

  function schwach(id) {
    return unitsOf(id).some(u => { const c = S.karten[id + ':' + u]; return c && (c.lapses > 0 || c.lastG === 1); });
  }

  function waehle() {
    // 1) oturum içi yanlışların tekrarı (4 soru sonra)
    const rq = session.requeue.findIndex(r => r.nach <= session.q && S.karten[r.uid]);
    if (rq >= 0) { const r = session.requeue.splice(rq, 1)[0]; return { uid: r.uid, requeue: r }; }

    const filter = FILTER[session.modus] || null;
    let due = faellig(filter);

    // 2) yeni öğe: vade azsa ya da her 4 soruda bir (bölümün günlük sınırı dolmadıysa)
    const neu = naechsteNeu();
    if (neu && (due.length < 2 || session.q - (session.letzteNeu ?? -99) >= 4)) {
      session.letzteNeu = session.q;
      return { neu };
    }
    if (!due.length) {
      // öğrenme aşamasındaki kartlar (yeni ya da az önce yanlış) 15 dk içindeyse öne çekilir
      const bald = Object.keys(S.karten).filter(u => { const c = S.karten[u]; return (c.neu || c.lastG === 1) && c.due - now() < 15 * 60000 && (!filter || filter(u)); });
      if (bald.length) due = bald;
    }
    if (!due.length) {
      if (session.modus === 'zayif' || (session.extra && filter)) {
        const pool = Object.keys(S.karten).filter(u => filter(u) && typOf(u) !== 'bed');
        if (!pool.length) return null;
        pool.sort((a, b) => FSRS.currentR(S.karten[a], now()) - FSRS.currentR(S.karten[b], now()));
        due = pool.slice(0, 8);
      } else if (session.extra) {
        const pool = Object.keys(S.karten).filter(u => S.karten[u].S);
        pool.sort((a, b) => FSRS.currentR(S.karten[a], now()) - FSRS.currentR(S.karten[b], now()));
        due = pool.slice(0, 10);
        if (!due.length) return null;
      } else return null;
    }
    // odak modunda her iki sorudan biri doğrudan odak alıştırması (n-Deklination / dönüşlü zamir)
    if (session.modus === 'ndek' || session.modus === 'refl') {
      const mod = due.filter(u => typOf(u) === session.modus);
      session.odakWechsel = !session.odakWechsel;
      if (mod.length && (session.odakWechsel || mod.length === due.length)) {
        mod.sort((a, b) => ((S.karten[b].lastG === 1) - (S.karten[a].lastG === 1)) || S.karten[a].due - S.karten[b].due);
        return { uid: mod.find(x => itemOf(x) !== session.sonItem) || mod[0] };
      }
    }
    // 3) tür dengesi (cümle 5 : kelime 3 : anlam 2), aynı tür en fazla 2 kez üst üste
    const byCat = { satz: [], wort: [], anlam: [] };
    due.forEach(u => byCat[CAT[typOf(u)]].push(u));
    const last2 = session.letzte.slice(-2);
    const blocked = last2.length === 2 && last2[0] === last2[1] ? last2[0] : null;
    const total = Object.values(session.cats).reduce((a, b) => a + b, 0) + 1;
    const cand = Object.keys(byCat).filter(c => byCat[c].length && c !== blocked);
    const cats = cand.length ? cand : Object.keys(byCat).filter(c => byCat[c].length);
    cats.sort((a, b) => (session.cats[a] / total - ZIEL_ANTEIL[a] / 10) - (session.cats[b] / total - ZIEL_ANTEIL[b] / 10));
    const list = byCat[cats[0]];
    // önce dünden kalan yanlışlar, sonra en eski vade; aynı öğe arka arkaya gelmesin
    const lastItem = session.sonItem;
    list.sort((a, b) => ((S.karten[b].lastG === 1) - (S.karten[a].lastG === 1)) || S.karten[a].due - S.karten[b].due);
    const u = list.find(x => itemOf(x) !== lastItem) || list[0];
    return { uid: u };
  }

  // ================= Soru üretimi =================
  let aktuell = null;

  function formAufgaben(v) {
    const r = v.refl ? 'sich' : '';
    const out = [{ key: 'perf', et: 'Perfekt', pers: 'er / sie', ans: [v.aux, r, v.p2].filter(Boolean).join(' ') }];
    const f = G.praesensForms(v);
    const reg = G.regular(v.base);
    if (G.IRR[v.base] || f[2] !== reg[2]) {
      out.push({ key: 'praes3', et: 'Präsens', pers: 'er / sie', ans: [f[2], r, v.pre].filter(Boolean).join(' ') });
      out.push({ key: 'praes2', et: 'Präsens', pers: 'du', ans: [f[1], v.refl ? (v.refl === 'D' ? 'dir' : 'dich') : '', v.pre].filter(Boolean).join(' ') });
    }
    const pt = (v.pt3 || '').split('/')[0];
    if (pt && !/te$/.test(pt)) out.push({ key: 'praet', et: 'Präteritum', pers: 'er / sie', ans: [pt, r, v.pre].filter(Boolean).join(' ') });
    return out;
  }

  function frage(sel) {
    if (sel.neu) return frageEinf(sel.neu);
    const uid = sel.uid, id = itemOf(uid), typ = typOf(uid), card = S.karten[uid];
    const lv = level(card);
    const base = { uid, id, typ, lv, start: now(), requeue: sel.requeue };
    if (typ === 'wort') return Object.assign(base, frageWort(byId[id], lv));
    if (typ === 'ndek') return Object.assign(base, frageNdek(byId[id], lv));
    const v = vById[id];
    if (typ === 'refl') return Object.assign(base, frageRefl(v, lv));
    if (typ === 'abr') return Object.assign(base, frageAbr(v, lv));
    if (typ === 'bed') return Object.assign(base, frageBed(v));
    if (typ === 'frm') return Object.assign(base, frageFrm(v));
    return Object.assign(base, frageSatz(v, lv));
  }

  function frageEinf(id) {
    if (id[0] !== 'v') {
      const n = byId[id];
      const pl = n.plOnly ? 'yalnız çoğul' : n.plf ? `die ${n.plf}` : 'çoğulu yok';
      return {
        typ: 'einf', id, uid: id + ':wort', abschreib: (n.plOnly ? 'die ' : n.art + ' ') + n.lemma, html: `
        <div class="tur"><span class="yeni">yeni kelime</span><span>isim · seviye ${'A' + Math.min(n.tier, 2)}${n.tier === 3 ? '→B1' : ''}</span></div>
        <div class="tanit-bas"><span class="kelime">${artHTML(n)}</span><span class="tr">${esc(n.tr)}</span></div>
        <div class="formlar"><div><span class="et">Artikel</span><span class="art art-${n.plOnly ? 'pl' : n.art}">${n.plOnly ? 'die (Pl.)' : n.art}</span></div><div><span class="et">Çoğul</span>${esc(pl)}</div></div>
        ${n.weak || n.falle ? ndekTabelle(n) : ''}
        ${n.bsp && n.bsp.length ? `<ul class="ornekler">${n.bsp.slice(0, 2).map(b => `<li>${deHTML(b)}</li>`).join('')}</ul>` : ''}
        ${abschreibHTML((n.plOnly ? 'die ' : n.art + ' ') + n.lemma)}` };
    }
    const v = vById[id];
    const muster = v.obj.length ? G.objMuster(v) : '';
    const abschreib = v.anz.replace('sich(D)', 'sich');
    const bsp = [];
    if (v.rahmen) { const u = G.uebung(v, 0, Math.random, OPTS); if (u) bsp.push(u.de); }
    (v.bsp || []).slice(0, 2).forEach(b => bsp.push(b));
    const f = G.praesensForms(v);
    return {
      typ: 'einf', id, uid: id + ':abr', abschreib, html: `
      <div class="tur"><span class="yeni">yeni fiil</span><span>seviye ${v.tier === 1 ? 'A1' : v.tier === 2 ? 'A2' : 'B1'}</span></div>
      <div class="tanit-bas"><span class="kelime">${esc(v.anz)}</span><span class="tr">${esc(v.tr)}</span></div>
      ${muster ? `<div class="chips"><span class="chip vurgu">${esc(muster)}</span>${v.refl ? `<span class="chip">dönüşlü: sich${v.refl === 'D' ? ' (Dativ: mir / dir)' : ' (mich / dich / sich …)'}</span>` : ''}</div>` : v.refl ? `<div class="chips"><span class="chip">dönüşlü: mich / dich / sich …</span></div>` : ''}
      <div class="formlar">
        <div><span class="et">ich / du</span>${esc(f[0])}${v.pre ? ' … ' + esc(v.pre) : ''} · ${esc(f[1])}${v.pre ? ' … ' + esc(v.pre) : ''}</div>
        <div><span class="et">er / sie</span>${esc(f[2])}${v.pre ? ' … ' + esc(v.pre) : ''}</div>
        <div><span class="et">Präteritum</span>${esc((v.pt3 || '').split('/')[0])}${v.pre ? ' … ' + esc(v.pre) : ''}</div>
        <div><span class="et">Perfekt</span>${esc(v.aux)} ${v.refl ? 'sich ' : ''}${esc(v.p2)}</div>
      </div>
      ${v.refl ? reflTabelle(v) : ''}
      ${bsp.length ? `<ul class="ornekler">${bsp.map(b => `<li>${deHTML(b)}</li>`).join('')}</ul>` : ''}
      ${abschreibHTML(abschreib)}` };
  }

  // Tanıtımda bir kez yazdırma (sadece okuyup geçmek yok)
  function abschreibHTML(ziel) {
    return `<form class="cevap" id="abschreib-form" autocomplete="off">
        <input id="cevap" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Bir kez yaz: ${esc(ziel)}" aria-label="Kelimeyi bir kez yaz">
        <button class="btn ana" type="submit">Öğren <kbd>Enter</kbd></button></form>
      <div class="sira" style="margin:0"><span class="soluk" id="abschreib-hinweis">Yazarak kaydet, sonra hemen sorulacak.</span><button class="btn mini" data-act="bekannt" type="button">Zaten biliyorum</button></div>`;
  }

  function ndekTabelle(n) {
    const f = k => G.np(n, k, { det: 'def' }).join(' ');
    const kopf = n.weak ? `<b>n-Deklination:</b> Nominativ dışında her hâlde <b>-${esc(G.np(n, 'A', { det: 'def' })[1].slice(n.lemma.length))}</b>${/ns$/.test(n.gen || '') ? ', Genitiv\'de ayrıca -s' : ''}`
      : '<b>Dikkat:</b> n-Deklination <b>değil</b>, Akk / Dat ek almaz';
    return `<div class="kural">${kopf}</div><div class="formlar">
      <div><span class="et">Nominativ</span>${esc(f('N'))}</div><div><span class="et">Akkusativ</span>${esc(f('A'))}</div>
      <div><span class="et">Dativ</span>${esc(f('D'))}</div><div><span class="et">Genitiv</span>${esc(f('G'))}</div>
      ${n.plf ? `<div><span class="et">Plural</span>die ${esc(n.plf)}</div>` : ''}</div>`;
  }

  function reflTabelle(v) {
    const pr = G.praesensForms(v);
    const k = v.refl === 'D' ? 'rD' : 'rA';
    const es = v.refl === 'D' ? ' es' : '';
    const pre = v.pre ? ' ' + v.pre : '';
    const zeilen = [['ich', 0, 'ich'], ['du', 1, 'du'], ['er / sie', 2, 'er'], ['wir', 3, 'wir'], ['ihr', 4, 'ihr'], ['sie / Sie', 5, 'sie_pl']]
      .map(([l, i, pk]) => `<div><span class="et">${l}</span>${esc(pr[i] + es + ' ' + G.PERS[pk][k] + pre)}</div>`).join('');
    return `<div class="kural"><b>Dönüşlü (${v.refl === 'D' ? 'Dativ: mir / dir' : 'Akkusativ: mich / dich'})</b>${v.refl === 'D' ? ' · Akk nesne: es / den Film …' : ''} · Perfekt: <b>hat sich ${esc(v.p2)}</b></div>
      <div class="formlar">${zeilen}</div>`;
  }

  function frageWort(n, lv) {
    const ex = (n.bsp || []).find(b => b.includes(n.lemma) || (n.plf && b.includes(n.plf)));
    const lem = n.lemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hint = lv === 0 && ex ? `<div class="soluk">Örnek: ${esc(ex.replace(new RegExp('\\b(?:(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer)\\s+)?' + lem + '\\w*', 'g'), '_____'))}</div>` : '';
    const syn = synOf(n.id, n.tr);
    const synHint = syn.length ? `<div class="soluk">Anlamdaşı var · başı: <code>${esc(synPraefix(n.id, syn))}…</code></div>` : '';
    return {
      html: `<div class="tur"><span>kelime · Türkçe → Almanca</span></div>
        <div class="soru">${esc(n.tr)}<span class="alt">Artikeliyle yaz${n.plOnly ? ' (çoğul isim)' : ''}: der / die / das + isim</span></div>${hint}${synHint}`,
      syn: inp => synTreffer(syn, inp),
      ziel: (n.plOnly ? 'die ' : n.art + ' ') + n.lemma, input: true, placeholder: 'z. B. der Bahnhof',
      pruef: inp => pruefWort(n, inp),
      loesungHTML: () => `${artHTML(n)}${n.plf && !n.plOnly ? ` <span class="soluk">· Pl. die ${esc(n.plf)}</span>` : ''}`,
      erkl: () => (n.bsp || []).slice(0, 1).map(b => 'Örnek: ' + deHTML(b)),
      frageText: n.tr,
    };
  }
  function pruefWort(n, inp) {
    const ziel = (n.plOnly ? 'die ' : n.art + ' ') + n.lemma;
    const r = G.pruefen(inp, ziel);
    const t = G.norm(inp).split(' ');
    if (r.urteil !== 'richtig') {
      const art = t.length > 1 ? t[0].toLowerCase() : null;
      const rest = t.length > 1 ? t.slice(1).join(' ') : t[0];
      const nounOk = G.pruefen(rest, n.lemma).urteil !== 'falsch';
      if (nounOk && art !== (n.plOnly ? 'die' : n.art)) {
        r.urteil = 'falsch';
        r.tags = [art && /^(der|die|das)$/.test(art) ? `artikel: ${art} → ${n.plOnly ? 'die' : n.art}` : 'artikel eksik'];
      }
      else if (!nounOk) r.tags = ['kelime yanlış'].concat(art && /^(der|die|das)$/.test(art) && art !== (n.plOnly ? 'die' : n.art) ? [`artikel: ${n.plOnly ? 'die' : n.art}`] : []);
    }
    return r;
  }

  function frageAbr(v, lv) {
    const preps = v.obj.filter(o => o.p);
    const ipucu = lv === 0 ? v.anz.split(' ').map(w => w[0] + '·'.repeat(Math.max(0, w.length - 1))).join(' ') : '';
    const syn = synOf(v.id, v.tr);
    return {
      syn: inp => synTreffer(syn, inp),
      html: `<div class="tur"><span>fiil · Türkçe → Almanca</span></div>
        <div class="soru">${esc(v.tr)}${preps.length ? `<span class="alt">Edatla birlikte yaz, ardından hâli: <b>A</b> (Akk) ya da <b>D</b> (Dat). Örnek: sich freuen auf A</span>` : v.refl ? '<span class="alt">Gerekiyorsa sich ile yaz.</span>' : ''}</div>
        ${ipucu ? `<div class="soluk">İpucu: <code>${esc(ipucu)}</code></div>` : syn.length ? `<div class="soluk">Anlamdaşı var · başı: <code>${esc(synPraefix(v.id, syn))}…</code></div>` : ''}`,
      ziel: v.anz + (v.obj.length ? ' (' + G.objMuster(v) + ')' : ''), input: true,
      placeholder: preps.length ? 'z. B. warten auf A' : 'Almanca fiil',
      pruef: inp => pruefAbr(v, inp),
      loesungHTML: () => `<b>${esc(v.anz)}</b>${v.obj.length ? ` <span class="chip vurgu">${esc(G.objMuster(v))}</span>` : ''}`,
      erkl: () => [(v.refl === 'D' ? 'Dativ dönüşlü: <b>mir / dir / sich</b>' : v.refl ? 'Dönüşlü fiil: <b>mich / dich / sich / uns / euch</b>' : '')].concat(v.bsp && v.bsp[0] ? ['Örnek: ' + deHTML(v.bsp[0])] : []).filter(Boolean),
      frageText: v.tr,
    };
  }
  // Başka bir anlamdaşı yazdıysa: yanlış sayılmaz, tekrar denetilir
  function synTreffer(ids, inp) {
    const u = G.norm(inp.replace(/\+/g, ' ')).toLowerCase().replace(/\s+(a|akk|d|dat)$/g, '').replace(/\s+(a|d)\s+/g, ' ');
    for (const id of ids) {
      const w = id[0] === 'v' ? vById[id].anz.replace('sich(D)', 'sich') : label(id);
      const bare = id[0] === 'v' ? w : byId[id].lemma;
      if (u === w.toLowerCase() || u === bare.toLowerCase() || u === w.replace(/^sich /, '').toLowerCase()) return w;
    }
    return null;
  }

  function pruefAbr(v, inp) {
    const preps = v.obj.filter(o => o.p);
    let toks = G.norm(inp.replace(/\+/g, ' ')).split(' ').filter(Boolean);
    const kas = {};
    const out = [];
    toks.forEach((t, i) => {
      if (/^(a|akk|akkusativ|d|dat|dativ)\.?$/i.test(t) && i > 0 && preps.some(p => p.p === toks[i - 1].toLowerCase())) kas[toks[i - 1].toLowerCase()] = t[0].toUpperCase();
      else out.push(t);
    });
    const r = G.pruefen(out.join(' '), v.anz.replace('sich(D)', 'sich'));
    if (r.urteil !== 'falsch') {
      preps.forEach(p => {
        if (!kas[p.p]) { r.urteil = r.urteil === 'richtig' ? 'fast' : r.urteil; r.tags.push(`hâl yazılmadı (${p.p} + ${p.k === 'A' ? 'Akk' : 'Dat'})`); }
        else if (kas[p.p] !== p.k) { r.urteil = 'falsch'; r.tags.push(`hâl: ${p.p} + ${p.k === 'A' ? 'Akk' : 'Dat'}`); }
      });
    }
    return r;
  }

  function frageBed(v) {
    const zeig = v.anz;
    return {
      html: `<div class="tur"><span>anlam · yardımsız</span></div>
        <div class="soru de">${esc(zeig)}<span class="alt">Türkçesi ne? Yaz (ya da aklından söyle), sonra aç.</span></div>`,
      self: true, frageText: zeig, selbstInput: true,
      loesungHTML: () => `<b>${esc(v.tr)}</b>${v.obj.length ? ` <span class="chip">${esc(G.objMuster(v))}</span>` : ''}`,
      erkl: () => (v.bsp || []).slice(0, 1).map(b => 'Örnek: ' + deHTML(b)),
      ziel: v.tr,
    };
  }

  function frageFrm(v) {
    const a = pick(formAufgaben(v));
    return {
      html: `<div class="tur"><span>çekim · ${esc(a.et)}</span></div>
        <div class="soru de">${esc((v.refl ? 'sich ' : '') + v.inf)}<span class="alt">${esc(v.tr)}</span></div>
        <div class="chips"><span class="chip vurgu">${esc(a.pers)} · ${esc(a.et)}</span></div>`,
      ziel: a.ans, input: true, placeholder: a.key === 'perf' ? 'z. B. hat gemacht' : 'çekimli biçim',
      pruef: inp => {
        const clean = G.norm(inp).replace(/^(er|sie|es|du|er\/sie)\s+/i, '');
        const alts = a.key === 'perf' && v.auxAlt ? [a.ans.replace(/^(hat|ist)/, v.auxAlt)] : [];
        const r = G.pruefen(clean, a.ans, alts);
        if (r.urteil === 'falsch' && a.key === 'perf') {
          const au = clean.split(' ')[0];
          if (/^(hat|ist)$/.test(au) && au !== v.aux) r.tags.push(`yardımcı fiil: ${v.aux === 'ist' ? 'sein (ist)' : 'haben (hat)'}`);
        }
        return r;
      },
      loesungHTML: () => `${esc(a.pers)} <b>${esc(a.ans)}</b>`,
      erkl: () => [a.key === 'perf' ? (v.aux === 'ist' ? 'Perfekt <b>sein</b> ile: hareket / durum değişikliği' : 'Perfekt <b>haben</b> ile') : '',
        `Formlar: ${esc(G.praesensForms(v)[2])}${v.pre ? ' … ' + esc(v.pre) : ''} · ${esc((v.pt3 || '').split('/')[0])} · ${esc(v.aux)} ${esc(v.p2)}`].filter(Boolean),
      frageText: `${v.anz} — ${a.pers} ${a.et}`,
    };
  }

  function frageSatz(v, lv) {
    const hist = S.kontext[v.id] || [];
    const useLuecke = v.lueckenListe.length && (!v.rahmen || Math.random() < 0.3);
    if (!useLuecke && v.rahmen) {
      let u = null;
      for (let i = 0; i < 6; i++) { u = G.uebung(v, lv, Math.random, OPTS); if (u && !hist.includes(u.de)) break; }
      if (u) return satzAusUebung(v, u, lv);
    }
    const cands = v.lueckenListe.filter(l => !hist.includes(l.text));
    const l = cands.length ? pick(cands) : pick(v.lueckenListe);
    return {
      html: `<div class="tur"><span>cümle · boşluk doldur (Goethe örneği)</span></div>
        <div class="soru">${deHTML(l.text).replace(/_____/g, '<span class="bosluk">_____</span>')}</div>
        <div class="chips"><span class="chip vurgu">${esc(v.tr)}</span>${lv === 0 && l.answer.toLowerCase() !== v.inf.toLowerCase() ? `<span class="chip">${esc(v.anz)}</span>` : ''}${l.n > 1 ? `<span class="chip">${l.n} boşluk: sırayla, boşlukla ayırarak yaz</span>` : ''}</div>`,
      ziel: l.answer, input: true, placeholder: 'eksik kelime(ler)', kontext: l.text, modus: 'luecke',
      pruef: inp => G.pruefen(inp, l.answer),
      loesungHTML: () => { const w = l.answer.split(' '); let i = 0; return deHTML(l.text.replace(/_____/g, () => w[i++] || '')); },
      erkl: () => [`${esc(v.anz)}: ${esc(v.tr)}`],
      frageText: l.text,
    };
  }

  function frageNdek(n, lv) {
    const a = G.ndekAufgabe(n, Math.random, lv);
    const text = deHTML(a.text).replace('___', '<span class="bosluk">_____</span>');
    return {
      html: `<div class="tur"><span>n-Deklination · boşluğa isim öbeğini yaz</span></div>
        <div class="soru">${text}</div>
        <div class="chips"><span class="chip vurgu">${artHTML(n)} · ${esc(kurzTr(n.tr))}</span><span class="chip">${esc(a.detTr)}</span>${lv === 0 ? `<span class="chip">${G.KASUS_TR[a.kasus]}</span>` : ''}</div>`,
      ziel: a.antwort, input: true, placeholder: 'z. B. den Kollegen', modus: 'ndek', kontext: a.satz,
      pruef: inp => {
        const r = G.pruefen(inp, a.antwort, a.alts);
        if (r.urteil !== 'richtig') {
          const u = G.norm(inp).split(' ').pop();
          const soll = a.antwort.split(' ').pop();
          if (n.weak && a.kasus !== 'N' && u === n.lemma) r.tags.push('n-Deklination: -n eksik');
          if (!n.weak && u !== soll && u.startsWith(n.lemma) && a.kasus !== 'G') r.tags.push('n-Deklination değil: ek yok');
          if (n.weak && a.kasus === 'N' && u !== n.lemma) r.tags.push('Nominativ: ek yok');
        }
        return r;
      },
      loesungHTML: () => deHTML(a.satz),
      erkl: () => a.erkl,
      frageText: a.text + ' [' + a.detTr + ']',
    };
  }

  function frageRefl(v, lv) {
    const a = G.reflAufgabe(v, Math.random, OPTS);
    return {
      html: `<div class="tur"><span>dönüşlü fiil · kısa cümle kur</span></div>
        <div class="gorev">
          <div class="gorev-satir"><span class="et">fiil</span><span><b>${esc(v.anz)}</b><span class="de-ipucu">${esc(v.tr)}</span></span></div>
          <div class="gorev-satir"><span class="et">kim · zaman</span><span><b>${esc(a.tr)}</b></span></div>
          ${a.objZeig ? `<div class="gorev-satir"><span class="et">nesne</span><span>${esc(a.objZeig)}</span></div>` : ''}
        </div>
        ${a.esHinweis ? '<div class="soluk">Akk nesne olarak <b>es</b> kullan (örnek: Ich sehe es mir an).</div>' : ''}`,
      ziel: a.satz, alts: a.alts, input: true, placeholder: a.typ === 'imp' ? 'z. B. Beeil dich!' : 'z. B. wir freuen uns', modus: 'refl', kontext: a.satz,
      pruef: inp => G.pruefen(inp, a.satz, a.alts),
      loesungHTML: () => deHTML(a.satz),
      erkl: () => a.erkl,
      frageText: `${v.anz} | ${a.tr}${a.objZeig ? ' | ' + a.objZeig : ''}`,
    };
  }

  // "çanta; cep" → "çanta", "arkadaş (kadın)" korunur
  const kurzTr = t => String(t).split(';')[0].trim();

  function satzAusUebung(v, u, lv) {
    const p = u.prompt;
    const obj = p.objs.map(o => {
      if (o.frage) return `<span class="nesne"><b>?</b> <span class="soluk">(bunu soru kelimesiyle sor)</span></span>`;
      if (o.pron) return `<span class="nesne"><b>${esc(o.tr)}</b> <span class="soluk">(zamir)</span></span>`;
      const art = o.art.startsWith('die (Pl') ? 'pl' : o.art;
      const pre = [o.poss ? esc(o.poss) : '', o.indef ? '<span class="soluk">bir</span>' : '', o.adj ? esc(ADJ_TR[o.adj] || o.adj) : ''].filter(Boolean).join(' ');
      return `<span class="nesne">${pre ? pre + ' ' : ''}<b>${esc(kurzTr(o.tr))}</b> <span class="art art-${art}">${esc(o.art)}</span>${o.de ? `<span class="de-ipucu">${esc(o.de)}</span>` : ''}${o.bare ? ' <span class="soluk">(artikelsiz)</span>' : ''}</span>`;
    }).join('');
    let subj = p.subj ? `<b>${esc(p.subj)}</b>` : '';
    if (p.subjNP) { const a = p.subjNP.art.startsWith('die (Pl') ? 'pl' : p.subjNP.art; subj = `<b>${esc(kurzTr(p.subjNP.tr))}</b> <span class="art art-${a}">${esc(p.subjNP.art)}</span>${p.subjNP.de ? `<span class="de-ipucu">${esc(p.subjNP.de)}</span>` : ''}`; }
    return {
      html: `<div class="tur"><span>cümle kur · Türkçe → Almanca</span></div>
        <div class="gorev">
          <div class="gorev-satir"><span class="et">fiil</span><span><b>${esc(p.verb.tr)}</b>${p.verb.de ? `<span class="de-ipucu">${esc(p.verb.de)}</span>` : ''}</span></div>
          <div class="gorev-satir"><span class="et">özne</span><span>${subj}</span></div>
          ${obj ? `<div class="gorev-satir"><span class="et">nesne</span><span>${obj}</span></div>` : ''}
        </div>
        <div class="chips">${p.chips.map((c, i) => `<span class="chip ${i === 0 ? 'vurgu' : c === 'olumsuz' ? 'olumsuz' : ''}">${esc(c)}</span>`).join('')}</div>`,
      ziel: u.de, alts: u.alts, input: true, placeholder: 'Almanca cümle', kontext: u.de, modus: 'satz',
      pruef: inp => G.pruefen(inp, u.de, u.alts),
      loesungHTML: () => deHTML(u.de),
      erkl: () => u.erkl,
      frageText: `${p.verb.tr} | ${p.subj || (p.subjNP && p.subjNP.tr) || ''} | ${p.objs.map(o => o.tr).join(', ')} | ${p.chips.join(', ')}`,
    };
  }

  // ================= Çizim =================
  const kart = $('#kart');

  function zeige() {
    renderHedef();
    const d = heuteM(session.modus);
    if (d.n >= ziel(session.modus) && !session.zielGesehen[session.modus]) {
      session.zielGesehen[session.modus] = true;
      kart.innerHTML = `<div class="bos"><div class="buyuk">Bugünlük tamam.</div>
        <div class="soluk">${esc(MODI[session.modus].ad)}: ${d.n} soru, ${d.richtig} doğru, ${d.fast} küçük hata, ${d.falsch} yanlış.</div>
        <div class="sira"><button class="btn ana" data-act="weiter" type="button">Devam et</button></div></div>`;
      aktuell = { typ: 'pause' };
      $('#durum-satiri').innerHTML = '';
      return;
    }
    const sel = waehle();
    $('#durum-satiri').innerHTML = '';
    if (!sel) {
      aktuell = { typ: 'leer' };
      const m = session.modus, hm = heuteM(m);
      kart.innerHTML = m === 'zayif'
        ? `<div class="bos"><div class="buyuk">Zayıf öğe yok.</div><div class="soluk">Yanlış yaptıkların burada toplanır.</div><button class="btn ana" data-act="normal" type="button">Karışık çalışmaya dön</button></div>`
        : `<div class="bos"><div class="buyuk">${esc(MODI[m].ad)}: şu an tekrar yok.</div>
          <div class="soluk">Bugün ${hm.n} soru, ${hm.neu} / ${neuMax(m)} ${esc(MODI[m].neuTr)}. Sıradaki tekrar: ${naechsteFaelligkeit()}.<br>İstersen ekstra çalış: bu bölümden 5 yeni öğe ya da unutmaya en yakın kartlar.</div>
          <button class="btn ana" data-act="extra" type="button">Ekstra çalış</button></div>`;
      return;
    }
    aktuell = frage(sel);
    const q = aktuell;
    const info = [];
    if (session.modus !== 'normal') info.push(`<span class="chip vurgu">odak: ${{ zayif: 'zayıflar', ndek: 'n-Deklination', refl: 'dönüşlü fiiller' }[session.modus]}</span>`);
    if (q.requeue) info.push('<span class="chip">tekrar: az önce yanlış</span>');
    if (q.typ !== 'einf') {
      const c = S.karten[q.uid];
      info.push(`<span>${esc(label(q.id))}</span>`);
      if (c && c.S) info.push(`<span class="soluk">· ipucu seviyesi ${q.lv}/3</span>`);
    }
    $('#durum-satiri').innerHTML = info.join(' ');
    let h = q.html;
    if (q.input) {
      h += `<form class="cevap" id="cevap-form" autocomplete="off"><input id="cevap" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="${esc(q.placeholder || '')}" aria-label="Cevap"><button class="btn ana" type="submit">Kontrol <kbd>Enter</kbd></button></form>
        <div class="sira soluk" style="margin:0"><button class="btn mini" type="button" data-act="weiss-nicht">Bilmiyorum</button></div>`;
    } else if (q.self) {
      h += `<form class="cevap" id="selbst-form" autocomplete="off"><input id="cevap" type="text" spellcheck="false" autocomplete="off" placeholder="Türkçesi (isteğe bağlı)" aria-label="Türkçe anlamı"><button class="btn ana" type="submit" data-act="aufdecken">Göster <kbd>Enter</kbd></button></form>`;
    }
    h += '<div id="sonuc"></div>';
    kart.innerHTML = h;
    const inp = $('#cevap');
    if (inp) inp.focus();
  }

  function naechsteFaelligkeit() {
    const ds = Object.values(S.karten).map(c => c.due).filter(Boolean);
    if (!ds.length) return '—';
    const m = Math.min(...ds);
    const d = m - now();
    if (d < 3600000) return `${Math.max(1, Math.round(d / 60000))} dk sonra`;
    if (d < DAY) return `${Math.round(d / 3600000)} saat sonra`;
    return new Date(m).toLocaleDateString('tr-TR');
  }

  function diffHTML(res, input) {
    const parts = res.diff.map(x => x.op === 'eq' ? esc(x.t) : x.op === 'ins' ? `<span class="ins">${esc(x.t)}</span>` : `<span class="del">${esc(x.t)}</span>`);
    return parts.join(' ');
  }

  function auswerten(input, weissNicht) {
    const q = aktuell;
    if (!q || q.done) return;
    // anlamdaşı yazdıysa: yanlış sayma, tekrar sor
    const syn = !weissNicht && q.syn && q.syn(input);
    if (syn) {
      $('#sonuc').innerHTML = `<div class="sonuc fast"><div class="baslik">≈ ${esc(syn)} da bu anlama geliyor, ama aranan başka bir kelime. Tekrar dene.</div></div>`;
      const i = $('#cevap'); i.value = ''; i.focus();
      q.synVersuche = (q.synVersuche || []).concat(syn);
      return;
    }
    q.done = true;
    q.antwort = input;
    q.sek = Math.round((now() - q.start) / 1000);
    const res = weissNicht ? { urteil: 'falsch', tags: ['bilmiyorum'], diff: [], ziel: q.ziel } : q.pruef(input);
    q.res = res;
    const vorschlag = res.urteil === 'richtig' ? 3 : res.urteil === 'fast' ? 2 : 1;
    const titel = { richtig: '✓ Doğru', fast: '≈ Küçük hata', falsch: '✗ Yanlış' }[res.urteil];
    const input$ = $('#cevap'); if (input$) input$.disabled = true;
    const erkl = (q.erkl ? q.erkl() : []).filter(Boolean);
    const box = $('#sonuc');
    box.innerHTML = `<div class="sonuc ${res.urteil}">
      <div class="baslik">${titel}${res.tags.length ? `<span class="etiketler">${res.tags.map(t => `<span class="etiket">${esc(t)}</span>`).join('')}</span>` : ''}</div>
      ${res.urteil !== 'richtig' ? `<div class="satir"><span class="et">senin</span><span class="deger fark">${weissNicht ? '<span class="soluk">—</span>' : diffHTML(res, input)}</span></div>` : ''}
      <div class="satir"><span class="et">doğru</span><span class="deger">${q.loesungHTML()}</span></div>
      ${erkl.length ? `<ul class="erkl">${erkl.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
      ${res.urteil === 'richtig' ? `<div class="soluk">Sonraki soru geliyor … <kbd>Enter</kbd> hemen geç · <kbd>1</kbd>/<kbd>2</kbd> notu düşür</div>`
        : `<div class="notlar">${[1, 2, 3].map(g => `<button class="btn n${g} ${g === vorschlag ? 'oneri' : ''}" data-note="${g}" type="button"><kbd>${g}</kbd> ${['', 'yanlış', 'küçük hata', 'doğru'][g]}</button>`).join('')}</div>`}
    </div>`;
    q.vorschlag = vorschlag;
    if (res.urteil === 'richtig') {
      q.autoTimer = setTimeout(() => benoten(3), 2200);
    }
  }

  function aufdecken() {
    const q = aktuell;
    if (!q || !q.self || q.offen) return;
    q.offen = true;
    q.sek = Math.round((now() - q.start) / 1000);
    const i0 = $('#cevap');
    const getippt = i0 ? i0.value.trim() : '';
    const erkl = (q.erkl ? q.erkl() : []).filter(Boolean);
    $('#sonuc').innerHTML = `<div class="sonuc">
      ${getippt ? `<div class="satir"><span class="et">senin</span><span class="deger">${esc(getippt)}</span></div>` : ''}
      <div class="satir"><span class="et">anlamı</span><span class="deger">${q.loesungHTML()}</span></div>
      ${erkl.length ? `<ul class="erkl">${erkl.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
      <div class="notlar">${[1, 2, 3].map(g => `<button class="btn n${g}" data-note="${g}" type="button"><kbd>${g}</kbd> ${['', 'bilemedim', 'kısmen', 'bildim'][g]}</button>`).join('')}</div></div>`;
    const i = $('#cevap');
    if (i) { q.antwort = i.value.trim(); i.disabled = true; }
    const btn = kart.querySelector('[data-act="aufdecken"]'); if (btn) btn.remove();
  }

  function benoten(g) {
    const q = aktuell;
    if (!q || q.benotet) return;
    if (q.self && !q.offen) return;
    if (!q.self && !q.done) return;
    q.benotet = true;
    clearTimeout(q.autoTimer);
    const t = now();
    const c = FSRS.review(S.karten[q.uid] || {}, g, t, S.einst.ret);
    delete c.neu;
    S.karten[q.uid] = c;
    const urteil = g === 3 ? 'richtig' : g === 2 ? 'fast' : 'falsch';
    const d = heute();
    d.n++; d[urteil]++;
    const dm = heuteM(session.modus); dm.n++; dm[urteil]++;
    d[CAT[q.typ]] = (d[CAT[q.typ]] || 0) + 1;
    session.q++;
    session.cats[CAT[q.typ]]++;
    session.letzte.push(CAT[q.typ]);
    session.sonItem = q.id;
    // oturum içi tekrar: yanlış → 4 soru sonra (en fazla 2 kez)
    const mal = q.requeue ? q.requeue.mal + 1 : 0;
    if (g === 1 && mal < 2) session.requeue.push({ uid: q.uid, nach: session.q + 4, mal });
    // ilk başarılı anlam hatırlamadan sonra çekim ve cümle birimleri açılır
    if (q.typ === 'abr' && g >= 2) {
      ['frm', 'satz', 'refl'].forEach((u, i) => {
        const key = q.id + ':' + u;
        if (unitsOf(q.id).includes(u) && !S.karten[key]) S.karten[key] = { due: t + (i + 2) * 3 * 60000, neu: true };
      });
    }
    if (q.kontext) {
      const h = S.kontext[q.id] || (S.kontext[q.id] = []);
      h.push(q.kontext); if (h.length > 12) h.shift();
    }
    const notiz = [];
    if (q.res && q.res.tags && q.res.tags.length) notiz.push(q.res.tags.join(', '));
    if (q.vorschlag && q.vorschlag !== g) notiz.push(`öneri:${['', 'falsch', 'fast', 'richtig'][q.vorschlag]}`);
    notiz.push(`sek:${q.sek}`, `ipucu:${q.lv}`);
    logEintrag({ modus: q.modus || q.typ, id: q.uid, item: label(q.id), frage: q.frageText || '', antwort: q.self ? (q.antwort || '(sözlü)') : (q.antwort || ''), ergebnis: urteil, loesung: q.ziel || '', notiz: notiz.join(' | ') });
    save();
    zeige();
  }

  function einfAktion(bekannt) {
    const q = aktuell;
    if (!q || q.typ !== 'einf') return;
    if (!bekannt && q.abschreib) {
      const i = $('#cevap');
      const r = G.pruefen(i ? i.value : '', q.abschreib);
      if (r.urteil === 'falsch') {
        $('#abschreib-hinweis').innerHTML = `Tam olarak yaz: <b>${esc(q.abschreib)}</b>`;
        if (i) { i.select(); i.focus(); }
        return;
      }
    }
    einfuehren(q.id, bekannt);
    logEintrag({ modus: 'yeni', id: q.id, item: label(q.id), frage: '', antwort: '', ergebnis: bekannt ? 'bekannt' : 'neu', loesung: '', notiz: '' });
    zeige();
  }

  // ================= Log =================
  const CSV_KOPF = 'zeit;modus;id;item;frage;antwort;ergebnis;loesung;notiz';
  const csvZelle = s => { s = String(s == null ? '' : s).replace(/\r?\n/g, ' '); return /[;"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function zeitStr(t) { const d = new Date(t); return `${tag(t)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; }
  function logEintrag(e) {
    e.zeit = zeitStr(now());
    S.log.push(e);
    S.pending.push(e);
    save();
    dateiSchreiben();
  }
  const csvZeile = e => [e.zeit, e.modus, e.id, e.item, e.frage, e.antwort, e.ergebnis, e.loesung, e.notiz].map(csvZelle).join(';');

  // ---- Klasör (File System Access API, Chrome/Edge) ----
  let ordner = null, schreibt = false;
  const idb = (mode, fn) => new Promise((res, rej) => {
    const r = indexedDB.open('almanca-tekrar', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => { const tx = r.result.transaction('kv', mode); const st = tx.objectStore('kv'); const q = fn(st); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); };
  });
  async function ordnerLaden() {
    if (!window.showDirectoryPicker) { $('#klasor-durum').textContent = 'Bu tarayıcı klasöre yazamıyor. Chrome ya da Edge kullan; ya da log.csv indir.'; return; }
    try {
      const h = await idb('readonly', st => st.get('ordner'));
      if (!h) { $('#klasor-durum').textContent = 'Bağlı klasör yok.'; return; }
      const p = await h.queryPermission({ mode: 'readwrite' });
      if (p === 'granted') { ordner = h; $('#klasor-durum').textContent = `Bağlı: ${h.name}`; dateiSchreiben(); }
      else { ordnerWartet = h; $('#klasor-durum').textContent = `${h.name}: izin gerekiyor. "Klasörü bağla"ya bas.`; $('#klasor').textContent = 'İzni yenile'; }
    } catch (e) { $('#klasor-durum').textContent = 'Klasör okunamadı.'; }
  }
  let ordnerWartet = null;
  async function ordnerVerbinden() {
    try {
      let h = ordnerWartet;
      if (h) { const p = await h.requestPermission({ mode: 'readwrite' }); if (p !== 'granted') return; }
      else h = await window.showDirectoryPicker({ mode: 'readwrite', id: 'almanca-tekrar' });
      ordner = h; ordnerWartet = null;
      await idb('readwrite', st => st.put(h, 'ordner'));
      $('#klasor-durum').textContent = `Bağlı: ${h.name}`;
      $('#klasor').textContent = 'Klasörü değiştir';
      dateiSchreiben(true);
    } catch (e) { if (e.name !== 'AbortError') $('#klasor-durum').textContent = 'Bağlanamadı: ' + e.message; }
  }
  async function dateiSchreiben(zustandAuch) {
    if (!ordner || schreibt) return;
    schreibt = true;
    try {
      const dir = await ordner.getDirectoryHandle('log', { create: true });
      if (S.pending.length) {
        const fh = await dir.getFileHandle('log.csv', { create: true });
        const f = await fh.getFile();
        const w = await fh.createWritable({ keepExistingData: true });
        const batch = S.pending.slice();
        let text = batch.map(csvZeile).join('\n') + '\n';
        if (f.size === 0) text = '﻿' + CSV_KOPF + '\n' + text;
        await w.seek(f.size); await w.write(text); await w.close();
        S.pending.splice(0, batch.length);
        save();
      }
      if (zustandAuch || session.q % 10 === 0) {
        const zh = await dir.getFileHandle('zustand.json', { create: true });
        const w2 = await zh.createWritable();
        await w2.write(JSON.stringify(Object.assign({}, S, { log: [], pending: [], gespeichert: zeitStr(now()) })));
        await w2.close();
      }
      schreibt = false;
      if (S.pending.length) setTimeout(dateiSchreiben, 50);
      return;
    } catch (e) { console.warn('log yazılamadı', e); $('#klasor-durum').textContent = 'Yazılamadı: ' + e.message; }
    schreibt = false;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) dateiSchreiben(true); });

  function herunterladen(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ================= Görünümler =================
  // üstteki sayaç: seçili bölümün bugünkü hedefi
  function renderHedef() {
    const m = session.modus, d = heuteM(m), z = ziel(m);
    $('#hedef-n').textContent = d.n;
    $('#hedef-z').textContent = z;
    $('#hedef-dolu').style.width = Math.min(100, d.n / z * 100) + '%';
    $('#hedef').classList.toggle('tamam', d.n >= z);
    $('#hedef').title = `${MODI[m].ad}: bugün ${d.n} / ${z} soru · yeni ${d.neu} / ${neuMax(m)}`;
  }

  function itemStatus(id) {
    if (!S.items[id]) return 'neu';
    if (schwach(id)) return 'schwach';
    const cs = unitsOf(id).map(u => S.karten[id + ':' + u]).filter(Boolean);
    if (cs.length && cs.every(c => c.S && c.S >= 21)) return 'sitzt';
    return 'lernt';
  }
  const STATUS_TR = { neu: 'yeni', lernt: 'öğreniliyor', sitzt: 'oturdu', schwach: 'zayıf' };

  function itemZeile(id, mitBtn) {
    const st = itemStatus(id);
    const de = id[0] === 'v' ? `<b>${esc(vById[id].anz)}</b>${vById[id].obj.length ? ` <span class="soluk">${esc(G.objMuster(vById[id]))}</span>` : ''}` : artHTML(byId[id]);
    const tr = id[0] === 'v' ? vById[id].tr : byId[id].tr;
    return `<div class="oge"><span class="de">${de}</span><span class="tr">${esc(tr)}</span>
      <span class="yan"><span class="durum-pil ${st}">${STATUS_TR[st]}</span>${mitBtn && st === 'neu' ? `<button class="btn mini" data-add="${id}" type="button">Ekle</button>` : ''}</span></div>`;
  }

  function renderListe() {
    const q = $('#ara').value.trim().toLowerCase();
    const tur = $('#tur').value, dur = $('#durum').value;
    const all = VERB_ORDER.map(v => v.id).concat(NOUN_ORDER.map(n => n.id));
    const hits = all.filter(id => {
      if (tur === 'v' && id[0] !== 'v') return false;
      if (tur === 'n' && id[0] === 'v') return false;
      if (tur === 'ndek' && !istNdek(id)) return false;
      if (tur === 'refl' && !istRefl(id)) return false;
      if (dur !== 'alle' && itemStatus(id) !== dur) return false;
      if (!q) return true;
      return label(id).toLowerCase().includes(q) || (id[0] === 'v' ? vById[id].tr : byId[id].tr).toLowerCase().includes(q);
    });
    $('#liste-say').textContent = `${hits.length} sonuç${hits.length > 150 ? ' · ilk 150 gösteriliyor' : ''}`;
    $('#liste').innerHTML = hits.slice(0, 150).map(id => itemZeile(id, true)).join('');
  }

  function renderZayif() {
    const ids = Object.keys(S.items).filter(schwach);
    $('#zayif-say').textContent = ids.length ? `${ids.length} öğe` : 'Şimdilik zayıf öğe yok.';
    $('#zayif-liste').innerHTML = ids.map(id => itemZeile(id, false)).join('');
  }

  function renderGecmis() {
    const t = now();
    const tage = [];
    for (let i = 20; i >= 0; i--) { const k = tag(t - i * DAY); tage.push([k, S.tage[k] || { n: 0, richtig: 0, fast: 0, falsch: 0, neuV: 0, neuN: 0 }]); }
    let streak = 0;
    for (let i = 0; ; i++) { const k = tag(t - i * DAY); if (S.tage[k] && S.tage[k].n > 0) streak++; else if (i > 0) break; else continue; if (i > 3650) break; }
    const items = Object.keys(S.items).length;
    const sitzt = Object.keys(S.items).filter(id => itemStatus(id) === 'sitzt').length;
    const d = heute();
    const ges = Object.values(S.tage).reduce((a, x) => a + x.n, 0);
    const bolum = x => Object.keys(MODI).filter(m => x.modi && x.modi[m] && x.modi[m].n)
      .map(m => `${esc(MODI[m].ad)} ${x.modi[m].n}/${ziel(m)}${x.modi[m].n >= ziel(m) ? ' ✓' : ''}`).join(' · ');
    $('#ozet').innerHTML = Object.keys(MODI).map(m => { const b = heuteM(m); return `<div class="tile"><div class="sayi">${b.n} / ${ziel(m)}</div><div class="et">bugün · ${esc(MODI[m].ad)}${m !== 'zayif' ? ` · yeni ${b.neu}/${neuMax(m)}` : ''}</div></div>`; }).join('') + [[streak, 'gün seri'], [items, 'öğrenilen öğe'], [sitzt, 'oturmuş (21+ gün)'], [ges, 'toplam cevap']]
      .map(([n, l]) => `<div class="tile"><div class="sayi">${n}</div><div class="et">${l}</div></div>`).join('');
    // grafik
    const W = 640, H = 170, pad = 24, bw = (W - pad * 2) / tage.length;
    const max = Math.max(10, ...tage.map(x => x[1].n)) || 1;
    const y = v => H - pad - v / max * (H - pad * 2);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Son 21 günde cevap sayısı">`;
    svg += `<text x="${pad}" y="${pad - 8}">en çok ${max} cevap</text>`;
    tage.forEach(([k, x], i) => {
      const x0 = pad + i * bw + 2, w = bw - 4;
      let acc = 0;
      [['richtig', 'var(--ok)'], ['fast', 'var(--warn)'], ['falsch', 'var(--bad)']].forEach(([key, col]) => {
        const v = x[key] || 0; if (!v) return;
        svg += `<rect x="${x0}" width="${w}" y="${y(acc + v)}" height="${y(acc) - y(acc + v)}" fill="${col}" rx="1.5"><title>${k}: ${key} ${v}</title></rect>`;
        acc += v;
      });
      if (i % 5 === 0 || i === tage.length - 1) svg += `<text x="${x0 + w / 2}" y="${H - 6}" text-anchor="middle">${k.slice(8)}.${k.slice(5, 7)}</text>`;
    });
    svg += `<line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" stroke="var(--line)"/></svg>`;
    $('#grafik').innerHTML = svg;
    $('#gun-tablo').innerHTML = `<thead><tr><th>gün</th><th class="num">cevap</th><th class="num">cümle</th><th class="num">kelime</th><th class="num">anlam</th><th class="num">doğru</th><th class="num">küçük h.</th><th class="num">yanlış</th><th class="num">yeni</th><th>bölümler</th></tr></thead><tbody>` +
      tage.slice().reverse().filter(([, x]) => x.n || x.neuV || x.neuN).map(([k, x]) => `<tr><td>${k}</td><td class="num">${x.n}</td><td class="num">${x.satz || 0}</td><td class="num">${x.wort || 0}</td><td class="num">${x.anlam || 0}</td><td class="num e-richtig">${x.richtig}</td><td class="num e-fast">${x.fast}</td><td class="num e-falsch">${x.falsch}</td><td class="num">${(x.neuV || 0) + (x.neuN || 0)}</td><td>${bolum(x)}</td></tr>`).join('') + '</tbody>';
    $('#feedback').innerHTML = FEEDBACK.length ? FEEDBACK.slice().reverse().slice(0, 60).map(f => `<div class="oge"><span class="de">${esc(f.antwort || '')} → ${deHTML(f.richtig || '')}</span><span class="tr">${esc(f.text || '')}</span><span class="yan"><span class="durum-pil ${f.urteil === 'richtig' ? 'sitzt' : f.urteil === 'falsch' ? 'schwach' : 'lernt'}">${esc(f.zeit || '')}</span></span></div>`).join('')
      : '<div class="oge"><span class="tr">Henüz yok. Log dosyasını pushlayıp Claude\'a "sonuçlarıma bak" de.</span></div>';
    $('#son-tablo').innerHTML = `<thead><tr><th>zaman</th><th>tür</th><th>öğe</th><th>cevap</th><th>sonuç</th><th>doğrusu</th></tr></thead><tbody>` +
      S.log.slice(-40).reverse().map(e => `<tr><td class="num">${esc(e.zeit.slice(5, 16))}</td><td>${esc(e.modus)}</td><td>${esc(e.item)}</td><td>${esc(e.antwort)}</td><td class="e-${esc(e.ergebnis)}">${esc(e.ergebnis)}</td><td>${deHTML(e.loesung)}</td></tr>`).join('') + '</tbody>';
  }

  function renderAyar() {
    $('#a-modi').innerHTML = `<thead><tr><th>bölüm</th><th class="num">günlük hedef (soru)</th><th class="num">günde yeni</th></tr></thead><tbody>` +
      Object.keys(MODI).map(m => `<tr><td>${esc(MODI[m].ad)}</td>
        <td class="num"><input type="number" min="5" max="300" id="z-${m}" value="${ziel(m)}" aria-label="${esc(MODI[m].ad)} hedef"></td>
        <td class="num">${m === 'zayif' ? '—' : `<input type="number" min="0" max="50" id="n-${m}" value="${neuMax(m)}" aria-label="${esc(MODI[m].ad)} yeni"> <span class="soluk">${esc(MODI[m].neuTr)}</span>`}</td></tr>`).join('') + '</tbody>';
    $('#a-ret').value = String(S.einst.ret);
  }

  function zeigView(v) {
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v ? 'true' : 'false'));
    document.querySelectorAll('.view').forEach(s => { s.hidden = s.id !== 'v-' + v; });
    if (v === 'liste') renderListe();
    if (v === 'zayif') renderZayif();
    if (v === 'gecmis') renderGecmis();
    if (v === 'ayar') renderAyar();
    if (v === 'calis') { const i = $('#cevap'); if (i) i.focus(); }
    try { history.replaceState(null, '', '#' + v); } catch (e) { /* file:// */ }
  }

  // ================= Olaylar =================
  document.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) zeigView(b.dataset.v); });

  kart.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'abschreib-form') { einfAktion(false); return; }
    if (e.target.id === 'selbst-form') { aufdecken(); return; }
    const inp = $('#cevap');
    if (!inp || !inp.value.trim() || aktuell.done) return;
    auswerten(inp.value);
  });
  kart.addEventListener('click', e => {
    const n = e.target.closest('[data-note]');
    if (n) { benoten(+n.dataset.note); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'lernen') einfAktion(false);
    else if (act === 'bekannt') einfAktion(true);
    else if (act === 'aufdecken') aufdecken();
    else if (act === 'weiss-nicht') auswerten('', true);
    else if (act === 'weiter') zeige();
    else if (act === 'extra') { session.extra = true; zeige(); }
    else if (act === 'normal') { setModus('normal'); zeige(); }
  });

  document.addEventListener('keydown', e => {
    if ($('#v-calis').hidden || !aktuell) return;
    const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT';
    if (aktuell.typ === 'einf' && !inInput) {
      if (e.key === 'Enter') { e.preventDefault(); einfAktion(false); }
      else if (e.key === 'b' || e.key === 'B') einfAktion(true);
      return;
    }
    if (aktuell.typ === 'pause' && e.key === 'Enter') { e.preventDefault(); zeige(); return; }
    if (aktuell.self && !aktuell.offen && !inInput && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); aufdecken(); return; }
    const offen = (aktuell.self && aktuell.offen) || aktuell.done;
    if (offen && !aktuell.benotet) {
      if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); benoten(+e.key); return; }
      if (e.key === 'Enter' && aktuell.res && aktuell.res.urteil === 'richtig') { e.preventDefault(); benoten(3); return; }
      if (e.key === 'Enter' && aktuell.done) { e.preventDefault(); benoten(aktuell.vorschlag); }
    }
  });

  // ä kısayolları
  const KURZ = { 'a:': 'ä', 'o:': 'ö', 'u:': 'ü', 's:': 'ß', 'A:': 'Ä', 'O:': 'Ö', 'U:': 'Ü' };
  kart.addEventListener('input', e => {
    const i = e.target; if (i.id !== 'cevap') return;
    const pos = i.selectionStart, two = i.value.slice(pos - 2, pos);
    if (KURZ[two]) { i.value = i.value.slice(0, pos - 2) + KURZ[two] + i.value.slice(pos); i.setSelectionRange(pos - 1, pos - 1); }
  });
  $('#umlaut').addEventListener('mousedown', e => e.preventDefault());
  $('#umlaut').addEventListener('click', e => {
    const b = e.target.closest('button'); const i = $('#cevap');
    if (!b || !i || i.disabled) return;
    const p = i.selectionStart; i.value = i.value.slice(0, p) + b.dataset.c + i.value.slice(i.selectionEnd); i.setSelectionRange(p + 1, p + 1); i.focus();
  });

  $('#ara').addEventListener('input', renderListe);
  $('#tur').addEventListener('change', renderListe);
  $('#durum').addEventListener('change', renderListe);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    einfuehren(b.dataset.add, false);
    renderListe();
  });
  function setModus(m) {
    if (!MODI[m]) m = 'normal';
    session.modus = m; session.letzteNeu = null; session.extra = false;
    session.cats = { satz: 0, wort: 0, anlam: 0 }; session.letzte = []; session.requeue = [];
    $('#odak').value = m;
    if (m === 'ndek' || m === 'refl') modulEinheiten();
    try { localStorage.setItem('almanca-tekrar-bolum', m); } catch (e) { /* yok */ }
    renderHedef();
  }
  $('#zayif-basla').addEventListener('click', () => { setModus('zayif'); zeigView('calis'); zeige(); });
  $('#odak').addEventListener('change', e => { setModus(e.target.value); zeige(); });

  $('#v-ayar').addEventListener('change', e => {
    const id = e.target.id || '';
    const m = id.slice(2);
    if (id.startsWith('z-') && MODI[m]) S.einst.modi[m].ziel = Math.max(5, Math.round(+e.target.value) || MODI[m].ziel);
    else if (id.startsWith('n-') && MODI[m]) S.einst.modi[m].neu = Math.max(0, Math.round(+e.target.value) || 0);
    else if (id === 'a-ret') S.einst.ret = +e.target.value || 0.9;
    else return;
    save(); renderHedef();
  });
  $('#klasor').addEventListener('click', ordnerVerbinden);
  $('#log-indir').addEventListener('click', () => herunterladen('log.csv', '﻿' + CSV_KOPF + '\n' + S.log.map(csvZeile).join('\n') + '\n', 'text/csv;charset=utf-8'));
  $('#yedek-indir').addEventListener('click', () => herunterladen('zustand.json', JSON.stringify(S), 'application/json'));
  $('#yedek-yukle').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const x = JSON.parse(await f.text()); S = Object.assign({}, DEF, x); S.einst = Object.assign({}, DEF.einst, x.einst); save(); renderAyar(); renderHedef(); zeige(); }
    catch (err) { $('#klasor-durum').textContent = 'Dosya okunamadı: ' + err.message; }
  });
  $('#sifirla').addEventListener('click', () => { $('#sifirla-onay').hidden = false; });
  $('#sifirla-hayir').addEventListener('click', () => { $('#sifirla-onay').hidden = true; });
  $('#sifirla-evet').addEventListener('click', () => {
    S = JSON.parse(JSON.stringify(DEF)); save(); $('#sifirla-onay').hidden = true; renderHedef(); zeige();
  });

  // ================= Başlat =================
  const start = (location.hash || '').replace('#', '');
  zeigView(['calis', 'zayif', 'liste', 'gecmis', 'ayar'].includes(start) ? start : 'calis');
  try { setModus(localStorage.getItem('almanca-tekrar-bolum') || 'normal'); } catch (e) { setModus('normal'); }
  zeige();
  ordnerLaden();
  window.__tekrar = { get S() { return S; }, get aktuell() { return aktuell; }, VERBEN, byId, G,
    _testOrdner: h => { ordner = h; return dateiSchreiben(true); } };
})();
