// node tests/test_grammatik.js
const G = require('../js/grammatik.js');
const FSRS = require('../js/fsrs.js');
let fail = 0;
const eq = (a, b, m) => { if (a !== b) { fail++; console.log('✗', m, '\n   bekl:', b, '\n   gelen:', a); } };

// Präsens
const V = (base, p3, extra) => Object.assign({ base, p3, pre: '', sp: '' }, extra || {});
eq(G.praesensForms(V('fahren', 'fährt')).join(','), 'fahre,fährst,fährt,fahren,fahrt,fahren', 'fahren');
eq(G.praesensForms(V('halten', 'hält')).join(','), 'halte,hältst,hält,halten,haltet,halten', 'halten');
eq(G.praesensForms(V('lesen', 'liest')).join(','), 'lese,liest,liest,lesen,lest,lesen', 'lesen');
eq(G.praesensForms(V('arbeiten', 'arbeitet')).join(','), 'arbeite,arbeitest,arbeitet,arbeiten,arbeitet,arbeiten', 'arbeiten');
eq(G.praesensForms(V('ändern', 'ändert')).join(','), 'ändere,änderst,ändert,ändern,ändert,ändern', 'ändern');
eq(G.praesensForms(V('sammeln', 'sammelt')).join(','), 'sammle,sammelst,sammelt,sammeln,sammelt,sammeln', 'sammeln');
eq(G.praesensForms(V('öffnen', 'öffnet')).join(','), 'öffne,öffnest,öffnet,öffnen,öffnet,öffnen', 'öffnen');
eq(G.praesensForms(V('tanzen', 'tanzt')).join(','), 'tanze,tanzt,tanzt,tanzen,tanzt,tanzen', 'tanzen');
eq(G.praesensForms(V('nehmen', 'nimmt')).join(','), 'nehme,nimmst,nimmt,nehmen,nehmt,nehmen', 'nehmen');
eq(G.praesensForms(V('laden', 'lädt')).join(','), 'lade,lädst,lädt,laden,ladet,laden', 'laden');
eq(G.praesensForms(V('treten', 'tritt')).join(','), 'trete,trittst,tritt,treten,tretet,treten', 'treten');
eq(G.praesensForms(V('waschen', 'wäscht')).join(','), 'wasche,wäschst,wäscht,waschen,wascht,waschen', 'waschen');
eq(G.praesensForms(V('lassen', 'lässt')).join(','), 'lasse,lässt,lässt,lassen,lasst,lassen', 'lassen');
eq(G.praesensForms(V('heißen', 'heißt')).join(','), 'heiße,heißt,heißt,heißen,heißt,heißen', 'heißen');
eq(G.praesensForms(V('lernen', 'lernt')).join(','), 'lerne,lernst,lernt,lernen,lernt,lernen', 'lernen');
eq(G.praesensForms(V('atmen', 'atmet')).join(','), 'atme,atmest,atmet,atmen,atmet,atmen', 'atmen');

// NP
const N = (art, lemma, x) => Object.assign({ art, lemma, tr: '?' }, x || {});
eq(G.np(N('der', 'Urlaub'), 'A', { det: 'def' }).join(' '), 'den Urlaub', 'den Urlaub');
eq(G.np(N('der', 'Bruder'), 'D', { det: 'poss', poss: 'du' }).join(' '), 'deinem Bruder', 'deinem Bruder');
eq(G.np(N('die', 'Reise'), 'A', { det: 'poss', poss: 'ihr', adj: 'lang' }).join(' '), 'eure lange Reise', 'eure lange Reise');
eq(G.np(N('das', 'Auto'), 'A', { det: 'indef', adj: 'neu' }).join(' '), 'ein neues Auto', 'ein neues Auto');
eq(G.np(N('der', 'Kollege', { weak: true }), 'D', { det: 'def' }).join(' '), 'dem Kollegen', 'weak');
eq(G.np(N('der', 'Herr', { weak: true }), 'A', { det: 'def' }).join(' '), 'den Herrn', 'Herrn');
eq(G.np(N('das', 'Kind', { plf: 'Kinder' }), 'D', { det: 'def', plural: true }).join(' '), 'den Kindern', 'Dat pl');
eq(G.np(N('der', 'Film'), 'D', { det: 'def', adj: 'teuer' }).join(' '), 'dem teuren Film', 'teuer');
eq(G.pluralForm('Bahnhof', '¨-e'), 'Bahnhöfe', 'plural uml');
eq(G.pluralForm('Haus', '¨-er'), 'Häuser', 'plural Haus');
eq(G.pluralForm('Vater', '¨-'), 'Väter', 'plural Vater');
eq(G.withPrep('zu', ['der', 'Ärztin'], true).join(' '), 'zur Ärztin', 'zur');

// Satz
const freuen = { anz: 'sich freuen auf', inf: 'freuen', base: 'freuen', pre: '', sp: '', p3: 'freut', aux: 'hat', p2: 'gefreut', refl: 'A', obj: [{ p: 'auf', k: 'A' }] };
const anrufen = { anz: 'anrufen', inf: 'anrufen', base: 'rufen', pre: 'an', sp: '', p3: 'ruft', aux: 'hat', p2: 'angerufen', refl: '', obj: [{ k: 'A' }] };
const reise = N('die', 'Reise');
const S = cfg => G.bauen(cfg);
eq(S({ v: freuen, subj: { pk: 'wir' }, tempus: 'perf', typ: 'aussage', neg: true, objs: [{ slot: freuen.obj[0], noun: reise, det: 'def' }] }).de,
  'Wir haben uns nicht auf die Reise gefreut.', 'perf neg refl');
eq(S({ v: freuen, subj: { pk: 'du' }, tempus: 'praes', typ: 'frage', objs: [{ slot: freuen.obj[0], noun: reise, det: 'def' }] }).de,
  'Freust du dich auf die Reise?', 'frage');
eq(S({ v: freuen, subj: { pk: 'du' }, tempus: 'perf', typ: 'wfrage', wIdx: 0, objs: [{ slot: freuen.obj[0], noun: reise, det: 'def' }] }).de,
  'Worauf hast du dich gefreut?', 'wfrage');
eq(S({ v: freuen, subj: { pk: 'ich' }, tempus: 'modal', modal: 'können', typ: 'neben', konj: 'weil', objs: [{ slot: freuen.obj[0], noun: reise, det: 'def' }] }).de,
  'weil ich mich auf die Reise freuen kann', 'neben modal');
eq(S({ v: anrufen, subj: { pk: 'ich' }, tempus: 'praes', typ: 'aussage', zeit: { de: 'morgen' }, objs: [{ slot: anrufen.obj[0], pron: 'du' }] }).de,
  'Morgen rufe ich dich an.', 'inversion sep');
eq(S({ v: anrufen, subj: { pk: 'ich' }, tempus: 'praes', typ: 'neben', konj: 'weil', neg: true, objs: [{ slot: anrufen.obj[0], pron: 'du' }] }).de,
  'weil ich dich nicht anrufe', 'neben sep neg');
const r = S({ v: freuen, subj: { name: 'Anna', k: '3sg', pk: 'sie' }, tempus: 'praes', typ: 'aussage', zeit: { de: 'heute' }, objs: [{ slot: freuen.obj[0], noun: reise, det: 'def' }] });
eq(r.de, 'Heute freut sich Anna auf die Reise.', 'name');
eq(r.alts.includes('Heute freut Anna sich auf die Reise.'), true, 'name alt');

eq(G.np(N('der', 'Nachbar', { weak: true }), 'D', { det: 'poss', poss: 'du' }).join(' '), 'deinem Nachbarn', 'Nachbarn');
eq(G.np(N('die', 'Eltern'), 'D', { det: 'poss', poss: 'er', plural: true }).join(' '), 'seinen Eltern', 'Eltern Dat');

// Prüfen
eq(G.pruefen('wir haben uns nicht auf die Reise gefreut', 'Wir haben uns nicht auf die Reise gefreut.').urteil, 'richtig', 'richtig');
eq(G.pruefen('Wir haben nicht auf die Reise gefreut.', 'Wir haben uns nicht auf die Reise gefreut.').tags.includes('dönüşlü zamir'), true, 'refl tag');
eq(G.pruefen('Wir haben uns nicht auf die Reise gefreut', 'Wir haben uns nicht auf den Reise gefreut.').urteil, 'falsch', 'artikel');
eq(G.pruefen('Ich fahre nach Munchen', 'Ich fahre nach München.').urteil, 'fast', 'umlaut');

// Lücke
const abfahren = { inf: 'abfahren', base: 'fahren', pre: 'ab', sp: '', p3: 'fährt', pt3: 'fuhr', p2: 'abgefahren' };
eq(G.luecke(abfahren, 'Wann fährt der Zug ab?').answer, 'fährt ab', 'luecke sep');
eq(G.luecke(abfahren, 'Der Zug ist schon abgefahren.').answer, 'abgefahren', 'luecke p2');

// n-Deklination, Genitiv
eq(G.np(N('der', 'Name', { weak: true, gen: 'Namens' }), 'G', { det: 'def' }).join(' '), 'des Namens', 'Genitiv Namens');
eq(G.np(N('der', 'Student', { weak: true, gen: 'Studenten' }), 'A', { det: 'indef' }).join(' '), 'einen Studenten', 'einen Studenten');
eq(G.np(N('der', 'Lehrer', { gen: 'Lehrers' }), 'D', { det: 'poss', poss: 'ich' }).join(' '), 'meinem Lehrer', 'kein n bei Lehrer');
eq(G.np(N('der', 'Arzt', { gen: 'Arztes' }), 'G', { det: 'def' }).join(' '), 'des Arztes', 'des Arztes');

// Dönüşlü: emir kipi
const IV = (base, p3, x) => Object.assign({ base, p3, pre: '', sp: '' }, x || {});
eq(G.imperativDu(IV('beeilen', 'beeilt')), 'beeil', 'beeil dich');
eq(G.imperativDu(IV('beruhigen', 'beruhigt')), 'beruhige', 'beruhige dich');
eq(G.imperativDu(IV('bewerben', 'bewirbt')), 'bewirb', 'bewirb dich');
eq(G.imperativDu(IV('sehen', 'sieht', { pre: 'an' })), 'sieh', 'sieh es dir an');
eq(G.imperativDu(IV('konzentrieren', 'konzentriert')), 'konzentrier', 'konzentrier dich');
eq(G.imperativDu(IV('kümmern', 'kümmert')), 'kümmere', 'kümmere dich');
eq(G.imperativDu(IV('ziehen', 'zieht', { pre: 'an' })), 'zieh', 'zieh dich an');
eq(G.imperativDu(IV('lesen', 'liest')), 'lies', 'lies');

// FSRS
let c = FSRS.review({}, 3, 0);
eq(Math.round(c.S * 100) / 100, 2.31, 'S0 good');
const c2 = FSRS.review(c, 3, c.due);
eq(c2.S > c.S * 2, true, 'S wächst');
const c3 = FSRS.review(c2, 1, c2.due);
eq(c3.S < c2.S, true, 'lapse');

console.log(fail ? `\n${fail} hata` : 'tüm testler geçti');
process.exit(fail ? 1 : 0);
