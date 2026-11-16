// Loads engine.js + guided/content.js under Node and recomputes every expected value in closed form,
// without the engine: fixed stations once, the personal station for 3000 names.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = process.argv[2];
const win = {};
const sb = { window: win, console, Math, Number, String, JSON, Array, Object, Error, isNaN };
vm.createContext(sb);
for (const f of ['engine.js', 'guided/content.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb, { filename: f });
const C = win.GuidedContent;
const { sqrt, atan, PI, hypot } = Math, DEG = 180 / PI;
let bad = 0, n = 0;
function eq(id, got, want, tol = 1e-6) { n++; if (!(Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)))) { bad++; console.log('MISMATCH', id, got, want); } }
const idx = (A) => { const by = {}; A.stations.forEach((st) => st.steps.forEach((sp) => { by[sp.id] = sp; })); return by; };

const A0 = C.build(C.makePersonal('בדיקה ראשונה')), b = idx(A0);
// station 1: R = 30, L = 40 mH, w = 1000, U = 10
eq('s1-xl', b['s1-xl'].expected, 40); eq('s1-z', b['s1-z'].expected, 50); eq('s1-i', b['s1-i'].expected, 200);
// station 2: R = 50, L = 0.1 H, C = 1 uF, U = 10
const f0 = 1 / (2 * PI * sqrt(0.1 * 1e-6));
eq('s2-f0', b['s2-f0'].expected, f0); eq('s2-imax', b['s2-imax'].expected, 200);
// station 3: 2025 Q2 - R = 480, XL = 140, u(t) = 25*sqrt2*sin(2000t)
eq('s3-ueff', b['s3-ueff'].expected, 25); eq('s3-omega', b['s3-omega'].expected, 2000); eq('s3-l', b['s3-l'].expected, 140 / 2000 * 1000);
eq('s3-z', b['s3-z'].expected, 500); eq('s3-phi', b['s3-phi'].expected, atan(140 / 480) * DEG); eq('s3-i', b['s3-i'].expected, 50);
eq('s3-ur', b['s3-ur'].expected, 24); eq('s3-ul', b['s3-ul'].expected, 7); eq('s3-i3', b['s3-i3'].expected, 25 / hypot(480, 420) * 1000);
// station 4: 2021 Q2 - R = 80, XC = 150, u(t) = 17*sqrt2*sin(8*pi*1e3*t)
eq('s4-f', b['s4-f'].expected, 4000); eq('s4-t', b['s4-t'].expected, 0.25); eq('s4-c', b['s4-c'].expected, 1e9 / (8000 * PI * 150));
eq('s4-z', b['s4-z'].expected, 170); eq('s4-i', b['s4-i'].expected, 100); eq('s4-ur', b['s4-ur'].expected, 8); eq('s4-uc', b['s4-uc'].expected, 15);
eq('s4-phi', b['s4-phi'].expected, -atan(150 / 80) * DEG);

let pts = 0, steps = 0; const per = {};
A0.stations.forEach((st) => { per[st.id] = 0; st.steps.forEach((sp) => { pts += sp.pts; steps++; per[st.id] += sp.pts; }); });
console.log('steps', steps, 'points', pts, JSON.stringify(per));

const seen = {}; let nInd = 0;
for (let i = 0; i < 3000; i++) {
  const name = 'תלמיד ' + i + ' משפחה' + (i * 7 % 13);
  const P = C.makePersonal(name), p = idx(C.build(P));
  const L = P.L_mH / 1000, Cf = P.C_uF * 1e-6, XL = P.omega * L, XC = 1 / (P.omega * Cf), Z = hypot(P.R, XL), I = P.U / Z;
  eq('p-xl', p['s5-xl'].expected, XL); eq('p-z', p['s5-z'].expected, Z); eq('p-i', p['s5-i'].expected, I * 1000);
  eq('p-phi', p['s5-phi'].expected, atan(XL / P.R) * DEG); eq('p-ul', p['s5-ul'].expected, I * XL);
  eq('p-xc', p['s5-xc'].expected, XC); eq('p-zb', p['s5-zb'].expected, hypot(P.R, XL - XC));
  eq('p-f0', p['s5-f0'].expected, 1 / (2 * PI * sqrt(L * Cf))); eq('p-ires', p['s5-ires'].expected, P.U / P.R * 1000);
  const right = p['s5-char'].options.findIndex((o) => o.correct);
  if (right !== (XL > XC ? 0 : 1)) { bad++; console.log('wrong character option', P); }
  if (XL > XC) nInd++;
  // the question must be well posed: not at resonance, sensible sizes, and distinct answers a student could confuse
  if (Math.abs(XL - XC) / XL < 0.2) { bad++; console.log('too close to resonance', P); }
  if (P.U < 5 || P.U > 60 || I * 1000 < 10) { bad++; console.log('odd source or current', P); }
  const P2 = C.makePersonal('  ' + name.toUpperCase() + '  ');
  if (JSON.stringify(P2) !== JSON.stringify(P)) { bad++; console.log('not deterministic'); }
  seen[[P.R, P.L_mH, P.omega, P.U, P.C_uF].join('|')] = 1;
}
console.log('distinct personal circuits in 3000 names:', Object.keys(seen).length, '| inductive after adding C:', nInd, 'of 3000');
console.log('checks', n, 'mismatches', bad);
process.exit(bad ? 1 : 0);
