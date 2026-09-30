// Dilbilgisi motoru: fiil çekimi, isim öbeği çekimi, cümle üretimi, cevap kontrolü.
// Tarayıcıda window.G, Node'da module.exports.
(function (root) {
  'use strict';

  // ---------- Kişiler ----------
  const PERS = {
    ich:    { k: '1sg', nom: 'ich', A: 'mich', D: 'mir',   rA: 'mich', rD: 'mir',  poss: 'mein',  tr: 'ben' },
    du:     { k: '2sg', nom: 'du',  A: 'dich', D: 'dir',   rA: 'dich', rD: 'dir',  poss: 'dein',  tr: 'sen' },
    er:     { k: '3sg', nom: 'er',  A: 'ihn',  D: 'ihm',   rA: 'sich', rD: 'sich', poss: 'sein',  tr: 'o (erkek)' },
    sie:    { k: '3sg', nom: 'sie', A: 'sie',  D: 'ihr',   rA: 'sich', rD: 'sich', poss: 'ihr',   tr: 'o (kadın)' },
    wir:    { k: '1pl', nom: 'wir', A: 'uns',  D: 'uns',   rA: 'uns',  rD: 'uns',  poss: 'unser', tr: 'biz' },
    ihr:    { k: '2pl', nom: 'ihr', A: 'euch', D: 'euch',  rA: 'euch', rD: 'euch', poss: 'euer',  tr: 'siz (samimi)' },
    sie_pl: { k: '3pl', nom: 'sie', A: 'sie',  D: 'ihnen', rA: 'sich', rD: 'sich', poss: 'ihr',   tr: 'onlar' },
    Sie:    { k: '3pl', nom: 'Sie', A: 'Sie',  D: 'Ihnen', rA: 'sich', rD: 'sich', poss: 'Ihr',   tr: 'siz (resmi)' },
  };
  const POSS_TR = { ich: 'benim', du: 'senin', er: 'onun (erkek)', sie: 'onun (kadın)', wir: 'bizim',
    ihr: 'sizin', sie_pl: 'onların', Sie: 'sizin (resmi)' };
  const NAMEN = [
    { name: 'Anna', k: '3sg', pk: 'sie' }, { name: 'Lukas', k: '3sg', pk: 'er' },
    { name: 'Frau Weber', k: '3sg', pk: 'sie' }, { name: 'Herr Yılmaz', k: '3sg', pk: 'er' },
  ];

  // ---------- Fiil çekimi ----------
  const IRR = {
    sein:    ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'],
    haben:   ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'],
    werden:  ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'],
    wissen:  ['weiß', 'weißt', 'weiß', 'wissen', 'wisst', 'wissen'],
    tun:     ['tue', 'tust', 'tut', 'tun', 'tut', 'tun'],
    können:  ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'],
    müssen:  ['muss', 'musst', 'muss', 'müssen', 'müsst', 'müssen'],
    dürfen:  ['darf', 'darfst', 'darf', 'dürfen', 'dürft', 'dürfen'],
    sollen:  ['soll', 'sollst', 'soll', 'sollen', 'sollt', 'sollen'],
    wollen:  ['will', 'willst', 'will', 'wollen', 'wollt', 'wollen'],
    mögen:   ['mag', 'magst', 'mag', 'mögen', 'mögt', 'mögen'],
    möchten: ['möchte', 'möchtest', 'möchte', 'möchten', 'möchtet', 'möchten'],
  };
  const KI = { '1sg': 0, '2sg': 1, '3sg': 2, '1pl': 3, '2pl': 4, '3pl': 5 };
  const MODAL = {
    können:  { tr: '-ebilmek (können)', praet: 'konnte' },
    müssen:  { tr: '-mek zorunda (müssen)', praet: 'musste' },
    wollen:  { tr: '-mek istemek (wollen)', praet: 'wollte' },
    möchten: { tr: '-mek istemek, kibar (möchten)', praet: null },
    sollen:  { tr: '-meli (sollen)', praet: 'sollte' },
    dürfen:  { tr: '-ebilir, izinli (dürfen)', praet: 'durfte' },
  };

  function stemOf(base) {
    if (/[^aeiouäöü](el|er)n$/.test(base) || /(el|er)n$/.test(base)) return base.slice(0, -1);
    return base.replace(/e?n$/, '');
  }
  const needsE = st => /[dt]$/.test(st) || /[^aeiouäöülrhmn][mn]$/.test(st);
  const sEnd = st => /(s|ß|x|z|tz)$/.test(st);

  function regular(base) {
    const st = stemOf(base);
    const elEr = /(el|er)$/.test(st) && /(el|er)n$/.test(base);
    const e = !elEr && needsE(st);
    const ich = /el$/.test(st) && elEr ? st.slice(0, -2) + 'le' : st + 'e';
    const du = elEr ? st + 'st' : e ? st + 'est' : sEnd(st) ? st + 't' : st + 'st';
    const er = elEr ? st + 't' : e ? st + 'et' : st + 't';
    return [ich, du, er, base, er, base];
  }

  // v: {base, pre, sp, p3} ; gibt nur das finite Wort zurück (ohne abgetrenntes Präfix)
  function praesensForms(v) {
    const base = v.base;
    if (IRR[base]) return IRR[base].slice();
    const f = regular(base);
    const g3 = v.p3 ? v.p3.split('/')[0] : null;
    if (g3 && g3 !== f[2]) {
      const st = stemOf(base);
      let du;
      if (sEnd(st) && /(s|ß|z|x)t$/.test(g3)) du = g3;           // liest, isst, lässt
      else if (/t$/.test(st) && /t$/.test(g3)) du = g3 + 'st';    // hält → hältst
      else du = g3.replace(/t$/, '') + 'st';                        // fährt → fährst, lädt → lädst
      f[1] = du;
      f[2] = g3;
    }
    return f;
  }
  function praesens(v, k) { return praesensForms(v)[KI[k]]; }

  function praeteritumForms(p3) {
    const e = /e$/.test(p3);
    const t = /[dt]$/.test(p3);
    return [p3, p3 + (e ? 'st' : t ? 'est' : 'st'), p3,
      p3 + (e ? 'n' : 'en'), p3 + (e ? 't' : t ? 'et' : 't'), p3 + (e ? 'n' : 'en')];
  }

  // ---------- İsim öbeği ----------
  const DEF = { m: { N: 'der', A: 'den', D: 'dem', G: 'des' }, f: { N: 'die', A: 'die', D: 'der', G: 'der' },
    n: { N: 'das', A: 'das', D: 'dem', G: 'des' }, pl: { N: 'die', A: 'die', D: 'den', G: 'der' } };
  const EIN_END = { m: { N: '', A: 'en', D: 'em', G: 'es' }, f: { N: 'e', A: 'e', D: 'er', G: 'er' },
    n: { N: '', A: '', D: 'em', G: 'es' }, pl: { N: 'e', A: 'e', D: 'en', G: 'er' } };
  const ADJ_W = { m: { N: 'e', A: 'en', D: 'en' }, f: { N: 'e', A: 'e', D: 'en' },
    n: { N: 'e', A: 'e', D: 'en' }, pl: { N: 'en', A: 'en', D: 'en' } };
  const ADJ_M = { m: { N: 'er', A: 'en', D: 'en' }, f: { N: 'e', A: 'e', D: 'en' },
    n: { N: 'es', A: 'es', D: 'en' }, pl: { N: 'en', A: 'en', D: 'en' } };
  const GEN = { der: 'm', die: 'f', das: 'n' };
  const KASUS_TR = { N: 'Nominativ', A: 'Akkusativ', D: 'Dativ', G: 'Genitiv' };

  function adjStem(a) {
    if (a === 'hoch') return 'hoh';
    if (/[ae]uer$/.test(a)) return a.slice(0, -2) + 'r';
    if (/el$/.test(a)) return a.slice(0, -2) + 'l';
    return a;
  }

  function umlaut(w) {
    const m = w.match(/^(.*?)(au|a|o|u|A|O|U)([^aouAOU]*)$/);
    if (!m) return w;
    const map = { au: 'äu', a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' };
    return m[1] + map[m[2]] + m[3];
  }
  function pluralForm(lemma, pl) {
    if (!pl || /\//.test(pl)) return null;
    let base = lemma, suf = pl;
    if (suf[0] === '¨') { base = umlaut(base); suf = suf.slice(1); }
    return suf === '-' ? base : base + suf.replace(/^-/, '');
  }

  // noun: {art, lemma, weak, plf}; opt: {det:'def'|'indef'|'poss'|'none', poss: pk, adj, plural}
  function nounForm(noun, kasus, plural) {
    if (plural) {
      const p = noun.plf || noun.lemma;
      return kasus === 'D' && !/[ns]$/.test(p) ? p + 'n' : p;
    }
    if (kasus === 'G' && noun.art !== 'die') return noun.gen || noun.lemma + 's';
    if (noun.weak && kasus !== 'N') {
      if (/(e|Herr|Nachbar|Bauer)$/.test(noun.lemma)) return noun.lemma + 'n';
      return noun.lemma + 'en';
    }
    return noun.lemma;
  }

  function np(noun, kasus, opt) {
    opt = opt || {};
    const g = opt.plural ? 'pl' : GEN[noun.art];
    const parts = [];
    let adjTab = null;
    if (opt.det === 'def') { parts.push(DEF[g][kasus]); adjTab = ADJ_W; }
    else if (opt.det === 'indef') { parts.push('ein' + EIN_END[g][kasus]); adjTab = ADJ_M; }
    else if (opt.det === 'poss') {
      let st = PERS[opt.poss].poss;
      const end = EIN_END[g][kasus];
      if (st === 'euer' && end) st = 'eur';
      parts.push(st + end); adjTab = ADJ_M;
    }
    if (opt.adj) {
      const tab = adjTab || { m: { N: 'er', A: 'en', D: 'em' }, f: { N: 'e', A: 'e', D: 'er' },
        n: { N: 'es', A: 'es', D: 'em' }, pl: { N: 'e', A: 'e', D: 'en' } };
      parts.push(adjStem(opt.adj) + tab[g][kasus]);
    }
    parts.push(nounForm(noun, kasus, opt.plural));
    return parts;
  }

  const KONTR = { an: { dem: 'am', das: 'ans' }, in: { dem: 'im', das: 'ins' },
    zu: { dem: 'zum', der: 'zur' }, von: { dem: 'vom' }, bei: { dem: 'beim' } };
  function withPrep(prep, parts, kontr) {
    const c = KONTR[prep] && KONTR[prep][parts[0]];
    if (c && kontr) return [c].concat(parts.slice(1));
    return [prep].concat(parts);
  }
  const PREP_CASE = { mit: 'D', nach: 'D', zu: 'D', von: 'D', bei: 'D', aus: 'D', seit: 'D',
    für: 'A', um: 'A', gegen: 'A', ohne: 'A', durch: 'A' };
  function woWort(prep) { return (/^[aeiouäöü]/.test(prep) ? 'wor' : 'wo') + prep; }

  // ---------- Cümle kurma ----------
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // cfg: {v, subj:{pk}|{name,k,pk}|{np:{noun,det,poss}, k}, tempus, modal, typ, konj, neg, zeit, objs:[...], wIdx}
  // obj: {slot:{k,p}, pron: pk} | {slot, noun, det, poss, adj, plural}
  function render(cfg, variant) {
    const v = cfg.v;
    const kontr = variant.kontr;
    let subj, k;
    if (cfg.subj.np) { subj = np(cfg.subj.np.noun, 'N', cfg.subj.np).join(' '); k = cfg.subj.k; }
    else if (cfg.subj.name) { subj = cfg.subj.name; k = cfg.subj.k; }
    else { subj = PERS[cfg.subj.pk].nom; k = PERS[cfg.subj.pk].k; }
    const subjIsPron = !cfg.subj.np && !cfg.subj.name;

    // fiil parçaları
    let finite, right = [], nebenEnd;
    if (cfg.tempus === 'perf') {
      finite = praesens({ base: v.aux === 'ist' ? 'sein' : 'haben' }, k);
      right = [v.p2]; nebenEnd = v.p2 + ' ' + finite;
    } else if (cfg.tempus === 'modal') {
      finite = praesens({ base: cfg.modal }, k);
      right = [v.inf]; nebenEnd = v.inf + ' ' + finite;
    } else {
      finite = praesens(v, k);
      if (v.pre) { right = [v.pre]; nebenEnd = v.pre + v.sp + finite; }
      else nebenEnd = finite;
    }

    // orta alan blokları
    const pron = [];
    if (v.refl) {
      const p = subjIsPron ? PERS[cfg.subj.pk] : PERS[cfg.subj.pk || 'er'];
      pron.push(v.refl === 'D' ? p.rD : p.rA);
    }
    const pronA = [], pronD = [], npD = [], npA = [], prep = [];
    let wWort = null;
    cfg.objs.forEach((o, i) => {
      const s = o.slot;
      const isW = cfg.typ === 'wfrage' && i === cfg.wIdx;
      if (isW) {
        if (s.p) wWort = o.pron || o.person ? s.p + ' ' + (s.k === 'D' ? 'wem' : 'wen') : woWort(s.p);
        else wWort = o.pron || o.person ? (s.k === 'D' ? 'wem' : 'wen') : 'was';
        return;
      }
      let parts;
      if (o.pron) parts = [PERS[o.pron][s.k]];
      else parts = np(o.noun, s.k, o);
      if (s.p) prep.push(withPrep(s.p, parts, kontr).join(' '));
      else if (o.pron) (s.k === 'A' ? pronA : pronD).push(parts.join(' '));
      else (s.k === 'D' ? npD : npA).push(parts.join(' '));
    });
    // Özne isimse (gefallen, schmecken …) Dativ kişi öznenin önüne alınabilir: „Schmeckt der Ärztin der Salat?"
    const dFront = cfg.subj.np ? npD.splice(0) : [];
    const pronBlock = pron.concat(pronA, pronD, dFront);
    const mid = [].concat(npD, npA);
    const neg = cfg.neg ? ['nicht'] : [];
    const rest = [].concat(mid, neg, prep);

    // özne + zamir bloğu (isim öznede zamirler önce de gelebilir)
    const sp = variant.pronFirst && !subjIsPron ? pronBlock.concat([subj]) : [subj].concat(pronBlock);

    let toks, end = '.';
    if (cfg.typ === 'frage') {
      toks = [finite].concat(sp, rest, right); end = '?';
    } else if (cfg.typ === 'wfrage') {
      toks = [wWort, finite].concat(sp, rest, right); end = '?';
    } else if (cfg.typ === 'neben') {
      toks = [cfg.konj].concat(sp, rest, [nebenEnd]); end = '';
    } else if (cfg.zeit) {
      toks = [cfg.zeit.de, finite].concat(sp, rest, right);
    } else {
      toks = [subj, finite].concat(pronBlock, rest, right);
    }
    let s = toks.filter(Boolean).join(' ');
    if (cfg.typ !== 'neben') s = cap(s);
    return s + end;
  }

  function erklaeren(cfg) {
    const v = cfg.v, out = [];
    const k = cfg.subj.np ? cfg.subj.k : cfg.subj.name ? cfg.subj.k : PERS[cfg.subj.pk].k;
    out.push(`<b>${v.anz}</b>${v.obj && v.obj.length ? ' — ' + objMuster(v) : ''}`);
    if (cfg.tempus === 'perf') out.push(`Perfekt: <b>${v.aux === 'ist' ? 'sein' : 'haben'}</b> + ${v.p2} (Partizip II sona)`);
    else if (cfg.tempus === 'modal') out.push(`${cfg.modal}: çekimli modal fiil 2. sırada, <b>${v.inf}</b> mastar hâlinde sonda`);
    else if (v.pre) out.push(`Ayrılan fiil: <b>${praesens(v, k)} … ${v.pre}</b> (ön ek sona)`);
    if (v.refl) {
      const pk = cfg.subj.pk || 'er';
      out.push(`Dönüşlü zamir: ${cfg.subj.name ? cfg.subj.name : PERS[pk].nom} → <b>${v.refl === 'D' ? PERS[pk].rD : PERS[pk].rA}</b>${v.refl === 'D' ? ' (Dativ)' : ''}`);
    }
    cfg.objs.forEach((o, i) => {
      if (cfg.typ === 'wfrage' && i === cfg.wIdx) {
        const s = o.slot;
        if (s.p && !(o.pron || o.person)) out.push(`Şey sorulur → <b>${woWort(s.p)}</b> (wo(r) + ${s.p})`);
        else out.push(`Kişi sorulur → <b>${s.p ? s.p + ' ' : ''}${s.k === 'D' ? 'wem' : 'wen'}</b> (${KASUS_TR[s.k]})`);
        return;
      }
      const s = o.slot;
      if (o.pron) {
        out.push(`${s.p ? s.p + ' + ' : ''}${KASUS_TR[s.k]}: ${PERS[o.pron].nom} → <b>${PERS[o.pron][s.k]}</b>`);
      } else {
        const f = np(o.noun, s.k, o).join(' ');
        const g = o.plural ? 'çoğul' : o.noun.art;
        let t = `${s.p ? s.p + ' + ' : ''}${KASUS_TR[s.k]}: ${o.noun.art} ${o.noun.lemma} (${g}) → <b>${s.p ? withPrep(s.p, np(o.noun, s.k, o), true).join(' ') : f}</b>`;
        if (o.adj) t += ` · sıfat sonu: -${np(o.noun, s.k, o).slice(-2)[0].slice(adjStem(o.adj).length)}`;
        if (o.noun.weak && s.k !== 'N' && !o.plural) t += ' · n-Deklination';
        out.push(t);
      }
    });
    if (cfg.neg) out.push(cfg.objs.some(o => o.slot.p) ? '<b>nicht</b> edatlı nesnenin önüne' : '<b>nicht</b> nesnelerden sonra, fiilin son parçasından önce');
    if (cfg.typ === 'neben') out.push(`<b>${cfg.konj}</b> yan cümlesi: çekimli fiil en sona`);
    if (cfg.typ === 'frage') out.push('Evet/hayır sorusu: çekimli fiil başa');
    if (cfg.zeit) out.push(`Zaman ifadesi başta → fiil 2. sırada, özne fiilden sonra (Inversion)`);
    return out;
  }

  function objMuster(v) {
    return v.obj.map(o => (o.p ? o.p + ' + ' : '') + (o.k === 'A' ? 'Akk' : o.k === 'D' ? 'Dat' : o.k)).join(', ');
  }

  function bauen(cfg) {
    const seen = new Set(), alts = [];
    const hasName = !!(cfg.subj.name || cfg.subj.np);
    const auxe = cfg.tempus === 'perf' && cfg.v.auxAlt ? [cfg.v.aux, cfg.v.auxAlt] : [null];
    for (const aux of auxe) {
      const c = aux ? Object.assign({}, cfg, { v: Object.assign({}, cfg.v, { aux }) }) : cfg;
      for (const pronFirst of hasName ? [true, false] : [false]) {
        for (const kontr of [true, false]) {
          const s = render(c, { pronFirst, kontr });
          if (!seen.has(s)) { seen.add(s); alts.push(s); }
        }
      }
    }
    return { de: alts[0], alts: alts.slice(1), erkl: erklaeren(cfg) };
  }

  // ---------- Rastgele alıştırma üretimi ----------
  const ZEIT = {
    praes: [['heute', 'bugün'], ['morgen', 'yarın'], ['jetzt', 'şimdi'], ['am Wochenende', 'hafta sonu']],
    perf: [['gestern', 'dün'], ['letzte Woche', 'geçen hafta'], ['am Wochenende', 'hafta sonu'], ['vorgestern', 'evvelsi gün']],
  };
  const KONJ = [['weil', 'çünkü …'], ['dass', '… -dığını / -diğini'], ['wenn', 'eğer / -dığında'], ['obwohl', '… -mesine rağmen']];

  const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

  // level: 0 = tam ipucu … 3 = ipucusuz
  function uebung(v, level, rnd, opts) {
    rnd = rnd || Math.random;
    opts = opts || {};
    const frames = v.rahmen;
    if (!frames || !frames.length) return null;
    const fr = pick(frames, rnd);
    const cfg = { v, objs: [], neg: false };

    // cümle tipi önce seçilir (soru cümlesinde özne 'ich' olmasın)
    const t = rnd();
    const rektion = o => (v.obj || []).some(x => x.p === o.p && x.k === o.k);
    const aus = fr.x || [];
    const wSlots = aus.includes('keinW') ? [] : (fr.o || []).map((o, i) => o.p && rektion(o) ? i : -1).filter(i => i >= 0);
    if (level >= 1 && t < 0.2) { cfg.typ = 'neben'; const kj = pick(KONJ, rnd); cfg.konj = kj[0]; cfg.konjTr = kj[1]; }
    else if (t < 0.38) cfg.typ = 'frage';
    else if (level >= 1 && wSlots.length && t < 0.55 && !fr.s) { cfg.typ = 'wfrage'; cfg.wIdx = pick(wSlots, rnd); }
    else cfg.typ = 'aussage';

    // özne
    const subjPool = Object.keys(PERS).filter(p => (!(cfg.typ === 'frage' || cfg.typ === 'wfrage') || p !== 'ich') &&
      (!aus.includes('plSubj') || PERS[p].k.endsWith('pl')));
    if (fr.s) {
      const n = pick(fr.s, rnd);
      const pl = !!n.plural;
      cfg.subj = { np: { noun: n, det: n.poss && rnd() < 0.5 ? 'poss' : 'def', poss: pick(Object.keys(PERS), rnd), plural: pl }, k: pl ? '3pl' : '3sg' };
    } else if (rnd() < 0.2 && cfg.typ !== 'frage' && !aus.includes('plSubj')) {
      const nm = pick(NAMEN, rnd); cfg.subj = { name: nm.name, k: nm.k, pk: nm.pk };
    } else cfg.subj = { pk: pick(subjPool, rnd) };
    const subjPk = cfg.subj.pk;
    // özneyle çakışan nesne zamirleri (wir … mich, ihr … dich) dışarıda
    const CLASH = { ich: ['ich', 'wir'], wir: ['ich', 'wir'], du: ['du', 'ihr'], ihr: ['du', 'ihr'],
      Sie: ['Sie', 'du', 'ihr'], er: [], sie: [], sie_pl: ['sie_pl'] };
    const used = new Set();
    const objPool = () => Object.keys(PERS).filter(p => !(subjPk && (CLASH[subjPk].includes(p) || p === subjPk && !cfg.subj.name)) && !used.has(p));
    // iyelik: yarı yarıya öznenin kendi iyeliği ya da başka biri
    const possPk = () => subjPk && !cfg.subj.name && rnd() < 0.5 ? subjPk : pick(Object.keys(PERS), rnd);

    // nesneler
    (fr.o || []).forEach(slot => {
      const cand = pick(slot.n, rnd);
      if (cand === 'P') {
        const pool = objPool();
        if (rnd() < 0.55 && pool.length) {
          const pk = pick(pool, rnd); used.add(pk);
          cfg.objs.push({ slot, pron: pk, person: true });
        } else {
          const n = pick(opts.personen || [], rnd);
          const det = n.poss && rnd() < 0.6 ? 'poss' : 'def';
          const o = { slot, noun: n, det, poss: possPk(), person: true, plural: !!n.plural };
          if (level >= 1 && n.adj && opts.adjPerson && rnd() < 0.25) o.adj = pick(opts.adjPerson, rnd);
          cfg.objs.push(o);
        }
      } else {
        const det = cand.bare ? 'none' : cand.poss && rnd() < 0.4 ? 'poss' : (cand.indef && rnd() < 0.5 ? 'indef' : 'def');
        const o = { slot, noun: cand, det, poss: possPk(), plural: !!cand.plural, person: !!cand.person };
        if (level >= 1 && cand.adj && !cand.bare && opts.adjSache && rnd() < 0.35) o.adj = pick(opts.adjSache, rnd);
        cfg.objs.push(o);
      }
    });

    // zaman
    const r = rnd();
    cfg.tempus = r < 0.4 ? 'praes' : r < 0.75 ? 'perf' : 'modal';
    if (fr.t && !fr.t.includes(cfg.tempus)) cfg.tempus = fr.t[0];
    if (fr.s && cfg.tempus === 'modal') cfg.tempus = 'praes';
    if (cfg.tempus === 'modal') cfg.modal = pick(['können', 'müssen', 'wollen', 'möchten', 'sollen'], rnd);

    if (cfg.typ !== 'wfrage' && rnd() < 0.3 && !cfg.objs.some(o => o.det === 'indef' || o.det === 'none' && !o.slot.p)) cfg.neg = true;
    if (cfg.typ === 'aussage' && !aus.includes('keineZeit') && rnd() < 0.35) {
      const z = pick(cfg.tempus === 'perf' ? ZEIT.perf : ZEIT.praes, rnd); cfg.zeit = { de: z[0], tr: z[1] };
    }

    const res = bauen(cfg);
    res.cfg = cfg;
    res.prompt = promptTr(cfg, level);
    return res;
  }

  function promptTr(cfg, level) {
    const v = cfg.v;
    const p = { chips: [], verb: {}, objs: [] };
    p.subj = cfg.subj.np ? null : cfg.subj.name || PERS[cfg.subj.pk].tr;
    if (cfg.subj.np) {
      const n = cfg.subj.np.noun;
      p.subjNP = { tr: (cfg.subj.np.det === 'poss' ? POSS_TR[cfg.subj.np.poss] + ' ' : '') + n.tr, art: cfg.subj.np.plural ? 'die (Pl.)' : n.art, de: level < 2 ? n.lemma : null };
    }
    p.chips.push(cfg.tempus === 'perf' ? 'geçmiş · Perfekt' : cfg.tempus === 'modal' ? MODAL[cfg.modal].tr : 'şimdiki / geniş zaman · Präsens');
    if (cfg.typ === 'frage') p.chips.push('evet/hayır sorusu');
    if (cfg.typ === 'wfrage') p.chips.push('soru kelimesiyle sor: ' + (cfg.objs[cfg.wIdx].pron || cfg.objs[cfg.wIdx].person ? 'kim?' : 'ne?'));
    if (cfg.typ === 'neben') p.chips.push('yan cümle: ' + cfg.konj + ' (' + cfg.konjTr + ')');
    if (cfg.neg) p.chips.push('olumsuz');
    if (cfg.zeit) p.chips.push(`„${cap(cfg.zeit.de)}" (${cfg.zeit.tr}) ile başla`);
    p.verb.tr = v.tr;
    if (level === 0) p.verb.de = v.anz + (v.obj && v.obj.length ? '  (' + objMuster(v) + ')' : '');
    else if (level === 1) p.verb.de = v.anz;
    cfg.objs.forEach((o, i) => {
      if (cfg.typ === 'wfrage' && i === cfg.wIdx) { p.objs.push({ tr: '?', frage: true }); return; }
      if (o.pron) { p.objs.push({ tr: PERS[o.pron].tr, pron: true }); return; }
      const x = { tr: o.noun.tr, art: o.plural ? 'die (Pl.)' : o.noun.art, de: level < 2 ? (o.plural ? o.noun.plf : o.noun.lemma) : null };
      if (o.det === 'poss') x.poss = POSS_TR[o.poss];
      if (o.det === 'indef') x.indef = true;
      if (o.det === 'none') x.bare = true;
      if (o.adj) x.adj = o.adj;
      p.objs.push(x);
    });
    return p;
  }

  // daten/*.js'deki kalıpları isim nesneleriyle çözer (id → isim)
  function rahmenAufloesen(v, byId) {
    if (!v.rahmen) return v;
    const res = r => Object.assign({}, byId[r.id], r);
    return Object.assign({}, v, {
      rahmen: v.rahmen.map(fr => Object.assign({}, fr, {
        s: fr.s && fr.s.map(res),
        o: fr.o.map(sl => Object.assign({}, sl, { n: sl.n.map(x => x === 'P' ? 'P' : res(x)) })),
      })),
    });
  }

  // ---------- n-Deklination alıştırması ----------
  const ND_PERSON = {
    N: [['___ kommt heute nicht.', 'özne'], ['___ wartet schon draußen.', 'özne'], ['Wo ist ___?', 'özne']],
    A: [['Ich frage ___.', 'fragen + Akk'], ['Kennst du ___?', 'kennen + Akk'], ['Wir warten auf ___.', 'warten auf + Akk'],
      ['Das Geschenk ist für ___.', 'für + Akk'], ['Ich rufe ___ morgen an.', 'anrufen + Akk'], ['Ich besuche ___ am Wochenende.', 'besuchen + Akk']],
    D: [['Ich helfe ___.', 'helfen + Dat'], ['Ich spreche mit ___.', 'mit + Dat'], ['Das Handy gehört ___.', 'gehören + Dat'],
      ['Ich habe ___ eine Nachricht geschickt.', 'schicken: kişi Dat'], ['Wir gehen mit ___ essen.', 'mit + Dat'], ['Ich danke ___.', 'danken + Dat']],
    G: [['Das ist das Auto ___.', 'kimin? → Genitiv'], ['Die Tasche ___ ist rot.', 'kimin? → Genitiv'], ['Ich kenne die Adresse ___ nicht.', 'kimin? → Genitiv']],
  };
  const ND_TIER = {
    N: [['___ schläft.', 'özne'], ['Wo ist ___?', 'özne']],
    A: [['Im Zoo sehen wir ___.', 'sehen + Akk'], ['Das Kind füttert ___.', 'füttern + Akk']],
    D: [['Das Kind gibt ___ eine Banane.', 'geben: alan Dat'], ['Wir haben Angst vor ___.', 'Angst vor + Dat']],
    G: [['Das Foto ___ ist schön.', 'kimin? → Genitiv']],
  };
  const ND_SACHE = {
    Name: { N: [['___ ist zu lang.', 'özne']], A: [['Ich habe ___ vergessen.', 'vergessen + Akk'], ['Wie schreibt man ___?', 'schreiben + Akk']], D: [['Unter ___ finde ich nichts.', 'unter (nerede?) + Dat']], G: [['Die Bedeutung ___ ist schön.', 'neyin? → Genitiv']] },
    Buchstabe: { N: [['___ ist schwer zu lesen.', 'özne']], A: [['Ich kann ___ nicht lesen.', 'lesen + Akk']], D: [['Das Wort beginnt mit ___.', 'mit + Dat']], G: [['Die Form ___ ist komisch.', 'neyin? → Genitiv']] },
    Gedanke: { N: [['___ ist gut.', 'özne']], A: [['Ich finde ___ interessant.', 'finden + Akk'], ['Ich denke oft an ___.', 'denken an + Akk']], D: [['Ich bin mit ___ nicht einverstanden.', 'mit + Dat']] },
    Automat: { N: [['___ ist kaputt.', 'özne']], A: [['Ich suche ___.', 'suchen + Akk']], D: [['Ich stehe vor ___.', 'vor (nerede?) + Dat']], G: [['Der Bildschirm ___ ist dunkel.', 'neyin? → Genitiv']] },
    Friede: { N: [['___ ist wichtig.', 'özne']], A: [['Alle wünschen sich ___.', 'wünschen + Akk']] },
    Käse: { N: [['___ ist lecker.', 'özne']], A: [['Ich kaufe ___.', 'kaufen + Akk']], D: [['Was machst du mit ___?', 'mit + Dat']], G: [['Der Preis ___ ist hoch.', 'neyin? → Genitiv']] },
    See: { N: [['___ ist kalt.', 'özne']], A: [['Wir sehen ___.', 'sehen + Akk']], D: [['Wir wohnen neben ___.', 'neben (nerede?) + Dat']], G: [['Das Wasser ___ ist klar.', 'neyin? → Genitiv']] },
    Bus: { N: [['___ kommt gleich.', 'özne']], A: [['Ich nehme ___.', 'nehmen + Akk']], D: [['Ich fahre mit ___.', 'mit + Dat']], G: [['Der Fahrer ___ ist nett.', 'neyin? → Genitiv']] },
  };
  const TIERE = ['Affe', 'Hase', 'Löwe', 'Bär', 'Elefant', 'Hund'];
  function ndTemplates(n) {
    const key = Object.keys(ND_SACHE).find(k => n.lemma === k || n.lemma.endsWith(k.toLowerCase()));
    if (key) return { tpl: ND_SACHE[key], sache: true };
    return { tpl: TIERE.includes(n.lemma) ? ND_TIER : ND_PERSON, sache: false };
  }
  const DET_TR = { def: 'belirli artikel (der/den/dem/des)', indef: 'belirsiz (ein/einen/einem/eines)' };
  function ndekAufgabe(n, rnd, level) {
    rnd = rnd || Math.random;
    const { tpl, sache } = ndTemplates(n);
    const kase = Object.keys(tpl);
    // Nominativ az sorulur (tuzak: orada -n yok), en çok Akk/Dat
    const gew = kase.map(k => k === 'N' ? 1 : k === 'G' ? 1.5 : 3);
    let r = rnd() * gew.reduce((a, b) => a + b, 0), k = kase[0];
    for (let i = 0; i < kase.length; i++) { r -= gew[i]; if (r <= 0) { k = kase[i]; break; } }
    const [text, why] = pick(tpl[k], rnd);
    // artikel seçimi isme göre: aile → der/mein, meslek → der/ein, bazıları iyelikle de doğal
    const FAMILIE = ['Bruder', 'Sohn', 'Vater', 'Onkel', 'Neffe', 'Mann', 'Partner', 'Junge'];
    const POSS_OK = FAMILIE.concat(['Kollege', 'Nachbar', 'Freund', 'Chef', 'Lehrer', 'Arzt', 'Professor', 'Dozent',
      'Kommilitone', 'Hund', 'Name', 'Vorname', 'Familienname', 'Schüler', 'Kunde', 'Patient']);
    const dets = ['def', 'def'];
    if (!FAMILIE.includes(n.lemma) && (!sache || n.lemma === 'Käse' || n.lemma === 'Bus')) dets.push('indef');
    if (POSS_OK.includes(n.lemma)) dets.push('poss', 'poss');
    const det = pick(dets, rnd);
    const poss = pick(['ich', 'du', 'er', 'sie', 'wir', 'ihr'], rnd);
    const antwort = np(n, k, { det, poss }).join(' ');
    const alts = [];
    if (k === 'G' && !n.weak && n.genAlt) alts.push(np(Object.assign({}, n, { gen: n.genAlt }), k, { det, poss }).join(' '));
    const satz = cap(text.replace('___', antwort));
    const erkl = [];
    erkl.push(`${KASUS_TR[k]}: ${why}`);
    if (n.weak) {
      const sp = n.gen && /ns$/.test(n.gen);
      erkl.push(`<b>${n.art} ${n.lemma}</b> n-Deklination: Nominativ dışında hep <b>-${nounForm(n, 'A').slice(n.lemma.length)}</b> → den / dem ${n.lemma === 'Herr' ? 'Herrn' : nounForm(n, 'A')}, des ${n.gen}${sp ? ' (Genitiv\'de ayrıca -s)' : ''}`);
      if (k === 'N') erkl.push('Nominativ\'de ek yok: ' + n.art + ' ' + n.lemma);
    } else {
      erkl.push(`<b>${n.art} ${n.lemma}</b> n-Deklination DEĞİL: den ${n.lemma}, dem ${n.lemma}, des ${n.gen}`);
    }
    return {
      text, antwort, alts, satz, kasus: k, det, poss, erkl,
      detTr: det === 'poss' ? POSS_TR[poss] + ' (' + PERS[poss].poss + '-)' : DET_TR[det],
    };
  }

  // ---------- Dönüşlü fiil alıştırması ----------
  const IMP_OK = ['beeilen', 'setzen', 'anziehen', 'ausziehen', 'umziehen', 'ausruhen', 'beruhigen', 'anschnallen',
    'anstrengen', 'konzentrieren', 'bewegen', 'vorbereiten', 'entscheiden', 'entschuldigen', 'bedanken', 'melden',
    'anmelden', 'informieren', 'kümmern', 'merken', 'ansehen', 'aussuchen', 'überlegen', 'vorstellen', 'waschen',
    'duschen', 'freuen', 'erholen'];
  const NUR_3 = ['ereignen', 'lohnen', 'eignen'];
  // tek başına cümle kurmayan (tümleç zorunlu, kalıbı yok) ya da öznesi şey olan fiiller: bu alıştırmada yok
  const REFL_AUS = NUR_3.concat(['befinden', 'verhalten', 'fühlen', 'ernähren', 'entschließen', 'nähern']);
  function imperativDu(v) {
    const f = praesensForms(v), reg = regular(v.base), st = stemOf(v.base);
    if (IRR[v.base]) return null;
    if (f[1] !== reg[1]) {
      // e → i / ie: gib, nimm, sieh, lies; a → ä: fahr, lauf (umlaut düşer)
      const stamm = f[2].replace(/t$/, '');
      if (/ä|äu|ö/.test(f[2]) && !/ä|ö/.test(st)) return st;
      if (/(s|ß|ss)t$/.test(f[2]) && /(s|ß|z)$/.test(st)) return f[2].replace(/t$/, '');
      return f[1].replace(/st$/, '') || stamm;
    }
    if (/el$/.test(st) && /eln$/.test(v.base)) return st.slice(0, -2) + 'le';
    if (/ig$|[dt]$|[^aeiouäöülrhmn][mn]$/.test(st) || (/er$/.test(st) && /ern$/.test(v.base))) return st + 'e';
    return st;
  }
  // edatlı dönüşlü fiillerde kalıptan bir edatlı nesne: "für die Musik", "mit dem Freund"
  function reflObjekt(v, rnd, opts) {
    const po = (v.obj || []).find(o => o.p);
    if (!po || !v.rahmen) return null;
    const slots = [];
    v.rahmen.forEach(fr => fr.o.forEach(sl => { if (sl.p === po.p && sl.k === po.k) slots.push(sl); }));
    if (!slots.length) return null;
    const sl = pick(slots, rnd);
    const things = sl.n.filter(x => x !== 'P');
    // kişi yalnızca kalıp kişi alıyorsa (P): "sich beteiligen am Onkel" gibi saçmalık olmasın
    const kannPerson = sl.n.includes('P') && opts && opts.personen;
    let noun = things.length && (!kannPerson || rnd() < 0.6) ? pick(things, rnd) : null;
    if (!noun && kannPerson) noun = pick(opts.personen.filter(x => !x.plural), rnd);
    if (!noun) return null;
    const det = noun.bare ? 'none' : 'def';
    return { de: withPrep(po.p, np(noun, po.k, { det, plural: !!noun.plural }), true).join(' '), noun, p: po.p, k: po.k,
      zeig: `${po.p} + ${noun.bare ? '' : (noun.plural ? 'die' : noun.art) + ' '}${noun.plural ? noun.plf || noun.lemma : noun.lemma}${noun.bare ? ' (artikelsiz)' : ''}` };
  }
  function reflAufgabe(v, rnd, opts) {
    rnd = rnd || Math.random;
    const obj = reflObjekt(v, rnd, opts);
    const po = obj ? [obj.de] : [];
    const nur3 = NUR_3.includes(v.base);
    const plur = v.base === 'einigen';
    const pool = nur3 ? ['er', 'sie', 'sie_pl'] : plur ? ['wir', 'ihr', 'sie_pl', 'Sie'] : Object.keys(PERS);
    const typs = ['praes', 'praes', 'perf', 'perf'];
    const impOk = IMP_OK.includes(v.base) && !nur3;
    if (impOk) typs.push('imp', 'imp');
    const typ = pick(typs, rnd);
    const es = v.refl === 'D' ? ['es'] : [];
    let pk, satz, tr;
    const alts = [];
    if (typ === 'imp') {
      pk = pick(plur ? ['ihr', 'Sie'] : ['du', 'ihr', 'Sie'], rnd);
      const p = PERS[pk], r = v.refl === 'D' ? p.rD : p.rA;
      let fin;
      if (pk === 'du') fin = imperativDu(v);
      else if (pk === 'ihr') fin = praesens(v, '2pl');
      else fin = praesens(v, '3pl');
      const bau = f => cap((pk === 'Sie' ? [f, 'Sie'] : [f]).concat(es, [r], po, v.pre ? [v.pre] : []).join(' ')) + '!';
      satz = bau(fin);
      // du-emirde -e isteğe bağlı (Beeil dich! / Beeile dich!), e→i değişen fiillerde değil
      if (pk === 'du' && praesensForms(v)[1] === regular(v.base)[1]) alts.push(bau(/e$/.test(fin) ? fin.slice(0, -1) : fin + 'e'));
      tr = 'emir kipi · ' + (pk === 'du' ? 'sen' : pk === 'ihr' ? 'siz (samimi)' : 'siz (resmi)');
    } else {
      pk = pick(pool, rnd);
      const p = PERS[pk], r = v.refl === 'D' ? p.rD : p.rA;
      if (typ === 'praes') {
        satz = [p.nom, praesens(v, p.k)].concat(es, [r], po, v.pre ? [v.pre] : []).join(' ');
        tr = PERS[pk].tr + ' · Präsens';
      } else {
        const aux = praesens({ base: v.aux === 'ist' ? 'sein' : 'haben' }, p.k);
        satz = [p.nom, aux].concat(es, [r], po, [v.p2]).join(' ');
        tr = PERS[pk].tr + ' · Perfekt';
      }
      satz = cap(satz) + '.';
    }
    const p = PERS[pk];
    const erkl = [
      `Dönüşlü zamir (${v.refl === 'D' ? 'Dativ' : 'Akkusativ'}): ${pk === 'Sie' ? 'Sie' : p.nom} → <b>${v.refl === 'D' ? p.rD : p.rA}</b>`,
      v.refl === 'D' ? 'Dativ dönüşlü: mir, dir, sich, uns, euch, sich (nesne Akk: es / den Film …). Akk nesne zamirse zamirden önce gelir: es mir' :
        'Akkusativ dönüşlü: mich, dich, sich, uns, euch, sich',
    ];
    if (typ === 'perf') erkl.push(`Perfekt: ${v.aux === 'ist' ? 'sein' : 'haben'} + ${v.p2} (dönüşlü fiiller çoğunlukla haben alır)`);
    if (typ === 'imp') erkl.push(pk === 'du' ? 'du emir: -st düşer, özne yok (Beeil dich!)' : pk === 'ihr' ? 'ihr emir: ihr-biçimi, özne yok (Beeilt euch!)' : 'Sie emir: fiil + Sie + sich (Beeilen Sie sich!)');
    if (obj) erkl.push(`${obj.p} + ${KASUS_TR[obj.k]} → <b>${obj.de}</b>`);
    if (v.pre) erkl.push(`Ayrılan ön ek sona: … ${v.pre}`);
    // kaynaşmamış edat da kabul (an dem / am)
    if (obj) { const unk = obj.de.replace(/^(am|ans|im|ins|zum|zur|vom|beim)\b/, m => ({ am: 'an dem', ans: 'an das', im: 'in dem', ins: 'in das', zum: 'zu dem', zur: 'zu der', vom: 'von dem', beim: 'bei dem' }[m])); if (unk !== obj.de) alts.push(satz.replace(obj.de, unk)); }
    return { satz, alts, tr, typ, pk, erkl, esHinweis: v.refl === 'D', objZeig: obj && obj.zeig };
  }

  // ---------- Goethe örnek cümlesinden boşluk ----------
  function verbFormen(v) {
    const s = new Set();
    if (!v.pre && ['sein', 'haben', 'werden'].includes(v.base)) return s;
    praesensForms(v).forEach(f => s.add(f));
    if (v.pt3) praeteritumForms(v.pt3.split('/')[0].split(' ')[0]).forEach(f => s.add(f));
    return s;
  }
  function luecke(v, satz) {
    const toks = satz.split(/\s+/);
    const clean = t => t.replace(/^[„“"(]+|[.,!?;:“"”)…]+$/g, '');
    const finite = verbFormen(v);
    const whole = new Set([v.inf, v.p2, v.pre ? v.pre + 'zu' + v.base : 'zu ' + v.base].filter(Boolean));
    if (v.pre && !v.sp) finite.forEach(f => whole.add(v.pre + f));
    const hits = [];
    toks.forEach((t, i) => {
      const c = clean(t);
      const lc = i === 0 ? c.charAt(0).toLowerCase() + c.slice(1) : c;
      if (whole.has(c) || whole.has(lc)) hits.push(i);
      else if (!v.pre && (finite.has(c) || finite.has(lc))) hits.push(i);
      else if (v.pre && !v.sp && (finite.has(c) || finite.has(lc))) {
        const j = toks.findIndex((t2, j2) => j2 > i && clean(t2) === v.pre);
        if (j > i) { hits.push(i); hits.push(j); }
      }
    });
    const uniq = [...new Set(hits)].sort((a, b) => a - b);
    if (!uniq.length) return null;
    const answer = uniq.map(i => clean(toks[i])).join(' ');
    const text = toks.map((t, i) => uniq.includes(i) ? t.replace(clean(t), '_____') : t).join(' ');
    return { text, answer, n: uniq.length };
  }

  // ---------- Cevap kontrolü ----------
  function norm(s) {
    return s.replace(/[„“"«»”]/g, '').replace(/\s+/g, ' ').trim()
      .replace(/\s*[.!?]+$/, '').replace(/\s+([,?.!])/g, '$1');
  }
  const firstLow = s => s.charAt(0).toLowerCase() + s.slice(1);
  const fold = s => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  const toks = s => norm(s).replace(/,/g, ' ,').split(' ').filter(Boolean);

  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }

  // Token-LCS: [{op:'eq'|'del'|'ins', t}]  (del = hedefte var, kullanıcıda yok; ins = kullanıcı fazladan)
  function diff(user, target) {
    const a = user, b = target;
    const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { out.push({ op: 'eq', t: a[i] }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ op: 'ins', t: a[i] }); i++; }
      else { out.push({ op: 'del', t: b[j] }); j++; }
    }
    while (i < a.length) out.push({ op: 'ins', t: a[i++] });
    while (j < b.length) out.push({ op: 'del', t: b[j++] });
    return out;
  }

  const FUNKTION = /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein\w*|mein\w*|dein\w*|sein\w*|ihr\w*|unser\w*|eur\w*|Ihr\w*|mich|dich|sich|uns|euch|mir|dir|ihm|ihn|ihnen|Ihnen|am|im|zum|zur|vom|beim|ans|ins)$/;
  const PRAEP = /^(an|auf|in|über|unter|vor|hinter|neben|zwischen|mit|nach|zu|von|bei|aus|seit|für|um|gegen|ohne|durch)$/;

  // Kategorisiert Fehler für Log & Analyse
  function pruefen(input, ziel, alts) {
    const cands = [ziel].concat(alts || []);
    const u = norm(input);
    for (const c of cands) {
      const n = norm(c);
      if (u === n || firstLow(u) === firstLow(n)) return { urteil: 'richtig', ziel: c, tags: [], diff: diff(toks(u), toks(n)) };
    }
    // en yakın aday
    let best = cands[0], bestD = Infinity;
    cands.forEach(c => { const d = lev(toks(u), toks(c)); if (d < bestD) { bestD = d; best = c; } });
    const ut = toks(u), zt = toks(best);
    const df = diff(ut, zt);
    const tags = new Set();
    let urteil = 'falsch';
    if (fold(u) === fold(norm(best))) {
      tags.add(u.toLowerCase() === norm(best).toLowerCase() ? 'groß/klein' : 'umlaut/ß');
      urteil = 'fast';
    } else {
      const dels = df.filter(x => x.op === 'del').map(x => x.t);
      const ins = df.filter(x => x.op === 'ins').map(x => x.t);
      if (ut.length === zt.length && [...ut].sort().join(' ') === [...zt].sort().join(' ')) tags.add('kelime sırası');
      dels.forEach(t => {
        if (/^(sich|mich|dich|uns|euch|mir|dir)$/.test(t) && !ins.some(x => /^(sich|mich|dich|uns|euch|mir|dir)$/.test(x))) tags.add('dönüşlü zamir');
        else if (PRAEP.test(t)) tags.add('edat');
        else if (FUNKTION.test(t)) tags.add('artikel/çekim');
        else if (/^(hat|habe|hast|haben|habt|ist|bin|bist|sind|seid)$/.test(t)) tags.add('yardımcı fiil');
        else if (t === 'nicht') tags.add('nicht');
      });
      // aynı kök, farklı son → çekim hatası
      dels.forEach(t => ins.forEach(x => {
        if (x !== t && x.length > 2 && t.slice(0, 3).toLowerCase() === x.slice(0, 3).toLowerCase()) {
          if (fold(x) === fold(t)) tags.add('umlaut/ß'); else tags.add('artikel/çekim');
        }
      }));
      const nonTrivial = dels.length + ins.length;
      if (nonTrivial === 2 && dels.length === 1 && !FUNKTION.test(dels[0]) && !PRAEP.test(dels[0]) &&
          lev(dels[0].toLowerCase(), ins[0].toLowerCase()) === 1 && !tags.has('artikel/çekim')) {
        tags.add('yazım'); urteil = 'fast';
      }
      if (!tags.size) tags.add(dels.length && !ins.length ? 'eksik kelime' : 'farklı');
    }
    return { urteil, ziel: best, tags: [...tags], diff: df };
  }

  const api = {
    PERS, NAMEN, MODAL, IRR, praesens, praesensForms, praeteritumForms, regular, stemOf,
    np, pluralForm, umlaut, withPrep, woWort, bauen, uebung, luecke, pruefen, norm, diff, toks,
    objMuster, KASUS_TR, POSS_TR, PREP_CASE, rahmenAufloesen, ndekAufgabe, reflAufgabe, imperativDu, NUR_3, REFL_AUS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.G = api;
})(this);
