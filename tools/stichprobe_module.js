// n-Deklination ve dönüşlü fiil alıştırmalarından örnek üretir (gözle kontrol).
// node tools/stichprobe_module.js [ndek|refl|imp]
const fs = require('fs');
const G = require('../js/grammatik.js');
global.window = {};
eval(fs.readFileSync(__dirname + '/../daten/verben.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/../daten/nomen.js', 'utf8'));
let seed = 3;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const was = process.argv[2] || 'ndek';
if (was === 'ndek') {
  for (const n of window.NOMEN.liste.filter(n => !n.skip && (n.weak || n.falle))) {
    const out = [];
    for (let i = 0; i < 3; i++) { const a = G.ndekAufgabe(n, rnd); out.push(a.satz); }
    console.log(`${(n.art + ' ' + n.lemma).padEnd(20)} ${out.join(' | ')}`);
  }
} else if (was === 'imp') {
  for (const v of window.VERBEN.filter(v => v.refl)) console.log(v.anz.padEnd(26), G.imperativDu(v));
} else {
  const byId = Object.fromEntries(window.NOMEN.liste.map(n => [n.id, n]));
  const personen = window.NOMEN.personen.map(r => Object.assign({}, byId[r.id], r, { person: true }));
  for (const v0 of window.VERBEN.filter(v => v.refl && !G.REFL_AUS.includes(v.base))) {
    const v = G.rahmenAufloesen(v0, byId);
    const out = [];
    for (let i = 0; i < 4; i++) out.push(G.reflAufgabe(v, rnd, { personen }).satz);
    console.log(`${v.anz.padEnd(26)} ${out.join(' | ')}`);
  }
}
