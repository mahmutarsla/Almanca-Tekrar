// Her kalıplı fiil için rastgele cümleler üretir (gözle kontrol için).
// node tools/stichprobe.js [adet] [tohum]
const fs = require('fs');
const G = require('../js/grammatik.js');
global.window = {};
eval(fs.readFileSync(__dirname + '/../daten/verben.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/../daten/nomen.js', 'utf8'));
const { VERBEN, NOMEN } = window;
const byId = Object.fromEntries(NOMEN.liste.map(n => [n.id, n]));
const personen = NOMEN.personen.map(r => Object.assign({}, byId[r.id], r, { person: true }));
const opts = { personen, adjSache: NOMEN.adjSache.map(a => a.de), adjPerson: NOMEN.adjPerson.map(a => a.de) };
let seed = +(process.argv[3] || 7);
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const n = +(process.argv[2] || 2);
for (const v of VERBEN) {
  if (!v.rahmen) continue;
  const vv = G.rahmenAufloesen(v, byId);
  for (let i = 0; i < n; i++) {
    const u = G.uebung(vv, i % 4, rnd, opts);
    console.log(`${v.anz.padEnd(26)} ${u.de}`);
  }
}
