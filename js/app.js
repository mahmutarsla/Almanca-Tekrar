// Almanca Tekrar — uygulama: veri, durum, kuyruk, soru türleri, not verme, log, görünümler.
(function () {
  'use strict';

  // ================= Yardımcılar =================
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const now = () => Date.now();
  const DAY = 86400000;
  const tag = (t = now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  // Hızlı tur zamanları (baştan savmaya karşı)
  const DENKZEIT = 2000;     // seçenekler en erken 2 sn sonra açılır: önce aklından söyle
  const ZU_SCHNELL = 400;    // seçenekler açıldıktan sonra bundan hızlı basış okunmamış sayılır, hedefe sayılmaz
  const FLUESSIG = 3500;     // seçenek açıldıktan sonra bu sürede doğru = akıcı (3), sonrası = zor (2)
  const INTRO_MIN = 2000;    // tanıtım kartı en az bu kadar ekranda kalır
  const STAU = 80;           // bu kadar birikmiş tekrar varsa yeni kelime gelmez (bölüm başına)
  const stauGrenze = m => m === 'akis' ? 150 : STAU;  // tek akış bütün kartları birlikte sayar

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
  const WOERTER = window.WOERTER || [];
  const wById = Object.fromEntries(WOERTER.map(w => [w.id, w]));
  const PAKETE = window.PAKETE || [];
  const pById = Object.fromEntries(PAKETE.map(p => [p.id, p]));
  const FEEDBACK = window.FEEDBACK || [];
  const KANCA = window.KANCA || {};
  const SAETZE = window.SAETZE || {};
  const THEMEN = window.THEMEN || [];   // Goethe B1 konuları: [{id, de, tr, items}]
  const thById = Object.fromEntries(THEMEN.map(t => [t.id, t]));
  const THEMA_VON = {};   // öğe → konular (çeldiriciler aynı konudan)
  THEMEN.forEach(t => t.items.forEach(id => (THEMA_VON[id] = THEMA_VON[id] || []).push(t.id)));
  const SAETZE_REFL = window.SAETZE_REFL || {};
  const NSAETZE = window.NSAETZE || {};
  const GLOSSEN = window.GLOSSEN || {};            // Almanca cümle → "die Regierung = hükümet; …"            // isim / diğer kelime → çeviri cümleleri   // dönüşlü fiil → çeviri cümleleri
  const AUFGABEN = window.AUFGABEN || [];         // serbest yazma görevleri   // fiil → [{de, tr}] Goethe örnekleri, elle çevrildi

  // Öğe türü: v fiil · n isim (n…/x…) · w diğer kelime · p paket
  const kind = id => id[0] === 'v' ? 'v' : id[0] === 'w' ? 'w' : id[0] === 'p' ? 'p' : 'n';
  const trOf = id => ({ v: () => vById[id].tr, w: () => wById[id].tr, p: () => pById[id].titelTr, n: () => byId[id].tr })[kind(id)]();
  const label = id => ({
    v: () => vById[id].anz, w: () => wById[id].de, p: () => pById[id].titel,
    n: () => (byId[id].plOnly ? 'die ' : byId[id].art + ' ') + byId[id].lemma,
  })[kind(id)]();
  const kurzTr = t => String(t).split(';')[0].trim();
  // Türkçe → Almanca soruda: Türkçe anlamın parantezi cevabı içeriyorsa gizle ("-den itibaren (ab Montag)" → "-den itibaren (…)")
  function maskTr(tr, de) {
    const stems = String(de).replace(/^(der|die|das|sich)\s+/i, '').split(/[\s…/]+/).filter(w => w.length >= 2 && !/^(sich|der|die|das|sein|A|D)$/i.test(w))
      .map(w => w.toLowerCase().slice(0, Math.max(2, w.length - 2)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!stems.length) return String(tr);
    const re = new RegExp('(^|[^a-zäöüß])(' + stems.join('|') + ')', 'i');
    return String(tr).replace(/\(([^)]*)\)/g, (m, inner) => re.test(inner) ? '(…)' : m);
  }                                    // "çanta; cep" → "çanta"
  const optTr = t => kurzTr(t).replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();      // seçenek için parantezsiz

  // Dönüşlü alıştırma: aynı fiilin birden çok anlamı varsa (freuen auf / über) yalnız ilki
  const reflGesehen = new Set();
  VERBEN.forEach(v => {
    const k = v.base + v.pre + v.refl;
    if (v.refl && !G.REFL_AUS.includes(v.base) && !reflGesehen.has(k)) { reflGesehen.add(k); v.reflDrill = true; }
  });
  // çekim sorusu da fiil başına bir kez (freuen auf / freuen über aynı çekim)
  // Düzensiz fiiller (Präteritum ünlü değiştiren ya da karışık: ging, brachte); fiil başına bir kez
  const starkGesehen = new Set();
  VERBEN.forEach(v => {
    const pt = (v.pt3 || '').split('/')[0].trim();
    const st = G.stemOf ? G.stemOf(v.base) : '';
    v.ptForm = pt;
    if (pt && !starkGesehen.has(v.inf) && (!/te$/.test(pt) || (st && pt !== st + 'te' && pt !== st + 'ete'))) { v.stark = true; starkGesehen.add(v.inf); }
  });
  const frmGesehen = new Set();
  VERBEN.forEach(v => { const k = v.inf + v.refl; v.frmDrill = !frmGesehen.has(k); frmGesehen.add(k); });

  // Anlamdaşlar: aynı Türkçe karşılık (ilk anlam) → TR→DE sorularında hangisinin istendiği belli olmaz
  const trKey = t => String(t).split(/[;,]/)[0].replace(/\(.*?\)/g, '').trim().toLowerCase();
  const SYN = new Map();
  const addSyn = (id, t) => { const k = trKey(t); (SYN.get(k) || SYN.set(k, []).get(k)).push(id); };
  VERBEN.forEach(v => addSyn(v.id, v.tr));
  NL.forEach(n => addSyn(n.id, n.tr));
  WOERTER.forEach(w => addSyn(w.id, w.tr));
  const synOf = id => (SYN.get(trKey(trOf(id))) || []).filter(x => x !== id && kind(x) === kind(id));
  // anlamdaşlardan ayıran en kısa baş (benötigen / brauchen → "be…")
  const kern = id => ({ v: () => vById[id].anz.replace(/^sich(\(D\))? /, ''), w: () => wById[id].de, n: () => byId[id].lemma, p: () => '' })[kind(id)]();
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
      if (isStart && /^(Die|Der|Das|Sie|Ihr|Ihre|Essen|Leben|Bitte|Danke|Morgen|Abend|Recht)$/.test(w)) return w;
      if (/^(Frau|Herr|Herrn)$/.test(w) && /^\s+[A-ZÄÖÜ]/.test(full.slice(off + w.length))) return w;
      return `<span class="n ${a}">${w}<sup>${a === 'pl' ? 'Pl.' : a}</sup></span>`;
    });
  }
  const artHTML = n => n.plOnly ? `<span class="art art-pl">die</span> ${esc(n.lemma)} <span class="soluk">(çoğul)</span>`
    : `<span class="art art-${n.art}">${n.art}</span> ${esc(n.lemma)}`;
  const deItemHTML = id => kind(id) === 'n' ? artHTML(byId[id]) : `<b>${esc(label(id))}</b>`;
  const KL_TR = { adj: 'sıfat', adv: 'zarf', konj: 'bağlaç', präp: 'edat', pron: 'zamir / belirleyici', andere: 'kelime' };

  // Artikel kuralı (veriden): "-ung → die (%100)" ya da "istisna!"
  function regelHTML(n) {
    if (!n.regel) return '';
    const [suf, art, pct, cnt] = n.regel;
    if (n.art === art) return `<div class="kural">Kural: <b>-${esc(suf)}</b> ile bitenler <span class="art art-${art}">${art}</span> <span class="soluk">(listede ${cnt} isim, %${pct})</span></div>`;
    return `<div class="kural istisna"><b>İstisna!</b> <b>-${esc(suf)}</b> ile bitenlerin %${pct}'i <span class="art art-${art}">${art}</span>, ama bu <span class="art art-${n.art}">${n.art}</span></div>`;
  }
  const kancaHTML = id => KANCA[id] ? `<div class="kanca">🪝 <b>Kanca:</b> ${esc(KANCA[id])}</div>` : '';

  // Tanıtım sırası: seviye → (fiil: kalıplı önce) → (isim: kalıplarda geçen önce)
  const inFrames = new Set();
  VERBEN.forEach(v => (v.rahmen || []).forEach(fr => { (fr.s || []).forEach(n => inFrames.add(n.id)); fr.o.forEach(sl => sl.n.forEach(n => n !== 'P' && inFrames.add(n.id))); }));
  OPTS.personen.forEach(p => inFrames.add(p.id));
  // Seviye içinde sabit karıştırma: benzer kelimeler (abfahren, abholen …) art arda gelmesin
  const mix = id => { let h = 2166136261; for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const VERB_ORDER = VERBEN.slice().sort((a, b) => b.tier - a.tier || (b.rahmen ? 1 : 0) - (a.rahmen ? 1 : 0) || mix(a.id) - mix(b.id));
  const NOUN_ORDER = NL.slice().sort((a, b) => b.tier - a.tier || (inFrames.has(b.id) ? 1 : 0) - (inFrames.has(a.id) ? 1 : 0) || mix(a.id) - mix(b.id));
  const WORT_ORDER = WOERTER.slice().sort((a, b) => b.tier - a.tier || mix(a.id) - mix(b.id));
  // Hızlı tur sırası: önce B1 (seviye 3), sonra A2, A1; 2 isim : 1 diğer kelime : 1 fiil
  const BLITZ_ORDER = [];
  [3, 2, 1].forEach(t => {
    // fiiller Hızlı tur'da yok: Fiiller bölümünde çekimleriyle öğrenilir
    const n = NOUN_ORDER.filter(x => x.tier === t), w = WORT_ORDER.filter(x => x.tier === t);
    while (n.length || w.length) { BLITZ_ORDER.push(...n.splice(0, 2), ...w.splice(0, 1)); }
  });

  // ================= Durum =================
  const KEY = 'almanca-tekrar-v1';
  const DEF = { karten: {}, items: {}, pakete: {}, tage: {}, log: [], pending: [], ghPending: [], kontext: {},
    einst: { ret: 0.9, modi: {} }, version: 3 };
  // Bölümler: her birinin kendi günlük hedefi (soru) ve yeni öğe sınırı.
  const MODI = {
    akis: { ad: 'Çalış', grup: 'Hepsi karışık', ziel: 80, neu: 15, neuTr: 'yeni kelime / fiil' },
    blitz: { ad: 'Hızlı tur', grup: 'Ezber', ziel: 40, neu: 10, neuTr: 'bilmediğin yeni kelime (bildiklerin sayılmaz)' },
    paket: { ad: 'Paketler', grup: 'Ezber', ziel: 10, neu: 1, neuTr: 'yeni paket (~10 kelime + metin)' },
    normal: { ad: 'Karışık', grup: 'Yazarak', ziel: 20, neu: 4, neuTr: 'yeni öğe (fiil + isim, derin tanıtım)' },
    verben: { ad: 'Fiiller', grup: 'Yazarak', ziel: 15, neu: 3, neuTr: 'yeni fiil (anlam + çekimler + cümle)' },
    woerter: { ad: 'Kelimeler (yazarak)', grup: 'Yazarak', ziel: 20, neu: 0, neuTr: 'yeni isim (0: Hızlı tur\'da öğrendiklerin buraya kendiliğinden gelir)' },
    ndek: { ad: 'n-Deklination', grup: 'Dilbilgisi', ziel: 15, neu: 5, neuTr: 'yeni n-Deklination ismi' },
    refl: { ad: 'Dönüşlü fiiller', grup: 'Dilbilgisi', ziel: 15, neu: 3, neuTr: 'yeni dönüşlü fiil' },
    thema: { ad: 'Konu', grup: 'Ezber', ziel: 30, neu: 15, neuTr: 'seçili konudan yeni kelime' },
    stark: { ad: 'Düzensiz fiiller', grup: 'Dilbilgisi', ziel: 20, neu: 5, neuTr: 'yeni düzensiz fiil (Präteritum + Perfekt)' },
    kalip: { ad: 'Kalıplar', grup: 'Yazma', ziel: 1, neu: 1, neuTr: 'okuma (soru yok)' },
    lesen: { ad: 'Okuma', grup: 'Yazma', ziel: 1, neu: 1, neuTr: 'metin + doğru/yanlış soruları' },
    unite: { ad: 'Ünite', grup: 'Ezber', ziel: 60, neu: 0, neuTr: 'kitaptaki konunun kelimeleri' },
    fiilmetin: { ad: 'Fiil metni', grup: 'Yazma', ziel: 1, neu: 0, neuTr: 'günün metni: fiil çekimleri' },
    yazma: { ad: 'Yazma', grup: 'Yazma', ziel: 1, neu: 1, neuTr: 'metin (3–4 günde bir)' },
    zayif: { ad: 'Zayıflar', grup: '', ziel: 10, neu: 0, neuTr: '' },
  };
  // Tek akış: tanıma, yazma, cümle, yeni kelime ve ara etkinlikler tek kuyrukta. Diğer bölümler odak için "Bölüm" listesinde.
  const PLAN = ['akis'];
  const MIN_TAG = 10;  // bu kadar sayılan cevap = gün "çalışılmış" sayılır (seri)

  function normalize(x) {
    const s = Object.assign({}, DEF, x || {});
    ['karten', 'items', 'pakete', 'tage', 'kontext'].forEach(k => { s[k] = s[k] || {}; });
    ['log', 'pending', 'ghPending'].forEach(k => { s[k] = s[k] || []; });
    s.einst = Object.assign({ ret: 0.9 }, s.einst);
    s.einst.modi = s.einst.modi || {};
    if ((x && x.version || 0) < 3) {
      // v3: kelimeler artık Hızlı tur'dan gelir
      if (s.einst.modi.woerter) s.einst.modi.woerter.neu = 0;
      if (s.einst.modi.normal && s.einst.modi.normal.neu > 4) s.einst.modi.normal.neu = 4;
      s.version = 3;
    }
    Object.keys(MODI).forEach(m => { s.einst.modi[m] = Object.assign({ ziel: MODI[m].ziel, neu: MODI[m].neu }, s.einst.modi[m]); });
    return s;
  }
  let S;
  try { S = normalize(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = normalize({}); }
  const ziel = m => S.einst.modi[m].ziel;
  const neuMax = m => S.einst.modi[m].neu;
  function save() {
    try {
      if (S.log.length > 3000) S.log = S.log.slice(-3000);
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) { console.warn('kaydedilemedi', e); }
  }
  window.addEventListener('pagehide', save);
  const heute = () => { const t = tag(); return S.tage[t] || (S.tage[t] = { n: 0, richtig: 0, fast: 0, falsch: 0, neuV: 0, neuN: 0, satz: 0, wort: 0, anlam: 0 }); };
  const heuteM = m => { const d = heute(); d.modi = d.modi || {}; return d.modi[m] || (d.modi[m] = { n: 0, richtig: 0, fast: 0, falsch: 0, neu: 0, bekannt: 0, ungezaehlt: 0 }); };

  // ================= Birimler =================
  // Tanıma (Hızlı tur): erk (DE→TR seçmeli), bed (fiil DE→TR seçmeli), art (der/die/das)
  // Üretim: wort (isim TR→DE), prod (diğer kelime TR→DE), abr (fiil TR→DE), frm (çekim), satz (cümle / boşluk)
  // Dilbilgisi: ndek (n-Deklination), refl (dönüşlü zamir) · Paket: pak (metinde boşluk tekrarı)
  const REKOG = new Set(['erk', 'bed', 'art']);
  const CAT = { nsatz: 'satz', stamm: 'wort', satz: 'satz', abr: 'wort', frm: 'wort', wort: 'wort', prod: 'wort', bed: 'anlam', erk: 'anlam', art: 'wort', ndek: 'wort', refl: 'wort', pak: 'satz' };
  const ZIEL_ANTEIL = { satz: 5, wort: 3, anlam: 2 };
  const akisKat = typ => ({ erk: 'hizli', bed: 'hizli', art: 'hizli', satz: 'satz', nsatz: 'satz' })[typ] || 'yazma';

  function unitsOf(id) {
    const k = kind(id);
    if (k === 'v') {
      const v = vById[id];
      return ['bed', 'abr'].concat(v.frmDrill && v.stark ? ['stamm'] : [], v.rahmen || v.lueckenListe.length || SAETZE[id] ? ['satz'] : [], v.reflDrill ? ['refl'] : []);
    }
    if (k === 'w') return ['erk', 'prod'].concat(NSAETZE[id] ? ['nsatz'] : []);
    if (k === 'p') return ['pak'];
    const n = byId[id];
    return ['erk'].concat(n.plOnly ? [] : ['art'], ['wort'], n.weak || n.falle ? ['ndek'] : [], NSAETZE[id] ? ['nsatz'] : []);
  }
  const istNdek = id => kind(id) === 'n' && !!(byId[id].weak || byId[id].falle);
  const istRefl = id => kind(id) === 'v' && !!vById[id].refl;
  const itemOf = uid => uid.split(':')[0];
  const typOf = uid => uid.split(':')[1];

  function level(card) {
    if (!card || !card.S) return 0;
    if (card.S < 3) return 0;
    if (card.S < 10) return 1;
    if (card.S < 30) return 2;
    return 3;
  }

  const neueKarte = (uid, due) => { if (!S.karten[uid]) S.karten[uid] = { due, neu: true }; };

  // Derin tanıtım (Karışık, Fiiller, n-Deklination, Dönüşlü): üretim birimleri hemen açılır
  function einfuehren(id, bekannt) {
    const t = now();
    S.items[id] = { seit: t, quelle: session.modus };
    const d = heute();
    if (kind(id) === 'v') d.neuV++; else d.neuN++;
    heuteM(session.modus).neu++;
    if (bekannt) {
      unitsOf(id).forEach(u => { S.karten[id + ':' + u] = FSRS.review({}, 4, t, S.einst.ret); });
      S.items[id].bekannt = true;
    } else {
      const us = kind(id) === 'v' ? ['abr'].concat(unitsOf(id).includes('satz') ? ['satz'] : [], ['bed'])
        : unitsOf(id).filter(u => u !== 'erk' && u !== 'nsatz');
      us.forEach((u, i) => neueKarte(id + ':' + u, t + i * 3 * 60000));
      // tanıma kartı yarın: üretimi bilen tanır
      unitsOf(id).filter(u => u === 'erk').forEach(u => neueKarte(id + ':' + u, t + DAY));
    }
    save();
  }

  // Hafif tanıtım (Hızlı tur, Paketler): önce sadece tanıma; üretim, tanıma oturunca (S ≥ 3 gün) açılır
  function leichtEinfuehren(id, opts) {
    opts = opts || {};
    const t = now();
    if (S.items[id]) return false;
    S.items[id] = { seit: t, quelle: opts.quelle || session.modus, leicht: true };
    const rek = kind(id) === 'v' ? 'bed' : 'erk';
    if (opts.bekannt) {
      S.items[id].bekannt = true;
      S.karten[id + ':' + rek] = FSRS.review({}, 4, t, S.einst.ret);
      // fiil: yazma hemen açılır (cümleler fiilden gelir); isim / diğer: artikel ya da tanıma tekrarı oturunca
      if (kind(id) === 'v') produktionFreigeben(id, t);
    } else {
      neueKarte(id + ':' + rek, t + (opts.spaeter || 60000));
    }
    // artikel her durumda hemen çalışılır (bilinen kelimenin artikeli bilinmeyebilir)
    if (kind(id) === 'n' && !byId[id].plOnly) neueKarte(id + ':art', t + (opts.spaeter || 0) + 3 * 60000);
    return true;
  }

  // tanıma oturdu → yazma birimleri
  function produktionFreigeben(id, t) {
    const k = kind(id);
    const due = t + DAY / 2;
    if (k === 'n') { neueKarte(id + ':wort', due); if (istNdek(id)) neueKarte(id + ':ndek', due + DAY); }
    else if (k === 'w') neueKarte(id + ':prod', due);
    else if (k === 'v') neueKarte(id + ':abr', due);
  }

  // kelime cümleleri sonradan eklendi: yazma kartı olanlara cümle kartı (zamana yayarak)
  (function nsatzGoc() {
    const t = now(); let i = 0;
    Object.keys(S.karten).forEach(u => {
      const id = itemOf(u), ty = typOf(u);
      if ((ty === 'wort' || ty === 'prod') && S.karten[u].S && NSAETZE[id] && !S.karten[id + ':nsatz']) S.karten[id + ':nsatz'] = { due: t + (i++ % 10) * 3600000, neu: true };
    });
  })();
  // v3 göçü: eski sürümde tanıtılmış isimlere tanıma + artikel kartı
  (function migrieren() {
    const t = now();
    let i = 0;
    Object.keys(S.items).forEach(id => {
      if (kind(id) !== 'n' || !byId[id] || byId[id].skip) return;
      if (S.karten[id + ':wort'] && !S.karten[id + ':art'] && !byId[id].plOnly) neueKarte(id + ':art', t + (i++ % 20) * 3600000);
      if (S.karten[id + ':wort'] && !S.karten[id + ':erk']) neueKarte(id + ':erk', t + DAY + (i % 20) * 3600000);
    });
  })();

  // ================= Oturum / kuyruk =================
  const session = { q: 0, cats: { satz: 0, wort: 0, anlam: 0 }, letzte: [], requeue: [], modus: 'normal', zielGesehen: {},
    extra: false, son: [], dikkatBis: -1, hinweis: null };
  const NDEK_ORDER = (function () {
    const w = NOUN_ORDER.filter(n => n.weak), f = NOUN_ORDER.filter(n => n.falle), out = [];
    // tuzak isimleri araya serpiştir: 3 n-Deklination, 1 tuzak
    while (w.length || f.length) { out.push(...w.splice(0, 3)); if (f.length) out.push(f.shift()); }
    return out;
  })();
  const REFL_ORDER = VERB_ORDER.filter(v => v.refl);
  // düzensiz: önce öneksiz temel fiiller (gehen, nehmen …) A1 → B1, sonra önekliler
  const STARK_ORDER = VERBEN.filter(v => v.stark).sort((a, b) => (!!a.pre - !!b.pre) || a.tier - b.tier || mix(a.id) - mix(b.id));
  const FILTER = {
    akis: u => typOf(u) !== 'pak',
    normal: u => typOf(u) !== 'pak' && !REKOG.has(typOf(u)),
    blitz: u => REKOG.has(typOf(u)) && kind(itemOf(u)) !== 'v',
    paket: u => typOf(u) === 'pak',
    verben: u => kind(itemOf(u)) === 'v',
    woerter: u => typOf(u) === 'wort' || typOf(u) === 'prod' || typOf(u) === 'nsatz',
    zayif: u => typOf(u) !== 'pak' && schwach(itemOf(u)),
    ndek: u => istNdek(itemOf(u)),
    refl: u => istRefl(itemOf(u)),
    thema: u => typOf(u) !== 'pak' && themaSet().has(itemOf(u)),
    stark: u => typOf(u) === 'stamm' || (typOf(u) === 'bed' && kind(itemOf(u)) === 'v' && !!(vById[itemOf(u)] || {}).stark),
    yazma: () => false,
    lesen: () => false,
    fiilmetin: () => false,
    unite: () => false,
    kalip: () => false,
  };
  // seçili konu
  const themaId = () => (thById[S.einst.thema] ? S.einst.thema : (THEMEN[0] && THEMEN[0].id));
  let _thSet = null, _thFor = null;
  const themaSet = () => { const id = themaId(); if (_thFor !== id) { _thFor = id; _thSet = new Set(thById[id] ? thById[id].items : []); } return _thSet; };
  // konu sırası: önce B1, sonra A2, A1; fiil / isim / diğer karışık
  const tierOf = id => ({ v: () => vById[id].tier, w: () => wById[id].tier, p: () => 2, n: () => byId[id].tier })[kind(id)]();
  const themaOrder = () => (thById[themaId()] ? thById[themaId()].items : []).filter(id => gueltig(id + ':x'))
    .slice().sort((a, b) => tierOf(b) - tierOf(a) || mix(a) - mix(b));
  // odakta daha önce tanıtılmış ama modül birimi olmayan öğelere birimi ekle
  function modulEinheiten() {
    const t = now();
    Object.keys(S.items).forEach(id => {
      const k = kind(id);
      if ((k === 'n' && !byId[id]) || (k === 'v' && !vById[id]) || k === 'w' || k === 'p') return;
      unitsOf(id).filter(u => u === 'ndek' || u === 'refl').forEach(u => {
        if (u === 'ndek' || S.karten[id + ':frm']) neueKarte(id + ':' + u, t);
      });
    });
  }

  function faellig(filterFn) {
    const t = now();
    return Object.keys(S.karten).filter(u => S.karten[u].due <= t && (!filterFn || filterFn(u)) && gueltig(u));
  }
  // veriden kaldırılmış öğelerin kartlarını atla
  // çekim (stamm) kartı: yalnız düzensiz fiil ve formlarını gördüysen (fiil metni / tanıtım)
  const stammSichtbar = id => !!(vById[id] && vById[id].stark && S.formGesehen && S.formGesehen[id]);
  // A1 kelimenin anlamı sorulmaz (hep doğru biliniyor); artikeli ve yazması sorulur
  const gueltig = u => {
    const id = itemOf(u), k = kind(id), ty = typOf(u);
    if (!(k === 'v' ? !!vById[id] : k === 'w' ? !!wById[id] : k === 'p' ? !!pById[id] : !!(byId[id] && !byId[id].skip))) return false;
    if (ty === 'stamm' && !stammSichtbar(id)) return false;
    return !((ty === 'erk' || ty === 'bed') && tierOf(id) === 1);
  };

  function schwach(id) {
    return unitsOf(id).some(u => { const c = S.karten[id + ':' + u]; return c && (c.lapses > 0 || c.lastG === 1); });
  }

  // bölümün sırasındaki yeni öğe (bugünkü sınır dolmadıysa)
  const paketFertig = pid => !!(S.pakete[pid] && (S.pakete[pid].fertig || S.karten[pid + ':pak']));
  // günlük net sınırlar: yeni kelime (isim + diğer) ve yeni fiil ayrı (bilinen sayılanlar hariç)
  const neuGrenze = k => k === 'v' ? (S.einst.neuVerben || 5) : (S.einst.neuWoerter || 25);
  const neuHeute = k => { const d = tag(); return Object.entries(S.items).filter(([id, it]) => it.seit && tag(it.seit) === d && !it.bekannt && (k === 'v') === (kind(id) === 'v') && kind(id) !== 'p').length; };
  function naechsteNeu() {
    const r = naechsteNeuRoh();
    if (!r) return null;
    const id = r.neu || r.pretest || r.stammNeu, extra = session.extra ? 5 : 0;
    const k = r.paket ? 'n' : kind(id), voll = r.paket ? neuHeute('n') > neuGrenze('n') - 8 : neuHeute(k) >= neuGrenze(k) + extra;
    if (voll) { if (!session.vollGemeldet) { session.vollGemeldet = true; session.vollBis = session.q + 3; } return null; }
    return r;
  }
  function naechsteNeuRoh() {
    const m = session.modus, hm = heuteM(m);
    // yarıda bırakılmış yeni paket önce bitirilir (sınırdan düşmez)
    if (m === 'paket') { const offen = PAKETE.find(p => S.pakete[p.id] && !paketFertig(p.id)); if (offen) return { paket: offen.id }; }
    // tekrar yükü arttıkça yeni öğe azalır (birikmiş STAU'da sıfır); tekrarları bitirdikçe yeniden açılır.
    // Hızlı tur ve paketler yazma tekrarlarını da, paketler Hızlı tur tekrarlarını da hesaba katar.
    const druck = f => Math.min(1, faellig(f).length / stauGrenze(m));
    let yuk = druck(FILTER[m]);
    if (m === 'blitz' || m === 'paket') yuk = Math.max(yuk, druck(FILTER.normal));
    if (m === 'paket') yuk = Math.max(yuk, druck(FILTER.blitz));
    const faktor = m === 'paket' ? (yuk >= 1 ? 0 : 1) : 1 - yuk;
    const max = Math.round((neuMax(m) + (session.extra ? (m === 'paket' ? 1 : 5) : 0)) * faktor);
    if (hm.neu >= max) return null;
    // bütün bölümler için ortak sınır: bugün yeni öğrenilen (bilinmeyen) kelime sayısı
    const frei = order => { const x = order.find(x => !S.items[x.id]); return x && x.id; };
    if (m === 'blitz') { if (hm.bekannt >= Math.round(30 * (1 - yuk))) return null; const id = frei(BLITZ_ORDER); return id && { pretest: id }; }
    if (m === 'thema') { const id = themaOrder().find(x => !S.items[x]); return id && { pretest: id }; }
    if (m === 'stark') { const v = STARK_ORDER.find(v => !S.karten[v.id + ':stamm']); return v && { stammNeu: v.id }; }
    if (m === 'paket') { const p = PAKETE.find(p => !S.pakete[p.id]); return p && { paket: p.id }; }
    if (m === 'akis') {
      // önce aktif ünitenin kelimeleri; sonra her 4 yeniden biri fiil (yazarak derin tanıtım), diğerleri kelime (ön test)
      const un = uniteNeuId();
      if (un) return kind(un) === 'v' ? { neu: un } : { pretest: un };
      const v = neuHeute('v') < neuGrenze('v') ? frei(VERB_ORDER) : null;
      if (v && hm.neu % 4 === 3) return { neu: v };
      if (hm.bekannt < Math.round(30 * (1 - yuk))) { const w = frei(BLITZ_ORDER); if (w) return { pretest: w }; }
      return v ? { neu: v } : null;
    }
    let id = null;
    if (m === 'verben') id = frei(VERB_ORDER);
    else if (m === 'woerter') id = frei(NOUN_ORDER);
    else if (m === 'ndek') id = frei(NDEK_ORDER);
    else if (m === 'refl') id = frei(REFL_ORDER);
    else if (m === 'normal') { const v = frei(VERB_ORDER), n = frei(NOUN_ORDER); id = hm.neu % 2 === 0 ? (v || n) : (n || v); }
    return id && { neu: id };
  }

  const dikkatAktiv = () => session.dikkatBis > session.q;

  // Aynı kelime: en az IZ_ABSTAND soru arayla; günde en çok 4 (bugün öğrenilen) / 2 (eski) kez — artikel, anlam, yazma hepsi dahil.
  // Kısa arayla tekrar = kısa süreli bellekten cevap (ezber değil); aralıklı tekrar kalıcı.
  const IZ_ABSTAND = 12;
  function iz() { const d = tag(); if (!S.iz || S.iz.tag !== d) S.iz = { tag: d, qq: 0, n: {}, q: {} }; return S.iz; }
  const izCap = id => (S.items[id] && S.items[id].seit && tag(S.items[id].seit) === tag()) ? 4 : 2;
  function izOk(id, abstand = IZ_ABSTAND) {
    const z = iz();
    if ((z.n[id] || 0) >= izCap(id)) return false;
    return z.q[id] == null || z.qq - z.q[id] >= abstand;
  }
  const stammErlaubt = () => (session.letzteStamm == null || session.q - session.letzteStamm >= 8) && (iz().stamm || 0) < 4;
  // ara etkinlikte görülen kelime: aralık sayılır, günlük sınır değil
  function izSeen(id) { if (!id) return; const z = iz(); z.q[id] = z.qq; }
  function izNote(id) { if (!id) return; const z = iz(); z.qq++; z.n[id] = (z.n[id] || 0) + 1; z.q[id] = z.qq; }
  // hep doğru bilinen kelime: kardeş kartları ileri at (yalnız son cevabı doğru ve az unutulmuş kartlar; sorunlu artikel kartı yerinde kalır)
  function seriSeyrek(id, seri, t) {
    const ab = t + Math.min(21, 3 * seri) * DAY;
    unitsOf(id).forEach(u => { const k = S.karten[id + ':' + u]; if (k && k.S && !k.lern && k.lastG === 3 && (k.lapses || 0) < 3 && k.due < ab) k.due = ab; });
  }
  // yazarak doğru (üretim) → aynı kelimenin kolay kartları (anlam / artikel) ayrıca sorulmasın: sanal "doğru" tekrar.
  // Ters seçmeli (Türkçe → artikelli Almanca) doğruysa artikel kartı da. Son cevabı yanlış ya da öğrenme adımındaki kart kendi sorusuyla gelir.
  const KREDI = { wort: ['erk', 'art'], prod: ['erk'], nsatz: ['erk'], abr: ['bed'], satz: ['bed'], erkDE: ['art'] };
  function kardesKredi(id, quelle, t) {
    (KREDI[quelle] || []).forEach(u => {
      const uid = id + ':' + u, k = S.karten[uid];
      if (!k || k.lastG === 1 || k.lern != null || (k.S && k.due > t + DAY)) return;
      const c = FSRS.review(k.S ? k : {}, k.S ? 3 : 4, t, S.einst.ret);
      delete c.neu; c.kredi = (k.kredi || 0) + 1;
      S.karten[uid] = c;
    });
  }
  // ertesi günün başı: bugün iki kez yanlış yapılan kart bugün bir daha gelmesin
  function morgen(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d.getTime(); }
  function waehle() {
    const m = session.modus;
    // 1) oturum içi yanlışların tekrarı (4 soru sonra)
    const rq = session.requeue.findIndex(r => r.nach <= session.q && S.karten[r.uid] && FILTER[m](r.uid) && izOk(itemOf(r.uid)) && gueltig(r.uid) && (typOf(r.uid) !== 'stamm' || stammErlaubt()));
    if (rq >= 0) { const r = session.requeue.splice(rq, 1)[0]; return { uid: r.uid, requeue: r }; }
    // 1b) her ~6 soruda bir: bugün öğrendiğin bir kelimeyi Türkçeden Almancaya yazdır (kelime başına günde en çok 2)
    if (session.q > 0 && session.q % 6 === 5 && session.letzteHeute !== session.q && m !== 'paket') {
      session.letzteHeute = session.q;
      const d = tag(), gf = session.heuteGefragt = session.heuteGefragt || {};
      const c = Object.entries(S.items).filter(([id, it]) => it.seit && tag(it.seit) === d && !it.bekannt && !it.a1 && kind(id) !== 'p' && gueltig(id + ':x') && (gf[id] || 0) < 1 && izOk(id) && id !== session.sonItem && now() - it.seit > 120000).map(([id]) => id);
      if (c.length) { const id = pick(c); gf[id] = (gf[id] || 0) + 1; return { uid: id + ':' + ({ n: 'wort', w: 'prod', v: 'abr' })[kind(id)], heute: true }; }
    }

    // Çalış: sıradaki 10–15 tekrar önce listede (biliyorum / emin değilim / bilmiyorum); listedeki "emin değilim" kartları
    // sorulunca (ya da aralık kuralı yüzünden şimdilik sorulamıyorsa) sıradaki liste
    let triVar = false;
    if (m === 'akis' && session.letzteAkt !== session.q && !triOffen().length) {
      const a = aktTriage();
      if (a) { session.letzteAkt = session.q; return a; }
    }
    if (m === 'akis') triVar = triOffen().length > 0 || faellig(u => FILTER.akis(u) && triFaehig(u) && !triGesehen(u)).length > 0;
    // tekrar yokken: 20–30 cevapta bir "gerçekten biliyor musun?" (rastgele öğrenilmiş kelime / fiil)
    if (m === 'akis' && session.q > 0 && !triVar) {
      if (session.kontrolBei == null) session.kontrolBei = session.q + 20 + Math.floor(Math.random() * 11);
      if (session.q >= session.kontrolBei && session.letzteAkt !== session.q) {
        session.kontrolBei = session.q + 20 + Math.floor(Math.random() * 11);
        const a = aktKontrol();
        if (a) { session.letzteAkt = session.q; return a; }
      }
    }
    // Çalış (tek akış): her 7 soruda bir ara etkinlik (metinde boşluk, eşleştirme, dinle-yaz, cümle dizme, paket tekrarı) ya da günün işi
    if (m === 'akis' && session.q > 0 && session.q % 7 === 6 && session.letzteAkt !== session.q && session.q - (session.aktEnde ?? -99) >= 3) {
      session.letzteAkt = session.q;
      const a = aktWaehlen();
      if (a) return a;
    }

    const filter = FILTER[m];
    const dueAlle = faellig(filter);
    let due = dueAlle.filter(u => izOk(itemOf(u)) && triTor(u));
    // birikme: ara verdiysen önce tekrarlar
    session.stau = dueAlle.length > stauGrenze(m) ? dueAlle.length : 0;
    // Hızlı tur / Paket: yazma tekrarları (Karışık) birikmişse yeni kelime yok; kolay kısmı yapıp zoru atlamaya karşı
    session.schreibStau = (m === 'blitz' || m === 'paket') ? faellig(FILTER.normal).length : 0;
    if (session.schreibStau <= STAU) session.schreibStau = 0;
    const kannNeu = !session.stau && !session.schreibStau && !dikkatAktiv();

    // 2) yeni öğe: vade azsa ya da her 4 soruda bir (sınır dolmadıysa)
    if (kannNeu) {
      const neu = naechsteNeu();
      if (neu && (due.length < 2 || session.q - (session.letzteNeu ?? -99) >= 4)) {
        session.letzteNeu = session.q;
        return neu;
      }
    }
    if (!due.length) {
      // öğrenme aşamasındaki kartlar (yeni ya da az önce yanlış) 15 dk içindeyse öne çekilir
      // az önce cevaplanan kart (2 dk) ve son öğe hemen geri gelmez; aynı soruyu art arda sormasın
      const bald = Object.keys(S.karten).filter(u => { const c = S.karten[u]; return (c.neu || c.lastG === 1 || c.lern === 1) && izOk(itemOf(u)) && c.due - now() < 15 * 60000 && !(c.last && now() - c.last < 120000) && itemOf(u) !== session.sonItem && filter(u) && gueltig(u); });
      if (bald.length) due = bald;
    }
    // aralık kuralı gevşetilmez: uygun soru yoksa yeni öğe (sınır dolmadıysa) ya da "şu an tekrar yok" — kısa döngü olmasın
    if (!due.length && kannNeu) { const neu = naechsteNeu(); if (neu) { session.letzteNeu = session.q; return neu; } }
    if (!due.length) {
      if (m === 'zayif' || session.extra) {
        // ekstra / Zayıflar: en zayıflar önce ama aynı aralık ve günlük sınır kuralıyla (8 kartlık döngü olmasın)
        const pool = Object.keys(S.karten).filter(u => filter(u) && gueltig(u) && S.karten[u].S && izOk(itemOf(u)));
        if (!pool.length) return null;
        pool.sort((a, b) => FSRS.currentR(S.karten[a], now()) - FSRS.currentR(S.karten[b], now()));
        due = pool.slice(0, 8);
      } else if (m === 'akis' && (session.aktLeer || 0) < 6) {
        session.aktLeer = (session.aktLeer || 0) + 1;
        session.hinweis = 'Vadesi gelen tekrar kalmadı: şimdi ara etkinlikler (metin, eşleştirme, dinle-yaz).'; session.hinweisBis = session.q + 3;
        return aktWaehlen();
      } else return null;
    }
    const lastItem = session.sonItem;
    const ordne = list => {
      // çok birikmişse hâlâ hatırlananlar önce (kurtarılabilenler); yoksa önce dünkü yanlışlar, sonra en eski vade
      // ama her 3. seçim en eski vade: en alttakiler günlerce beklemesin
      if (session.stau && session.q % 3 !== 2) list.sort((a, b) => FSRS.currentR(S.karten[b], now()) - FSRS.currentR(S.karten[a], now()));
      else if (session.stau) list.sort((a, b) => S.karten[a].due - S.karten[b].due);
      else {
        // önceki günlerden kalan yanlışlar önce; bugün yanlış yapılanlar diğer tekrarların önüne geçmez
        const d = tag(), eski = u => S.karten[u].lastG === 1 && !!S.karten[u].last && tag(S.karten[u].last) !== d;
        list.sort((a, b) => (eski(b) - eski(a)) || S.karten[a].due - S.karten[b].due);
      }
      return list.find(x => itemOf(x) !== lastItem) || list[0];
    };
    // çekim (stamm): en az 6 soru arayla, günde en çok 5
    const z = iz();
    // çekim: en az 8 soru arayla, günde en çok 4; başka soru olmasa da sınır aşılmaz
    if (!stammErlaubt()) due = due.filter(u => typOf(u) !== 'stamm');
    // her 5 soruda bir: öğrendiğin kelime gerçek bir metin cümlesinin içinde (DW / Klexikon / Goethe) — anlamı ne?
    if (m !== 'paket' && m !== 'zayif' && session.q % 5 === 4 && session.letzteKontext !== session.q) {
      session.letzteKontext = session.q;
      // Hızlı tur: isim / kelime; Fiiller: fiil; diğer bölümler: hepsi (fiil anlamı kartları Karışık'ta da görünür)
      const passt = u => m === 'blitz' ? kind(itemOf(u)) !== 'v' : m === 'verben' ? kind(itemOf(u)) === 'v' : (m === 'normal' || m === 'woerter' ? true : FILTER[m](u));
      const kand = faellig(u => (typOf(u) === 'erk' || typOf(u) === 'bed') && passt(u) && triTor(u))
        .filter(u => izOk(itemOf(u)) && itemOf(u) !== lastItem && kontextSaetze(itemOf(u)).length);
      if (kand.length) { const u = kand.sort((a, b) => S.karten[a].due - S.karten[b].due)[0]; return { uid: u, kontext: pick(kontextSaetze(itemOf(u))) }; }
    }
    // 1 günden fazla gecikmiş kart: her iki sorudan biri en eskisi (tür dengesi onları alta itmesin)
    if (m !== 'blitz' && m !== 'paket' && m !== 'akis' && session.q % 2 === 0) {
      const alt = due.filter(u => now() - S.karten[u].due > DAY).sort((a, b) => S.karten[a].due - S.karten[b].due);
      const u = alt.find(x => itemOf(x) !== lastItem);
      if (u) return { uid: u };
    }
    // dikkat dağınıkken kolay sorular (tanıma) önce
    if (dikkatAktiv()) {
      const leicht = due.filter(u => REKOG.has(typOf(u)));
      if (leicht.length) return { uid: ordne(leicht) };
    }
    if (m === 'blitz' || m === 'paket') return { uid: ordne(due) };
    // odak modunda her iki sorudan biri doğrudan odak alıştırması (n-Deklination / dönüşlü zamir)
    if (m === 'ndek' || m === 'refl') {
      const mod = due.filter(u => typOf(u) === m);
      session.odakWechsel = !session.odakWechsel;
      if (mod.length && (session.odakWechsel || mod.length === due.length)) return { uid: ordne(mod) };
    }
    if (m === 'akis') {
      // hızlı (seçmeli / artikel) 4 : yazma 3 : cümle 3; aynı tür en fazla 2 kez üst üste
      const by = { hizli: [], yazma: [], satz: [] };
      due.forEach(u => by[akisKat(typOf(u))].push(u));
      const ver = session.akisVerlauf || [], tot = ver.length + 1, anteil = { hizli: 4, yazma: 3, satz: 3 };
      const l2 = ver.slice(-2), blk = l2.length === 2 && l2[0] === l2[1] ? l2[0] : null;
      const cnt = k => ver.filter(x => x === k).length;
      let ks = Object.keys(by).filter(k => by[k].length && k !== blk);
      if (!ks.length) ks = Object.keys(by).filter(k => by[k].length);
      ks.sort((a, b) => (cnt(a) / tot - anteil[a] / 10) - (cnt(b) / tot - anteil[b] / 10));
      return { uid: ordne(by[ks[0]]) };
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
    return { uid: ordne(byCat[cats[0]]) };
  }

  // ================= Soru üretimi =================
  let aktuell = null;

  function frage(sel) {
    if (sel.akt) return aktFrage(sel);
    if (sel.neu) return frageEinf(sel.neu);
    if (sel.stammNeu) return frageStammEinf(sel.stammNeu);
    if (sel.pretest) return fragePretest(sel.pretest);
    if (sel.paket) return paketNeu(sel.paket);
    const uid = sel.uid, id = itemOf(uid), typ = typOf(uid), card = S.karten[uid];
    const lv = level(card);
    const base = { uid, id, typ, lv, start: now(), requeue: sel.requeue, heute: sel.heute };
    if (typ === 'pak') return Object.assign(base, paketWiederholung(id));
    if ((typ === 'erk' || typ === 'bed') && sel.kontext) return Object.assign(base, frageKontext(id, sel.kontext));
    if ((typ === 'erk' || typ === 'bed') && ((S.items[id] || {}).satzBis || 0) > now()) { const k = satzKontext(id); if (k) return Object.assign(base, frageKontext(id, k), { kontext: k.s }); }
    if (typ === 'erk' || typ === 'bed') return Object.assign(base, frageErkennen(id));
    if (typ === 'art') return Object.assign(base, frageArtikel(byId[id]));
    if (typ === 'wort') return Object.assign(base, frageWort(byId[id], lv));
    if (typ === 'prod') return Object.assign(base, frageProd(wById[id], lv));
    if (typ === 'nsatz') return Object.assign(base, frageWortSatz(id, lv));
    if (typ === 'ndek') return Object.assign(base, frageNdek(byId[id], lv));
    const v = vById[id];
    if (typ === 'refl') return Object.assign(base, frageRefl(v, lv));
    if (typ === 'stamm') return Object.assign(base, frageStamm(v, lv));
    if (typ === 'abr') return Object.assign(base, frageAbr(v, lv));
    if (typ === 'frm') return Object.assign(base, frageFrm(v));
    return Object.assign(base, frageSatz(v, lv));
  }

  // ---------- Tanıma (seçmeli) ----------
  // Çeldiriciler: aynı türden, anlamdaşı olmayan; yarısı tanıdığın kelimelerden (daha zor)
  // şık olarak son 10 soruda çıkan kelime yine şık olmasın (aynı kelimeyi her soruda görme)
  const ABLENK_PAUSE = 10;
  const ablenkFrei = x => { const a = session.ablenk || {}; return a[x] == null || session.q - a[x] >= ABLENK_PAUSE; };
  const ablenkMerke = ids => { const a = session.ablenk = session.ablenk || {}; ids.forEach(x => { a[x] = session.q; }); };
  function optionen(id) {
    const k = kind(id);
    const richtig = optTr(trOf(id));
    let pool;
    if (k === 'v') pool = VERBEN.map(v => v.id);
    else if (k === 'w') { const kl = wById[id].kl; pool = WOERTER.filter(w => w.kl === kl).map(w => w.id); if (pool.length < 12) pool = WOERTER.map(w => w.id); }
    else pool = NL.map(n => n.id);
    const verboten = new Set([trKey(trOf(id))]);
    // önce aynı konudan, aynı türden (Wettervorhersage → Wetterbericht, Temperatur …); sonra genel havuz
    const ths = THEMA_VON[id] || [];
    const nah = shuffle([...new Set(ths.flatMap(t => thById[t].items))].filter(x => kind(x) === k && x !== id && gueltig(x + ':x') && ablenkFrei(x))).slice(0, 2);
    const bekannt = shuffle(pool.filter(x => S.items[x] && ablenkFrei(x)));
    const rest = shuffle(pool.filter(ablenkFrei)).concat(shuffle(pool));
    const out = [], texte = new Set([richtig]), ids = [];
    for (const x of nah.concat(bekannt.slice(0, 1), rest)) {
      if (out.length >= 5) break;
      if (x === id || verboten.has(trKey(trOf(x)))) continue;
      const t = optTr(trOf(x));
      // neredeyse anlamdaş olmasın: Türkçede ortak uzun kelime varsa (hava tahmini / hava raporu) atla
      const w = s => s.toLowerCase().split(/[^a-zçğıöşü]+/).filter(x => x.length >= 4);
      if (w(t).some(x => w(richtig).includes(x))) continue;
      if (!t || texte.has(t)) continue;
      texte.add(t); verboten.add(trKey(trOf(x)));
      out.push({ t, ok: false }); ids.push(x);
    }
    ablenkMerke(ids.concat([id]));
    return shuffle(out.concat([{ t: richtig, ok: true }]));
  }

  function erkPrompt(id, frageText) {
    const k = kind(id);
    let de = deItemHTML(id), alt = '';
    if (k === 'v') { const v = vById[id]; de = `<b>${esc(v.anz)}</b>`; }
    if (k === 'w') alt = `<span class="alt">${esc(KL_TR[wById[id].kl])}</span>`;
    return `<div class="soru de buyuk-kelime">${de}${alt}</div>${frageText ? `<div class="soluk">${esc(frageText)}</div>` : ''}`;
  }

  // TR → DE seçmeli: Almanca şıklar artikelleriyle (aynı konudan isimler + doğru ismin yanlış artikelli hâli)
  function optionenDE(id) {
    const k = kind(id);
    const ziel = label(id);
    const ths = THEMA_VON[id] || [];
    const nah = shuffle([...new Set(ths.flatMap(t => thById[t].items))].filter(x => kind(x) === k && x !== id && gueltig(x + ':x') && ablenkFrei(x))).slice(0, 2);
    const pool0 = k === 'n' ? NL.map(n => n.id) : k === 'v' ? VERBEN.map(v => v.id) : WOERTER.map(w => w.id);
    const pool = shuffle(pool0.filter(ablenkFrei)).concat(shuffle(pool0));
    const out = [], texte = new Set([ziel]), verboten = new Set([trKey(trOf(id))]), ids = [];
    if (k === 'n' && !byId[id].plOnly) {
      const falsch = shuffle(['der', 'die', 'das'].filter(a => a !== byId[id].art))[0] + ' ' + byId[id].lemma;
      out.push({ t: falsch, ok: false }); texte.add(falsch);
    }
    for (const x of nah.concat(pool)) {
      if (out.length >= 5) break;
      if (verboten.has(trKey(trOf(x)))) continue;
      const t = label(x);
      if (texte.has(t)) continue;
      texte.add(t); verboten.add(trKey(trOf(x)));
      out.push({ t, ok: false }); ids.push(x);
    }
    ablenkMerke(ids.concat([id]));
    return shuffle(out.concat([{ t: ziel, ok: true }]));
  }
  function frageErkennen(id) {
    // isim ve diğer kelimelerde yarı yarıya ters yön: Türkçe → Almanca (artikelli şıklar)
    if (kind(id) !== 'v' && Math.random() < 0.75) return {
      mc: true, optionen: optionenDE(id),
      html: `<div class="tur"><span>tanıma · Almancası ne?${kind(id) === 'n' ? ' (artikeline dikkat)' : ''}</span></div><div class="soru buyuk-kelime">${esc(kurzTr(trOf(id)))}</div>`,
      ziel: label(id), frageText: kurzTr(trOf(id)), modus: 'erk', artikelli: kind(id) === 'n',
      loesungHTML: () => `${deItemHTML(id)} = <b>${esc(trOf(id))}</b>`,
      erkl: () => (kind(id) === 'n' ? [regelHTML(byId[id])] : []).concat(infoZeilen(id)).filter(Boolean),
    };
    return {
      mc: true, optionen: optionen(id),
      html: `<div class="tur"><span>tanıma · anlamı ne?</span></div>${erkPrompt(id, '')}`,
      ziel: kurzTr(trOf(id)), frageText: label(id), modus: kind(id) === 'v' ? 'bed' : 'erk',
      loesungHTML: () => `${deItemHTML(id)} = <b>${esc(trOf(id))}</b>`,
      erkl: () => infoZeilen(id),
    };
  }

  // ---------- Metinde gör: okuma metinlerinden gerçek cümle, kelime vurgulu ----------
  let _kontextIdx = null;
  function kontextSaetze(id) {
    if (!_kontextIdx) {
      _kontextIdx = {};
      const m = formIdx();
      LT.forEach(t => (t.text || '').split('\n').forEach(par => par.split(/(?<=[.!?])\s+/).forEach(satz => {
        const ws = satz.split(/\s+/);
        if (ws.length < 5 || ws.length > 24 || /^\d+ |—|@|https?:/.test(satz)) return;
        const gesehen = new Set();
        ws.forEach((w, i) => {
          const c = w.replace(/^[„“"(‚]+|[.,!?;:“"”)…’‘]+$/g, '');
          // büyük harfle küçültme yalnız cümle başında (ortadaki "Schienen" isim, scheinen fiili değil)
          const x = m.get(c) || (i === 0 || /[:„“"]$/.test(ws[i - 1]) || /^[„“"]/.test(w) ? m.get(c.charAt(0).toLowerCase() + c.slice(1)) : null);
          if (!x || gesehen.has(x)) return;
          gesehen.add(x);
          const l = _kontextIdx[x] = _kontextIdx[x] || [];
          if (l.length < 6) l.push({ s: satz, w: c, q: t.quelle });
        });
      })));
    }
    return _kontextIdx[id] || [];
  }
  // "bilmiyorum" dediğin kelimenin anlam sorusu bir hafta cümle içinde (her seferinde başka cümle)
  function satzKontext(id) {
    const w = satzWahl(id, 1), l = w && wortLuecke(id, w.x.de);
    return l ? { s: w.x.de, w: l.answer.split(' ')[0], q: w.x.quelle || 'örnek cümle' } : null;
  }
  function frageKontext(id, k) {
    const satzHTML = esc(k.s).replace(new RegExp('(^|[^\\wäöüÄÖÜß])(' + k.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\wäöüÄÖÜß])'), '$1<mark>$2</mark>');
    return {
      mc: true, optionen: optionen(id),
      html: `<div class="tur"><span class="yeni">metinde</span><span>bu cümlede işaretli kelime ne demek?</span></div>
        <div class="soru de kontext-satz">${satzHTML}</div><div class="soluk">${esc(k.q || '')}</div>`,
      ziel: kurzTr(trOf(id)), frageText: k.s, modus: kind(id) === 'v' ? 'bed' : 'erk', kontextQ: true,
      loesungHTML: () => `${deItemHTML(id)} = <b>${esc(trOf(id))}</b>`,
      erkl: () => infoZeilen(id),
    };
  }

  // tanıtım ve yanlış cevapta gösterilen kısa bilgi
  // fiilin kalıpları (quellen/kaliplar.txt): tanıtımda ve cevap ekranında da görünsün, Kalıplar sayfasında yavan durmasın
  function kalipListe(id, n, ab) {
    const l = (window.KALIPLAR && window.KALIPLAR.fiil && window.KALIPLAR.fiil[id]) || [];
    if (!l.length) return [];
    const s0 = (ab || 0) % l.length;
    return l.slice(s0).concat(l.slice(0, s0)).slice(0, n);
  }
  const kalipZeile = (id, n = 2) => { const l = kalipListe(id, n, session.q); return l.length ? 'Kalıp: ' + l.map(k => `${deHTML(k.de)} <span class="soluk">(${esc(k.tr)})</span>`).join(' · ') : ''; };
  const kalipKutu = id => { const l = kalipListe(id, 3, 0); return l.length ? `<div class="kalip-kutu"><div class="soluk">Kalıplar · bu fiil günlük dilde böyle kullanılır</div><ul class="ornekler">${l.map(k => `<li>${deHTML(k.de)}<br><span class="soluk">${esc(k.tr)}</span></li>`).join('')}</ul></div>` : ''; };
  // örnek cümle her seferinde aynı olmasın: listedeki örnekler sırayla
  const dreh = l => (l && l.length ? l[session.q % l.length] : null);
  function infoZeilen(id) {
    const k = kind(id), out = [];
    if (k === 'n') {
      const n = byId[id];
      if (n.plf && !n.plOnly) out.push(`Çoğul: die ${esc(n.plf)}`);
      const bsp = dreh(n.bsp); if (bsp) out.push('Örnek: ' + deHTML(bsp));
    } else if (k === 'v') {
      const v = vById[id];
      if (v.obj.length) out.push(esc(G.objMuster(v)));
      out.push(`Perfekt: ${esc(v.aux)} ${v.refl ? 'sich ' : ''}${esc(v.p2)}`);
      const bsp = dreh(v.bsp); if (bsp) out.push('Örnek: ' + deHTML(bsp));
      const kz = kalipZeile(id); if (kz) out.push(kz);
    } else if (k === 'w') {
      const bsp = dreh(wById[id].bsp); if (bsp) out.push('Örnek: ' + deHTML(bsp));
    }
    return out;
  }

  // ---------- der / die / das ----------
  function frageArtikel(n) {
    return {
      artFrage: true, modus: 'art',
      html: `<div class="tur"><span>artikel · der / die / das?</span></div>
        <div class="soru de buyuk-kelime">${esc(n.lemma)}</div><div class="soluk">${esc(kurzTr(n.tr))}</div>`,
      ziel: n.art + ' ' + n.lemma, frageText: n.lemma,
      loesungHTML: () => artHTML(n) + (n.plf ? ` <span class="soluk">· Pl. die ${esc(n.plf)}</span>` : ''),
      erkl: () => [],
    };
  }

  // ---------- Hızlı tur: yeni kelime ön testi ----------
  function fragePretest(id) {
    return {
      typ: 'pretest', id, uid: id + ':' + (kind(id) === 'v' ? 'bed' : 'erk'), mc: true, optionen: optionen(id), start: now(), modus: 'pretest',
      html: `<div class="tur"><span class="yeni">yeni kelime</span><span>biliyor musun?</span></div>
        ${erkPrompt(id, 'Biliyorsan doğru seç: bildiğin kelime tekrar yükü olmadan geçer. Bilmiyorsan "Bilmiyorum" de, öğretelim.')}`,
      ziel: kurzTr(trOf(id)), frageText: label(id),
      loesungHTML: () => `${deItemHTML(id)} = <b>${esc(trOf(id))}</b>`,
      erkl: () => infoZeilen(id),
    };
  }

  // Hafif tanıtım kartı (Hızlı tur'da bilinmeyen kelime)
  function lichtHTML(id) {
    const k = kind(id);
    let kopf, extra = '';
    if (k === 'n') {
      const n = byId[id];
      kopf = `<span class="kelime">${artHTML(n)}</span>`;
      extra = regelHTML(n) + (n.weak ? `<div class="kural"><b>n-Deklination:</b> den / dem / des ${esc(G.np(n, 'A', { det: 'def' })[1])}</div>` : '');
    } else if (k === 'v') {
      const v = vById[id];
      kopf = `<span class="kelime">${esc(v.anz)}</span>`;
    } else {
      kopf = `<span class="kelime">${esc(wById[id].de)}</span><span class="soluk">${esc(KL_TR[wById[id].kl])}</span>`;
    }
    const info = infoZeilen(id);
    return `<div class="tanit-bas">${kopf}<span class="tr">${esc(trOf(id))}</span></div>${extra}
      ${info.length ? `<ul class="erkl">${info.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}${kancaHTML(id)}`;
  }

  // ---------- Derin tanıtım (yazarak) ----------
  function frageEinf(id) {
    if (kind(id) === 'n') {
      const n = byId[id];
      const pl = n.plOnly ? 'yalnız çoğul' : n.plf ? `die ${n.plf}` : 'çoğulu yok';
      return {
        typ: 'einf', id, uid: id + ':wort', abschreib: (n.plOnly ? 'die ' : n.art + ' ') + n.lemma, html: `
        <div class="tur"><span class="yeni">yeni kelime</span><span>isim · seviye ${'A' + Math.min(n.tier, 2)}${n.tier === 3 ? '→B1' : ''}</span></div>
        <div class="tanit-bas"><span class="kelime">${artHTML(n)}</span><span class="tr">${esc(n.tr)}</span></div>
        <div class="formlar"><div><span class="et">Artikel</span><span class="art art-${n.plOnly ? 'pl' : n.art}">${n.plOnly ? 'die (Pl.)' : n.art}</span></div><div><span class="et">Çoğul</span>${esc(pl)}</div></div>
        ${regelHTML(n)}
        ${n.weak || n.falle ? ndekTabelle(n) : ''}
        ${n.bsp && n.bsp.length ? `<ul class="ornekler">${n.bsp.slice(0, 2).map(b => `<li>${deHTML(b)}</li>`).join('')}</ul>` : ''}
        ${kancaHTML(id)}
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
      ${kalipKutu(id)}
      ${kancaHTML(id)}
      ${abschreibHTML(abschreib)}` };
  }

  // Tanıtımda bir kez yazdırma (sadece okuyup geçmek yok)
  function abschreibHTML(z) {
    return `<form class="cevap" id="abschreib-form" autocomplete="off">
        <input id="cevap" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Bir kez yaz: ${esc(z)}" aria-label="Kelimeyi bir kez yaz">
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

  // ---------- Üretim (yazarak) ----------
  function frageWort(n, lv) {
    const lem = n.lemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // örnek ipucu yalnız artikel doğrudan ismin önündeyse (eine alte ___ gibi örnekler "artikel gerekmez" sandırıyordu)
    const detRe = new RegExp('\\b(?:der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\\s+' + lem + '\\w*', 'gi');
    const ex = (n.bsp || []).find(b => { detRe.lastIndex = 0; return detRe.test(b) && !new RegExp('\\b' + lem, 'g').test(b.replace(detRe, '')); });
    const hint = lv === 0 && ex ? `<div class="soluk">Örnek: ${esc(ex.replace(detRe, '_____'))} <span class="soluk">(boşluk = artikel + isim)</span></div>` : '';
    const syn = synOf(n.id);
    const synHint = syn.length ? `<div class="soluk">Anlamdaşı var · başı: <code>${esc(synPraefix(n.id, syn))}…</code></div>` : '';
    return {
      html: `<div class="tur"><span>kelime · Türkçe → Almanca</span></div>
        <div class="soru">${esc(maskTr(n.tr, n.lemma))}<span class="alt">Artikeliyle yaz${n.plOnly ? ' (çoğul isim)' : ''}: der / die / das + isim</span></div>${hint}${synHint}`,
      syn: inp => synTreffer(syn, inp),
      ziel: (n.plOnly ? 'die ' : n.art + ' ') + n.lemma, input: true, placeholder: 'z. B. der Bahnhof',
      pruef: inp => pruefWort(n, inp),
      loesungHTML: () => `${artHTML(n)}${n.plf && !n.plOnly ? ` <span class="soluk">· Pl. die ${esc(n.plf)}</span>` : ''}`,
      erkl: () => [regelHTML(n)].concat((n.bsp || []).slice(0, 1).map(b => 'Örnek: ' + deHTML(b))).filter(Boolean),
      frageText: n.tr,
    };
  }
  function pruefWort(n, inp) {
    const ziel = (n.plOnly ? 'die ' : n.art + ' ') + n.lemma;
    const r = G.pruefen(inp, ziel, (n.alt || []).map(a => (n.plOnly ? 'die ' : n.art + ' ') + a));
    const t = G.norm(inp).split(' ');
    if (r.urteil !== 'richtig') {
      const art = t.length > 1 ? t[0].toLowerCase() : null;
      const rest = t.length > 1 ? t.slice(1).join(' ') : t[0];
      const nounOk = G.pruefen(rest, n.lemma).urteil !== 'falsch';
      if (nounOk && art !== (n.plOnly ? 'die' : n.art)) {
        r.urteil = 'falsch';
        r.tags = [art && /^(der|die|das)$/.test(art) ? `artikel: ${art} → ${n.plOnly ? 'die' : n.art}` : 'artikel eksik: isimle birlikte yaz'];
      } else if (!nounOk) r.tags = ['kelime yanlış'].concat(art && /^(der|die|das)$/.test(art) && art !== (n.plOnly ? 'die' : n.art) ? [`artikel: ${n.plOnly ? 'die' : n.art}`] : []);
    }
    return r;
  }

  function frageProd(w, lv) {
    const syn = synOf(w.id);
    const ipucu = lv === 0 ? w.de.split(' ').map(x => x[0] + '·'.repeat(Math.max(0, x.length - 1))).join(' ') : '';
    const ex = (w.bsp || [])[0];
    const first = w.de.split(/[ …]/)[0];
    const hint = lv <= 1 && ex && ex.toLowerCase().includes(first.toLowerCase())
      ? `<div class="soluk">Örnek: ${esc(ex.replace(new RegExp('\\b' + first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'gi'), '_____'))}</div>` : '';
    return {
      syn: inp => synTreffer(syn, inp),
      html: `<div class="tur"><span>${esc(KL_TR[w.kl])} · Türkçe → Almanca</span></div>
        <div class="soru">${esc(maskTr(w.tr, w.de))}</div>${hint}
        ${ipucu ? `<div class="soluk">İpucu: <code>${esc(ipucu)}</code></div>` : syn.length ? `<div class="soluk">Anlamdaşı var · başı: <code>${esc(synPraefix(w.id, syn))}…</code></div>` : ''}`,
      ziel: w.de, input: true, placeholder: 'Almanca kelime',
      pruef: inp => G.pruefen(inp, w.de, [w.de.replace(/ … /g, ' ').replace(/…/g, '')]),
      loesungHTML: () => `<b>${esc(w.de)}</b>`,
      erkl: () => (w.bsp || []).slice(0, 1).map(b => 'Örnek: ' + deHTML(b)),
      frageText: w.tr,
    };
  }

  function frageAbr(v, lv) {
    const preps = v.obj.filter(o => o.p);
    const ipucu = lv === 0 ? v.anz.split(' ').map(w => w[0] + '·'.repeat(Math.max(0, w.length - 1))).join(' ') : '';
    const syn = synOf(v.id);
    return {
      syn: inp => synTreffer(syn, inp),
      html: `<div class="tur"><span>fiil · Türkçe → Almanca</span></div>
        <div class="soru">${esc(maskTr(v.tr, v.inf + ' ' + (G.praesensForms(v)[2] || '') + ' ' + (v.ptForm || '') + ' ' + (v.p2 || '')))}${preps.length ? `<span class="alt">Edatla birlikte yaz, ardından hâli: <b>A</b> (Akk) ya da <b>D</b> (Dat). Örnek: sich freuen auf A</span>` : v.refl ? '<span class="alt">Gerekiyorsa sich ile yaz.</span>' : ''}</div>
        ${ipucu ? `<div class="soluk">İpucu: <code>${esc(ipucu)}</code></div>` : syn.length ? `<div class="soluk">Anlamdaşı var · başı: <code>${esc(synPraefix(v.id, syn))}…</code></div>` : ''}`,
      ziel: v.anz + (v.obj.length ? ' (' + G.objMuster(v) + ')' : ''), input: true,
      placeholder: preps.length ? 'z. B. warten auf A' : 'Almanca fiil',
      pruef: inp => pruefAbr(v, inp),
      loesungHTML: () => `<b>${esc(v.anz)}</b>${v.obj.length ? ` <span class="chip vurgu">${esc(G.objMuster(v))}</span>` : ''}`,
      erkl: () => [(v.refl === 'D' ? 'Dativ dönüşlü: <b>mir / dir / sich</b>' : v.refl ? 'Dönüşlü fiil: <b>mich / dich / sich / uns / euch</b>' : '')].concat(v.bsp && v.bsp[0] ? ['Örnek: ' + deHTML(v.bsp[0])] : [], [kalipZeile(v.id)]).filter(Boolean),
      frageText: v.tr,
    };
  }
  // Başka bir anlamdaşı yazdıysa: yanlış sayılmaz, tekrar denetilir
  function synTreffer(ids, inp) {
    const u = G.norm(inp.replace(/\+/g, ' ')).toLowerCase().replace(/\s+(a|akk|d|dat)$/g, '').replace(/\s+(a|d)\s+/g, ' ');
    for (const id of ids) {
      const k = kind(id);
      const w = k === 'v' ? vById[id].anz.replace('sich(D)', 'sich') : label(id);
      const bare = k === 'n' ? byId[id].lemma : w;
      if (u === w.toLowerCase() || u === bare.toLowerCase() || u === w.replace(/^sich /, '').toLowerCase()) return w;
    }
    return null;
  }

  function pruefAbr(v, inp) {
    const preps = v.obj.filter(o => o.p);
    const toks = G.norm(inp.replace(/\+/g, ' ')).split(' ').filter(Boolean);
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

  function formAufgaben(v) {
    const r = v.refl ? 'sich' : '';
    const out = /^(können|müssen|dürfen|sollen|wollen|mögen|möchten)$/.test(v.inf) ? [] : [{ key: 'perf', et: 'Perfekt', pers: 'er / sie', ans: [v.aux, r, v.p2].filter(Boolean).join(' ') }];
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

  // Cümle: çoğunlukla tam Türkçe cümleyi Almancaya çevir; bazen Goethe boşluğu; ikisi de yoksa kalıptan üretilen görev
  function frageSatz(v, lv) {
    const hist = S.kontext[v.id] || [];
    const ue = SAETZE[v.id] || [];
    const lueckeFrei = v.lueckenListe.some(l => !hist.includes(l.text));
    if (ue.length && (!v.lueckenListe.length || !lueckeFrei || Math.random() < 0.75)) return frageUebersetzen(v, lv, ue, hist);
    const useLuecke = v.lueckenListe.length > 0;
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
      erkl: () => [`${esc(v.anz)}: ${esc(v.tr)}`, kalipZeile(v.id)],
      frageText: l.text,
    };
  }

  // ---------- Kademeli cümle: 1) yardımlı boşluk 2) yardımsız boşluk 3) sıfırdan cümle ----------
  // kelimenin cümledeki biçimini bul (fiil: çekimli biçim + ayrılan önek; isim: tekil / çoğul / ekli; diğer: sıfat ekli)
  function wortLuecke(id, satz) {
    const k = kind(id);
    if (k === 'v') return G.luecke(vById[id], satz);
    const toks = satz.split(/\s+/);
    const clean = t => t.replace(/^[„“"(]+|[.,!?;:“"”)…]+$/g, '');
    let ok;
    if (k === 'n') {
      const n = byId[id], ls = [n.lemma, n.plf].filter(Boolean);
      ok = c => ls.some(l => c === l || (c.startsWith(l) && c.length - l.length <= 2));
    } else {
      const w = wById[id].de.split(/[ …]+/)[0].toLowerCase();
      if (w.length < 2) return null;
      ok = c => { const lc = c.toLowerCase(); return lc === w || (w.length >= 4 && lc.startsWith(w) && lc.length - w.length <= 3); };
    }
    const i = toks.findIndex(t => ok(clean(t)));
    if (i < 0) return null;
    return { text: toks.map((t, j) => j === i ? t.replace(clean(t), '_____') : t).join(' '), answer: clean(toks[i]), n: 1 };
  }
  // tam cümle sorusunda: cümlede geçen, iyi bilmediğin kelimeler (hedef kelime hariç) Almanca = Türkçe
  let _lemmaIdx = null;
  function lemmaIdx() {
    if (_lemmaIdx) return _lemmaIdx;
    _lemmaIdx = new Map();
    NL.forEach(n => { _lemmaIdx.set((n.plOnly ? 'die ' : n.art + ' ') + n.lemma, n.id); });
    VERBEN.forEach(v => { _lemmaIdx.set(v.inf, v.id); _lemmaIdx.set(v.anz.replace('sich(D)', 'sich'), v.id); });
    WOERTER.forEach(w => _lemmaIdx.set(w.de, w.id));
    return _lemmaIdx;
  }
  const gutBekannt = id => !!S.items[id] && (!!S.items[id].a1 || unitsOf(id).some(u => (S.karten[id + ':' + u] || {}).S >= 10));
  function hilfeHTML(de, zielId) {
    const g = GLOSSEN[de];
    if (!g) return '';
    const teile = g.split(/\s*;\s*/).map(x => x.split(/\s*=\s*/)).filter(x => x.length === 2).filter(([d]) => {
      const id = lemmaIdx().get(d.trim());
      return id !== zielId && !(id && gutBekannt(id));
    });
    if (!teile.length) return '';
    return `<div class="chips"><span class="soluk">Yardım:</span>${teile.map(([d, t]) => `<span class="chip">${deHTML(d)} = ${esc(t)}</span>`).join('')}</div>`;
  }
  const STUFE_TR = ['aşama 1/3 · boşluk (ipuçlu)', 'aşama 2/3 · boşluk', 'aşama 3/3 · tam cümle'];
  // Cümle havuzu: kendi çeviri cümleleri (Türkçesiyle) + Goethe listesinin örnek cümleleri + okuma metinlerinden gerçek cümleler.
  // Tek cümleli kelimede hep aynı cümle gelince cümle ezberleniyordu, kelime değil. En az kullanılan önce (S.kontext: son 12 cümle).
  function satzPool(id) {
    const k = kind(id);
    const own = ((k === 'v' ? SAETZE[id] : NSAETZE[id]) || []).map(x => ({ de: x.de, tr: x.tr }));
    const seen = new Set(own.map(x => x.de)), extra = [];
    const add = (de, quelle) => {
      if (!de || seen.has(de) || !/[.!?]$/.test(de.trim())) return;
      const n = de.split(/\s+/).length;
      if (n < 4 || n > 22 || !wortLuecke(id, de)) return;
      seen.add(de); extra.push({ de, quelle });
    };
    ((k === 'v' ? vById[id].bsp : k === 'n' ? byId[id].bsp : wById[id].bsp) || []).forEach(de => add(de, 'Goethe-Wortliste'));
    kontextSaetze(id).forEach(x => add(x.s, x.q));
    return { own, extra };
  }
  function satzWahl(id, lv) {
    const hist = S.kontext[id] || [], { own, extra } = satzPool(id);
    const frisch = l => l.filter(x => !hist.includes(x.de));
    const aeltest = l => l.slice().sort((a, b) => hist.lastIndexOf(a.de) - hist.lastIndexOf(b.de))[0];
    if (lv >= 2) {
      // tam cümle: Türkçesi olan cümle; hepsi yakın zamanda sorulduysa başka cümlede boşluk (aynı çeviriyi ezberlememek için)
      const f = frisch(own);
      if (f.length) return { x: pick(f), voll: true };
      const e = frisch(extra);
      if (e.length) return { x: pick(e), voll: false };
      return own.length ? { x: aeltest(own), voll: true } : extra.length ? { x: aeltest(extra), voll: false } : null;
    }
    const alle = own.concat(extra), f = frisch(alle);
    if (f.length) return { x: pick(f), voll: false };
    return alle.length ? { x: aeltest(alle), voll: false } : null;
  }
  function frageLueckeStufe(id, x, lv, hinweisHTML, modus) {
    const l = wortLuecke(id, x.de);
    if (!l) return null;
    return {
      html: `<div class="tur"><span>${esc(STUFE_TR[Math.min(lv, 1)])}${x.tr ? '' : ' · gerçek metinden'}</span></div>
        <div class="soluk">${x.tr ? esc(x.tr) : `aranan: <b>${esc(kurzTr(trOf(id)))}</b>${x.quelle ? ' · ' + esc(x.quelle) : ''}`}</div>
        <div class="soru">${deHTML(l.text).replace(/_____/g, '<span class="bosluk">_____</span>')}</div>
        ${lv === 0 && hinweisHTML ? `<div class="chips">${hinweisHTML}</div>` : ''}${l.n > 1 ? '<div class="soluk">2 boşluk: sırayla, aralarına boşluk koyarak yaz.</div>' : ''}`,
      ziel: l.answer, input: true, placeholder: 'boşluktaki kelime(ler)', kontext: x.de, modus,
      pruef: inp => G.pruefen(inp, l.answer),
      loesungHTML: () => deHTML(x.de),
      erkl: () => [`${deItemHTML(id)}: ${esc(trOf(id))}`],
      frageText: l.text,
    };
  }

  function frageUebersetzen(v, lv, ue, hist) {
    const w = satzWahl(v.id, lv) || { x: ue[0], voll: lv >= 2 };
    let x = w.x;
    if (lv <= 1 || !w.voll) {
      const q = frageLueckeStufe(v.id, x, Math.min(lv, 1), `<span class="chip vurgu">${esc(v.anz)}${v.obj.length ? ' · ' + esc(G.objMuster(v)) : ''}</span>`, 'satz');
      if (q) return q;
    }
    if (!x.tr) x = ue[0];  // çeviri sorusu yalnız Türkçesi olan cümleyle
    // ipucu azalır: 0 → Almanca fiil + hâller, 1 → sadece hâl kalıbı, 2+ → yok
    const ipucu = lv === 0 ? `<span class="chip vurgu">${esc(v.anz)}${v.obj.length ? ' · ' + esc(G.objMuster(v)) : ''}</span>`
      : lv === 1 && v.obj.length ? `<span class="chip">${esc(G.objMuster(v))}</span>` : '';
    return {
      html: `<div class="tur"><span>${lv >= 2 ? STUFE_TR[2] : 'cümle'} · Almancaya çevir</span></div>
        <div class="soru">${esc(x.tr)}</div>${hilfeHTML(x.de, v.id)}
        ${ipucu ? `<div class="chips">${ipucu}</div>` : ''}`,
      ziel: x.de, input: true, placeholder: 'Almanca cümle', kontext: x.de, modus: 'satz',
      pruef: inp => G.pruefen(inp, x.de),
      loesungHTML: () => deHTML(x.de),
      erkl: () => [`<b>${esc(v.anz)}</b>${v.obj.length ? ' · ' + esc(G.objMuster(v)) : ''}: ${esc(v.tr)}`, kalipZeile(v.id), 'Farklı ama doğru bir çeviri yazdıysan kendine 3 ver (Claude log\'dan kontrol eder).'],
      frageText: x.tr,
    };
  }

  // ---------- Kelime cümle içinde: Türkçe cümle → Almanca (isim / diğer kelime) ----------
  function frageWortSatz(id, lv) {
    const ue = NSAETZE[id] || [];
    const w = satzWahl(id, lv) || { x: ue[0], voll: lv >= 2 };
    let x = w.x;
    const k = kind(id), wort = k === 'n' ? byId[id].lemma : wById[id].de;
    const art = k === 'n' ? (byId[id].plOnly ? 'die (Pl.)' : byId[id].art) : '';
    // ipucu azalır: 0 → artikel + baş harfler, 1 → artikel, 2+ → yok
    const kopf = wort.split(' ').map(w => w.slice(0, 2) + '·'.repeat(Math.max(0, w.length - 2))).join(' ');
    if (lv <= 1 || !w.voll) {
      const q = frageLueckeStufe(id, x, Math.min(lv, 1), `<span class="chip vurgu">${art ? `<span class="art art-${art.startsWith('die (') ? 'pl' : art}">${esc(art)}</span> ` : ''}${esc(kopf)} · ${esc(kurzTr(trOf(id)))}</span>`, 'nsatz');
      if (q) return q;
    }
    if (!x.tr) x = ue[0];  // çeviri sorusu yalnız Türkçesi olan cümleyle
    const ipucu = lv === 0 ? `<span class="chip vurgu">${art ? `<span class="art art-${art.startsWith('die (') ? 'pl' : art}">${esc(art)}</span> ` : ''}${esc(kopf)} · ${esc(kurzTr(trOf(id)))}</span>`
      : lv === 1 && art ? `<span class="chip">${esc(kurzTr(trOf(id)))}: <span class="art art-${art.startsWith('die (') ? 'pl' : art}">${esc(art)}</span> …</span>` : '';
    return {
      html: `<div class="tur"><span>${esc(STUFE_TR[2])} · Almancaya çevir</span></div>
        <div class="soru">${esc(x.tr)}</div>${hilfeHTML(x.de, id)}
        ${ipucu ? `<div class="chips">${ipucu}</div>` : ''}`,
      ziel: x.de, input: true, placeholder: 'Almanca cümle', kontext: x.de, modus: 'nsatz',
      pruef: inp => G.pruefen(inp, x.de),
      loesungHTML: () => deHTML(x.de),
      erkl: () => [`${deItemHTML(id)}: ${esc(trOf(id))}`, 'Farklı ama doğru bir çeviri yazdıysan kendine 3 ver (Claude log\'dan kontrol eder).'],
      frageText: x.tr,
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

  // ---------- Düzensiz fiiller: Präteritum + Perfekt ----------
  VERBEN.forEach(v => { v.p2s = String(v.p2 || '').replace(/\s*\(.*$/, '').split('/')[0].trim(); });
  const MODALV = new Set(['können', 'müssen', 'dürfen', 'sollen', 'wollen', 'mögen', 'möchten']);
  // fiilin 3 temel biçimi: er-Präsens, Präteritum, Perfekt (modal fiillerde Perfekt sorulmaz)
  function formen(v) {
    const f = G.praesensForms(v), sich = v.refl ? ' sich' : '', pre = v.pre ? ' ' + v.pre : '';
    const out = [{ et: 'Präsens (er/sie)', soll: f[2] + sich + pre, ohne: f[2] }, { et: 'Präteritum', soll: v.ptForm + sich + pre, ohne: v.ptForm }];
    if (!MODALV.has(v.inf)) out.push({ et: 'Perfekt', soll: `${v.aux}${sich} ${v.p2s}`, alt: v.auxAlt ? `${v.auxAlt}${sich} ${v.p2s}` : null, ohne: `${v.aux} ${v.p2s}` });
    return out;
  }
  const stammZiel = v => formen(v).map(x => x.soll).join(', ');
  function frageStammEinf(id) {
    const v = vById[id], fs = formen(v);
    (S.formGesehen = S.formGesehen || {})[id] = tag();  // formlar burada gösteriliyor
    const abschreib = stammZiel(v);
    return { typ: 'einf', stamm: true, id, uid: id + ':stamm', abschreib, html: `
      <div class="tur"><span class="yeni">yeni fiil</span><span>${fs.map(x => x.et).join(' · ')}</span></div>
      <div class="tanit-bas"><span class="kelime">${esc(v.anz)}</span><span class="tr">${esc(v.tr)}</span></div>
      <div class="formlar">${fs.map(x => `<div><span class="et">${esc(x.et)}</span><b>er ${esc(x.soll)}</b></div>`).join('')}</div>
      ${MODALV.has(v.inf) ? '<div class="kural">Modal fiil: geçmişte hep <b>Präteritum</b> (konnte, musste …), Perfekt neredeyse hiç kullanılmaz.</div>' : v.aux === 'ist' ? '<div class="kural">Perfekt <b>sein</b> ile: hareket ya da durum değişikliği.</div>' : ''}
      ${(SAETZE[id] || [])[0] ? `<ul class="ornekler"><li>${deHTML(SAETZE[id][0].de)}<br><span class="soluk">${esc(SAETZE[id][0].tr)}</span></li></ul>` : ''}
      ${abschreibHTML(abschreib)}` };
  }
  function frageStamm(v, lv) {
    const fs = formen(v);
    return {
      html: `<div class="tur"><span>fiil · çekimler</span></div>
        <div class="soru de">${esc(v.anz)}<span class="alt">${esc(v.tr)}</span></div>
        <div class="chips"><span class="chip vurgu">er / sie · ${fs.map(x => x.et.replace(' (er/sie)', '')).join(', ')}</span></div>`,
      ziel: stammZiel(v), input: true, placeholder: fs.length === 3 ? 'z. B. fährt, fuhr, ist gefahren' : 'z. B. kann, konnte', modus: 'stamm',
      pruef: inp => pruefStamm(v, inp),
      loesungHTML: () => fs.map(x => `er <b>${esc(x.soll)}</b>`).join(' · '),
      erkl: () => [MODALV.has(v.inf) ? 'Modal fiil: geçmiş zaman Präteritum ile' : v.aux === 'ist' ? 'Perfekt <b>sein</b> ile (hareket / durum değişikliği)' : 'Perfekt <b>haben</b> ile'].concat((SAETZE[v.id] || []).slice(0, 1).map(x => 'Örnek: ' + deHTML(x.de)), [kalipZeile(v.id, 1)]),
      frageText: `${v.inf} — ${fs.map(x => x.et).join(', ')}`,
    };
  }
  function pruefStamm(v, inp) {
    const fs = formen(v);
    const teile = G.norm(inp).split(/\s*[,;\/–]\s*|\s+-\s+/).map(x => x.replace(/^(er|sie|es)\s+/i, '').trim()).filter(Boolean);
    const tags = [];
    let schlecht = false;
    fs.forEach((x, i) => {
      const r = G.pruefen(teile[i] || '', x.soll, [x.ohne, x.alt].filter(Boolean));
      if (r.urteil === 'richtig') return;
      if (r.urteil === 'falsch') schlecht = true;
      const au = (teile[i] || '').split(' ')[0];
      tags.push(x.et === 'Perfekt' && /^(hat|ist)$/.test(au) && au !== v.aux ? `yardımcı fiil: ${v.aux}` : `${x.et}: ${x.soll}`);
    });
    const urteil = schlecht ? 'falsch' : tags.length ? 'fast' : 'richtig';
    const ganz = G.pruefen(teile.join(', '), stammZiel(v));
    return { urteil, tags, diff: ganz.diff, ziel: stammZiel(v) };
  }

  function frageRefl(v, lv) {
    // önce tam Türkçe cümle (dönüşlü fiil cümleleri, yoksa Goethe örnekleri); kalıp görevi yalnız yedek
    const ue = SAETZE_REFL[v.id] || SAETZE[v.id] || [];
    if (ue.length) {
      const q = frageUebersetzen(v, lv, ue, S.kontext[v.id] || []);
      q.html = q.html.replace('cümle · Almancaya çevir', 'dönüşlü fiil · Almancaya çevir');
      if (lv <= 1) q.html += `<div class="soluk">Dönüşlü zamir: ${v.refl === 'D' ? 'mir / dir / sich / uns / euch (Dativ)' : 'mich / dich / sich / uns / euch'}</div>`;
      q.modus = 'refl';
      return q;
    }
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

  // ---------- Paketler ----------
  function paketNeu(pid) {
    const t = now();
    const p = pById[pid];
    if (!S.pakete[pid]) {
      S.pakete[pid] = { start: t };
      heuteM('paket').neu++;
      // pakette yeni olan kelimeler hafif tanıtılır (tanıma kartları yarım saat sonra Hızlı tur'a düşer)
      p.items.forEach((id, i) => leichtEinfuehren(id, { quelle: 'paket', spaeter: 30 * 60000 + i * 60000 }));
    }
    save();
    return { typ: 'paket', pid, uid: pid + ':pak', schritt: 'liste', i: 0, erg: [], neuPaket: true, start: t, schrittStart: t };
  }
  function paketWiederholung(pid) {
    return { typ: 'paket', pid, schritt: 'luecke', i: 0, erg: [], neuPaket: false, schrittStart: now() };
  }
  function paketTextHTML(q, modus) {
    const p = pById[q.pid];
    return p.teile.map(x => {
      if (typeof x === 'string') return deHTML(x);
      const l = p.luecken[x];
      if (modus === 'lesen') return `<b class="pk-wort">${deHTML(l.form)}</b>`;
      if (x < q.i || (x === q.i && q.warte)) { const e = q.erg[x]; return `<span class="dolu ${e && e.urteil}">${deHTML(l.form)}</span>`; }
      if (x === q.i) return '<span class="bosluk aktiv">_____</span>';
      return '<span class="bosluk">_____</span>';
    }).join('');
  }
  // aktif boşluğun cümlesi (uzun metinde, özellikle telefonda, boşluk ekran dışında kalmasın)
  function aktiverSatz(q) {
    const p = pById[q.pid];
    let txt = '';
    p.teile.forEach(x => { txt += typeof x === 'string' ? x : x === q.i ? '\u0001' : x < q.i ? p.luecken[x].form : '\u0002'; });
    const pos = txt.indexOf('\u0001');
    const re = /[.!?][“”"»]?\s+/g;
    let a = 0, m;
    while ((m = re.exec(txt)) && m.index < pos) a = m.index + m[0].length;
    re.lastIndex = pos;
    const m2 = re.exec(txt);
    const satz = txt.slice(a, m2 ? m2.index + m2[0].length : txt.length).trim();
    return deHTML(satz).replace('\u0001', '<span class="bosluk aktiv">_____</span>').replace(/\u0002/g, '<span class="bosluk">___</span>');
  }
  function paketHinweis(id) {
    const k = kind(id);
    if (k === 'n') { const n = byId[id]; return `<span class="chip vurgu">${esc(kurzTr(n.tr))} · <span class="art art-${n.plOnly ? 'pl' : n.art}">${n.plOnly ? 'die (Pl.)' : n.art}</span></span>`; }
    if (k === 'v') return `<span class="chip vurgu">${esc(kurzTr(vById[id].tr))} · fiil (çekimli yaz)</span>`;
    return `<span class="chip vurgu">${esc(kurzTr(wById[id].tr))} · ${esc(KL_TR[wById[id].kl])}</span>`;
  }
  function paketRender(q) {
    const p = pById[q.pid];
    const kopf = `<div class="tur"><span class="${q.neuPaket ? 'yeni' : ''}">${q.neuPaket ? 'yeni paket' : 'paket tekrarı'}</span><span>${esc(p.titel)} · ${esc(p.titelTr)}</span></div>`;
    let h = kopf;
    if (q.schritt === 'liste') {
      h += `<div class="soru">Bu sahnenin kelimeleri</div><div class="paket-liste">${p.items.map(id => `<div><span class="de">${deItemHTML(id)}</span><span class="soluk">${esc(kurzTr(trOf(id)))}</span></div>`).join('')}</div>
        <div class="sira"><button class="btn ana" data-act="paket-weiter" type="button">Metni oku <kbd>Enter</kbd></button><span class="soluk">Bir kez sesli oku, anlamlarına bak.</span></div>`;
    } else if (q.schritt === 'lesen') {
      h += `<div class="paket-text">${paketTextHTML(q, 'lesen')}</div>
        <details class="ceviri"><summary>Türkçesini göster</summary><p>${esc(p.tr)}</p></details>
        <div class="sira"><button class="btn ana" data-act="paket-weiter" type="button">Boşluklara geç <kbd>Enter</kbd></button></div>`;
    } else if (q.schritt === 'luecke') {
      const l = p.luecken[q.i];
      h += `<div class="paket-text">${paketTextHTML(q, 'luecke')}</div>
        <div class="pk-satz">${aktiverSatz(q)}</div>
        <div class="chips"><span class="chip">${q.i + 1} / ${p.luecken.length}</span>${paketHinweis(l.id)}${!q.neuPaket && q.i === 0 && !q.gelesen ? '<button class="btn mini" data-act="paket-lesen" type="button" title="Önce okursan paket notu en fazla “küçük hata” olur">Önce metni oku</button>' : ''}</div>
        <form class="cevap" id="paket-form" autocomplete="off"><input id="cevap" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="boşluktaki kelime (metindeki biçimiyle)" aria-label="Boşluk"><button class="btn ana" type="submit">Kontrol <kbd>Enter</kbd></button></form>
        <div id="sonuc"></div>`;
    } else {
      const ok = q.erg.filter(e => e.urteil === 'richtig').length, fast = q.erg.filter(e => e.urteil === 'fast').length;
      h += `<div class="bos"><div class="buyuk">${ok + fast} / ${p.luecken.length}</div>
        <div class="soluk">${ok} doğru, ${fast} küçük hata, ${p.luecken.length - ok - fast} yanlış.${q.neuPaket ? ' Yeni kelimeler tekrar listene eklendi; birkaç gün içinde bu metin tekrar gelecek.' : ''}</div>
        <div class="sira"><button class="btn ana" data-act="paket-weiter" type="button">Devam <kbd>Enter</kbd></button></div></div>`;
    }
    kart.innerHTML = h;
    tastatur();
    const i = $('#cevap'); if (i) i.focus();
  }
  function paketWeiter() {
    const q = aktuell;
    if (!q || q.typ !== 'paket') return;
    const t = now();
    if (q.schritt === 'liste' || q.schritt === 'lesen') {
      // okumadan geçmeye karşı: liste 3 sn, metin kelime başına 0,15 sn (6–15 sn)
      const min = q.schritt === 'liste' ? 3000 : Math.min(15000, Math.max(6000, paketWoerter(q.pid) * 150));
      if (t - q.schrittStart < min) { flash('Biraz daha oku…'); return; }
      q.schritt = q.schritt === 'liste' ? 'lesen' : 'luecke'; q.schrittStart = t; paketRender(q); return;
    }
    if (q.schritt === 'luecke' && q.warte) {
      q.warte = false; q.i++;
      if (q.i >= pById[q.pid].luecken.length) paketAbschluss(q); else paketRender(q);
      return;
    }
    if (q.schritt === 'ende') zeige();
  }
  const paketWoerter = pid => pById[pid].teile.map(x => typeof x === 'string' ? x : 'x').join('').split(/\s+/).filter(Boolean).length;
  function paketPruefen(input) {
    const q = aktuell;
    if (!q || q.schritt !== 'luecke' || q.warte) return;
    const p = pById[q.pid], l = p.luecken[q.i];
    const leer = istMuell(input);
    let r = leer ? { urteil: 'falsch', tags: ['boş / rastgele'] } : G.pruefen(input, l.form);
    if (r.urteil === 'falsch' && !leer) {
      const ohne = input.trim().replace(/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\s+/i, '');
      if (ohne !== input.trim()) { const r2 = G.pruefen(ohne, l.form); if (r2.urteil !== 'falsch') r = { urteil: r2.urteil, tags: ['artikel metinde zaten var'] }; }
    }
    // doğru kelime, yanlış biçim (Schmerz → Schmerzen, untersuchen → untersucht): küçük hata
    if (r.urteil === 'falsch' && !leer) {
      const a = G.norm(input).toLowerCase(), b = l.form.toLowerCase(), n = Math.min(5, b.length - 1);
      if (a.length >= 4 && !a.includes(' ') && a.slice(0, n) === b.slice(0, n)) { r.urteil = 'fast'; r.tags = [`biçim: metinde ${l.form}`]; }
    }
    // isim küçük harfle yazıldıysa: küçük hata (pruefen ilk harfi cümle başı sayıp affeder)
    if (r.urteil === 'richtig' && kind(l.id) === 'n' && /^[a-zäöü]/.test(input.trim()) && /^[A-ZÄÖÜ]/.test(l.form)) { r.urteil = 'fast'; r.tags = ['groß/klein: isim büyük harfle']; }
    q.erg[q.i] = { urteil: r.urteil, input };
    q.warte = true;
    session.q++;
    zaehlen({ ungezaehlt: leer, typ: 'pak' }, r.urteil);
    dikkatNotieren(r.urteil !== 'falsch', leer);
    logEintrag({ modus: 'paket', id: q.pid + ':' + q.i, item: label(l.id), frage: p.titel, antwort: input, ergebnis: r.urteil, loesung: l.form, notiz: r.tags.concat(leer ? ['sayılmadı'] : []).join(', ') });
    if (r.urteil === 'falsch' && !leer) leechPruefen(l.id);
    paketRender(q);
    $('#cevap').disabled = true;
    $('#sonuc').innerHTML = `<div class="sonuc ${r.urteil}"><div class="baslik">${{ richtig: '✓ Doğru', fast: '≈ Küçük hata', falsch: '✗ Yanlış' }[r.urteil]}</div>
      ${r.urteil !== 'richtig' ? `<div class="satir"><span class="et">doğrusu</span><span class="deger">${deHTML(l.form)} <span class="soluk">(${esc(label(l.id))})</span></span></div>${kancaHTML(l.id)}` : ''}
      <div class="soluk">Devam: <kbd>Enter</kbd></div></div>`;
    save();
  }
  function paketAbschluss(q) {
    const t = now(), p = pById[q.pid];
    const punkte = q.erg.reduce((a, e) => a + (e.urteil === 'richtig' ? 1 : e.urteil === 'fast' ? 0.6 : 0), 0) / p.luecken.length;
    let g = punkte >= 0.9 ? 3 : punkte >= 0.6 ? 2 : 1;
    if (q.gelesen && g > 2) g = 2;  // tekrarda önce metni okuduysa: ipuçlu hatırlama
    const uid = q.pid + ':pak';
    const c = FSRS.review(S.karten[uid] || {}, g, t, S.einst.ret); delete c.neu;
    S.karten[uid] = c;
    if (S.pakete[q.pid]) { S.pakete[q.pid].zuletzt = t; S.pakete[q.pid].fertig = true; }
    q.schritt = 'ende';
    logEintrag({ modus: 'paket', id: uid, item: p.titel, frage: q.neuPaket ? 'yeni paket' : 'paket tekrarı', antwort: '', ergebnis: g === 3 ? 'richtig' : g === 2 ? 'fast' : 'falsch', loesung: '', notiz: `puan:${Math.round(punkte * 100)}${q.gelesen ? ' | önce okudu' : ''}` });
    save();
    paketRender(q);
  }

  // ================= Serbest yazma =================
  // 3–4 günde bir: konu + öğrendiğin kelimelerden 5 zorunlu kelime; metin log'a gider, Claude düzeltir
  const YAZMA_ARA = 1;
  const sonText = () => (S.texte || []).reduce((a, x) => Math.max(a, x.zeit), 0);
  const yazmaFaellig = () => Object.keys(S.items).length >= 30 && now() - sonText() >= YAZMA_ARA * DAY;
  function aufgabeWaehlen(anders) {
    const done = new Set((S.texte || []).map(x => x.id));
    let c = AUFGABEN.filter(a => !done.has(a.id) && a.thema === themaId());
    if (!c.length) c = AUFGABEN.filter(a => !done.has(a.id));
    if (!c.length) c = AUFGABEN.slice();
    if (anders && session.aufgabe) { const f = c.filter(a => a.id !== session.aufgabe.id); if (f.length) c = f; }
    return pick(c);
  }
  // zorunlu kelimeler yalnız görevin konusundan: önce öğrendiklerin (yeniler önde), eksikse konunun diğer kelimeleri
  function pflichtWoerter(a) {
    const th = thById[a.thema];
    if (!th) return [];
    const ids = th.items.filter(id => gueltig(id + ':x'));
    const gelernt = ids.filter(id => S.items[id]).sort((x, y) => S.items[y].seit - S.items[x].seit);
    const rest = shuffle(ids.filter(id => !S.items[id]));
    return shuffle(gelernt.slice(0, 8)).slice(0, 5).concat(rest).slice(0, 5);
  }
  function yazmaRender(anders) {
    if (!AUFGABEN.length) { kart.innerHTML = '<div class="bos">Yazma görevi yok.</div>'; return; }
    if (!session.aufgabe || anders) { session.aufgabe = aufgabeWaehlen(anders); session.pflicht = pflichtWoerter(session.aufgabe); }
    const a = session.aufgabe, teile = a.de.split(' · ');
    aktuell = { typ: 'yazma', id: a.id };
    const heute = heuteM('yazma').n;
    $('#durum-satiri').innerHTML = '';
    kart.innerHTML = `<div class="tur"><span class="yeni">yazma</span><span>${esc({ email: 'arkadaşa e-posta', forum: 'forumda görüş', formell: 'resmî e-posta' }[a.typ] || a.typ)} · en az ${a.min} kelime${thById[a.thema] ? ' · ' + esc(thById[a.thema].tr) : ''}</span></div>
      ${heute ? '<div class="sonuc richtig"><div class="baslik">✓ Bugün bir metin gönderdin.</div><div class="soluk">İstersen bir tane daha yazabilirsin. Claude\'a "sonuçlarıma bak" de, düzeltir.</div></div>' : ''}
      <div class="soru" style="font-size:1.1rem;font-weight:400">${esc(teile[0])}</div>
      ${teile.length > 1 ? `<ul class="erkl">${teile.slice(1).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="soluk">${esc(a.tr)}</div>
      ${session.pflicht.length ? `<div class="chips"><span class="soluk">Şu kelimeleri kullanmaya çalış:</span>${session.pflicht.map(id => `<span class="chip vurgu">${deItemHTML(id)}</span>`).join('')}</div>` : ''}
      <textarea id="metin" rows="9" spellcheck="false" placeholder="Liebe / Lieber …, Sehr geehrte Damen und Herren, …" style="width:100%;font:inherit;font-size:1.05rem;padding:.7rem .9rem;border-radius:10px;border:2px solid var(--line);background:var(--surface-2)"></textarea>
      <div class="sira" style="margin:0"><span class="soluk" id="metin-say">0 kelime</span>
        <button class="btn ana" data-act="metin-gonder" type="button">Gönder</button>
        <button class="btn" data-act="metin-baska" type="button">Başka konu</button>
        <button class="btn" data-act="kalip-panel" type="button">Kalıplar</button></div>
      <div id="kalip-panel" hidden><div class="soluk">Kalıba bas: metne eklenir. Üzerine gelince Türkçesi görünür.</div>${yazmaKalipHTML(a)}</div>`;
    tastatur();
    const ta = $('#metin');
    try { ta.value = localStorage.getItem('almanca-tekrar-taslak-' + a.id) || ''; } catch (e) { /* yok */ }
    const say = () => { const n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; $('#metin-say').textContent = `${n} kelime${n < a.min ? ` (en az ${a.min})` : ' ✓'}`; return n; };
    ta.addEventListener('input', () => { say(); try { localStorage.setItem('almanca-tekrar-taslak-' + a.id, ta.value); } catch (e) { /* yok */ } });
    say();
  }
  function metinGonder() {
    const a = session.aufgabe, ta = $('#metin');
    if (!a || !ta) return;
    const text = ta.value.trim(), n = text ? text.split(/\s+/).length : 0;
    if (n < Math.round(a.min * 0.6)) { flash(`Biraz daha yaz: en az ${a.min} kelime (şu an ${n}).`); return; }
    const kullan = session.pflicht.filter(id => text.toLowerCase().includes((kind(id) === 'n' ? byId[id].lemma : kind(id) === 'v' ? vById[id].inf.replace(/^sich /, '') : wById[id].de).toLowerCase().slice(0, 5)));
    S.texte = S.texte || [];
    S.texte.push({ zeit: now(), id: a.id });
    heuteM('yazma').n++;
    logEintrag({ modus: 'text', id: a.id, item: a.thema, frage: a.de, antwort: text.replace(/\s*\n+\s*/g, ' ¶ '), ergebnis: 'neu', loesung: '',
      notiz: `kelime:${n} | zorunlu:${session.pflicht.map(label).join(', ')} | kullandı:${kullan.length}/${session.pflicht.length}` });
    try { localStorage.removeItem('almanca-tekrar-taslak-' + a.id); } catch (e) { /* yok */ }
    ghSync(true);
    save();
    session.aufgabe = null;
    kart.innerHTML = `<div class="bos"><div class="buyuk">Gönderildi ✓</div><div class="soluk">${n} kelime. Claude'a "sonuçlarıma bak" de: hatalarını tek tek düzeltir, düzeltmeler Geçmiş'te görünür.</div>
      <div class="sira"><button class="btn ana" data-modus="akis" type="button">Çalış'a dön</button></div></div>`;
    renderPlan();
  }

  // ================= Kalıplar =================
  // Fiillerin günlük kullanımı (soru yok): öğrendiğin fiiller önce; "yazmaya ekle" dediklerin yazma ekranında da çıkar
  const KAL = window.KALIPLAR || { yazma: {}, fiil: {} };
  function kalipFiiller() {
    // şimdilik yalnız B1 fiilleri (A1/A2 yok); en son öğrendiğin önce, sonra henüz öğrenmediğin B1 fiilleri
    const ids = Object.keys(KAL.fiil).filter(id => vById[id] && vById[id].tier === 3);
    const gelernt = ids.filter(id => S.items[id]).sort((a, b) => (S.items[b].seit || 0) - (S.items[a].seit || 0));
    return gelernt.concat(ids.filter(id => !S.items[id]));
  }
  function kalipRender() {
    aktuell = { typ: 'kalip' };
    $('#durum-satiri').innerHTML = '';
    const ids = kalipFiiller(), seite = session.kalipSeite || 0, fav = S.kalipFav || {};
    const N = 12, teil = ids.slice(seite * N, seite * N + N);
    kart.innerHTML = `<div class="tur"><span class="yeni">kalıplar</span><span>${ids.length} fiil · ${seite * N + 1}–${Math.min(ids.length, seite * N + N)} · B1 fiilleri, son öğrendiğin önce</span></div>
      <div class="kalip-grid">${teil.map(id => `<div class="kalip-fiil"><div class="soru de" style="font-size:1.2rem">${esc(vById[id].anz)} <span class="soluk" style="font-weight:400">${esc(vById[id].tr)}</span></div>
        <ul class="ornekler">${KAL.fiil[id].map((k, i) => `<li>${deHTML(k.de)}<br><span class="soluk">${esc(k.tr)}</span> <button class="fav-btn${fav[id + ':' + i] ? ' an' : ''}" data-fav="${id}:${i}" type="button" title="Yazma ekranında göster">${fav[id + ':' + i] ? '✓ yazmada' : '+ yazmaya ekle'}</button></li>`).join('')}</ul></div>`).join('')}</div>
      <div class="sira">${seite ? '<button class="btn" data-act="kalip-zurueck" type="button">← Önceki</button>' : ''}${(seite + 1) * N < ids.length ? `<button class="btn ana" data-act="kalip-weiter" type="button">Sonraki ${N} fiil →</button>` : ''}</div>`;
    tastatur();
    if (!session.kalipGesehen) { session.kalipGesehen = true; heuteM('kalip').n++; save(); }
  }
  // yazma ekranı için: görev türü + konu + eklenen fiil kalıpları
  function yazmaKalipHTML(a) {
    const fav = S.kalipFav || {};
    const fl = Object.keys(fav).filter(k => fav[k]).map(k => { const [id, i] = k.split(':'); return (KAL.fiil[id] || [])[+i]; }).filter(Boolean);
    const blok = (titel, l) => l && l.length ? `<div class="soluk" style="margin-top:.4rem">${esc(titel)}</div><div class="chips">${l.map(k => `<button class="chip" data-einfuegen="${esc(k.de)}" type="button" title="${esc(k.tr)}">${esc(k.de)}</button>`).join('')}</div>` : '';
    return blok({ email: 'E-posta kalıpları', forum: 'Görüş kalıpları', formell: 'Resmî e-posta kalıpları' }[a.typ] || 'Kalıplar', KAL.yazma[a.typ]) +
      blok(`Konu: ${thById[a.thema] ? thById[a.thema].tr : a.thema}`, KAL.yazma[a.thema]) + blok('Eklediğin fiil kalıpları', fl);
  }

  // ================= Okuma =================
  // Paket metinleri + doğru/yanlış soruları; kelimeye basınca anlamı. Son günlerde öğrendiğin kelimeleri en çok içeren metin önce.
  const LESEN = window.LESEN || {};
  let _formIdx = null;
  function formIdx() {
    if (_formIdx) return _formIdx;
    const m = _formIdx = new Map();
    const add = (f, id) => { if (f && !m.has(f)) m.set(f, id); };
    NL.forEach(n => { [n.lemma, n.plf].filter(Boolean).forEach(f => ['', 'n', 'en', 's', 'es'].forEach(e => add(f + e, n.id))); });
    // ayrılabilen ya da çok kelimeli fiil (abfahren, bekannt geben): yalnız mastar ve Partizip; çekimli hâli ("fährt … ab") tek kelimeden tanınmaz,
    // yoksa metindeki "fährt" abfahren sanılır. Önce öneksiz fiiller (fahren) kendi formlarını alır.
    const sirali = VERBEN.filter(v => !v.pre).concat(VERBEN.filter(v => v.pre));
    sirali.filter(v => v.frmDrill).concat(sirali).forEach(v => {
      if (v.pre) { [v.inf, v.p2s].forEach(x => add(x, v.id)); return; }
      const f = G.praesensForms(v);
      [v.inf, v.p2s, v.base].concat(f).forEach(x => add(x, v.id));
      if (v.ptForm) ['', 'st', 'n', 'en', 't'].forEach(e => add(v.ptForm + e, v.id));
    });
    WOERTER.forEach(w => { const d = w.de.split(/[ …]+/)[0]; ['', 'e', 'en', 'er', 'es', 'em'].forEach(e => add(d + e, w.id)); });
    return m;
  }
  const wortSuchen = t => { const c = t.replace(/^[„“"(]+|[.,!?;:“"”)…]+$/g, ''); const m = formIdx(); return m.get(c) || m.get(c.charAt(0).toLowerCase() + c.slice(1)) || null; };
  // Okuma metinleri Klexikon, DW ve Goethe'den; seçili konu ve son öğrendiğin kelimelerin konusu önce
  const LT = (window.LESETEXTE || []).map((t, i) => Object.assign({ id: 'k' + i, quelle: 'Klexikon' }, t))
    .concat((window.LESETEXTE_DW || []).map(t => Object.assign({}, t, { id: 'dw' + t.id })))
    .concat((window.GOETHE_LESEN || []));
  const GL_OPT = { rf: () => [['richtig', 'Richtig'], ['falsch', 'Falsch']], jn: () => [['ja', 'Ja'], ['nein', 'Nein']],
    abc: a => a.o.map((o, i) => ['abc'[i], 'abc'[i] + ') ' + o]), zu: () => 'abcdefghi0'.split('').map(x => [x, x]) };
  function lesenWaehlen(anders) {
    const t = now(), g = S.gelesen || {};
    const son = {};
    Object.entries(S.items).forEach(([id, it]) => { if (t - (it.seit || 0) < 3 * DAY) (THEMA_VON[id] || []).forEach(th => { son[th] = (son[th] || 0) + 1; }); });
    const c = LT.filter(x => !g[x.id] && !(anders && session.lesen && session.lesen.id === x.id));
    const pool = c.length ? c : LT;
    // Goethe (sınav görevleri), DW (B1 haber metinleri), Klexikon dönüşümlü; konu eşleşirse öne
    const puan = x => (x.thema && x.thema === S.einst.thema ? 5 : 0) + (son[x.thema] || 0) + (x.quelle !== session.lesenQ ? 4 : 0) + (x.aufgaben ? 1 : 0) + Math.random() * 2;
    return pool.slice().sort((a, b) => puan(b) - puan(a))[0];
  }
  function lesenRender(anders) {
    if (!session.lesen || anders) { session.lesen = lesenWaehlen(anders); session.lesenQ = session.lesen && session.lesen.quelle; session.lesenCevap = {}; }
    aktuell = { typ: 'lesen' };
    $('#durum-satiri').innerHTML = '';
    const L = session.lesen;
    if (!L) { kart.innerHTML = '<div class="bos">Okuma metni yok.</div>'; return; }
    const text = L.text.split('\n').map(par => '<p>' + esc(par).split(/(\s+)/).map(w => /\S/.test(w) ? `<span class="lw">${w}</span>` : w).join('') + '</p>').join('');
    const gl = (L.glossar || []).length ? `<details class="ceviri"><summary>DW sözlüğü (${L.glossar.length} kelime, Almanca açıklama)</summary><ul class="erkl">${L.glossar.map(g => `<li><b>${esc(g.de)}</b>: ${esc(g.erkl)}</li>`).join('')}</ul></details>` : '';
    kart.innerHTML = `<div class="tur"><span class="yeni">okuma</span><span>${esc(L.reihe || L.quelle)}${thById[L.thema] ? ' · ' + esc(thById[L.thema].tr) : ''} · bilmediğin kelimeye bas</span></div>
      <div class="soru">${esc(L.titel)}</div>${L.anweisung ? `<div class="soluk">${esc(L.anweisung)}${L.beispiel ? '<br>Beispiel: ' + esc(L.beispiel) : ''}</div>` : ''}
      <div class="paket-text" id="lesen-text">${text}</div>
      <div id="lesen-wort" class="kural" hidden></div>
      ${gl}${L.aufgaben ? goetheAufgabenHTML(L) : ''}
      <div class="soluk">Kaynak: ${L.url ? `<a href="${esc(L.url)}" target="_blank" rel="noopener">${esc(L.quelle)}: ${esc(L.titel)}</a>` : esc(L.quelle) + ', ' + esc(L.reihe)}</div>
      <div class="sira">${L.aufgaben ? '' : '<button class="btn ana" data-act="lesen-fertig" type="button">Okudum</button>'}<button class="btn${L.aufgaben && Object.keys(session.lesenCevap).length === L.aufgaben.length ? ' ana' : ''}" data-act="lesen-baska" type="button">Başka metin</button></div>`;
    tastatur();
  }
  // ================= Ünite (kitaptaki konunun kelime listesi: bir günlük yoğun ezber) =================
  // 1) Ayırma: biliyorum / emin değilim / bilmiyorum. 2) Her kelime bir merdivenden geçer:
  //    tanıtım → anlam seçmeli → ters seçmeli (isimde artikelli) → (isim) der/die/das → cümlede boşluk → Türkçeden yazma → (düzensiz fiil) çekim.
  //    Biliyorum: yalnız boşluk + yazma; emin değilim: tanıtımsız. Yanlışta bir basamak geri, araya en az 6 soru.
  // 3) Araya: kelime kutulu boşluklu metin (2. turda kutusuz), eşleştirme, dinle-yaz, cümle dizme. 4) Sonunda yazma görevi ve tekrar sistemine aktarma.
  const UNITEN = window.UNITE || [];
  const uById = {};
  UNITEN.forEach(U => U.items.forEach(it => { uById[it.id] = it; }));
  const U_STUFEN = it => ['intro', 'mc', 'mcrev'].concat(it.typ === 'n' ? ['art'] : [], it.lk ? ['lk'] : [], ['typ'], it.formen ? ['formen'] : []);
  const U_AKTIV = 8;
  function uState(U) {
    const all = S.unite = S.unite || {};
    return all[U.id] = all[U.id] || { sort: {}, idx: {}, next: {}, done: {}, step: 0, texte: {}, runde: 1, fertig: false, uebernommen: false, sortI: 0 };
  }
  // kapanmış (@geschlossen) ya da aktarılmış ünite artık gösterilmez
  const uAktiv = U => !U.geschlossen && !(S.unite && S.unite[U.id] && S.unite[U.id].uebernommen);
  const uAktuell = () => UNITEN.find(uAktiv) || UNITEN[UNITEN.length - 1];
  // ünite kelimesi → ana listedeki öğe (isim / fiil / diğer kelime)
  function uMainId(it) {
    const kand = it.typ === 'n' ? NL.filter(x => label(x.id) === it.de).map(x => x.id)
      : it.typ === 'v' ? VERBEN.filter(v => v.anz === it.de || (v.inf === it.de.replace(/^sich /, '') && v.refl === (/^sich /.test(it.de) ? 'A' : v.refl))).map(v => v.id)
      : WOERTER.filter(w => label(w.id) === it.de).map(w => w.id);
    return kand[0] || null;
  }
  function sprich(text, rate) {
    try {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'de-DE'; u.rate = rate || 0.9;
      const v = speechSynthesis.getVoices().find(v => /^de/i.test(v.lang)); if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { flash('Bu tarayıcıda ses yok.'); }
  }
  const uLabel = it => it.de;
  const uNorm = s => (s || '').toLowerCase().replace(/[.,!?;:„“"()]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  // yazma kontrolü: tam doğru / küçük hata (artikel eksik, tek harf, umlaut) / yanlış
  function uPruef(eingabe, ziel, alts) {
    const e = uNorm(eingabe), cands = [ziel].concat(alts || []).map(uNorm);
    if (cands.includes(e)) return { u: (eingabe || '').trim().replace(/\s+/g, ' ') === ziel ? 'richtig' : 'fast', hinweis: (eingabe || '').trim() === ziel ? '' : 'büyük/küçük harf ya da umlaut' };
    for (const c of cands) {
      const ohneArt = c.replace(/^(der|die|das) /, '');
      if (ohneArt !== c && e === ohneArt) return { u: 'fast', hinweis: 'artikel eksik: ' + ziel };
      if (ohneArt !== c && /^(der|die|das) /.test(e) && e.replace(/^(der|die|das) /, '') === ohneArt) return { u: 'falsch', hinweis: 'artikel yanlış: ' + ziel };
      if (Math.abs(c.length - e.length) <= 1 && c.length > 4 && lev(c, e) <= 1) return { u: 'fast', hinweis: 'yazım: ' + ziel };
    }
    return { u: 'falsch', hinweis: '' };
  }
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  const uZiel = it => it.de;
  const uAlts = it => {
    const a = [];
    if (/^sich /.test(it.de)) a.push(it.de.replace(/^sich /, ''));
    if (it.de === 'schätzen an') a.push('schätzen');
    if (it.de === 'gehören zu') a.push('gehören');
    if (it.de === 'seitdem') a.push('seit');
    if (/ sein$/.test(it.de)) a.push(it.de.replace(/ sein$/, ''));
    return a;
  };
  function uKarteHTML(it, mitSatz = true) {
    const art = it.typ === 'n' ? `<span class="art art-${it.art}">${it.art}</span> ${esc(it.lemma)}` : `<b>${esc(it.de)}</b>`;
    return `<div class="tanit-bas"><span class="kelime">${art}</span><span class="tr">${esc(it.tr)}</span></div>
      ${it.ex ? `<div class="soluk">${esc(it.ex)}</div>` : ''}
      ${mitSatz && it.bsp ? `<div class="u-satz">${deHTML(it.bsp)} <button class="btn mini" data-sprich="${esc(it.bsp)}" type="button">🔊</button><br><span class="soluk">${esc(it.bspTr)}</span></div>` : ''}`;
  }
  function uOptionen(U, it, feld) {
    const pool = shuffle(U.items.filter(x => x.id !== it.id && x[feld] !== it[feld] && (x.typ === it.typ || Math.random() < 0.3)));
    const out = [], seen = new Set([it[feld]]);
    for (const x of pool) { if (out.length >= 3) break; if (seen.has(x[feld])) continue; seen.add(x[feld]); out.push(x[feld]); }
    return shuffle(out.concat([it[feld]]));
  }
  // ---- seçim ----
  function uWaehle(U) {
    const st = uState(U);
    const items = U.items;
    const offen = items.filter(it => !st.done[it.id] && st.idx[it.id] != null);
    // araya: metin / eşleştirme / dinle-yaz / dizme
    const reif = items.filter(it => (st.idx[it.id] || 0) >= 3 || st.done[it.id]);
    if (st.step > 0 && st.step % 7 === 0 && st.extra !== st.step) {
      st.extra = st.step;
      const t = uText(U); if (t != null) return { art: 'text', t };
    }
    if (st.step > 0 && st.step % 25 === 12 && reif.length >= 6 && st.extra !== st.step) { st.extra = st.step; return { art: 'match', ids: shuffle(reif).slice(0, 6).map(x => x.id) }; }
    if (st.step > 0 && st.step % 14 === 3 && reif.length >= 3 && st.extra !== st.step) { st.extra = st.step; return { art: 'diktat', id: pick(reif.filter(x => x.bsp)).id }; }
    if (st.step > 0 && st.step % 17 === 10 && reif.length >= 3 && st.extra !== st.step) { const c = reif.filter(x => x.bsp && x.bsp.split(' ').length <= 10); if (c.length) { st.extra = st.step; return { art: 'ordnen', id: pick(c).id }; } }
    // fällige (aralık doldu) en düşük basamak önce; aktif sayısı az ise yeni öğe
    const faellig = offen.filter(it => (st.next[it.id] || 0) <= st.step);
    const aktiv = offen.filter(it => st.idx[it.id] < 3).length;
    if (aktiv < U_AKTIV || !faellig.length) {
      const reihen = ['n', 'u', 'k'];
      const neu = items.filter(it => st.idx[it.id] == null && !st.done[it.id]).sort((a, b) => reihen.indexOf(st.sort[a.id] || 'n') - reihen.indexOf(st.sort[b.id] || 'n'))[0];
      if (neu) {
        const s = st.sort[neu.id] || 'n', stufen = U_STUFEN(neu);
        st.idx[neu.id] = s === 'k' ? Math.max(0, stufen.indexOf(neu.lk ? 'lk' : 'typ')) : s === 'u' ? 1 : 0;
        return { art: 'item', id: neu.id };
      }
    }
    if (faellig.length) {
      faellig.sort((a, b) => (st.next[a.id] || 0) - (st.next[b.id] || 0) || st.idx[a.id] - st.idx[b.id]);
      const x = faellig.find(it => it.id !== st.letzte) || faellig[0];
      return { art: 'item', id: x.id };
    }
    if (offen.length) { offen.sort((a, b) => (st.next[a.id] || 0) - (st.next[b.id] || 0)); const x = offen.find(it => it.id !== st.letzte) || offen[0]; return { art: 'item', id: x.id }; }
    return null;
  }
  // ünite metninde boşluk yalnız gördüğün (tanıtılmış / biliyorum dediğin) kelimelerde; görmediğin kelime metinde yazılı durur
  function uGesehen(U, st, f) {
    const it = U.items.find(i => i.lk === f || i.lemma === f || i.de === f || i.de.split(' ').slice(-1)[0] === f);
    return !it || st.idx[it.id] != null || !!st.done[it.id] || st.sort[it.id] === 'k';
  }
  const uLuecken = (U, st, T) => T.teile.filter(x => typeof x !== 'string' && uGesehen(U, st, x.f)).map(x => x.f);
  function uText(U) {
    const st = uState(U);
    // 1. tur: kelime kutulu; 2. tur: kutusuz
    for (let r = st.runde; r <= 2; r++) {
      const i = U.texte.findIndex((t, i) => (st.texte[i] || 0) < r && uLuecken(U, st, t).length >= 3);
      if (i >= 0) { st.runde = r; return i; }
    }
    return null;
  }
  // ---- ekran ----
  function uniteRender() {
    const U = uAktuell();
    $('#durum-satiri').innerHTML = '';
    if (!U) { aktuell = { typ: 'unite' }; kart.innerHTML = '<div class="bos">Ünite yok.</div>'; return; }
    const st = uState(U), items = U.items;
    const fertigN = items.filter(it => st.done[it.id]).length;
    const kopf = `<div class="tur"><span class="yeni">ünite</span><span>${esc(U.titel)} · ${fertigN} / ${items.length} öğrenildi</span></div>
      <div class="u-bar"><div style="width:${Math.round(100 * fertigN / items.length)}%"></div></div>`;
    // 1) ayırma
    if (st.sortI < items.length) {
      const it = items[st.sortI];
      aktuell = { typ: 'unite', usort: true };
      kart.innerHTML = `${kopf}<div class="soluk">Önce ayır (${st.sortI + 1} / ${items.length}): bu kelimeyi biliyor musun? <b>1</b> biliyorum · <b>2</b> emin değilim · <b>3</b> bilmiyorum</div>
        <div class="soluk">${esc(it.gruppe)}</div>
        <div class="soru buyuk-kelime">${it.typ === 'n' ? `${esc(it.de)}` : esc(it.de)}</div>${it.ex ? `<div class="soluk">${esc(it.ex)}</div>` : ''}
        <div class="sira u-sort"><button class="btn" data-usort="k" type="button"><kbd>1</kbd> Biliyorum</button><button class="btn" data-usort="u" type="button"><kbd>2</kbd> Emin değilim</button><button class="btn" data-usort="n" type="button"><kbd>3</kbd> Bilmiyorum</button>${st.sortI ? '<button class="btn mini" data-usort="zurueck" type="button">← geri</button>' : ''}</div>`;
      tastatur();
      return;
    }
    // 2) bitti mi
    const sel = st.aktuell || (st.aktuell = uWaehle(U));
    if (!sel) {
      st.fertig = true; save();
      aktuell = { typ: 'unite', ende: true };
      const n = Object.values(st.sort);
      kart.innerHTML = `${kopf}<div class="buyuk">Bütün kelimeler bitti 🎉</div>
        <div class="soluk">${n.filter(x => x === 'n').length} bilmediğin, ${n.filter(x => x === 'u').length} emin olmadığın kelime çalışıldı.</div>
        <h3>Yazma (sınav için iyi alıştırma)</h3>
        ${U.aufgaben.map(a => `<div class="kural"><b>${esc(a.titel)}</b><br>${esc(a.de)}<br><span class="soluk">${esc(a.tr)}</span><br>Kullan: ${a.woerter.map(w => `<span class="chip">${esc(w)}</span>`).join(' ')}
          <textarea class="u-text" data-aufgabe="${a.id}" rows="6" placeholder="Almanca yaz…">${esc((st.texteSchreiben || {})[a.id] || '')}</textarea>
          <button class="btn" data-uaufgabe="${a.id}" type="button">Kaydet (Claude düzeltir)</button></div>`).join('')}
        <div class="sira">${st.uebernommen ? '<span class="soluk">Kelimeler tekrar sistemine alındı ✓</span>' : '<button class="btn ana" data-act="u-uebernehmen" type="button">Kelimeleri tekrar sistemine al</button>'}<button class="btn" data-act="u-nochmal" type="button">Zor kelimeleri bir tur daha</button></div>`;
      tastatur();
      return;
    }
    aktuell = { typ: 'unite', sel };
    let h = '';
    if (sel.art === 'item') {
      const it = uById[sel.id], stufe = sel.stufe || (sel.stufe = U_STUFEN(it)[st.idx[it.id]]);
      if (stufe === 'intro') h = `<div class="soluk">yeni kelime · oku, sesli söyle</div>${uKarteHTML(it)}<div class="sira"><button class="btn ana" data-act="u-weiter" type="button">Tamam <kbd>Enter</kbd></button></div>`;
      else if (stufe === 'mc' || stufe === 'mcrev' || stufe === 'art') {
        if (!sel.opts) sel.opts = stufe === 'mc' ? uOptionen(U, it, 'tr') : stufe === 'mcrev' ? uOptionen(U, it, 'de') : ['der', 'die', 'das'];
        const frage = stufe === 'mc' ? `<div class="soru buyuk-kelime">${esc(it.de)}</div><div class="soluk">anlamı ne?</div>` : stufe === 'mcrev' ? `<div class="soru buyuk-kelime">${esc(it.tr)}</div><div class="soluk">Almancası? (isimde artikele dikkat)</div>` : `<div class="soru buyuk-kelime">___ ${esc(it.lemma)}</div><div class="soluk">${esc(it.tr)} · der / die / das?</div>`;
        h = frage + `<div class="mc">${sel.opts.map((o, i) => `<button class="mc-opt${sel.cevap != null ? (o === (stufe === 'mc' ? it.tr : stufe === 'mcrev' ? it.de : it.art) ? ' ok' : i === sel.cevap ? ' yanlis' : '') : ''}" data-umc="${i}" type="button"${sel.cevap != null ? ' disabled' : ''}><kbd>${i + 1}</kbd> ${esc(o)}</button>`).join('')}</div>`;
      } else if (stufe === 'lk') {
        const satz = esc(it.bsp).replace(esc(it.lk), '<span class="bosluk">_____</span>');
        h = `<div class="soluk">cümlede boşluk · ${esc(it.tr)}${it.ex ? ' · ' + esc(it.ex) : ''}</div><div class="soru de">${satz} <button class="btn mini" data-sprich="${esc(it.bsp.replace(it.lk, '…'))}" type="button">🔊</button></div><div class="soluk">${esc(it.bspTr)}</div>
          <input id="cevap" class="cevap" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="boşluktaki kelime">`;
      } else if (stufe === 'typ') {
        h = `<div class="soluk">Türkçeden Almancaya yaz${it.typ === 'n' ? ' (artikeliyle)' : ''}</div><div class="soru buyuk-kelime">${esc(it.tr)}</div>${it.typ !== 'n' && it.ex && !it.formen ? `<div class="soluk">${esc(it.ex)}</div>` : ''}
          <input id="cevap" class="cevap" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${it.typ === 'n' ? 'der / die / das …' : 'Almanca'}">`;
      } else if (stufe === 'formen') {
        h = `<div class="soluk">düzensiz fiil · er-Präsens, Präteritum, Perfekt</div><div class="soru buyuk-kelime">${esc(it.de.replace(/^sich /, ''))}</div><div class="soluk">${esc(it.tr)}</div>
          <input id="cevap" class="cevap" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="z. B. fährt, fuhr, ist gefahren">`;
      }
    } else if (sel.art === 'text') {
      const T = U.texte[sel.t], mitBank = st.runde === 1;
      sel.werte = sel.werte || {};
      let k = 0;
      const body = T.teile.map(x => typeof x === 'string' ? esc(x) : !uGesehen(U, st, x.f) ? `<b class="u-frei" title="henüz görmediğin kelime">${esc(x.f)}</b>` : `<input class="u-luecke" data-ul="${k++}" size="${Math.max(6, x.f.length)}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(sel.werte[k - 1] || '')}">`).join('');
      const bank = shuffle(uLuecken(U, st, T));
      sel.bank = sel.bank || bank;
      h = `<div class="soluk">boşluklu metin · ${mitBank ? 'kelimeler kutuda' : '2. tur: kutu yok, hatırla'} · ${esc(T.tr)}</div><div class="soru">${esc(T.titel)}</div>
        ${mitBank ? `<div class="chips u-bank">${sel.bank.map(w => `<span class="chip">${esc(w)}</span>`).join('')}</div>` : ''}
        <div class="paket-text u-text-body">${body}</div>
        <div class="sira"><button class="btn ana" data-act="u-text-pruef" type="button">Kontrol et</button></div><div id="u-text-erg"></div>`;
    } else if (sel.art === 'match') {
      sel.links = sel.links || shuffle(sel.ids.slice()); sel.rechts = sel.rechts || shuffle(sel.ids.slice()); sel.paare = sel.paare || {};
      h = `<div class="soluk">eşleştir · Almanca ↔ Türkçe (önce soldan seç)</div><div class="u-match"><div>${sel.links.map(id => `<button class="btn u-m${sel.paare[id] ? ' ok' : ''}${sel.wahl === id ? ' aktif' : ''}" data-um="L${id}" type="button"${sel.paare[id] ? ' disabled' : ''}>${esc(uById[id].de)}</button>`).join('')}</div><div>${sel.rechts.map(id => `<button class="btn u-m${sel.paare[id] ? ' ok' : ''}" data-um="R${id}" type="button"${sel.paare[id] ? ' disabled' : ''}>${esc(uById[id].tr)}</button>`).join('')}</div></div>
        ${Object.keys(sel.paare).length === sel.ids.length ? `<div class="kural">Bitti · ${sel.fehler || 0} hata</div><div class="sira"><button class="btn ana" data-act="u-weiter" type="button">Devam <kbd>Enter</kbd></button></div>` : ''}`;
    } else if (sel.art === 'diktat') {
      const it = uById[sel.id];
      h = `<div class="soluk">dinle–yaz · 🔊'ye bas, duyduğun cümleyi yaz (istediğin kadar dinle)</div><div class="sira"><button class="btn ana" data-sprich="${esc(it.bsp)}" type="button">🔊 Dinle</button></div>
        <input id="cevap" class="cevap" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="duyduğun cümle">`;
    } else if (sel.art === 'ordnen') {
      const it = uById[sel.id];
      sel.toks = sel.toks || shuffle(it.bsp.replace(/[.!?]$/, '').split(' ').map((w, i) => ({ w, i })));
      sel.gew = sel.gew || [];
      h = `<div class="soluk">cümleyi diz · ${esc(it.bspTr)}</div><div class="soru de u-gebaut">${sel.gew.map(i => esc(sel.toks[i].w)).join(' ') || '…'}</div>
        <div class="chips">${sel.toks.map((t, i) => `<button class="chip" data-uo="${i}" type="button"${sel.gew.includes(i) ? ' disabled' : ''}>${esc(t.w)}</button>`).join('')}</div>
        <div class="sira"><button class="btn mini" data-act="u-ordnen-zurueck" type="button">← sil</button>${sel.gew.length === sel.toks.length ? '<button class="btn ana" data-act="u-ordnen-pruef" type="button">Kontrol et</button>' : ''}</div>`;
    }
    kart.innerHTML = kopf + h + `<div id="u-erg"></div>`;
    tastatur();
    const inp = $('#cevap'); if (inp) inp.focus();
  }
  function uLog(sel, it, antwort, erg, loesung) {
    logEintrag({ modus: 'unite', id: it ? it.id : uAktuell().id, item: it ? it.de : sel.art, frage: sel.stufe || sel.art, antwort: antwort || '', ergebnis: erg, loesung: loesung || '', notiz: '' });
  }
  // bir basamak sonucu: doğru → ilerle, yanlış → bir geri; aralık
  function uSchritt(it, ok) {
    const U = uAktuell(), st = uState(U), stufen = U_STUFEN(it);
    let i = st.idx[it.id];
    if (ok) i++; else i = Math.max(1, i - 1);
    if (i >= stufen.length) { st.done[it.id] = true; delete st.idx[it.id]; }
    else st.idx[it.id] = i;
    st.next[it.id] = st.step + (ok ? 4 + i : 6);
    st.letzte = it.id;
  }
  function uWeiter() {
    const U = uAktuell(), st = uState(U);
    const sel = st.aktuell;
    if (sel && sel.art === 'item' && sel.stufe === 'intro') { uSchritt(uById[sel.id], true); }
    st.step++; st.aktuell = null;
    heuteM('unite').n++;
    save(); renderPlan(); uniteRender(); window.scrollTo(0, 0);
  }
  function uZeigeErgebnis(it, ok, hinweis, loes) {
    const box = $('#u-erg');
    box.innerHTML = `<div class="sonuc ${ok === 'richtig' ? 'richtig' : ok === 'fast' ? 'fast' : 'falsch'}">${ok === 'richtig' ? '✓ doğru' : ok === 'fast' ? '≈ küçük hata' : '✗ yanlış'}${hinweis ? ' · ' + esc(hinweis) : ''}${loes ? `<br>Doğrusu: <b>${esc(loes)}</b>` : ''}</div>
      ${ok !== 'richtig' && it ? uKarteHTML(it) : ''}<div class="sira"><button class="btn ana" data-act="u-weiter" type="button">Devam <kbd>Enter</kbd></button></div>`;
    aktuell.wartet = true;
  }
  function uMc(i) {
    const st = uState(uAktuell()), sel = st.aktuell; if (!sel || sel.cevap != null) return;
    const it = uById[sel.id], richtig = sel.stufe === 'mc' ? it.tr : sel.stufe === 'mcrev' ? it.de : it.art;
    sel.cevap = i;
    const ok = sel.opts[i] === richtig;
    uSchritt(it, ok); uLog(sel, it, sel.opts[i], ok ? 'richtig' : 'falsch', richtig);
    uniteRender(); uZeigeErgebnis(it, ok ? 'richtig' : 'falsch', '', ok ? '' : richtig);
  }
  function uEingabe() {
    const st = uState(uAktuell()), sel = st.aktuell, inp = $('#cevap'); if (!sel || !inp || sel.geprueft) return;
    const v = inp.value;
    let it = uById[sel.id], r, loes;
    if (sel.art === 'diktat') { r = uPruef(v, it.bsp); if (r.u === 'falsch') { const a = uNorm(v).split(' '), b = uNorm(it.bsp).split(' '); const gleich = a.filter((w, i) => w === b[i]).length; if (gleich >= b.length - 2) r = { u: 'fast', hinweis: 'birkaç kelime farklı' }; } loes = it.bsp; }
    else if (sel.stufe === 'lk') { r = uPruef(v, it.lk); loes = it.lk; }
    else if (sel.stufe === 'typ') { r = uPruef(v, uZiel(it), uAlts(it)); loes = it.de; }
    else if (sel.stufe === 'formen') { r = uPruef(v.replace(/\ber /g, ''), it.formen); loes = it.formen; }
    if (!v.trim()) r = { u: 'falsch', hinweis: 'bilmiyorum' };
    sel.geprueft = true; inp.disabled = true;
    if (sel.art === 'item') uSchritt(it, r.u !== 'falsch');
    uLog(sel, it, v, r.u, loes);
    uZeigeErgebnis(it, r.u, r.hinweis, r.u === 'richtig' ? '' : loes);
    if (sel.art === 'diktat' || sel.stufe === 'lk') sprich(it.bsp);
  }
  function uTextPruef() {
    const U = uAktuell(), st = uState(U), sel = st.aktuell; if (!sel || sel.geprueft) return;
    const T = U.texte[sel.t], soll = uLuecken(U, st, T);
    let r = 0;
    document.querySelectorAll('.u-luecke').forEach(inp => {
      const i = +inp.dataset.ul, ok = uPruef(inp.value, soll[i]).u !== 'falsch';
      if (ok) r++;
      inp.classList.add(ok ? 'ok' : 'yanlis'); inp.disabled = true;
      if (!ok) inp.insertAdjacentHTML('afterend', ` <b class="u-dogru">${esc(soll[i])}</b>`);
    });
    sel.geprueft = true;
    st.texte[sel.t] = Math.max(st.texte[sel.t] || 0, st.runde);
    logEintrag({ modus: 'unite', id: U.id + ':t' + sel.t, item: T.titel, frage: 'metin tur ' + st.runde, antwort: [...document.querySelectorAll('.u-luecke')].map(x => x.value).join(' / '), ergebnis: r === soll.length ? 'richtig' : r >= soll.length * 0.7 ? 'fast' : 'falsch', loesung: soll.join(' / '), notiz: `puan:${r}/${soll.length}` });
    $('#u-text-erg').innerHTML = `<div class="kural"><b>${r} / ${soll.length}</b> doğru</div><div class="sira"><button class="btn ana" data-act="u-weiter" type="button">Devam <kbd>Enter</kbd></button></div>`;
    aktuell.wartet = true;
    save();
  }
  function uMatch(code) {
    const st = uState(uAktuell()), sel = st.aktuell; if (!sel) return;
    const seite = code[0], id = code.slice(1);
    if (seite === 'L') { sel.wahl = id; uniteRender(); return; }
    if (!sel.wahl) { flash('Önce soldan seç.'); return; }
    if (sel.wahl === id) { sel.paare[id] = true; sel.wahl = null; }
    else { sel.fehler = (sel.fehler || 0) + 1; flash('✗ ' + uById[sel.wahl].de + ' ≠ ' + uById[id].tr); sel.wahl = null; }
    if (Object.keys(sel.paare).length === sel.ids.length) logEintrag({ modus: 'unite', id: uAktuell().id + ':match', item: 'eşleştirme', frage: sel.ids.map(i => uById[i].de).join(', '), antwort: '', ergebnis: sel.fehler ? 'fast' : 'richtig', loesung: '', notiz: `hata:${sel.fehler || 0}` });
    uniteRender();
  }
  function uOrdnen(i) { const sel = uState(uAktuell()).aktuell; if (!sel || sel.geprueft) return; if (i === 'zurueck') sel.gew.pop(); else if (!sel.gew.includes(i)) sel.gew.push(i); uniteRender(); }
  function uOrdnenPruef() {
    const sel = uState(uAktuell()).aktuell; if (!sel || sel.geprueft) return;
    const it = uById[sel.id], satz = sel.gew.map(i => sel.toks[i].w).join(' '), soll = it.bsp.replace(/[.!?]$/, '');
    const ok = satz === soll;
    sel.geprueft = true;
    uLog(sel, it, satz, ok ? 'richtig' : 'falsch', soll);
    uZeigeErgebnis(it, ok ? 'richtig' : 'falsch', ok ? '' : 'fiilin yerine dikkat', ok ? '' : it.bsp);
    sprich(it.bsp);
  }
  function uSort(w) {
    const U = uAktuell(), st = uState(U);
    if (w === 'zurueck') { st.sortI = Math.max(0, st.sortI - 1); uniteRender(); return; }
    const it = U.items[st.sortI]; if (!it) return;
    st.sort[it.id] = w; st.sortI++;
    if (st.sortI === U.items.length) logEintrag({ modus: 'unite', id: U.id + ':sort', item: U.titel, frage: 'ayırma', antwort: '', ergebnis: 'gelesen', loesung: '', notiz: ['k', 'u', 'n'].map(x => x + ':' + Object.values(st.sort).filter(y => y === x).length).join(' ') });
    save(); uniteRender();
  }
  function uUebernehmen() {
    const U = uAktuell(), st = uState(U), t = now();
    let n = 0, ohne = [];
    U.items.forEach(it => {
      const id = uMainId(it);
      if (!id) { ohne.push(it.de); return; }
      if (!S.items[id]) { leichtEinfuehren(id, { quelle: 'unite', spaeter: morgen(t) + 4 * 3600000 - t }); n++; }
    });
    st.uebernommen = true; st.ohne = ohne; save();
    logEintrag({ modus: 'unite', id: U.id + ':ende', item: U.titel, frage: 'tekrar sistemine', antwort: '', ergebnis: 'gelesen', loesung: '', notiz: `alındı:${n} listede yok:${ohne.length}` });
    flash(`${n} kelime tekrar sistemine alındı (yarından itibaren). ${ohne.length} kelime Goethe listesinde yok, ünitede kaldı.`);
    uniteRender();
  }
  function uNochmal() {
    // bilmediğin / emin olmadığın kelimeler: yazma basamaklarından bir tur daha
    const U = uAktuell(), st = uState(U);
    U.items.forEach(it => { if (st.sort[it.id] !== 'k') { delete st.done[it.id]; const s = U_STUFEN(it); st.idx[it.id] = Math.max(0, s.indexOf(it.lk ? 'lk' : 'typ')); st.next[it.id] = 0; } });
    st.fertig = false; st.aktuell = null; save(); uniteRender();
  }

  // aktif ünitenin sıradaki (henüz listende olmayan) kelimesi: Çalış akışında yeni kelimeler önce buradan
  const _uMain = {};
  function uniteNeuId() {
    const U = UNITEN.find(uAktiv); if (!U) return null;
    for (const it of U.items) {
      const id = it.id in _uMain ? _uMain[it.id] : (_uMain[it.id] = uMainId(it));
      if (id && !S.items[id] && gueltig(id + ':x')) return id;
    }
    return null;
  }

  // ================= Ara etkinlikler (Çalış akışında her 7 soruda bir) =================
  // Metinde boşluk: gerçek metin (DW / Klexikon / Goethe / kitap ünitesi). YALNIZ daha önce gördüğün kelimeler boşluk olur;
  // görmediklerin metinde yazılı durur (basınca anlamı). Kelime kutusunda 2 çeldirici. Eşleştirme, dinle-yaz, cümle dizme: öğrendiklerinden.
  // Bu etkinlikler tekrar takvimini değiştirmez (ek maruz kalma); günlük hedefe 1 cevap sayılır.
  const gesehen = id => !!S.items[id] && !S.items[id].a1 && kind(id) !== 'p' && gueltig(id + ':x') && tierOf(id) >= 2;
  const lernend = id => gesehen(id) && !S.items[id].bekannt;
  const itemFaellig = id => unitsOf(id).some(u => S.karten[id + ':' + u] && S.karten[id + ':' + u].due <= now());
  const tokRein = w => w.replace(/^[„“"(‚‘»«]+|[.,!?;:“"”)…’‘»«]+$/g, '');
  let _aktSaetze = null;
  // bütün metinler cümle cümle; her kelimenin listedeki karşılığı (formIdx)
  function aktSaetze() {
    if (_aktSaetze) return _aktSaetze;
    const m = formIdx();
    const quellen = LT.map(t => ({ id: t.id, titel: t.titel, quelle: t.reihe || t.quelle, text: t.text || '', glossar: t.glossar }))
      .concat(UNITEN.flatMap(U => U.texte.map((T, i) => ({ id: U.id + ':t' + i, titel: T.titel, quelle: 'Kitap: ' + U.titel, text: T.teile.map(x => typeof x === 'string' ? x : x.f).join('') }))));
    const out = [];
    quellen.forEach(q => q.text.split('\n').forEach((par, pi) => {
      par.split(/(?<=[.!?“])\s+/).filter(x => x.trim()).forEach((satz, si) => {
        if (/https?:|@|^\(aus /.test(satz)) return;
        const toks = satz.split(/\s+/).map(raw => { const c = tokRein(raw); return { raw, c, id: c.length > 2 ? (m.get(c) || m.get(c.charAt(0).toLowerCase() + c.slice(1)) || null) : null }; });
        out.push({ q, pi, si, satz, toks, n: toks.length });
      });
    }));
    return _aktSaetze = out;
  }
  function aktLuecke() {
    const A = aktSaetze(), d = tag(), benutzt = S.aktTexte || {};
    const memo = new Map();
    const gew = id => { if (!memo.has(id)) memo.set(id, !gesehen(id) ? 0 : S.items[id].bekannt ? 0.3 : (schwach(id) ? 3 : 1) + (itemFaellig(id) ? 1 : 0)); return memo.get(id); };
    let best = [], bestP = 0;
    for (let a = 0; a < A.length; a++) {
      if (benutzt[A[a].q.id] && (now() - benutzt[A[a].q.id]) < 3 * DAY) continue;
      let w = 0;
      const ids = new Map();
      for (let b = a; b < A.length && b < a + 5; b++) {
        if (A[b].q !== A[a].q || A[b].pi !== A[a].pi) break;
        w += A[b].n;
        if (w > 90) break;
        A[b].toks.forEach(t => { if (t.id && !ids.has(t.id)) ids.set(t.id, gew(t.id)); });
        if (w < 25 || b === a) continue;
        const ps = [...ids.values()].filter(x => x > 0).sort((x, y) => y - x).slice(0, 8);
        const lern = ps.filter(x => x >= 1).length;
        if (ps.length < 3 || lern < 2) continue;
        const p = ps.reduce((x, y) => x + y, 0) + Math.random() * 1.5;
        if (p > bestP) { bestP = p; best = A.slice(a, b + 1); }
      }
    }
    if (!best.length) return null;
    // boşluk: en değerli en çok 8 kelime, her birinin ilk geçtiği yer
    const ids = new Map();
    best.forEach((s, si) => s.toks.forEach((t, ti) => { if (t.id && gew(t.id) > 0 && !ids.has(t.id)) ids.set(t.id, { si, ti, form: t.c, w: gew(t.id) }); }));
    const sec = [...ids.entries()].sort((x, y) => y[1].w - x[1].w).slice(0, 8);
    const blanks = sec.map(([id, x]) => ({ id, si: x.si, ti: x.ti, form: x.form })).sort((a, b) => a.si - b.si || a.ti - b.ti);  // metin sırasıyla
    // çeldirici: listendeki başka kelimeler (metinde olmayan)
    const imText = new Set(best.flatMap(s => s.toks.map(t => t.c)));
    const ext = shuffle(Object.keys(S.items).filter(id => gesehen(id) && !ids.has(id))).map(id => kind(id) === 'n' ? byId[id].lemma : kind(id) === 'v' ? vById[id].inf : wById[id].de.split(' ')[0]).filter(f => f && !imText.has(f)).slice(0, 2);
    return { akt: 'luecke', saetze: best, blanks, bank: shuffle(blanks.map(b => b.form).concat(ext)) };
  }
  function aktMatch() {
    const ids = Object.keys(S.items).filter(id => lernend(id) && ((S.karten[id + ':erk'] || S.karten[id + ':bed'] || {}).reps || 0) >= 1);
    if (ids.length < 6) return null;
    ids.sort((a, b) => (schwach(b) - schwach(a)) || (S.items[b].seit || 0) - (S.items[a].seit || 0));
    const sec = [], trs = new Set(), des = new Set();
    for (const id of shuffle(ids.slice(0, 20))) {
      const tr = kurzTr(trOf(id)), de = label(id);
      if (trs.has(tr) || des.has(de)) continue;
      trs.add(tr); des.add(de); sec.push(id);
      if (sec.length === 6) break;
    }
    return sec.length === 6 ? { akt: 'match', ids: sec } : null;
  }
  function aktSatz(art) {
    const maxW = art === 'ordnen' ? 10 : 12, minW = art === 'ordnen' ? 4 : 3, gs = S.aktSaetze || {};
    const kand = [];
    Object.keys(S.items).forEach(id => {
      if (!lernend(id)) return;
      (kind(id) === 'v' ? (SAETZE[id] || []) : (NSAETZE[id] || [])).forEach(x => {
        const n = x.de.split(' ').length;
        if (n <= maxW && n >= minW && !(gs[x.de] && now() - gs[x.de] < 5 * DAY)) kand.push({ id, de: x.de, tr: x.tr, w: (schwach(id) ? 2 : 1) + Math.random() });
      });
    });
    if (!kand.length) return null;
    kand.sort((a, b) => b.w - a.w);
    return { akt: art, satz: kand[0] };
  }
  // Ön kontrol (Çalış): vadesi gelen bütün kelime tekrarları önce 10–15'lik listede (yazma sorusu varsa Türkçesi gösterilir: Almancasını söyle,
  // yoksa Almancası: anlamını söyle). Listeye girmeyenler: bugün tanıtılan kelime (öğrenme adımları), son 3 saatte sorulan kart,
  // çekim / dönüşlü / n-Deklination alıştırması — bunlar normal sorulur.
  const TRI_TYP = new Set(['erk', 'bed', 'art', 'wort', 'prod', 'abr', 'satz', 'nsatz']), TRI_PROD = new Set(['wort', 'prod', 'abr', 'satz', 'nsatz']);
  const triFaehig = u => {
    const c = S.karten[u], it = S.items[itemOf(u)];
    return TRI_TYP.has(typOf(u)) && !!c && !!it && !(it.seit && tag(it.seit) === tag()) && !(c.last && now() - c.last < 3 * 3600000);
  };
  const triGesehen = u => !!(session.tri && session.tri.uids.has(u));
  const triTor = u => session.modus !== 'akis' || !triFaehig(u) || triGesehen(u);
  const triOffen = () => session.tri ? [...session.tri.offen].filter(u => S.karten[u] && S.karten[u].due <= now() && gueltig(u) && izOk(itemOf(u))) : [];
  function aktTriage() {
    const by = new Map();
    faellig(u => FILTER.akis(u) && triFaehig(u) && !triGesehen(u)).forEach(u => { const id = itemOf(u), d = S.karten[u].due; if (S.items[id] && (!by.has(id) || d < by.get(id))) by.set(id, d); });
    const ids = [...by.keys()].sort((a, b) => by.get(a) - by.get(b)).slice(0, 15);
    if (!ids.length) return null;
    // yön: o kelimenin vadesi gelen yazma / cümle sorusu varsa Türkçe → Almanca, yoksa Almanca → anlam (isimde artikeliyle)
    const yon = {}, artDa = {};
    ids.forEach(id => { const us = faellig(u => itemOf(u) === id && triFaehig(u)); yon[id] = us.some(u => TRI_PROD.has(typOf(u))) ? 'tr' : 'de'; artDa[id] = us.some(u => typOf(u) === 'art'); });
    return { akt: 'kontrol', tri: true, ids, antw: {}, yon, artDa };
  }
  // "Gerçekten biliyor musun?": rastgele 8 öğrenilmiş (ya da ön testte bilinen) kelime / fiil; bugün sorulmamış, vadesi gelmemiş, son 5 günde kontrol edilmemiş
  function aktKontrol() {
    const t = now(), kz = S.kontrol || {}, z = iz();
    const ids = Object.keys(S.items).filter(id => gesehen(id) && !(kz[id] && t - kz[id] < 5 * DAY) && !z.n[id] && !itemFaellig(id));
    return ids.length >= 4 ? { akt: 'kontrol', ids: shuffle(ids).slice(0, 8), antw: {} } : null;
  }
  // bilmiyorum: tanıma kartı unutuldu sayılır (10 dk sonra yeniden, öğrenme adımları, Zayıflar), öteki kartlar en geç yarın;
  // bir hafta anlam sorusu cümle içinde gelir, cümle kartı açılır
  function kontrolBilmiyor(id, t) {
    const it = S.items[id], rek = kind(id) === 'v' ? 'bed' : 'erk', k = S.karten[id + ':' + rek];
    delete it.bekannt;
    it.seri = 0;
    it.satzBis = t + 7 * DAY;
    S.karten[id + ':' + rek] = Object.assign(FSRS.review(k && k.S ? k : {}, 1, t, S.einst.ret), { lern: 0 });
    // bu oturumda bir kez daha (cümle içinde), kalabalık tekrar kuyruğunu beklemeden
    session.requeue.push({ uid: id + ':' + rek, nach: session.q + 8, mal: 0 });
    unitsOf(id).forEach(u => { const c = S.karten[id + ':' + u]; if (u !== rek && c && c.S) { c.S = Math.min(c.S, 2); c.due = c.due <= t ? t + 3 * 3600000 : Math.min(c.due, morgen(t) + 6 * 3600000); } });
    const su = kind(id) === 'v' ? 'satz' : 'nsatz';
    if (unitsOf(id).includes(su)) neueKarte(id + ':' + su, t + DAY / 2);
    leechPruefen(id);
  }
  function markiere(id, de) {
    const l = wortLuecke(id, de);
    let h = esc(de);
    if (l) l.answer.split(' ').forEach(w => { h = h.replace(new RegExp('(^|[^\\wäöüÄÖÜß>])(' + esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\wäöüÄÖÜß])'), '$1<mark>$2</mark>'); });
    return h;
  }
  function kontrolSaetze(id) {
    const { own, extra } = satzPool(id), l = shuffle(own).concat(shuffle(extra)).slice(0, 3);
    return l.length ? `<ul class="kt-saetze">${l.map(x => `<li>${markiere(id, x.de)}${x.tr ? `<div class="soluk">${esc(x.tr)}</div>` : x.quelle ? ` <span class="soluk">· ${esc(x.quelle)}</span>` : ''}</li>`).join('')}</ul>` : '';
  }
  function kontrolAntwort(code) {
    const q = aktuell; if (!q || q.art !== 'kontrol' || q.wartet) return;
    const i = code.lastIndexOf(':'), id = code.slice(0, i), a = code.slice(i + 1);
    if (!q.ids.includes(id) || !'ben'.includes(a)) return;
    q.antw[id] = a;
    aktRender(q);
  }
  const KT_AD = { b: 'biliyorum', e: 'emin değilim', n: 'bilmiyorum' };
  function kontrolBitti() {
    const q = aktuell; if (!q || q.art !== 'kontrol' || q.wartet || q.ids.some(id => !q.antw[id])) return;
    const t = now(), kz = S.kontrol = S.kontrol || {}, n = { b: [], e: [], n: [] };
    const tri = q.tri ? (session.tri = session.tri || { uids: new Set(), offen: new Set() }) : null;
    q.ids.forEach(id => {
      const a = q.antw[id];
      n[a].push(id);
      kz[id] = t;
      // listedeki tekrar kartları: biliyorum → bugünkü tekrarı yapılmış (doğru), emin değilim → şimdi normal sorulur
      const uids = tri ? faellig(u => itemOf(u) === id && triFaehig(u) && !tri.uids.has(u)) : [];
      uids.forEach(u => tri.uids.add(u));
      if (a === 'n') kontrolBilmiyor(id, t);
      else if (a === 'b') uids.forEach(u => { const c = Object.assign(FSRS.review(S.karten[u].S ? S.karten[u] : {}, 3, t, S.einst.ret), { selbst: (S.karten[u].selbst || 0) + 1 }); delete c.neu; delete c.lern; S.karten[u] = c; });
      else if (tri) uids.forEach(u => tri.offen.add(u));
      if (tri && a !== 'e') zaehlen({ typ: 'erk' }, a === 'b' ? 'richtig' : 'falsch');  // emin değilim: asıl soru sayılır
      logEintrag({ modus: 'kontrol', id, item: label(id), frage: tri ? 'sıradaki tekrar' : 'rastgele', antwort: KT_AD[a], ergebnis: { b: 'biliyor', e: 'emin-degil', n: 'bilmiyor' }[a], loesung: trOf(id), notiz: tri ? `kart:${uids.length}` : '' });
    });
    const liste = ids => ids.map(id => esc(label(id))).join(', ');
    q.ergHTML = `<div class="kural">${[n.b.length ? `✓ ${n.b.length} biliyorum${tri ? ': bugünkü tekrarları yapıldı' : ''}` : '', n.e.length ? `? ${n.e.length} emin değilim${tri ? ': şimdi soruluyor' : ''}` : '', n.n.length ? `✗ bilmiyorum, daha sık ve cümle içinde gelecek: <b>${liste(n.n)}</b>` : ''].filter(Boolean).join('<br>')}</div>`;
    // emin değilim: hemen sorulabilir (listede görmek aralık sayılmaz); ötekiler normal aralıkla
    if (tri) { const z = iz(); n.e.forEach(id => { if (z.q[id] != null) z.q[id] = Math.min(z.q[id], z.qq - IZ_ABSTAND); }); }
    aktAbschluss(q, !n.n.length ? 'richtig' : n.n.length <= 2 ? 'fast' : 'falsch', '', '', `biliyor:${n.b.length} emin-degil:${n.e.length} bilmiyor:${n.n.length}`, n.b.concat(n.n), !!tri);
  }
  function aktWaehlen() {
    const hm = heuteM('akis'), off = session.aktAbgelehnt = session.aktAbgelehnt || {};
    // günün işleri: fiil metni (25+ cevaptan sonra), yazma (45+ cevaptan sonra, sırası geldiyse); "sonra" dersen bugün bir daha sorulmaz
    if (!heuteM('fiilmetin').n && hm.n >= 25 && !off.fiilmetin && LT.length) return { akt: 'angebot', was: 'fiilmetin' };
    if (yazmaFaellig() && !heuteM('yazma').n && hm.n >= 45 && !off.yazma) return { akt: 'angebot', was: 'yazma' };
    const sira = ['luecke', 'match', 'paket', 'diktat', 'luecke', 'ordnen'];
    const k = session.aktI = (session.aktI || 0) + 1;
    for (let j = 0; j < sira.length; j++) {
      const typ = sira[(k + j) % sira.length];
      // paket tekrarı uzun (10 boşluk): günde en çok bir
      if (typ === 'paket') { if ((iz().pak || 0) >= 1) continue; const pak = faellig(u => typOf(u) === 'pak').filter(u => izOk(itemOf(u))); if (pak.length) { iz().pak = (iz().pak || 0) + 1; return { uid: pak[0] }; } continue; }
      const a = typ === 'luecke' ? aktLuecke() : typ === 'match' ? aktMatch() : aktSatz(typ);
      if (a) return a;
    }
    return null;
  }
  function aktFrage(sel) {
    const q = Object.assign({ typ: 'akt', art: sel.akt, start: now() }, sel);
    if (q.art === 'match') { q.links = shuffle(q.ids.slice()); q.rechts = shuffle(q.ids.slice()); q.paare = {}; q.fehler = 0; }
    if (q.art === 'ordnen') { q.toks = shuffle(q.satz.de.replace(/[.!?]$/, '').split(' ').map((w, i) => ({ w, i }))); q.gew = []; }
    if (q.art === 'luecke') {
      const T = q.saetze[0].q;
      (S.aktTexte = S.aktTexte || {})[T.id] = now();
      session.lesen = { titel: T.titel, glossar: T.glossar || [] };
    }
    if (q.art === 'diktat' || q.art === 'ordnen') (S.aktSaetze = S.aktSaetze || {})[q.satz.de] = now();
    return q;
  }
  const AKT_AD = { luecke: 'metinde boşluk', match: 'eşleştir', diktat: 'dinle–yaz', ordnen: 'cümle dizme', angebot: 'günün işi', kontrol: 'gerçekten biliyor musun?' };
  const aktAd = q => q.art === 'kontrol' && q.tri ? 'sıradaki tekrarlar' : AKT_AD[q.art];
  function aktRender(q) {
    $('#durum-satiri').innerHTML = '';
    let h = `<div class="tur"><span class="yeni">${q.tri ? 'ön kontrol' : 'ara etkinlik'}</span><span>${esc(aktAd(q))}</span></div>`;
    if (q.art === 'angebot') {
      const fm = q.was === 'fiilmetin';
      h += `<div class="buyuk">${fm ? 'Günün fiil metni hazır' : 'Bugünün yazma görevi'}</div>
        <div class="soluk">${fm ? 'Gerçek bir metin: tam bilmediğin düzensiz fiiller işaretli, basınca zamanı ve formları. Sonra 6 soruluk kısa test (~5 dk).' : 'Kısa bir B1 yazma görevi (~80 kelime). Claude "sonuçlarıma bak"ta düzeltir.'}</div>
        <div class="sira"><button class="btn ana" data-akt="jetzt" type="button">Şimdi ${fm ? 'oku' : 'yaz'} <kbd>Enter</kbd></button><button class="btn" data-akt="spaeter" type="button">Sonra <kbd>0</kbd></button></div>`;
    } else if (q.art === 'luecke') {
      const T = q.saetze[0].q, bl = new Map(q.blanks.map((b, i) => [b.si + ':' + b.ti, i]));
      const body = q.saetze.map((s, si) => s.toks.map((t, ti) => {
        const i = bl.get(si + ':' + ti);
        if (i == null) return `<span class="lw">${esc(t.raw)}</span>`;
        const vor = t.raw.slice(0, t.raw.indexOf(t.c)), nach = t.raw.slice(t.raw.indexOf(t.c) + t.c.length);
        const w = q.werte ? q.werte[i] : '';
        return `${esc(vor)}<input class="u-luecke${q.ok ? (q.ok[i] ? ' ok' : ' yanlis') : ''}" data-al="${i}" size="${Math.max(5, t.c.length + 1)}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(w || '')}"${q.ok ? ' disabled' : ''}>${q.ok && !q.ok[i] ? ` <b class="u-dogru">${esc(q.blanks[i].form)}</b>` : ''}${esc(nach)}`;
      }).join(' ')).join(' ');
      h += `<div class="soluk">Boşluklar: daha önce gördüğün kelimeler. Bilmediğin kelimeye bas, anlamı çıkar. · ${esc(T.quelle || '')}</div>
        <div class="soru">${esc(T.titel || '')}</div>
        <div class="chips u-bank">${q.bank.map(w => `<span class="chip">${esc(w)}</span>`).join('')}</div>
        <div class="paket-text u-text-body" id="lesen-text">${body}</div><div id="lesen-wort" class="kural" hidden></div>
        ${q.ok ? '' : '<div class="sira"><button class="btn ana" data-akt="pruef" type="button">Kontrol et</button></div>'}`;
    } else if (q.art === 'match') {
      const fertig = Object.keys(q.paare).length === q.ids.length;
      h += `<div class="soluk">Almanca ↔ Türkçe: önce soldan seç, sonra karşılığını</div><div class="u-match">
        <div>${q.links.map(id => `<button class="btn u-m${q.paare[id] ? ' ok' : ''}${q.wahl === id ? ' aktif' : ''}" data-am="L${id}" type="button"${q.paare[id] ? ' disabled' : ''}>${esc(label(id))}</button>`).join('')}</div>
        <div>${q.rechts.map(id => `<button class="btn u-m${q.paare[id] ? ' ok' : ''}" data-am="R${id}" type="button"${q.paare[id] ? ' disabled' : ''}>${esc(kurzTr(trOf(id)))}</button>`).join('')}</div></div>
        ${fertig ? `<div class="kural">Bitti · ${q.fehler} hata</div>` : ''}`;
    } else if (q.art === 'diktat') {
      h += `<div class="soluk">Dinle, duyduğun cümleyi yaz (istediğin kadar dinle)</div>
        <div class="sira"><button class="btn ana" data-sprich="${esc(q.satz.de)}" type="button">🔊 Dinle</button><button class="btn mini" data-sprich-yavas="${esc(q.satz.de)}" type="button">🐢 yavaş</button></div>
        <input id="cevap" class="cevap" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="duyduğun cümle"${q.erg ? ' disabled' : ''} value="${esc(q.eingabe || '')}">
        ${q.erg ? '' : '<div class="sira"><button class="btn ana" data-akt="pruef" type="button">Kontrol <kbd>Enter</kbd></button></div>'}`;
    } else if (q.art === 'kontrol') {
      const offen = q.ids.findIndex(id => !q.antw[id]);
      h += `<div class="soluk">${q.tri ? 'Sıradaki tekrarların: Türkçe verilenin Almancasını (isimde artikeliyle), Almanca verilenin anlamını aklından söyle, sonra seç; cevap açılır.<br>Biliyorum → bugünkü tekrarı yapılmış sayılır · emin değilim → şimdi normal sorulur · ' : 'Almancasına bak, anlamını aklından söyle, sonra seç. '}bilmiyorum → daha sık ve cümle içinde gelir.</div>
        <div class="kt-liste">${q.ids.map((id, i) => {
          const a = q.antw[id], tr = q.yon && q.yon[id] === 'tr';
          const nackt = tr ? `<span class="kt-soru">${esc(kurzTr(trOf(id)))}</span> <span class="soluk">→ Almancası?</span>`
            : (kind(id) === 'n' ? `<b>${esc(byId[id].lemma)}</b>${byId[id].plOnly ? ' <span class="soluk">(çoğul)</span>' : ''}` : deItemHTML(id)) + ` <span class="soluk">→ anlamı${q.artDa && q.artDa[id] ? ' + artikeli' : ''}?</span>`;
          const btn = (k, t, kbd) => `<button class="btn mini${a === k ? ' secili' : ''}" data-kt="${id}:${k}" type="button"${q.wartet ? ' disabled' : ''}>${t}${i === offen ? ` <kbd>${kbd}</kbd>` : ''}</button>`;
          return `<div class="kt-satir${i === offen ? ' aktif' : ''}${a === 'b' ? ' ok' : a === 'n' ? ' yanlis' : a === 'e' ? ' emin' : ''}">
            <div class="kt-ust"><span class="kt-de">${a ? deItemHTML(id) + ` <span class="kt-tr">= ${esc(trOf(id))}</span>` : nackt}</span>
            <span class="kt-btns">${btn('b', '✓ biliyorum', 1)}${btn('e', '? emin değilim', 2)}${btn('n', '✗ bilmiyorum', 3)}</span></div>
            ${a === 'n' ? ((q.sz = q.sz || {})[id] = q.sz[id] || kontrolSaetze(id)) : ''}</div>`;
        }).join('')}</div>
        ${offen < 0 && !q.wartet ? '<div class="sira"><button class="btn ana" data-akt="kt-bitti" type="button">Bitti <kbd>Enter</kbd></button></div>' : ''}`;
    } else if (q.art === 'ordnen') {
      h += `<div class="soluk">Cümleyi diz: ${esc(q.satz.tr)}</div><div class="soru de u-gebaut">${q.gew.map(i => esc(q.toks[i].w)).join(' ') || '…'}</div>
        <div class="chips">${q.toks.map((t, i) => `<button class="chip" data-ao="${i}" type="button"${q.gew.includes(i) || q.erg ? ' disabled' : ''}>${esc(t.w)}</button>`).join('')}</div>
        ${q.erg ? '' : `<div class="sira"><button class="btn mini" data-ao="zurueck" type="button">← sil</button>${q.gew.length === q.toks.length ? '<button class="btn ana" data-akt="pruef" type="button">Kontrol et <kbd>Enter</kbd></button>' : ''}</div>`}`;
    }
    if (q.ergHTML) h += q.ergHTML;
    kart.innerHTML = h;
    tastatur();
    if (q.art === 'diktat' && !q.erg) { const i = $('#cevap'); if (i) i.focus(); if (!q.gesprochen) { q.gesprochen = true; sprich(q.satz.de); } }
    if (q.art === 'luecke' && !q.ok) { const i = document.querySelector('.u-luecke'); if (i) i.focus(); }
  }
  // etkinlik bitti: hedefe 1 cevap, görülen kelimeler aralık sayılır, log
  function aktAbschluss(q, urteil, antwort, loesung, notiz, ids, gezaehlt) {
    if (!gezaehlt) zaehlen({}, urteil);
    session.q++;
    session.aktEnde = session.q;
    (ids || []).forEach(izSeen);
    logEintrag({ modus: 'akt', id: q.art + (q.saetze ? ':' + q.saetze[0].q.id : q.satz ? ':' + q.satz.id : ''), item: AKT_AD[q.art], frage: q.saetze ? q.saetze.map(s => s.satz).join(' ').slice(0, 300) : q.satz ? q.satz.de : (q.ids || []).map(label).join(', '), antwort: antwort || '', ergebnis: urteil, loesung: loesung || '', notiz: notiz || '' });
    q.wartet = true;
    q.ergHTML = (q.ergHTML || '') + `<div class="sira"><button class="btn ana" data-akt="weiter" type="button">Devam <kbd>Enter</kbd></button></div>`;
    save(); renderHedef(); renderPlan();
    aktRender(q);
  }
  function aktPruef() {
    const q = aktuell; if (!q || q.typ !== 'akt' || q.wartet) return;
    if (q.art === 'luecke') {
      q.werte = q.blanks.map((b, i) => (document.querySelector(`.u-luecke[data-al="${i}"]`) || {}).value || '');
      q.ok = q.blanks.map((b, i) => uPruef(q.werte[i], b.form).u !== 'falsch');
      const r = q.ok.filter(Boolean).length, n = q.blanks.length;
      q.ergHTML = `<div class="kural"><b>${r} / ${n}</b> doğru${r < n ? ' · yanlışların doğrusu yeşil' : ''}</div>`;
      aktAbschluss(q, r === n ? 'richtig' : r >= n * 0.6 ? 'fast' : 'falsch', q.werte.join(' / '), q.blanks.map(b => b.form).join(' / '), `puan:${r}/${n}`, q.blanks.map(b => b.id));
    } else if (q.art === 'diktat') {
      const i = $('#cevap'); q.eingabe = i ? i.value : '';
      let r = uPruef(q.eingabe, q.satz.de);
      if (r.u === 'falsch') {
        const a = uNorm(q.eingabe).split(' '), b = uNorm(q.satz.de).split(' ');
        const gleich = b.filter((w, k) => a[k] === w).length;
        if (gleich >= b.length - 1 && b.length > 3) r = { u: 'fast', hinweis: 'bir kelime farklı' };
      }
      q.erg = r.u;
      q.ergHTML = `<div class="sonuc ${r.u}">${r.u === 'richtig' ? '✓ doğru' : r.u === 'fast' ? '≈ küçük hata' : '✗ yanlış'}<br><b>${deHTML(q.satz.de)}</b><br><span class="soluk">${esc(q.satz.tr)}</span></div>`;
      aktAbschluss(q, r.u, q.eingabe, q.satz.de, r.hinweis || '', [q.satz.id]);
    } else if (q.art === 'ordnen') {
      if (q.gew.length !== q.toks.length) return;
      const satz = q.gew.map(i => q.toks[i].w).join(' '), soll = q.satz.de.replace(/[.!?]$/, '');
      q.erg = satz === soll ? 'richtig' : 'falsch';
      q.ergHTML = `<div class="sonuc ${q.erg}">${q.erg === 'richtig' ? '✓ doğru' : '✗ sıra farklı (fiilin yerine dikkat)'}<br><b>${deHTML(q.satz.de)}</b></div>`;
      sprich(q.satz.de);
      aktAbschluss(q, q.erg, satz, q.satz.de, '', [q.satz.id]);
    }
  }
  function aktMatch2(code) {
    const q = aktuell; if (!q || q.art !== 'match' || q.wartet) return;
    const seite = code[0], id = code.slice(1);
    if (seite === 'L') { q.wahl = id; aktRender(q); return; }
    if (!q.wahl) { flash('Önce soldan seç.'); return; }
    if (q.wahl === id) { q.paare[id] = true; q.wahl = null; }
    else { q.fehler++; flash(`✗ ${label(q.wahl)} ≠ ${kurzTr(trOf(id))}`); q.wahl = null; }
    if (Object.keys(q.paare).length === q.ids.length) aktAbschluss(q, q.fehler ? (q.fehler <= 2 ? 'fast' : 'falsch') : 'richtig', '', '', `hata:${q.fehler}`, q.ids);
    else aktRender(q);
  }
  function aktOrdnen(i) {
    const q = aktuell; if (!q || q.art !== 'ordnen' || q.wartet) return;
    if (i === 'zurueck') q.gew.pop(); else if (!q.gew.includes(+i)) q.gew.push(+i);
    aktRender(q);
  }
  function aktAktion(a) {
    const q = aktuell; if (!q || q.typ !== 'akt') return;
    if (a === 'pruef') aktPruef();
    else if (a === 'weiter') zeige();
    else if (a === 'jetzt') { setModus(q.was); zeige(); }
    else if (a === 'spaeter') { session.aktAbgelehnt[q.was] = true; zeige(); }
    else if (a === 'kt-bitti') kontrolBitti();
  }

  // ================= Günün fiil metni =================
  // Her gün (sabah 4'te değişir) gerçek bir metin (DW / Klexikon / Goethe): tam bilmediğin düzensiz fiillerin çekimli hâllerini en çok içeren.
  // Fiil formları işaretli; basınca mastar + zaman + üç form. Sonra kısa test (hangi zaman?). Görülen fiillerin çekim sorusu ancak bundan sonra açılır.
  const fvTag = () => tag(now() - 4 * 3600000);
  let _fvIdx = null;
  function fvIndex() {
    if (_fvIdx) return _fvIdx;
    _fvIdx = new Map();
    const add = (form, v, zeit, pre) => { if (!form || form === v.inf) return; const l = _fvIdx.get(form) || []; if (!l.some(x => x.id === v.id && x.zeit === zeit)) l.push({ id: v.id, zeit, pre }); _fvIdx.set(form, l); };
    VERBEN.forEach(v => {
      if (!v.stark || !v.frmDrill || v.tier < 2) return;  // A1 fiilleri (gehen, kommen …) zaten biliniyor
      if (/\s/.test(v.inf) || v.sp) return;  // çok kelimeli (bekannt geben, Angst haben): yanlış eşleşir
      const pre = v.pre && !v.sp ? v.pre : '';  // ayrılabilen ön ek: cümlede ayrıca aranır
      const f = G.praesensForms(v);
      [0, 1, 2, 4].forEach(i => add(f[i], v, 'Präsens', pre));
      if (v.ptForm) G.praeteritumForms(v.ptForm).forEach(x => add(x, v, 'Präteritum', pre));
      (v.p2s || v.p2 || '').split(/[ /(]/).filter(x => x && x.length > 3).slice(0, 1).forEach(x => add(x, v, 'Perfekt (Partizip)', ''));
    });
    return _fvIdx;
  }
  // bir cümlede fiil formlarını bul; ayrılabilen fiilde ön ek cümlede yoksa ön eksiz fiil
  function fvImSatz(satz) {
    const idx = fvIndex(), roh = satz.split(/\s+/), toks = roh.map(t => t.replace(/^[„“"(‚]+|[.,!?;:“"”)…’‘]+$/g, ''));
    // ayrılabilen ön ek: yan cümlenin sonunda (noktalamadan hemen önce ya da cümle sonu) — "fällt mir auf," evet, "an der Uni" hayır
    const sonda = new Set(); roh.forEach((t, i) => { if (/[.,!?;:“"”)]$/.test(t) || i === roh.length - 1) sonda.add(i); });
    const out = [];
    toks.forEach((t, i) => {
      const l = idx.get(t); if (!l) return;
      let ende = i + 1; while (ende < toks.length && !sonda.has(ende - 1)) ende++;
      const prefix = sonda.has(i) ? null : toks[Math.min(ende, toks.length) - 1];
      const mitPre = l.filter(x => x.pre && x.pre === prefix), ohne = l.filter(x => !x.pre);
      const x = (mitPre[0] || ohne[0]); if (x) out.push(Object.assign({ form: t }, x));
    });
    return out;
  }
  function fvZiele() {
    // tam bilmediğin: öğrenilmiş ama zayıf (S < 7 gün) ya da hiç öğrenilmemiş B1/A2 fiilleri; çekimini daha önce görmediklerin önce
    const fg = S.formGesehen || {};
    const w = {};
    VERBEN.forEach(v => {
      if (!v.stark || !v.frmDrill) return;
      const c = S.karten[v.id + ':bed'] || S.karten[v.id + ':abr'];
      let p = S.items[v.id] ? (c && c.S >= 7 ? 0.5 : 3) : (v.tier >= 3 ? 1.2 : 1);
      if (fg[v.id]) p *= 0.3;
      w[v.id] = p;
    });
    return w;
  }
  function fvWaehlen() {
    const d = fvTag(), h = S.fiilMetin = S.fiilMetin || {};
    if (h[d] && LT.find(x => x.id === h[d].id)) return LT.find(x => x.id === h[d].id);
    const benutzt = new Set(Object.values(h).map(x => x.id)), w = fvZiele();
    let best = null, bestP = -1;
    LT.forEach(t => {
      if (benutzt.has(t.id)) return;
      const ids = new Set(); (t.text || '').split(/(?<=[.!?])\s+/).forEach(s => fvImSatz(s).forEach(x => ids.add(x.id)));
      const p = [...ids].reduce((a, id) => a + (w[id] || 0), 0) / Math.max(1, Math.sqrt((t.text || '').length / 800)) * (t.quelle === 'Klexikon' ? 0.8 : 1);
      if (ids.size >= 3 && p > bestP) { bestP = p; best = t; }
    });
    if (best) { h[d] = { id: best.id }; save(); }
    return best;
  }
  function fiilMetinRender() {
    const L = fvWaehlen();
    aktuell = { typ: 'lesen' };
    $('#durum-satiri').innerHTML = '';
    if (!L) { kart.innerHTML = '<div class="bos">Fiil metni bulunamadı.</div>'; return; }
    session.lesen = L;
    const st = session.fv && session.fv.id === L.id && session.fv.tag === fvTag() ? session.fv : (session.fv = { id: L.id, tag: fvTag(), test: null, i: 0, cevap: [] });
    const funde = [];
    const text = L.text.split('\n').map(par => '<p>' + par.split(/(?<=[.!?])\s+/).map(satz => {
      const fs = fvImSatz(satz); fs.forEach(x => funde.push(Object.assign({ satz }, x)));
      const formen = new Set(fs.map(x => x.form));
      return esc(satz).split(/(\s+)/).map(w => { if (!/\S/.test(w)) return w; const c = w.replace(/^[„“"(‚]+|[.,!?;:“"”)…’‘]+$/g, ''); const f = formen.has(c) && fs.find(x => x.form === c); return f ? `<span class="lw fv" data-fv="${f.id}|${esc(f.form)}|${esc(f.zeit)}">${w}</span>` : `<span class="lw">${w}</span>`; }).join('');
    }).join(' ') + '</p>').join('');
    const verbs = [...new Map(funde.map(x => [x.id, x])).values()];
    st.funde = funde;
    const tabelle = `<table class="fv-tab"><tr><th>fiil</th>${formen(vById[verbs[0].id]).map(f => `<th>${esc(f.et)}</th>`).join('')}</tr>${verbs.map(x => { const v = vById[x.id]; return `<tr><td><b>${esc(v.anz)}</b><br><span class="soluk">${esc(v.tr)}</span></td>${formen(v).map(f => `<td>er ${esc(f.soll)}</td>`).join('')}${MODALV.has(v.inf) ? '<td>—</td>' : ''}</tr>`; }).join('')}</table>`;
    let test = '';
    if (st.test) {
      const q = st.test[st.i];
      if (q) {
        const v = vById[q.id], c = st.cevap[st.i];
        const soru = q.ziel === 'mastar' ? `<mark>${esc(q.form)}</mark> hangi fiilin formu?` : `<mark>${esc(q.form)}</mark> <span class="soluk">(${esc(q.zeit)})</span> → aynı fiil, <b>${esc(q.ziel)}</b>: er …?`;
        test = `<div class="kural"><div class="soluk">Test ${st.i + 1} / ${st.test.length} · metinden: „${esc(q.satz)}“</div>
          <div class="soru de">${soru}</div>
          <div class="gl-opts">${q.opts.map((o, i) => `<button class="btn mini gl-opt${c == null ? '' : o === q.ok ? ' ok' : o === c ? ' yanlis' : ''}" data-fvt="${esc(o)}" type="button"${c != null ? ' disabled' : ''}><kbd>${i + 1}</kbd> ${esc(o)}</button>`).join(' ')}</div>
          ${c != null ? `<div>${c === q.ok ? '✓' : '✗'} <b>${esc(q.form)}</b> = ${esc(v.anz)} (${esc(v.tr)}), ${esc(q.zeit)} · ${formen(v).map(f => 'er ' + esc(f.soll)).join(', ')}${q.erkl ? `<div class="soluk">${esc(q.erkl)}</div>` : ''}</div><div class="sira"><button class="btn ana" data-act="fv-weiter" type="button">Devam <kbd>Enter</kbd></button></div>` : ''}</div>`;
      } else {
        const r = st.test.filter((q, i) => st.cevap[i] === q.ok).length;
        test = `<div class="kural"><b>${r} / ${st.test.length}</b> doğru. Bu fiillerin çekim soruları yarından itibaren gelecek.</div><div class="sira"><button class="btn ana" data-modus="akis" type="button">Çalış'a dön</button></div>`;
      }
    }
    kart.innerHTML = `<div class="tur"><span class="yeni">günün fiil metni</span><span>${esc(L.reihe || L.quelle)} · ${verbs.length} fiil işaretli · basınca mastarı ve zamanı</span></div>
      <div class="soru">${esc(L.titel)}</div>
      <div class="paket-text" id="lesen-text">${text}</div>
      <div id="lesen-wort" class="kural" hidden></div>
      <details class="ceviri" open><summary>Metindeki fiillerin formları (${verbs.length})</summary>${tabelle}</details>
      ${test}
      ${st.test ? '' : '<div class="sira"><button class="btn ana" data-act="fv-test" type="button">Okudum, teste geç</button></div>'}`;
    tastatur();
  }
  // test: metindeki formdan başka bir zamana geç (Präsens / Präteritum / Perfekt dengeli) ya da mastarı bul.
  // Çeldiriciler tipik hatalar: düzenli sanma (fliehte, geflieht), yanlış yardımcı fiil (hat ↔ ist), ünlü değişmeden Präsens (fahrt), başka zamanın formu.
  const FV_ZEITEN = ['Präsens', 'Präteritum', 'Perfekt'];
  const fvZeitIdx = z => z.startsWith('Perfekt') ? 2 : z === 'Präteritum' ? 1 : 0;
  function fvSchwach(v) {
    const pre = v.pre ? ' ' + v.pre : '', st = v.base.replace(/e?n$/, ''), e = /[td]$/.test(st) ? 'e' : '';
    const untrennbar = /^(be|ge|er|ver|zer|ent|emp|miss)/.test(v.base) || /ieren$/.test(v.base);
    return {
      pt: st + e + 'te' + pre,
      p2: (v.pre || '') + (untrennbar ? '' : 'ge') + st + e + 't',
      p3: st + e + 't' + pre,  // ünlü değişmeden (fährt → fahrt)
    };
  }
  function fvOptionen(v, ziel) {
    const f = formen(v), sw = fvSchwach(v), sich = v.refl ? ' sich' : '';
    const ok = f[ziel].soll, swap = { hat: 'ist', ist: 'hat' }[v.aux];
    const p2 = f[2] ? v.p2s : null;
    let d;
    if (ziel === 2) d = [v.auxAlt ? null : `${swap}${sich} ${p2}`, `${v.aux}${sich} ${sw.p2}`, `${swap}${sich} ${sw.p2}`, f[1].soll];
    else if (ziel === 1) d = [sw.pt, f[0].soll, p2, sw.p3];
    else d = [sw.p3, f[1].soll, sw.pt, p2];
    const alt = f[ziel].alt;
    d = [...new Set(d.filter(x => x && x !== ok && x !== alt))].slice(0, 3);
    return { ok, opts: shuffle(d.concat([ok])) };
  }
  function fvTestStart() {
    const st = session.fv; if (!st || !st.funde) return;
    const seen = new Set(), t = [], zahl = [0, 0, 0];
    shuffle(st.funde.slice()).forEach(x => { if (!seen.has(x.id) && t.length < 6) { seen.add(x.id); t.push(Object.assign({}, x)); } });
    const ids = [...new Set(st.funde.map(x => x.id))];
    t.forEach((q, i) => {
      const v = vById[q.id], von = fvZeitIdx(q.zeit), n = formen(v).length;
      q.zeit = FV_ZEITEN[von];
      // 6 sorudan 2'si mastar (okurken fiili tanımak), diğerleri başka zamana geçiş
      if (i % 3 === 2) {
        const andere = shuffle(ids.filter(x => x !== q.id)).concat(shuffle(STARK_ORDER.filter(w => w.id !== q.id && w.tier >= 2 && w.inf[0] === v.inf[0]).map(w => w.id)), shuffle(STARK_ORDER.map(w => w.id)));
        const opts = [...new Set(andere.filter(x => x !== q.id).map(x => vById[x].inf))].filter(x => x !== v.inf).slice(0, 3);
        Object.assign(q, { ziel: 'mastar', ok: v.inf, opts: shuffle(opts.concat([v.inf])) });
        return;
      }
      const ziel = [0, 1, 2].filter(z => z !== von && z < n).sort((a, b) => zahl[a] - zahl[b] || Math.random() - 0.5)[0];
      zahl[ziel]++;
      Object.assign(q, { ziel: FV_ZEITEN[ziel] }, fvOptionen(v, ziel));
      if (ziel === 2) q.erkl = v.aux === 'ist' ? 'Perfekt sein ile (hareket / durum değişikliği).' : 'Perfekt haben ile.';
    });
    st.test = t; st.i = 0; st.cevap = [];
    fiilMetinRender();
  }
  function fvTestAntwort(z) {
    const st = session.fv, q = st && st.test && st.test[st.i];
    if (!q || st.cevap[st.i] != null) return;
    st.cevap[st.i] = z;
    logEintrag({ modus: 'fiilmetin', id: q.id, item: vById[q.id].anz, frage: `${q.form} → ${q.ziel} | ${q.satz}`, antwort: z, ergebnis: z === q.ok ? 'richtig' : 'falsch', loesung: q.ok, notiz: session.lesen.id });
    fiilMetinRender();
  }
  function fvWeiter() {
    const st = session.fv; if (!st || !st.test) return;
    st.i++;
    if (st.i >= st.test.length && !st.fertig) {
      st.fertig = true;
      const fg = S.formGesehen = S.formGesehen || {}, t = now();
      [...new Set(st.funde.map(x => x.id))].forEach(id => {
        fg[id] = fvTag();
        // çekim sorusu: yalnız öğrendiğin fiillerde, yarından itibaren
        if (S.items[id] && !S.karten[id + ':stamm'] && unitsOf(id).includes('stamm')) neueKarte(id + ':stamm', morgen(t) + 4 * 3600000);
      });
      heuteM('fiilmetin').n++;
      logEintrag({ modus: 'fiilmetin', id: session.lesen.id, item: session.lesen.titel, frage: '', antwort: '', ergebnis: 'gelesen', loesung: '', notiz: `puan:${st.test.filter((q, i) => st.cevap[i] === q.ok).length}/${st.test.length}` });
      save(); renderPlan();
    }
    fiilMetinRender();
  }

  function lesenWort(el) {
    const id = wortSuchen(el.textContent), box = $('#lesen-wort');
    document.querySelectorAll('#lesen-text .lw.aktiv').forEach(x => x.classList.remove('aktiv'));
    el.classList.add('aktiv');
    box.hidden = false;
    if (!id) {
      const w = el.textContent.replace(/[.,!?;:“"”„()]/g, '').toLowerCase();
      const g = ((session.lesen || {}).glossar || []).find(x => { const h = x.de.split(/[ ,(]/)[0].replace(/\|/g, '').toLowerCase(); return h.length > 3 && (w.startsWith(h.slice(0, Math.max(4, h.length - 2))) || h.startsWith(w)); });
      box.innerHTML = g ? `<b>${esc(g.de)}</b>: ${esc(g.erkl)} <span class="soluk">(DW sözlüğü)</span>` : `<b>${esc(el.textContent.replace(/[.,!?;:“"”„]/g, ''))}</b>: listede yok`;
      return;
    }
    box.innerHTML = `${deItemHTML(id)} = <b>${esc(trOf(id))}</b>${S.items[id] ? '' : ` <button class="btn mini" data-lernen="${id}" type="button">Öğrenmeye ekle</button>`}`;
    logEintrag({ modus: 'lesen-wort', id, item: label(id), frage: session.lesen.titel, antwort: '', ergebnis: S.items[id] ? 'bekannt' : 'neu', loesung: trOf(id), notiz: '' });
  }
  // Goethe Übungssatz: orijinal sorular, çözüm cevap kağıdından
  function goetheAufgabenHTML(L) {
    const C = session.lesenCevap, fertig = Object.keys(C).length === L.aufgaben.length;
    const h = L.aufgaben.map((a, i) => {
      const c = C[i], opts = GL_OPT[L.art](a);
      const btn = opts.map(([v, t]) => {
        const kl = c == null ? '' : v === a.l ? ' ok' : v === c ? ' yanlis' : '';
        return `<button class="btn mini gl-opt${kl}" data-ga="${i}:${v}" type="button"${c != null ? ' disabled' : ''}>${esc(t)}</button>`;
      }).join(L.art === 'abc' ? '<br>' : ' ');
      return `<div class="gl-auf"><div><b>${a.n}</b> ${esc(a.s)}${c == null ? '' : c === a.l ? ' <span class="ok">✓</span>' : ` <span class="yanlis">✗ doğrusu: ${esc(a.l)}</span>`}</div><div class="gl-opts">${btn}</div></div>`;
    }).join('');
    const r = L.aufgaben.filter((a, i) => C[i] === a.l).length;
    return `<div class="gl-aufgaben">${h}</div>${fertig ? `<div class="kural"><b>${r} / ${L.aufgaben.length}</b> doğru</div>` : ''}`;
  }
  function goetheAntwort(i, v) {
    const L = session.lesen, C = session.lesenCevap;
    if (!L || !L.aufgaben || C[i] != null) return;
    C[i] = v;
    const a = L.aufgaben[i];
    logEintrag({ modus: 'lesen', id: L.id + ':' + a.n, item: L.titel, frage: a.s, antwort: v, ergebnis: v === a.l ? 'richtig' : 'falsch', loesung: a.l, notiz: L.reihe });
    if (Object.keys(C).length === L.aufgaben.length) {
      const r = L.aufgaben.filter((x, j) => C[j] === x.l).length;
      (S.gelesen = S.gelesen || {})[L.id] = now(); heuteM('lesen').n++;
      logEintrag({ modus: 'lesen', id: L.id, item: L.titel, frage: L.reihe, antwort: '', ergebnis: 'gelesen', loesung: '', notiz: `puan:${r}/${L.aufgaben.length}` });
      save(); renderPlan();
    }
    const y = window.scrollY; lesenRender(); window.scrollTo(0, y);
  }

  // ================= Baştan savmaya karşı =================
  // boş / rastgele yazılmış cevap: hedefe sayılmaz, "bilmiyorum" gibi işlenir
  function istMuell(input) {
    const s = String(input || '').trim();
    if (s.length < 2) return true;
    if (!/[a-zäöüß]/i.test(s)) return true;
    if (/(.)\1{3,}/.test(s)) return true;
    const letters = s.replace(/[^a-zäöüß]/gi, '');
    if (letters.length >= 4 && !/[aeiouäöüy]/i.test(letters)) return true;
    return false;
  }
  // son 8 cevapta çok yanlış ya da çok "bas geç" → 10 soru boyunca yeni kelime yok, kolay sorular önce
  function dikkatNotieren(ok, schlampig) {
    session.son.push({ ok, schlampig: !!schlampig });
    if (session.son.length > 8) session.son.shift();
    if (dikkatAktiv() || session.son.length < 6) return;
    const falsch = session.son.filter(x => !x.ok).length, schl = session.son.filter(x => x.schlampig).length;
    if (falsch >= 5 || schl >= 3) {
      session.dikkatBis = session.q + 10;
      session.son = [];
      session.hinweisBis = session.dikkatBis;
      session.hinweis = schl >= 3
        ? 'Cevaplar çok hızlı ya da boş geliyor: okumadan basıyor olabilirsin. 10 soru boyunca yeni kelime yok, kolay tekrarlar geliyor. Gerekirse 5 dakika mola ver.'
        : 'Son cevapların çoğu yanlış: yorulmuş olabilirsin. 10 soru boyunca yeni kelime yok, kolay tekrarlar geliyor.';
      logEintrag({ modus: 'dikkat', id: '', item: '', frage: '', antwort: '', ergebnis: schl >= 3 ? 'bas-gec' : 'cok-yanlis', loesung: '', notiz: `son8 yanlış:${falsch} hızlı/boş:${schl}` });
    }
  }
  // takılan kelime: üç ayrı günde yanlış → kanca için işaretle (aynı gün içindeki tekrar hataları bir sayılır)
  const LEECH_TAGE = 3;
  function leechPruefen(id) {
    const it = S.items[id];
    if (!it || it.leech) return;
    const d = tag();
    it.fehlTage = it.fehlTage || [];
    if (!it.fehlTage.includes(d)) it.fehlTage.push(d);
    if (it.fehlTage.length >= LEECH_TAGE) {
      it.leech = now();
      session.hinweisBis = session.q + 4;
      session.hinweis = `„${label(id)}“ takılıyor (${it.fehlTage.length} ayrı günde yanlış). Zayıflar'a işaretlendi; "sonuçlarıma bak" dediğinde Claude buna hafıza kancası yazar.`;
      logEintrag({ modus: 'leech', id, item: label(id), frage: trOf(id), antwort: '', ergebnis: 'takiliyor', loesung: '', notiz: `günler:${it.fehlTage.join(',')}` });
    }
  }

  // ================= Çizim =================
  const kart = $('#kart');
  // ä/ö/ü tuşları yalnız yazma kutusu varken
  const tastatur = () => { $('#umlaut').hidden = !kart.querySelector('#cevap, .u-luecke'); };
  let letzteEingabe = null;
  document.addEventListener('focusin', e => { if (e.target.id === 'cevap' || (e.target.classList && e.target.classList.contains('u-luecke'))) letzteEingabe = e.target; });
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  function flash(msg) {
    const h = $('#hinweis');
    h.textContent = msg; h.hidden = false; h.classList.add('kisa');
    later(() => { h.classList.remove('kisa'); hinweisRender(); }, 1600);
  }
  function hinweisRender() {
    const h = $('#hinweis');
    h.classList.remove('kisa');
    const msgs = [];
    if (session.hinweis && session.q < (session.hinweisBis || 0)) msgs.push(session.hinweis);
    if (session.stau) msgs.push(`${session.stau} tekrar birikmiş: ${stauGrenze(session.modus)}'in altına inene kadar yeni kelime yok. Önce hâlâ hatırladıkların geliyor.`);
    if (session.schreibStau) msgs.push(`Karışık'ta ${session.schreibStau} yazma tekrarı bekliyor: azalana kadar burada yeni kelime yok. Tanıdığını yazamıyorsan öğrenmiş sayılmazsın.`);
    if (session.vollBis > session.q) msgs.push('Bugünkü yeni sınırına ulaştın. Bundan sonra tekrarlar geliyor.');
    if (session.willkommen && session.q < 8) msgs.push(session.willkommen);
    h.hidden = !msgs.length;
    h.innerHTML = msgs.map(m => `<div>${esc(m)}</div>`).join('');
  }

  function zeige() {
    clearTimers();
    renderHedef();
    renderPlan();
    themaUI();
    document.body.classList.toggle('genis', session.modus === 'kalip');
    if (session.modus === 'yazma') { yazmaRender(); return; }
    if (session.modus === 'lesen') { lesenRender(); return; }
    if (session.modus === 'fiilmetin') { fiilMetinRender(); return; }
    if (session.modus === 'unite') { uniteRender(); return; }
    if (session.modus === 'kalip') { kalipRender(); return; }
    const m = session.modus, d = heuteM(m);
    if (d.n >= ziel(m) && !session.zielGesehen[m]) {
      session.zielGesehen[m] = true;
      const naechst = PLAN.find(x => x !== m && heuteM(x).n < ziel(x));
      const rest = faellig(FILTER[m]).length;
      kart.innerHTML = `<div class="bos"><div class="buyuk">${esc(MODI[m].ad)}: bugünlük tamam.</div>
        <div class="soluk">${d.n} soru, ${d.richtig} doğru, ${d.fast} küçük hata, ${d.falsch} yanlış.${d.ungezaehlt ? ` ${d.ungezaehlt} cevap çok hızlı ya da boş olduğu için sayılmadı.` : ''}</div>
        ${rest ? `<div class="soluk">Bu bölümde vadesi gelmiş ${rest} tekrar daha var. Devam edersen yarın daha az birikir.</div>` : ''}
        <div class="sira">${naechst ? `<button class="btn ana" data-modus="${naechst}" type="button">Sıradaki: ${esc(MODI[naechst].ad)} <kbd>Enter</kbd></button>` : ''}<button class="btn ${naechst ? '' : 'ana'}" data-act="weiter" type="button">Burada devam et${naechst ? '' : ' <kbd>Enter</kbd>'}</button></div></div>`;
      aktuell = { typ: 'pause', naechst };
      $('#durum-satiri').innerHTML = '';
      hinweisRender();
      tastatur();
      return;
    }
    const sel = waehle();
    if (sel) izNote(sel.uid ? itemOf(sel.uid) : (sel.pretest || sel.neu || sel.stammNeu));
    if (sel && sel.uid && typOf(sel.uid) === 'stamm') { session.letzteStamm = session.q; iz().stamm = (iz().stamm || 0) + 1; }
    hinweisRender();
    $('#durum-satiri').innerHTML = '';
    if (!sel) {
      aktuell = { typ: 'leer' };
      const hm = heuteM(m);
      let msg;
      if (m === 'zayif') msg = `<div class="buyuk">Zayıf öğe yok.</div><div class="soluk">Yanlış yaptıkların burada toplanır.</div><button class="btn ana" data-modus="akis" type="button">Çalış'a geç</button>`;
      else if (m === 'paket' && !PAKETE.some(p => !S.pakete[p.id])) msg = `<div class="buyuk">Bütün paketleri bitirdin.</div><div class="soluk">Claude'a "yeni paket yaz" de; zayıf kelimelerinden yeni sahneler yazar.</div>`;
      else {
        const naechst = session.schreibStau ? 'normal' : PLAN.find(x => x !== m && heuteM(x).n < ziel(x));
        msg = `<div class="buyuk">${esc(MODI[m].ad)}: şu an tekrar yok.</div>
          <div class="soluk">Bugün ${hm.n} soru · ${hm.neu} / ${neuMax(m)} ${esc(MODI[m].neuTr)}. Sıradaki tekrar: ${naechsteFaelligkeit()}.</div>
          <div class="sira">${naechst ? `<button class="btn ana" data-modus="${naechst}" type="button">Sıradaki: ${esc(MODI[naechst].ad)} <kbd>Enter</kbd></button>` : ''}<button class="btn" data-act="extra" type="button">Ekstra çalış</button></div>`;
        aktuell.naechst = naechst;
      }
      kart.innerHTML = `<div class="bos">${msg}</div>`;
      tastatur();
      return;
    }
    aktuell = frage(sel);
    render(aktuell);
  }

  function render(q) {
    if (q.typ === 'akt') { aktRender(q); return; }
    const info = [];
    if (q.heute) info.push('<span class="chip vurgu">bugün öğrendin: Almancası?</span>');
    if (q.requeue) info.push(`<span class="chip">${q.requeue.neu ? 'az önce öğrendin: hatırla' : 'tekrar: az önce yanlış'}</span>`);
    // öğenin adı burada gösterilmez: TR→DE sorularında cevabı ele verir
    if (q.input && q.typ !== 'einf') { const c = S.karten[q.uid]; if (c && c.S) info.push(`<span class="soluk">ipucu seviyesi ${q.lv}/3</span>`); }
    $('#durum-satiri').innerHTML = info.join(' ');
    if (q.typ === 'paket') { paketRender(q); return; }
    let h = q.html;
    if (q.mc) {
      h += `<div class="mc" id="mc" hidden>${q.optionen.map((o, i) => `<button class="mc-opt" data-mc="${i}" type="button"><kbd>${i + 1}</kbd> ${esc(o.t)}</button>`).join('')}</div>
        <div class="mc-bekle" id="mc-bekle"><span class="nokta"></span> önce aklından söyle…</div>
        <div class="sira" style="margin:0"><button class="btn mini" type="button" data-act="mc-weiss-nicht">Bilmiyorum <kbd>0</kbd></button></div>`;
    } else if (q.artFrage) {
      h += `<div class="art-sec">${['der', 'die', 'das'].map((a, i) => `<button class="btn art-btn art-${a}" data-art="${a}" type="button"><kbd>${i + 1}</kbd> ${a}</button>`).join('')}</div>`;
    } else if (q.input) {
      h += `<form class="cevap" id="cevap-form" autocomplete="off"><input id="cevap" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="${esc(q.placeholder || '')}" aria-label="Cevap"><button class="btn ana" type="submit">Kontrol <kbd>Enter</kbd></button></form>
        <div class="sira soluk" style="margin:0"><button class="btn mini" type="button" data-act="weiss-nicht">Bilmiyorum</button></div>`;
    }
    h += '<div id="sonuc"></div>';
    kart.innerHTML = h;
    tastatur();
    if (q.mc) later(() => mcAufdecken(q), DENKZEIT);
    if (q.artFrage) q.freiAb = now() + 400;
    const inp = $('#cevap');
    if (inp) inp.focus();
  }

  function naechsteFaelligkeit() {
    const ds = Object.keys(S.karten).filter(u => FILTER[session.modus](u) && gueltig(u)).map(u => S.karten[u].due).filter(Boolean);
    if (!ds.length) return '—';
    const m = Math.min(...ds);
    const d = m - now();
    if (d < 3600000) return `${Math.max(1, Math.round(d / 60000))} dk sonra`;
    if (d < DAY) return `${Math.round(d / 3600000)} saat sonra`;
    return new Date(m).toLocaleDateString('tr-TR');
  }

  function diffHTML(res) {
    return res.diff.map(x => x.op === 'eq' ? esc(x.t) : x.op === 'ins' ? `<span class="ins">${esc(x.t)}</span>` : `<span class="del">${esc(x.t)}</span>`).join(' ');
  }

  // ---------- seçmeli (Hızlı tur) ----------
  function mcAufdecken(q) {
    if (aktuell !== q || q.done) return;
    q.offen = true; q.revealAt = now();
    const mc = $('#mc'), b = $('#mc-bekle');
    if (mc) mc.hidden = false;
    if (b) b.remove();
  }
  function mcWahl(i, weissNicht) {
    const q = aktuell;
    if (!q || !q.mc || q.done) return;
    if (!weissNicht && !q.offen) return;
    q.done = true;
    clearTimers();
    const t = now();
    const opt = weissNicht ? null : q.optionen[i];
    const ok = !!(opt && opt.ok);
    const rt = q.revealAt ? t - q.revealAt : 99999, total = t - q.start;
    q.sek = Math.round(total / 1000);
    let g = !ok ? 1 : rt <= FLUESSIG ? 3 : 2;
    const tags = [];
    if (!weissNicht && rt < ZU_SCHNELL) { q.ungezaehlt = true; tags.push('çok hızlı'); if (g > 2) g = 2; }
    if (weissNicht) tags.push('bilmiyorum');
    if (ok && g === 2 && !q.ungezaehlt) tags.push('yavaş');
    q.note = g; q.antwort = weissNicht ? '' : opt.t;
    q.res = { urteil: g === 3 ? 'richtig' : g === 2 ? 'fast' : 'falsch', tags };
    // seçenekleri işaretle
    document.querySelectorAll('.mc-opt').forEach((b, j) => {
      b.disabled = true;
      if (q.optionen[j].ok) b.classList.add('dogru');
      else if (j === i) b.classList.add('yanlis');
    });
    if (q.typ === 'pretest') { pretestErgebnis(q, ok && g === 3 && !q.ungezaehlt); return; }
    dikkatNotieren(ok, q.ungezaehlt);
    if (ok) { later(() => benoten(g), g === 3 ? 550 : 1100); return; }
    q.wartet = true;
    const erkl = (q.erkl ? q.erkl() : []).filter(Boolean);
    $('#sonuc').innerHTML = `<div class="sonuc falsch"><div class="baslik">✗ ${weissNicht ? 'Bilmiyorum' : 'Yanlış'}</div>
      <div class="satir"><span class="et">doğru</span><span class="deger">${q.loesungHTML()}</span></div>
      ${erkl.length ? `<ul class="erkl">${erkl.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}${kancaHTML(q.id)}
      <div class="sira"><button class="btn ana" data-act="weiter-note" type="button">Devam <kbd>Enter</kbd></button></div></div>`;
  }

  function artWahl(a) {
    const q = aktuell;
    if (!q || !q.artFrage || q.done || now() < (q.freiAb || 0)) return;
    q.done = true;
    clearTimers();
    const n = byId[q.id], t = now();
    const ok = a === n.art, rt = t - q.start;
    let g = !ok ? 1 : rt <= 3500 ? 3 : 2;
    if (rt < 450) { q.ungezaehlt = true; if (g > 2) g = 2; }
    q.note = g; q.antwort = a; q.sek = Math.round(rt / 1000);
    q.res = { urteil: g === 3 ? 'richtig' : g === 2 ? 'fast' : 'falsch', tags: ok ? [] : [`artikel: ${a} → ${n.art}`] };
    document.querySelectorAll('.art-btn').forEach(b => { b.disabled = true; if (b.dataset.art === n.art) b.classList.add('dogru'); else if (b.dataset.art === a) b.classList.add('yanlis'); });
    dikkatNotieren(ok, q.ungezaehlt);
    const regel = regelHTML(n);
    if (ok) {
      $('#sonuc').innerHTML = `<div class="sonuc richtig"><div class="baslik">✓ Doğru</div><div class="satir"><span class="et">artikel</span><span class="deger">${artHTML(n)}</span></div>${regel}</div>`;
      later(() => benoten(g), regel && /istisna/.test(regel) ? 1800 : 700);
      return;
    }
    q.wartet = true;
    $('#sonuc').innerHTML = `<div class="sonuc falsch"><div class="baslik">✗ Yanlış</div><div class="satir"><span class="et">doğru</span><span class="deger">${artHTML(n)}</span></div>${regel}${kancaHTML(q.id)}
      ${n.plf ? `<div class="soluk">Çoğul: die ${esc(n.plf)}</div>` : ''}
      <div class="sira"><button class="btn ana" data-act="weiter-note" type="button">Devam <kbd>Enter</kbd></button></div></div>`;
  }

  // Ön test sonucu: biliyorsa tekrar yükü olmadan geçer, bilmiyorsa hafif tanıtım
  function pretestErgebnis(q, gewusst) {
    const id = q.id, hm = heuteM(session.modus);
    dikkatNotieren(gewusst || !q.ungezaehlt, q.ungezaehlt);
    if (gewusst) {
      leichtEinfuehren(id, { bekannt: true, quelle: session.modus });
      hm.bekannt++;
      zaehlen({ ungezaehlt: false, typ: kind(id) === 'v' ? 'bed' : 'erk' }, 'richtig');
      session.q++;
      logEintrag({ modus: 'pretest', id: q.uid, item: label(id), frage: label(id), antwort: q.antwort, ergebnis: 'bekannt', loesung: q.ziel, notiz: `sek:${q.sek}` });
      save();
      $('#sonuc').innerHTML = `<div class="sonuc richtig"><div class="baslik">✓ Biliyorsun, tekrar yükü yok</div><div class="satir"><span class="et">kelime</span><span class="deger">${deItemHTML(id)} = ${esc(kurzTr(trOf(id)))}</span></div>${kind(id) === 'n' && !byId[id].plOnly ? '<div class="soluk">Artikeli birazdan ayrıca sorulacak.</div>' : ''}</div>`;
      later(zeige, 900);
      return;
    }
    // bilmiyor / emin değil → tanıt (çok hızlı basış istatistikte "sayılmadı")
    if (q.ungezaehlt) zaehlen({ ungezaehlt: true }, 'falsch');
    q.typ = 'licht';
    q.lichtAb = now() + INTRO_MIN;
    hm.neu++;
    logEintrag({ modus: 'pretest', id: q.uid, item: label(id), frage: label(id), antwort: q.antwort || '', ergebnis: 'neu', loesung: q.ziel, notiz: (q.res.tags || []).join(', ') });
    kart.innerHTML = `<div class="tur"><span class="yeni">yeni kelime</span><span>öğren</span></div>${lichtHTML(id)}
      <div class="sira"><button class="btn ana" data-act="licht-weiter" type="button">Tamam, öğrendim <kbd>Enter</kbd></button><span class="soluk">Birazdan tekrar sorulacak.</span></div>`;
    tastatur();
  }
  function lichtWeiter() {
    const q = aktuell;
    if (!q || q.typ !== 'licht') return;
    if (now() < q.lichtAb) { flash('Bir kez oku, sonra devam.'); return; }
    leichtEinfuehren(q.id, { quelle: session.modus });
    session.requeue.push({ uid: q.uid, nach: session.q + IZ_ABSTAND, mal: 0, neu: true });
    session.q++;
    save();
    zeige();
  }

  // ---------- yazarak ----------
  function auswerten(input, weissNicht) {
    const q = aktuell;
    if (!q || q.done) return;
    // anlamdaşı yazdıysa: yanlış sayma, tekrar sor
    // önce kendi cevabı: doğruysa anlamdaş kontrolüne hiç girme
    const syn = !weissNicht && q.syn && q.pruef(input).urteil !== 'richtig' && q.syn(input);
    if (syn) {
      $('#sonuc').innerHTML = `<div class="sonuc fast"><div class="baslik">≈ ${esc(syn)} da bu anlama geliyor, ama aranan başka bir kelime. Tekrar dene.</div></div>`;
      const i = $('#cevap'); i.value = ''; i.focus();
      return;
    }
    // boş / rastgele: bilmiyorum gibi, hedefe sayılmaz
    if (!weissNicht && istMuell(input)) { weissNicht = true; q.ungezaehlt = true; }
    q.done = true;
    q.antwort = input;
    q.sek = Math.round((now() - q.start) / 1000);
    const res = weissNicht ? { urteil: 'falsch', tags: [q.ungezaehlt ? 'boş / rastgele' : 'bilmiyorum'], diff: [], ziel: q.ziel } : q.pruef(input);
    q.res = res;
    const vorschlag = res.urteil === 'richtig' ? 3 : res.urteil === 'fast' ? 2 : 1;
    const titel = { richtig: '✓ Doğru', fast: '≈ Küçük hata', falsch: '✗ Yanlış' }[res.urteil];
    const input$ = $('#cevap'); if (input$) input$.disabled = true;
    const erkl = (q.erkl ? q.erkl() : []).filter(Boolean);
    $('#sonuc').innerHTML = `<div class="sonuc ${res.urteil}">
      <div class="baslik">${titel}${res.tags.length ? `<span class="etiketler">${res.tags.map(t => `<span class="etiket">${esc(t)}</span>`).join('')}</span>` : ''}</div>
      ${res.urteil !== 'richtig' ? `<div class="satir"><span class="et">senin</span><span class="deger fark">${weissNicht ? '<span class="soluk">—</span>' : diffHTML(res)}</span></div>` : ''}
      <div class="satir"><span class="et">doğru</span><span class="deger">${q.loesungHTML()}</span></div>
      ${erkl.length ? `<ul class="erkl">${erkl.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
      ${res.urteil !== 'richtig' ? kancaHTML(q.id) : ''}
      ${res.urteil === 'richtig' ? `<div class="soluk">Sonraki soru geliyor … <kbd>Enter</kbd> hemen geç · <kbd>1</kbd>/<kbd>2</kbd> notu düşür</div>`
        : weissNicht ? `<div class="notlar"><button class="btn n1 oneri" data-note="1" type="button"><kbd>Enter</kbd> devam</button></div>`
        : `<div class="notlar">${[1, 2, 3].map(g => `<button class="btn n${g} ${g === vorschlag ? 'oneri' : ''}" data-note="${g}" type="button"><kbd>${g}</kbd> ${['', 'yanlış', 'küçük hata', 'doğru'][g]}</button>`).join('')}</div>`}
    </div>`;
    q.vorschlag = vorschlag;
    q.nurFalsch = !!weissNicht;  // bilmiyorum / boş: kendine not veremez
    if (res.urteil === 'richtig') later(() => benoten(3), 2200);
  }

  // bugünün sayaçları (çok hızlı / boş cevaplar hedefe sayılmaz)
  function zaehlen(q, urteil) {
    const d = heute(), dm = heuteM(session.modus);
    if (q.ungezaehlt) { d.ungezaehlt = (d.ungezaehlt || 0) + 1; dm.ungezaehlt = (dm.ungezaehlt || 0) + 1; return; }
    d.n++; d[urteil]++;
    dm.n++; dm[urteil]++;
    const c = CAT[q.typ]; if (c) d[c] = (d[c] || 0) + 1;
  }

  function benoten(g) {
    const q = aktuell;
    if (!q || q.benotet || !q.done) return;
    q.benotet = true;
    clearTimers();
    const t = now();
    const alt = S.karten[q.uid] || {};
    const c = FSRS.review(alt, g, t, S.einst.ret);
    // zorlanılan genç kartın ilk tekrarları kısa aralıkla (2 gün ara verince unutulmasın): küçük hata ya da daha önce unutulmuşsa en çok 2 / 4 gün.
    // Hep hızlı doğru bilinen kart FSRS aralığıyla gider (bildiğin kelime boş yere sık gelmesin).
    if (g >= 2 && (c.reps || 0) <= 5 && (g === 2 || (alt.lapses || 0) > 0)) c.due = Math.min(c.due, t + ((c.reps || 0) <= 3 ? 2 : 4) * DAY);
    delete c.neu;
    // öğrenme adımları (yeni kart): ilk gün 3 hatırlama (tanıtım → birkaç soru sonra → ~10 dk sonra), ertesi gün kesin tekrar.
    // Yalnız bugün tanıtılan kelimede ya da ilk cevap tam doğru değilse: eski kelimenin yeni açılan kartı ilk seferde doğruysa doğrudan tekrar takvimine.
    const itAlt = S.items[q.id], bugunTanitildi = !!(itAlt && itAlt.seit && tag(itAlt.seit) === tag(t));
    const stufe = alt.lern != null ? alt.lern : (!alt.S && (bugunTanitildi || g < 3) ? 0 : null);
    if (stufe != null) {
      if (g === 1) c.lern = 0;
      else if (stufe === 0) { c.lern = 1; c.due = t + 10 * 60000; }
      else { delete c.lern; c.due = Math.min(c.due, t + 0.75 * DAY); }
    }
    // iyi bildiğin kelimenin (kardeş kartı ≥ 7 gün oturmuş) yeni açılan kartı ilk seferde doğru → "kolay" başlangıç (~8 gün sonra)
    if (!alt.S && g === 3 && stufe == null && unitsOf(q.id).some(u => u !== q.typ && ((S.karten[q.id + ':' + u] || {}).S || 0) >= 7)) Object.assign(c, FSRS.review({}, 4, t, S.einst.ret), { lastG: 3 });
    S.karten[q.uid] = c;
    if (session.tri) session.tri.offen.delete(q.uid);
    // öğe serisi: kelimenin bütün kartlarında (anlam, artikel, yazma, cümle) art arda hızlı doğru → kelimeyi biliyorsun;
    // 4. doğrudan sonra kardeş kartlar da 12–21 gün ileri (her kart ayrı takvimle neredeyse her gün gelmesin). Yanlışta seri sıfırlanır.
    const itS = S.items[q.id];
    if (itS && stufe == null && !q.heute) {
      itS.seri = g === 1 ? 0 : g >= 3 && !q.requeue ? (itS.seri || 0) + 1 : (itS.seri || 0);
      if (itS.seri >= 4) seriSeyrek(q.id, itS.seri, t);
    }
    // kredi yalnız sistem de "doğru" dediyse (kendi notun cömert olabilir); cümlede ipuçlu boşlukta (seviye 0) fiil / kelime verilir: anlamı kanıtlamaz
    if (g === 3 && (!q.vorschlag || q.vorschlag === 3) && !q.requeue && !q.ungezaehlt && !((q.typ === 'satz' || q.typ === 'nsatz') && q.lv < 1)) kardesKredi(q.id, q.typ === 'erk' && q.artikelli ? 'erkDE' : q.typ, t);
    const urteil = g >= 3 ? 'richtig' : g === 2 ? 'fast' : 'falsch';
    zaehlen(q, urteil);
    session.q++;
    session.cats[CAT[q.typ]]++;
    session.letzte.push(CAT[q.typ]);
    (session.akisVerlauf = session.akisVerlauf || []).push(akisKat(q.typ)); if (session.akisVerlauf.length > 40) session.akisVerlauf.shift();
    session.sonItem = q.id;
    if (!q.mc && !q.artFrage) dikkatNotieren(g > 1, q.ungezaehlt);
    // oturum içi tekrar: yanlış → 6 soru sonra yalnız 1 kez (başka cümleyle); orada da yanlışsa bugün bir daha sorma, yarına
    const mal = q.requeue ? q.requeue.mal + 1 : 0;
    session.requeue = session.requeue.filter(r => r.uid !== q.uid);
    if (g === 1) {
      const fh = session.falschHeute = session.falschHeute || {};
      const schon = fh[q.uid] && fh[q.uid].tag === tag(t) ? fh[q.uid].n : 0;
      fh[q.uid] = { tag: tag(t), n: schon + 1 };
      if (mal < 1 && !schon) session.requeue.push({ uid: q.uid, nach: session.q + 6, mal });
      else { c.due = Math.max(c.due, morgen(t)); delete c.lern; }
    }
    // ilk başarılı hatırlamadan sonra çekim ve cümle birimleri açılır
    if (q.typ === 'abr' && g >= 2) {
      // aynı gün 9 soru olmasın: cümle ertesi gün, çekim 2, dönüşlü 3 gün sonra
      ['satz', 'stamm', 'refl'].forEach((u, i) => { if (unitsOf(q.id).includes(u)) neueKarte(q.id + ':' + u, morgen(t) + i * DAY + 4 * 3600000); });
    }
    // tanıma oturdu (S ≥ 3 gün) → yazarak üretim açılır
    if ((q.typ === 'erk' || q.typ === 'bed' || q.typ === 'art') && g >= 2 && !c.lern && c.reps >= 3) produktionFreigeben(q.id, t);
    // kelimeyi yazabildikten sonra cümle içinde
    if ((q.typ === 'wort' || q.typ === 'prod') && g >= 2 && NSAETZE[q.id]) neueKarte(q.id + ':nsatz', t + DAY / 2);
    if (q.kontext) {
      const h = S.kontext[q.id] || (S.kontext[q.id] = []);
      h.push(q.kontext); if (h.length > 12) h.shift();
    }
    if (g === 1) leechPruefen(q.id);
    const notiz = [];
    if (q.res && q.res.tags && q.res.tags.length) notiz.push(q.res.tags.join(', '));
    if (q.vorschlag && q.vorschlag !== g) notiz.push(`öneri:${['', 'falsch', 'fast', 'richtig'][q.vorschlag]}`);
    if (q.ungezaehlt) notiz.push('sayılmadı');
    notiz.push(`sek:${q.sek}`, `ipucu:${q.lv}`);
    logEintrag({ modus: q.modus || q.typ, id: q.uid, item: label(q.id), frage: q.frageText || '', antwort: q.antwort || '', ergebnis: urteil, loesung: q.ziel || '', notiz: notiz.join(' | ') });
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
    if (q.stamm) {
      const t = now();
      if (!S.items[q.id]) S.items[q.id] = { seit: t, quelle: 'stark' };
      if (bekannt) S.karten[q.uid] = FSRS.review({}, 4, t, S.einst.ret);
      else { neueKarte(q.uid, t + 60000); session.requeue.push({ uid: q.uid, nach: session.q + IZ_ABSTAND, mal: 0, neu: true }); }
      neueKarte(q.id + ':bed', t + DAY);
      heuteM(session.modus).neu++;
      session.q++;
      logEintrag({ modus: 'yeni', id: q.uid, item: label(q.id), frage: 'düzensiz fiil', antwort: '', ergebnis: bekannt ? 'bekannt' : 'neu', loesung: q.abschreib, notiz: '' });
      zeige();
      return;
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
    if (ghToken()) { (S.ghPending = S.ghPending || []).push(e); if (S.ghPending.length >= 10) ghSync(S.ghPending.length >= 20 || session.q % 30 === 0); }
    save();
    dateiSchreiben();
  }
  const csvZeile = e => [e.zeit, e.modus, e.id, e.item, e.frage, e.antwort, e.ergebnis, e.loesung, e.notiz].map(csvZelle).join(';');

  // ---- Klasör (File System Access API, Chrome/Edge) ----
  let ordner = null, schreibt = false, ordnerWartet = null;
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
      if (p === 'granted') { ordner = h; $('#klasor-durum').textContent = `Bağlı: ${h.name}`; dateiSchreiben(); renderPlan(); }
      else { ordnerWartet = h; $('#klasor-durum').textContent = `${h.name}: izin gerekiyor. "Klasörü bağla"ya bas.`; $('#klasor').textContent = 'İzni yenile'; }
    } catch (e) { $('#klasor-durum').textContent = 'Klasör okunamadı.'; }
  }
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
      renderPlan();
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) { dateiSchreiben(true); ghSync(true); } });

  // ---- GitHub'a doğrudan kayıt (site olarak açıldığında push gerekmez) ----
  const GH = { repo: 'mahmutarsla/Almanca-Tekrar', branch: 'claude/chat-session-1vghmx' };
  const ghToken = () => { try { return localStorage.getItem('almanca-tekrar-gh') || ''; } catch (e) { return ''; } };
  const b64enc = s => btoa(unescape(encodeURIComponent(s)));
  const b64dec = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ''))));
  const ghDurum = t => { const el = $('#gh-durum'); if (el) el.textContent = t; };
  async function ghApi(path, opt) {
    const r = await fetch(`https://api.github.com/repos/${GH.repo}${path}`, Object.assign({}, opt, {
      headers: { Authorization: 'Bearer ' + ghToken(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } }));
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
    return r.json();
  }
  async function ghLesen(datei) {
    const m = await ghApi(`/contents/${datei}?ref=${encodeURIComponent(GH.branch)}`);
    if (!m) return { text: null, sha: null };
    // 1 MB üstü dosyalarda içerik gelmez: blob'dan oku
    const b64 = m.content && m.encoding === 'base64' ? m.content : (await ghApi(`/git/blobs/${m.sha}`)).content;
    return { text: b64dec(b64), sha: m.sha };
  }
  async function ghSchreiben(datei, text, sha, msg) {
    return ghApi(`/contents/${datei}`, { method: 'PUT', body: JSON.stringify({ message: msg, content: b64enc(text), branch: GH.branch, sha: sha || undefined }) });
  }
  let ghLaeuft = false, ghZuletzt = 0;
  async function ghSync(zustandAuch) {
    if (!ghToken() || ghLaeuft) return;
    const batch = (S.ghPending || []).slice();
    if (!batch.length && !zustandAuch) return;
    ghLaeuft = true;
    try {
      if (batch.length) {
        for (let versuch = 0; versuch < 2; versuch++) {
          try {
            const alt = await ghLesen('log/log.csv');
            // zaten dosyada olan satırları tekrar yazma (ilk bağlanışta eski log da gönderilir)
            const vorhanden = new Set((alt.text || '').split('\n'));
            const neu = batch.map(csvZeile).filter(l => !vorhanden.has(l));
            if (!neu.length) break;
            const basis = alt.text ? alt.text.replace(/\n?$/, '\n') : '\uFEFF' + CSV_KOPF + '\n';
            const text = basis + neu.join('\n') + '\n';
            await ghSchreiben('log/log.csv', text, alt.sha, `log: ${batch.length} cevap`);
            break;
          } catch (e) { if (versuch || !/^(409|422)/.test(e.message)) throw e; }
        }
        S.ghPending.splice(0, batch.length);
        save();
      }
      if (zustandAuch) {
        const alt = await ghLesen('log/zustand.json');
        await ghSchreiben('log/zustand.json', JSON.stringify(Object.assign({}, S, { log: [], pending: [], ghPending: [], gespeichert: zeitStr(now()) })), alt.sha, 'ilerleme');
      }
      ghZuletzt = now();
      ghDurum(`GitHub'a kaydedildi (${zeitStr(now()).slice(11, 16)}).`);
    } catch (e) { ghDurum('GitHub\'a yazılamadı: ' + e.message); console.warn(e); }
    ghLaeuft = false;
    renderPlan();
  }
  // 10 cevapta bir ya da 3 dakikada bir
  setInterval(() => { if ((S.ghPending || []).length && now() - ghZuletzt > 180000) ghSync(true); }, 30000);
  async function ghLaden() {
    if (!ghToken()) { ghDurum('Önce anahtarı kaydet.'); return; }
    try {
      const z = await ghLesen('log/zustand.json');
      if (!z.text) { ghDurum('GitHub\'da kayıtlı ilerleme yok.'); return; }
      const neu = normalize(JSON.parse(z.text));
      neu.log = S.log; neu.ghPending = S.ghPending || []; neu.pending = S.pending;
      S = neu; save(); renderAyar(); renderHedef(); zeige();
      ghDurum(`İlerleme GitHub'dan alındı (${(JSON.parse(z.text).gespeichert) || ''}).`);
    } catch (e) { ghDurum('Alınamadı: ' + e.message); }
  }

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

  // Bugünün planı: tek "Çalış" akışı + günün işleri (fiil metni, yazma); odak bölümündeysen o da görünür
  function renderPlan() {
    const d = heute(), hm = heuteM('akis'), z = ziel('akis'), m = session.modus;
    const chip = (mm, no, ad, sayi, ok, extra) => `<button class="plan-chip ${ok ? 'ok' : ''} ${m === mm ? 'aktif' : ''} ${extra || ''}" data-modus="${mm}" type="button"><span class="no">${ok ? '✓' : no}</span>${ad}${sayi ? ` <span class="sayi">${sayi}</span>` : ''}</button>`;
    let chips = chip('akis', '▶', 'Çalış', `${hm.n}/${z}`, hm.n >= z, 'ana-chip');
    chips += chip('fiilmetin', '+', 'Fiil metni', 'günün', heuteM('fiilmetin').n > 0);
    if (yazmaFaellig() || heuteM('yazma').n) chips += chip('yazma', '+', 'Yazma', 'metin', heuteM('yazma').n > 0);
    if (UNITEN.some(uAktiv)) { const U = UNITEN.find(uAktiv); chips += chip('unite', '★', 'Ünite: ' + esc(U.titel), `${U.items.filter(it => uState(U).done[it.id]).length}/${U.items.length}`, false, 'vurgu'); }
    if (!['akis', 'fiilmetin', 'yazma', 'unite'].includes(m) && MODI[m]) chips += `<span class="plan-et">odak:</span>` + chip(m, '·', esc(MODI[m].ad), MODI[m].ziel > 1 ? `${heuteM(m).n}/${ziel(m)}` : '', false);
    const opt = $('#odak option[value="unite"]'); if (opt) opt.hidden = !UNITEN.some(uAktiv);
    const sayildi = d.n >= MIN_TAG;
    const bitti = hm.n >= z;
    const min = bitti ? `✓ bugün tamam${ghToken() ? ' · Claude\'a "sonuçlarıma bak" de' : ordner ? ' · log\'u pushla, Claude\'a "sonuçlarıma bak" de' : ''}` : sayildi ? '✓ gün sayıldı' : `gün için ${MIN_TAG - d.n} cevap daha`;
    // log klasörü bağlı değilse cevaplar dosyaya yazılmaz, Claude göremez
    const logUyari = ordner || ghToken() ? '' : `<button class="plan-log" type="button" data-git="ayar" title="Cevaplar log/log.csv'ye yazılmıyor">log kaydedilmiyor: Ayarlar'dan bağla</button>`;
    const neuInfo = `<span class="plan-et" title="Günlük yeni sınırı (Ayarlar'dan)">yeni: kelime ${neuHeute('n')}/${neuGrenze('n')} · fiil ${neuHeute('v')}/${neuGrenze('v')}</span>`;
    $('#plan').innerHTML = `<span class="plan-et">bugün</span>${chips}${neuInfo}<span class="plan-min ${sayildi ? 'ok' : ''}" title="En az ${MIN_TAG} sayılan cevap: gün seriye sayılır">${min}</span>${logUyari}`;
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
    const k = kind(id);
    const de = k === 'v' ? `<b>${esc(vById[id].anz)}</b>${vById[id].obj.length ? ` <span class="soluk">${esc(G.objMuster(vById[id]))}</span>` : ''}`
      : k === 'w' ? `<b>${esc(wById[id].de)}</b> <span class="soluk">${esc(KL_TR[wById[id].kl])}</span>` : artHTML(byId[id]);
    const it = S.items[id] || {};
    const kanca = it.leech ? (KANCA[id] ? '<span class="durum-pil" title="kanca var">🪝 kanca</span>' : '<span class="durum-pil schwach" title="Claude\'a sonuçlarıma bak de">🪝 kanca bekliyor</span>') : '';
    return `<div class="oge"><span class="de">${de}</span><span class="tr">${esc(trOf(id))}${KANCA[id] ? ` · <i>${esc(KANCA[id])}</i>` : ''}</span>
      <span class="yan">${kanca}<span class="durum-pil ${st}">${STATUS_TR[st]}</span>${mitBtn && st === 'neu' ? `<button class="btn mini" data-add="${id}" type="button">Ekle</button>` : ''}</span></div>`;
  }

  function renderListe() {
    const q = $('#ara').value.trim().toLowerCase();
    const tur = $('#tur').value, dur = $('#durum').value;
    const all = VERB_ORDER.map(v => v.id).concat(NOUN_ORDER.map(n => n.id), WORT_ORDER.map(w => w.id));
    const hits = all.filter(id => {
      const k = kind(id);
      if (tur === 'v' && k !== 'v') return false;
      if (tur === 'n' && k !== 'n') return false;
      if (tur === 'w' && k !== 'w') return false;
      if (tur === 'ndek' && !istNdek(id)) return false;
      if (tur === 'refl' && !istRefl(id)) return false;
      if (dur !== 'alle' && itemStatus(id) !== dur) return false;
      if (!q) return true;
      return label(id).toLowerCase().includes(q) || trOf(id).toLowerCase().includes(q);
    });
    $('#liste-say').textContent = `${hits.length} sonuç${hits.length > 150 ? ' · ilk 150 gösteriliyor' : ''}`;
    $('#liste').innerHTML = hits.slice(0, 150).map(id => itemZeile(id, true)).join('');
  }

  function renderZayif() {
    const ids = Object.keys(S.items).filter(id => kind(id) !== 'p' && gueltig(id + ':x') && schwach(id));
    ids.sort((a, b) => (S.items[b].leech ? 1 : 0) - (S.items[a].leech ? 1 : 0));
    const leech = ids.filter(id => S.items[id].leech).length;
    $('#zayif-say').textContent = ids.length ? `${ids.length} öğe${leech ? ` · ${leech} tanesi takılıyor (🪝)` : ''}` : 'Şimdilik zayıf öğe yok.';
    $('#zayif-liste').innerHTML = ids.map(id => itemZeile(id, false)).join('');
  }

  function renderGecmis() {
    const t = now();
    const tage = [];
    for (let i = 20; i >= 0; i--) { const k = tag(t - i * DAY); tage.push([k, S.tage[k] || { n: 0, richtig: 0, fast: 0, falsch: 0, neuV: 0, neuN: 0 }]); }
    let streak = 0;
    for (let i = 0; i < 3650; i++) { const k = tag(t - i * DAY); if (S.tage[k] && S.tage[k].n >= MIN_TAG) streak++; else if (i > 0) break; }
    const items = Object.keys(S.items).length;
    const sitzt = Object.keys(S.items).filter(id => itemStatus(id) === 'sitzt').length;
    const ges = Object.values(S.tage).reduce((a, x) => a + x.n, 0);
    const bolum = x => Object.keys(MODI).filter(m => x.modi && x.modi[m] && x.modi[m].n)
      .map(m => `${esc(MODI[m].ad)} ${x.modi[m].n}/${ziel(m)}${x.modi[m].n >= ziel(m) ? ' ✓' : ''}`).join(' · ');
    $('#ozet').innerHTML = Object.keys(MODI).map(m => { const b = heuteM(m); return `<div class="tile"><div class="sayi">${b.n} / ${ziel(m)}</div><div class="et">bugün · ${esc(MODI[m].ad)}${m !== 'zayif' ? ` · yeni ${b.neu}/${neuMax(m)}` : ''}${b.bekannt ? ` · ${b.bekannt} zaten biliniyordu` : ''}</div></div>`; }).join('') +
      [[streak, `gün seri (en az ${MIN_TAG} cevap)`], [items, 'öğrenilen öğe'], [sitzt, 'oturmuş (21+ gün)'], [ges, 'toplam cevap'], [heute().ungezaehlt || 0, 'bugün sayılmayan (çok hızlı / boş)']]
        .map(([n, l]) => `<div class="tile"><div class="sayi">${n}</div><div class="et">${l}</div></div>`).join('');
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
    $('#gun-tablo').innerHTML = `<thead><tr><th>gün</th><th class="num">cevap</th><th class="num">cümle</th><th class="num">kelime</th><th class="num">anlam</th><th class="num">doğru</th><th class="num">küçük h.</th><th class="num">yanlış</th><th class="num">yeni</th><th class="num">sayılmadı</th><th>bölümler</th></tr></thead><tbody>` +
      tage.slice().reverse().filter(([, x]) => x.n || x.neuV || x.neuN || x.ungezaehlt).map(([k, x]) => `<tr><td>${k}</td><td class="num">${x.n}</td><td class="num">${x.satz || 0}</td><td class="num">${x.wort || 0}</td><td class="num">${x.anlam || 0}</td><td class="num e-richtig">${x.richtig}</td><td class="num e-fast">${x.fast}</td><td class="num e-falsch">${x.falsch}</td><td class="num">${(x.neuV || 0) + (x.neuN || 0)}</td><td class="num">${x.ungezaehlt || 0}</td><td>${bolum(x)}</td></tr>`).join('') + '</tbody>';
    $('#feedback').innerHTML = FEEDBACK.length ? FEEDBACK.slice().reverse().slice(0, 60).map(f => `<div class="oge"><span class="de">${esc(f.antwort || '')} → ${deHTML(f.richtig || '')}</span><span class="tr">${esc(f.text || '')}</span><span class="yan"><span class="durum-pil ${f.urteil === 'richtig' ? 'sitzt' : f.urteil === 'falsch' ? 'schwach' : 'lernt'}">${esc(f.zeit || '')}</span></span></div>`).join('')
      : '<div class="oge"><span class="tr">Henüz yok. Log dosyasını pushlayıp Claude\'a "sonuçlarıma bak" de.</span></div>';
    $('#son-tablo').innerHTML = `<thead><tr><th>zaman</th><th>tür</th><th>öğe</th><th>cevap</th><th>sonuç</th><th>doğrusu</th></tr></thead><tbody>` +
      S.log.slice(-40).reverse().map(e => `<tr><td class="num">${esc(e.zeit.slice(5, 16))}</td><td>${esc(e.modus)}</td><td>${esc(e.item)}</td><td>${esc(e.antwort)}</td><td class="e-${esc(e.ergebnis)}">${esc(e.ergebnis)}</td><td>${deHTML(e.loesung)}</td></tr>`).join('') + '</tbody>';
  }

  function renderAyar() {
    $('#a-modi').innerHTML = `<thead><tr><th>bölüm</th><th class="num">günlük hedef (soru)</th><th>günde yeni</th></tr></thead><tbody>` +
      Object.keys(MODI).map(m => `<tr><td>${esc(MODI[m].ad)}${MODI[m].grup ? ` <span class="soluk">· ${esc(MODI[m].grup)}</span>` : ''}</td>
        <td class="num"><input type="number" min="5" max="300" id="z-${m}" value="${ziel(m)}" aria-label="${esc(MODI[m].ad)} hedef"></td>
        <td>${m === 'zayif' ? '—' : `<input type="number" min="0" max="50" id="n-${m}" value="${neuMax(m)}" aria-label="${esc(MODI[m].ad)} yeni"> <span class="soluk">${esc(MODI[m].neuTr)}</span>`}</td></tr>`).join('') + '</tbody>';
    $('#a-modi').innerHTML += `<tbody><tr><td><b>Tüm bölümler</b></td><td></td><td><input type="number" min="0" max="100" id="n-gw" value="${neuGrenze('n')}" aria-label="Günde yeni kelime"> <span class="soluk">yeni kelime / gün (bugün ${neuHeute('n')})</span><br><input type="number" min="0" max="30" id="n-gv" value="${neuGrenze('v')}" aria-label="Günde yeni fiil"> <span class="soluk">yeni fiil / gün (bugün ${neuHeute('v')})</span></td></tr></tbody>`;
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
    const inp = $('#cevap');
    if (e.target.id === 'paket-form') { if (aktuell && aktuell.warte) paketWeiter(); else if (inp && inp.value.trim()) paketPruefen(inp.value); return; }
    if (!inp || !inp.value.trim() || !aktuell || aktuell.done) return;
    auswerten(inp.value);
  });
  kart.addEventListener('click', e => {
    const fv = e.target.closest('[data-fav]');
    if (fv) { const f = S.kalipFav = S.kalipFav || {}; f[fv.dataset.fav] = !f[fv.dataset.fav]; fv.textContent = f[fv.dataset.fav] ? '✓ yazmada' : '+ yazmaya ekle'; fv.classList.toggle('an', !!f[fv.dataset.fav]); save(); return; }
    const ef = e.target.closest('[data-einfuegen]');
    if (ef) { const ta = $('#metin'); if (ta) { const p0 = ta.selectionStart || ta.value.length; const t = ef.dataset.einfuegen.split(' / ')[0].replace(/ …$|…/g, ''); ta.value = ta.value.slice(0, p0) + t + ' ' + ta.value.slice(p0); ta.focus(); ta.dispatchEvent(new Event('input')); } return; }
    const lw = e.target.closest('.lw');
    const ak = e.target.closest('[data-akt]'); if (ak) { aktAktion(ak.dataset.akt); return; }
    const am = e.target.closest('[data-am]'); if (am) { aktMatch2(am.dataset.am); return; }
    const kt = e.target.closest('[data-kt]'); if (kt) { kontrolAntwort(kt.dataset.kt); return; }
    const ao = e.target.closest('[data-ao]'); if (ao) { aktOrdnen(ao.dataset.ao); return; }
    const spy = e.target.closest('[data-sprich-yavas]'); if (spy) { sprich(spy.dataset.sprichYavas, 0.65); return; }
    const us = e.target.closest('[data-usort]'); if (us) { uSort(us.dataset.usort); return; }
    const umc = e.target.closest('[data-umc]'); if (umc) { uMc(+umc.dataset.umc); return; }
    const um = e.target.closest('[data-um]'); if (um) { uMatch(um.dataset.um); return; }
    const uo = e.target.closest('[data-uo]'); if (uo) { uOrdnen(+uo.dataset.uo); return; }
    const sp = e.target.closest('[data-sprich]'); if (sp) { sprich(sp.dataset.sprich); return; }
    const ua = e.target.closest('[data-uaufgabe]');
    if (ua) {
      const U = uAktuell(), st = uState(U), a = U.aufgaben.find(x => x.id === ua.dataset.uaufgabe), ta = document.querySelector(`textarea[data-aufgabe="${a.id}"]`), txt = ta.value.trim();
      if (!txt) return;
      (st.texteSchreiben = st.texteSchreiben || {})[a.id] = txt;
      const benutzt = a.woerter.filter(w => txt.toLowerCase().includes(w.replace(/^sich /, '').split(' ').pop().toLowerCase().slice(0, 6)));
      logEintrag({ modus: 'text', id: a.id, item: a.titel, frage: a.de, antwort: txt.replace(/\n+/g, ' ¶ '), ergebnis: 'neu', loesung: '', notiz: `kelime:${txt.split(/\s+/).length} | zorunlu:${benutzt.length}/${a.woerter.length}` });
      save(); flash('Kaydedildi. "Sonuçlarıma bak" de, düzelteyim.'); return;
    }
    const fvt = e.target.closest('[data-fvt]');
    if (fvt) { fvTestAntwort(fvt.dataset.fvt); return; }
    if (lw && lw.dataset.fv) { const [id, form, zeit] = lw.dataset.fv.split('|'); const v = vById[id], box = $('#lesen-wort'); document.querySelectorAll('#lesen-text .lw.aktiv').forEach(x => x.classList.remove('aktiv')); lw.classList.add('aktiv'); box.hidden = false; box.innerHTML = `<b>${esc(form)}</b> → <b>${esc(v.anz)}</b> (${esc(v.tr)}) · <b>${esc(zeit)}</b><br>${formen(v).map(f => `${esc(f.et)}: er ${esc(f.soll)}`).join(' · ')}${kalipZeile(id) ? '<br>' + kalipZeile(id) : ''}`; return; }
    if (lw) { lesenWort(lw); return; }
    const ga = e.target.closest('[data-ga]');
    if (ga) { const [i, v] = ga.dataset.ga.split(':'); goetheAntwort(+i, v); return; }
    const ln = e.target.closest('[data-lernen]');
    if (ln) { leichtEinfuehren(ln.dataset.lernen, { quelle: 'lesen', spaeter: 0 }); save(); ln.replaceWith(Object.assign(document.createElement('span'), { className: 'soluk', textContent: ' eklendi ✓' })); return; }
    const n = e.target.closest('[data-note]');
    if (n) { benoten(aktuell && aktuell.nurFalsch ? 1 : +n.dataset.note); return; }
    const mc = e.target.closest('[data-mc]');
    if (mc) { mcWahl(+mc.dataset.mc); return; }
    const ar = e.target.closest('[data-art]');
    if (ar) { artWahl(ar.dataset.art); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'lernen') einfAktion(false);
    else if (act === 'bekannt') einfAktion(true);
    else if (act === 'weiss-nicht') auswerten('', true);
    else if (act === 'mc-weiss-nicht') mcWahl(-1, true);
    else if (act === 'weiter-note') benoten(aktuell.note);
    else if (act === 'licht-weiter') lichtWeiter();
    else if (act === 'paket-weiter') paketWeiter();
    else if (act === 'metin-gonder') metinGonder();
    else if (act === 'lesen-baska') lesenRender(true);
    else if (act === 'fv-test') fvTestStart();
    else if (act === 'u-weiter') uWeiter();
    else if (act === 'u-text-pruef') uTextPruef();
    else if (act === 'u-ordnen-zurueck') uOrdnen('zurueck');
    else if (act === 'u-ordnen-pruef') uOrdnenPruef();
    else if (act === 'u-uebernehmen') uUebernehmen();
    else if (act === 'u-nochmal') uNochmal();
    else if (act === 'fv-weiter') fvWeiter();
    else if (act === 'lesen-fertig') { const L = session.lesen; (S.gelesen = S.gelesen || {})[L.id] = now(); heuteM('lesen').n++; logEintrag({ modus: 'lesen', id: L.id, item: L.titel, frage: L.thema, antwort: '', ergebnis: 'gelesen', loesung: '', notiz: L.url }); save(); renderPlan(); lesenRender(true); flash('Okundu ✓ Sıradaki metin.'); }
    else if (act === 'kalip-weiter') { session.kalipSeite = (session.kalipSeite || 0) + 1; kalipRender(); window.scrollTo(0, 0); }
    else if (act === 'kalip-zurueck') { session.kalipSeite = Math.max(0, (session.kalipSeite || 0) - 1); kalipRender(); window.scrollTo(0, 0); }
    else if (act === 'kalip-panel') { const pn = $('#kalip-panel'); pn.hidden = !pn.hidden; }
    else if (act === 'metin-baska') yazmaRender(true);
    else if (act === 'paket-lesen') { aktuell.schritt = 'lesen'; aktuell.gelesen = true; aktuell.schrittStart = now(); paketRender(aktuell); }
    else if (act === 'weiter') zeige();
    else if (act === 'extra') { session.extra = true; zeige(); }
  });
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-git]');
    if (g) { zeigView(g.dataset.git); return; }
    const b = e.target.closest('[data-modus]');
    if (!b) return;
    setModus(b.dataset.modus);
    zeigView('calis');
    zeige();
  });

  document.addEventListener('keydown', e => {
    if ($('#v-calis').hidden || !aktuell) return;
    const q = aktuell;
    const inInput = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
    if (q.typ === 'akt') {
      if (q.art === 'angebot' && !inInput) {
        if (e.key === 'Enter') { e.preventDefault(); aktAktion('jetzt'); } else if (e.key === '0' || e.key === 'Escape') { e.preventDefault(); aktAktion('spaeter'); }
        return;
      }
      if (q.art === 'kontrol' && !q.wartet && !inInput) {
        const offen = q.ids.find(id => !q.antw[id]);
        if (offen && /^[123]$/.test(e.key)) { e.preventDefault(); kontrolAntwort(offen + ':' + 'ben'[+e.key - 1]); return; }
        if (!offen && e.key === 'Enter') { e.preventDefault(); kontrolBitti(); return; }
      }
      if (e.key !== 'Enter') return;
      if (q.wartet) { e.preventDefault(); zeige(); return; }
      if (e.target.classList && e.target.classList.contains('u-luecke')) { e.preventDefault(); const nx = document.querySelector(`.u-luecke[data-al="${+e.target.dataset.al + 1}"]`); if (nx) nx.focus(); else aktPruef(); return; }
      if (q.art === 'diktat' && e.target.id === 'cevap') { e.preventDefault(); aktPruef(); return; }
      if (q.art === 'ordnen' && q.gew.length === q.toks.length) { e.preventDefault(); aktPruef(); }
      return;
    }
    if (q.typ === 'unite') {
      const st = uState(uAktuell()), sel = st.aktuell;
      if (q.usort && !inInput && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); uSort({ 1: 'k', 2: 'u', 3: 'n' }[e.key]); return; }
      if (e.key === 'Enter') {
        if (e.target.classList && e.target.classList.contains('u-luecke')) { e.preventDefault(); const nx = document.querySelector(`.u-luecke[data-ul="${+e.target.dataset.ul + 1}"]`); if (nx) nx.focus(); else uTextPruef(); return; }
        if (e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (q.wartet || (sel && sel.stufe === 'intro') || (sel && sel.art === 'match' && Object.keys(sel.paare || {}).length === sel.ids.length)) { uWeiter(); return; }
        if (e.target.id === 'cevap') { uEingabe(); return; }
        return;
      }
      if (sel && sel.art === 'item' && ['mc', 'mcrev', 'art'].includes(sel.stufe) && sel.cevap == null && !inInput && /^[1-4]$/.test(e.key) && +e.key <= sel.opts.length) { e.preventDefault(); uMc(+e.key - 1); return; }
      return;
    }
    if (q.typ === 'lesen' && session.modus === 'fiilmetin' && e.key === 'Enter' && document.querySelector('[data-act="fv-weiter"]')) { e.preventDefault(); fvWeiter(); return; }
    if (q.typ === 'lesen' && session.modus === 'fiilmetin' && /^[1-4]$/.test(e.key)) { const b = document.querySelectorAll('[data-fvt]:not([disabled])')[+e.key - 1]; if (b) { e.preventDefault(); fvTestAntwort(b.dataset.fvt); return; } }
    if (q.typ === 'yazma' || q.typ === 'lesen' || q.typ === 'kalip') return;
    if ((q.typ === 'pause' || q.typ === 'leer') && e.key === 'Enter' && !inInput) {
      e.preventDefault();
      if (q.naechst) setModus(q.naechst);
      if (q.naechst || q.typ === 'pause') zeige();
      return;
    }
    if (q.typ === 'einf' && !inInput) {
      if (e.key === 'Enter') { e.preventDefault(); einfAktion(false); }
      return;
    }
    if (q.typ === 'licht') { if (e.key === 'Enter') { e.preventDefault(); lichtWeiter(); } return; }
    if (q.typ === 'paket') {
      if (e.key === 'Enter' && (!inInput || q.warte)) { e.preventDefault(); paketWeiter(); }
      return;
    }
    if (q.mc) {
      if (inInput) return;
      if (!q.done) {
        if (/^[1-6]$/.test(e.key) && +e.key <= q.optionen.length) { e.preventDefault(); mcWahl(+e.key - 1); }
        else if (e.key === '0') { e.preventDefault(); mcWahl(-1, true); }
      } else if (q.wartet && e.key === 'Enter') { e.preventDefault(); benoten(q.note); }
      return;
    }
    if (q.artFrage) {
      if (!q.done) { const a = { 1: 'der', 2: 'die', 3: 'das' }[e.key]; if (a) { e.preventDefault(); artWahl(a); } }
      else if (q.wartet && e.key === 'Enter') { e.preventDefault(); benoten(q.note); }
      return;
    }
    if (q.done && !q.benotet) {
      if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); benoten(q.nurFalsch ? 1 : +e.key); return; }
      if (e.key === 'Enter') { e.preventDefault(); benoten(q.res && q.res.urteil === 'richtig' ? 3 : q.vorschlag); }
    }
  });

  // ä kısayolları
  const KURZ = { 'a:': 'ä', 'o:': 'ö', 'u:': 'ü', 's:': 'ß', 'A:': 'Ä', 'O:': 'Ö', 'U:': 'Ü' };
  kart.addEventListener('input', e => {
    const i = e.target; if (i.id !== 'cevap' && !(i.classList && i.classList.contains('u-luecke'))) return;
    const pos = i.selectionStart, two = i.value.slice(pos - 2, pos);
    if (KURZ[two]) { i.value = i.value.slice(0, pos - 2) + KURZ[two] + i.value.slice(pos); i.setSelectionRange(pos - 1, pos - 1); }
  });
  $('#umlaut').addEventListener('mousedown', e => e.preventDefault());
  $('#umlaut').addEventListener('click', e => {
    const b = e.target.closest('button'); const i = letzteEingabe && document.body.contains(letzteEingabe) ? letzteEingabe : $('#cevap');
    if (!b || !i || i.disabled) return;
    const p = i.selectionStart; i.value = i.value.slice(0, p) + b.dataset.c + i.value.slice(i.selectionEnd); i.setSelectionRange(p + 1, p + 1); i.focus();
  });

  $('#ara').addEventListener('input', renderListe);
  $('#tur').addEventListener('change', renderListe);
  $('#durum').addEventListener('change', renderListe);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    if (kind(b.dataset.add) === 'w') leichtEinfuehren(b.dataset.add, { quelle: 'liste', spaeter: 0 });
    else einfuehren(b.dataset.add, false);
    save();
    renderListe();
  });
  function setModus(m) {
    if (!MODI[m]) m = 'akis';
    session.modus = m; session.letzteNeu = null; session.extra = false;
    session.cats = { satz: 0, wort: 0, anlam: 0 }; session.letzte = []; session.requeue = [];
    $('#odak').value = m;
    themaUI();
    if (m === 'ndek' || m === 'refl') modulEinheiten();
    try { localStorage.setItem('almanca-tekrar-bolum', JSON.stringify({ m, tag: tag() })); } catch (e) { /* yok */ }
    renderHedef();
  }
  function themaUI() {
    const sel = $('#thema-sec');
    if (!sel) return;
    sel.hidden = session.modus !== 'thema';
    if (sel.hidden) return;
    sel.innerHTML = THEMEN.map(t => { const n = t.items.filter(id => S.items[id]).length; return `<option value="${t.id}">${esc(t.tr)} · ${esc(t.de)} (${n}/${t.items.length})</option>`; }).join('');
    sel.value = themaId();
  }
  $('#thema-sec').addEventListener('change', e => { S.einst.thema = e.target.value; save(); session.requeue = []; session.letzteNeu = null; themaUI(); zeige(); });
  $('#zayif-basla').addEventListener('click', () => { setModus('zayif'); zeigView('calis'); zeige(); });
  $('#odak').addEventListener('change', e => { setModus(e.target.value); zeige(); });

  $('#v-ayar').addEventListener('change', e => {
    const id = e.target.id || '';
    const m = id.slice(2);
    if (id.startsWith('z-') && MODI[m]) S.einst.modi[m].ziel = Math.max(5, Math.round(+e.target.value) || MODI[m].ziel);
    else if (id === 'n-gw') S.einst.neuWoerter = Math.max(0, Math.round(+e.target.value));
    else if (id === 'n-gv') S.einst.neuVerben = Math.max(0, Math.round(+e.target.value));
    else if (id.startsWith('n-') && MODI[m]) S.einst.modi[m].neu = Math.max(0, Math.round(+e.target.value) || 0);
    else if (id === 'a-ret') S.einst.ret = +e.target.value || 0.9;
    else return;
    save(); renderHedef(); renderPlan();
  });
  $('#klasor').addEventListener('click', ordnerVerbinden);
  $('#gh-token').value = ghToken() ? '••••••••' : '';
  if (ghToken()) ghDurum('Anahtar kayıtlı: cevaplar GitHub\'a yazılıyor.');
  $('#gh-kaydet').addEventListener('click', async () => {
    const v = $('#gh-token').value.trim();
    if (!v || v.startsWith('•')) return;
    try { localStorage.setItem('almanca-tekrar-gh', v); } catch (e) { /* yok */ }
    $('#gh-token').value = '••••••••';
    ghDurum('Deneniyor…');
    try { await ghApi(''); S.ghPending = S.log.slice(); save(); await ghSync(true); }
    catch (e) { ghDurum('Anahtar çalışmadı: ' + e.message); }
  });
  $('#gh-simdi').addEventListener('click', () => ghSync(true));
  // A1 + modal fiiller: bilinen say (öğrencinin bilmediği dört kelime hariç). İsimlerde yalnız artikel sorulur,
  // ama bariz artikeller atlanır: -e / -ung / -heit / -keit / -ion … kuralına uyan die'ler, -in ile biten kadın isimleri,
  // erkek meslek ve aile isimleri (der), das Bier / das Wasser. Fiilde çekim (1 aya yayılı). Tekrar basılırsa düzeltir.
  const A1_HARIC = new Set(['Bahnsteig', 'Gleis', 'Postleitzahl', 'Stadtplan']);
  const A1_DER_PERSON = new Set(['Arzt', 'Chef', 'Kellner', 'Kollege', 'Lehrer', 'Schüler', 'Student', 'Verkäufer', 'Mann', 'Herr', 'Junge', 'Vater', 'Bruder', 'Sohn', 'Opa', 'Freund', 'Nachbar', 'Türke']);
  function artikelBariz(n) {
    if (n.regel && n.regel[1] === n.art && ['e', 'ung', 'heit', 'keit', 'schaft', 'ion', 'tät', 'ei'].includes(n.regel[0])) return true;
    if (n.art === 'die' && /in$/.test(n.lemma) && NL.some(m => m.art === 'der' && m.lemma + 'in' === n.lemma.replace(/ä/, 'a'))) return true;
    if (n.art === 'die' && /in$/.test(n.lemma) && NL.some(m => m.art === 'der' && n.lemma.startsWith(m.lemma.replace(/e$/, '')))) return true;
    if (n.art === 'der' && A1_DER_PERSON.has(n.lemma)) return true;
    return n.art === 'das' && /^(Bier|Wasser)$/.test(n.lemma);
  }
  $('#a1-bekannt').addEventListener('click', () => {
    const t = now();
    const modal = /^(können|müssen|dürfen|sollen|wollen|mögen|möchten)$/;
    const ids = NL.filter(n => n.tier === 1).map(n => n.id).concat(VERBEN.filter(v => v.tier === 1 || modal.test(v.inf)).map(v => v.id), WOERTER.filter(w => w.tier === 1).map(w => w.id));
    let n = 0, art = 0, bariz = 0, stamm = 0;
    ids.forEach((id, i) => {
      const k = kind(id);
      if (k === 'n' && A1_HARIC.has(byId[id].lemma)) {
        // daha önce yanlışlıkla bilinen sayıldıysa geri al: normal yeni kelime olarak gelsin
        if (S.items[id] && S.items[id].quelle === 'a1') { delete S.items[id]; Object.keys(S.karten).filter(u => itemOf(u) === id).forEach(u => delete S.karten[u]); }
        return;
      }
      if (S.items[id] && S.items[id].quelle !== 'a1') { S.items[id].a1 = true; return; }
      if (!S.items[id]) { S.items[id] = { seit: t, bekannt: true, a1: true, quelle: 'a1' }; n++; }
      if (k === 'n' && !byId[id].plOnly) {
        const c = S.karten[id + ':art'];
        if (artikelBariz(byId[id])) { bariz++; if (c && !c.S) delete S.karten[id + ':art']; }
        else if (!c) { neueKarte(id + ':art', t + (art % 14) * DAY + (i % 24) * 3600000); art++; }
        else art++;
      }
      if (k === 'v' && vById[id].frmDrill && !S.karten[id + ':stamm']) { neueKarte(id + ':stamm', t + (stamm++ % 30) * DAY + (i % 24) * 3600000); }
    });
    save();
    logEintrag({ modus: 'a1', id: '', item: '', frage: '', antwort: '', ergebnis: 'bekannt', loesung: '', notiz: `${n} öğe bilinen sayıldı; ${art} artikel sorulacak, ${bariz} bariz artikel atlandı` });
    $('#a1-durum').textContent = `${n} öğe bilinen sayıldı. ${art} ismin artikeli 2 haftaya yayılarak sorulacak, ${bariz} bariz artikel atlandı. Bahnsteig, Gleis, Postleitzahl, Stadtplan normal öğrenilecek.`;
  });
  $('#gh-yukle').addEventListener('click', ghLaden);
  $('#log-indir').addEventListener('click', () => herunterladen('log.csv', '﻿' + CSV_KOPF + '\n' + S.log.map(csvZeile).join('\n') + '\n', 'text/csv;charset=utf-8'));
  $('#yedek-indir').addEventListener('click', () => herunterladen('zustand.json', JSON.stringify(S), 'application/json'));
  $('#yedek-yukle').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { S = normalize(JSON.parse(await f.text())); save(); renderAyar(); renderHedef(); zeige(); }
    catch (err) { $('#klasor-durum').textContent = 'Dosya okunamadı: ' + err.message; }
  });
  $('#sifirla').addEventListener('click', () => { $('#sifirla-onay').hidden = false; });
  $('#sifirla-hayir').addEventListener('click', () => { $('#sifirla-onay').hidden = true; });
  $('#sifirla-evet').addEventListener('click', () => {
    S = normalize({}); save(); $('#sifirla-onay').hidden = true; renderHedef(); zeige();
  });

  // ================= Başlat =================
  (function willkommen() {
    // ara verdiysen: önce birikmişler, kısa tur önerisi
    const tage = Object.keys(S.tage).filter(k => S.tage[k].n > 0).sort();
    const letzter = tage.filter(k => k < tag()).pop();
    if (letzter) {
      const pause = Math.round((new Date(tag()) - new Date(letzter)) / DAY);
      if (pause >= 3) session.willkommen = `${pause} gün ara verdin, sorun değil. Bugün Çalış'ta 30–40 cevap yeter; önce eski kelimeler gelecek.`;
    }
  })();
  const start = (location.hash || '').replace('#', '');
  zeigView(['calis', 'zayif', 'liste', 'gecmis', 'ayar'].includes(start) ? start : 'calis');
  // Kapanmış ünite: ünitede çalıştığın (basamağa giren) kelimeler tekrar sistemine; çalışmadıkların alınmaz (B1 listesindeyse sırası gelince gelir)
  // tek seferlik: geçmiş cevaplardan (S.log) her kelimenin art arda doğru serisi; 4+ ise bildiğin kelime seyrekleşir
  (function seriGoc() {
    if (S.seriGoc) return;
    const t = now(), seri = {};
    const SKIP = new Set(['pretest', 'yeni', 'leech', 'dikkat', 'paket', 'akt', 'unite', 'lesen', 'lesen-wort', 'fiilmetin', 'text']);
    S.log.forEach(e => {
      if (!e || SKIP.has(e.modus) || !e.id) return;
      const id = String(e.id).split(':')[0];
      if (!S.items[id]) return;
      if (e.ergebnis === 'falsch') seri[id] = 0;
      else if (e.ergebnis === 'richtig') seri[id] = (seri[id] || 0) + 1;
    });
    Object.entries(seri).forEach(([id, n]) => { S.items[id].seri = n; if (n >= 4) seriSeyrek(id, n, t); });
    S.seriGoc = true;
    save();
  })();
  // tek seferlik: yazarak son cevabı doğru olan kelimenin hiç sorulmamış ya da vadesi gelmiş anlam / artikel kartları sanal doğruyla ileri
  (function kardesGoc() {
    if (S.kardesGoc) return;
    const t = now();
    Object.keys(S.items).forEach(id => Object.keys(KREDI).forEach(q => {
      const k = S.karten[id + ':' + q];
      if (k && k.lastG === 3 && k.S >= (q === 'satz' || q === 'nsatz' ? 3 : 2)) kardesKredi(id, q, t);
    }));
    S.kardesGoc = true;
    save();
  })();
  (function uniteSchliessen() {
    const t = now();
    UNITEN.forEach(U => {
      const st = S.unite && S.unite[U.id];
      if (!U.geschlossen || !st || st.uebernommen) return;
      const gearbeitet = U.items.filter(it => st.idx[it.id] != null || st.done[it.id]);
      const alinan = [], ohne = [];
      gearbeitet.forEach(it => {
        const id = uMainId(it);
        if (!id) { ohne.push(it.de); return; }
        if (leichtEinfuehren(id, { quelle: 'unite', spaeter: 0 })) alinan.push(label(id));
      });
      st.uebernommen = true; st.ohne = ohne; st.alinan = alinan;
      logEintrag({ modus: 'unite', id: U.id + ':ende', item: U.titel, frage: 'ünite kapandı', antwort: alinan.join(', '), ergebnis: 'gelesen', loesung: '', notiz: `alındı:${alinan.length} listede yok:${ohne.length}` });
      session.willkommen = `Ünite kapandı: çalıştığın ${alinan.length} kelime tekrar listene eklendi (${alinan.slice(0, 6).join(', ')}${alinan.length > 6 ? ' …' : ''}). Çalışmadıkların eklenmedi.`;
      save();
    });
  })();
  (function startModus() {
    // aynı gün içinde son bölüm; yeni günde planın ilk bitmemiş adımı
    let m = null;
    try { const x = JSON.parse(localStorage.getItem('almanca-tekrar-bolum') || 'null'); if (x && x.tag === tag()) m = x.m; } catch (e) { /* eski biçim */ }
    if (!S.akisEingefuehrt) { S.akisEingefuehrt = true; m = null; save(); }  // tek akışa geçiş: ilk açılışta Çalış
    setModus(m && MODI[m] ? m : 'akis');
  })();
  zeige();
  ordnerLaden();
  window.__tekrar = { get S() { return S; }, get aktuell() { return aktuell; }, UNITE_IT: uById, satzPool, kontextSaetze, formIdx, faellig, gueltig, wortLuecke, VERBEN, byId, wById, pById, G,
    _testOrdner: h => { ordner = h; return dateiSchreiben(true); } };
})();
