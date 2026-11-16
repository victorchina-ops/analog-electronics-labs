/**
 * guided/content.js - the guided bagrut activity for unit U3 (AC: series RL, RC, RLC and resonance).
 *
 * Five stations. Stations 1-2 are a reminder with the simulator open (meters, phasors, a frequency
 * slider); stations 3-4 walk through two original bagrut questions (815381: 2025 Q2 - RL, 2021 Q2 - RC)
 * in "compute mode": the panel shows the circuit and an impedance triangle drawn to scale, and every
 * value the student finds is written onto it; station 5 is a question of the same kind with personal
 * values derived from the name (RL, then a capacitor is added: RLC and resonance).
 *
 * No number is typed by hand: every expected value comes from ACEngine.solveACCircuit when the page
 * loads, and tools/check_guided.js recomputes all of them independently in closed form.
 *
 * BiDi: every formula, number with a unit and Latin term goes through L() / T() (isolated LTR <bdi>).
 */
(function (global) {
  'use strict';

  const E = global.ACEngine;
  const L = E.L;
  const T = E.T;

  const f2 = (x) => { const v = Number(Number(x).toFixed(2)); return (Object.is(v, -0) ? 0 : v).toFixed(2); };
  const g = (x) => String(Number(Number(x).toFixed(3)));          // 480, 2.5, 0.07: no trailing zeros
  const g2 = (x) => String(Number(Number(x).toFixed(2)));
  const DEG = 180 / Math.PI;

  const SKILLS = {
    source: 'קריאת נתוני המקור',
    reactance: 'היגב XL ו-XC',
    findLC: 'מציאת L או C',
    impedance: 'עכבה Z',
    current: 'הזרם במעגל',
    voltages: 'מתחים על הרכיבים',
    phase: 'זווית מופע ואופי המעגל',
    freq: 'השפעת שינוי התדר',
    resonance: 'תהודה',
    read: 'קריאה מהסימולטור'
  };

  const solve = (cfg) => E.solveACCircuit(cfg);

  // ---------------------------------------------------------------- formula sheet (always free)
  const FORMULAS = {
    rows: [
      { f: 'u(t) = Um · sin(ω · t)', what: `ביטוי המקור. ${L('Um = Ueff · √2')}: המספר שלפני ${L('√2')} הוא הערך היעיל`, when: 'תמיד קוראים קודם את נתוני המקור' },
      { f: 'ω = 2π · f  ;  T = 1 / f', what: 'תדירות זוויתית, תדירות וזמן מחזור', when: `${L('ω')} הוא המספר שמכפיל את ${L('t')}` },
      { f: 'XL = ω · L', what: 'היגב המשרן: גדל כשהתדר עולה', when: `ומכאן ${L('L = XL / ω')}` },
      { f: 'XC = 1 / (ω · C)', what: 'היגב הקבל: קטן כשהתדר עולה', when: `ומכאן ${L('C = 1 / (ω · XC)')}` },
      { f: 'Z = √(R² + X²)  ;  X = XL - XC', what: 'עכבת מעגל טורי: חיבור בזווית ישרה, לא חיבור רגיל', when: `ב-${T('RL')}: ${L('X = XL')}. ב-${T('RC')}: ${L('X = -XC')}` },
      { f: 'I = U / Z', what: 'חוק אוהם בזרם חילופין, בערכים יעילים', when: 'אחרי שמצאתם את העכבה' },
      { f: 'UR = I · R  ;  UL = I · XL  ;  UC = I · XC', what: 'המתח על כל רכיב', when: `בדיקה: ${L('U = √(UR² + (UL - UC)²)')}` },
      { f: 'φ = tan⁻¹(X / R)', what: 'הפרש המופע בין מתח המקור לזרם', when: 'חיובי: אופי השראי, המתח מקדים. שלילי: אופי קיבולי, הזרם מקדים' },
      { f: 'f0 = 1 / (2π · √(L · C))', what: `תדר התהודה: ${L('XL = XC')}, ${L('Z = R')} והזרם מרבי`, when: `רק במעגל שיש בו גם ${L('L')} וגם ${L('C')}` }
    ],
    compareTitle: 'שלושת המעגלים הטוריים זה מול זה',
    compare: [
      ['', `${T('RL')}`, `${T('RC')}`, `${T('RLC')}`],
      ['ההיגב השקול', `${L('X = XL')}`, `${L('X = -XC')}`, `${L('X = XL - XC')}`],
      ['מי מקדים', 'המתח מקדים את הזרם', 'הזרם מקדים את המתח', `תלוי בסימן של ${L('X')}`],
      ['כשהתדר עולה', 'העכבה גדלה, הזרם קטן', 'העכבה קטנה, הזרם גדל', 'הזרם מרבי בתדר התהודה']
    ],
    tableTitle: 'שלשות שחוזרות בבגרות',
    table: [['R , X', '3 , 4', '5 , 12', '8 , 15', '7 , 24'], ['Z', '5', '13', '17', '25']],
    noteHe: 'מדי מתח ומדי זרם מראים ערכים יעילים. המחשבון חייב להיות במצב מעלות כשמחשבים זווית.'
  };

  // ---------------------------------------------------------------- personal values (station 5)
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const normName = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [24, 7, 25], [7, 24, 25]];   // R, XL, Z
  const SCALES = [10, 20, 40];
  const OMEGAS = [1000, 2000, 5000];
  const CURRENTS_mA = [20, 40, 50, 100];
  const XC_RATIOS = [0.25, 0.5, 2, 4];             // XC / XL at the given frequency: never 1, so never at resonance

  /** Deterministic: the same name always gets the same circuit, on every device. */
  function makePersonal(fullName) {
    const seed = hashSeed('u3-ac-guided-v1|' + normName(fullName));
    const r = rng(seed);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const tr = pick(TRIPLES), k = pick(SCALES), omega = pick(OMEGAS);
    const R = tr[0] * k, XL = tr[1] * k, Z = tr[2] * k;
    const okI = CURRENTS_mA.filter((i) => { const u = Z * i / 1000; return u >= 5 && u <= 60; });
    const I_mA = pick(okI.length ? okI : [20]);
    const U = Number((Z * I_mA / 1000).toFixed(3));
    const L_mH = Number((XL / omega * 1000).toFixed(3));
    const ratio = pick(XC_RATIOS);
    const C_uF = Number((1e6 / (omega * XL * ratio)).toPrecision(3));      // a round, printable capacitor
    return { seed, R, L_mH, omega, U, C_uF };
  }

  // ---------------------------------------------------------------- small builders
  const sol3 = (f, s, r) => ({ f, s, r });
  const hint = (cost, html) => ({ cost, html });
  const opt = (html, fb, correct) => ({ html, fb, correct: Boolean(correct) });
  const trap = (val, msgHtml) => ({ val, msgHtml });

  // ================================================================ the activity
  function build(personal) {
    const P = personal;

    // ---------- station 1: R and L in AC ----------
    const C1 = { topology: 'RL', inputMode: 'components', freqMode: 'omega', omega: 1000, Ueff: 10, R_ohm: 30, L_H: 0.04 };
    const a1 = solve(C1);
    const open1 = (extra) => Object.assign({ cfg: C1, mode: 'open', second: 'phasors', fRange: [30, 1500] }, extra || {});
    const s1 = {
      id: 's1', short: 'חימום', title: 'חימום: נגד וסליל בזרם חילופין', img: 'st-dynamo',
      introHe: 'חמש דקות של תזכורת. כאן הסימולטור פתוח לגמרי: מזיזים את התדר וקוראים את המדים.',
      steps: [
        {
          id: 's1-idea', type: 'info', titleHe: 'הרעיון בתמונה אחת', img: 'st-coil',
          bodyHe: `<p>בזרם חילופין גם סליל וגם קבל מתנגדים לזרם, אבל ההתנגדות שלהם תלויה בתדר. קוראים לה <b>היגב</b>:</p>
            <div class="eq">${L('XL = ω · L')}</div>
            <p>ככל שהתדר גבוה יותר, הסליל מתנגד יותר. הנגד, לעומתו, לא מושפע מהתדר.</p>
            <p>במעגל טורי ההתנגדות הכוללת נקראת <b>עכבה</b>, והיא מחושבת בפיתגורס ולא בחיבור רגיל:</p>
            <div class="eq">${L('Z = √(R² + XL²)')}</div>`,
          sim: open1()
        },
        {
          id: 's1-move', type: 'sim', task: 'f-change', titleHe: 'מזיזים את התדר',
          bodyHe: `<p>בסימולטור: נגד ${L('R = 30 Ω')} וסליל ${L('L = 40 mH')} בטור, מקור ${L('U = 10 V')}.</p>
            <p class="do">גררו את מחוון התדר ימינה ושמאלה, והביטו במד הזרם ובהיגב ${L('XL')}.</p>`,
          taskWaitHe: 'ממתין: הזיזו את מחוון התדר...', taskDoneHe: 'התדר שונה ✓',
          sim: open1({ free: true, check: { kind: 'changed', by: 0.3 } })
        },
        {
          id: 's1-trend', type: 'mc', skill: 'freq', pts: 2, titleHe: 'מה קורה כשהתדר עולה?',
          bodyHe: `<p class="ask">כשמעלים את התדר במעגל ${T('RL')} הזה, מה קורה?</p>`,
          options: [
            opt(`${L('XL')} גדל, העכבה גדלה והזרם קטן`, `נכון. ${L('XL = ω · L')} עולה עם התדר, ולכן הסליל "חוסם" יותר.`, true),
            opt(`${L('XL')} קטן, העכבה קטנה והזרם גדל`, `זו התנהגות של קבל. בסליל ההיגב עולה עם התדר.`),
            opt('שום דבר: נגד וסליל לא מושפעים מהתדר', `הנגד באמת לא מושפע, אבל היגב הסליל תלוי בתדר.`)
          ],
          sim: open1({ free: true })
        },
        {
          id: 's1-xl', type: 'num', skill: 'reactance', pts: 2, titleHe: 'היגב הסליל',
          bodyHe: `<p>הסימולטור חזר לתדר של השאלה: ${L('ω = 1000 rad/s')}.</p><p class="ask">חשבו את היגב הסליל ${L('XL')}.</p>`,
          unit: 'Ω', expected: a1.XL_ohm,
          traps: [trap(40000, `שכחתם להמיר: ${L('40 mH = 0.04 H')}.`)],
          hints: [hint(1, `${L('XL = ω · L = 1000 · 0.04')}`)],
          solution: [sol3('XL = ω · L', 'XL = 1000 rad/s · 0.04 H', 'XL = 40 Ω')],
          sim: open1()
        },
        {
          id: 's1-z', type: 'num', skill: 'impedance', pts: 2, titleHe: 'העכבה',
          bodyHe: `<p class="ask">חשבו את עכבת המעגל ${L('Z')}.</p>`,
          unit: 'Ω', expected: a1.Z_ohm,
          traps: [trap(70, `חיברתם ${L('30 + 40')}. נגד והיגב מתחברים בזווית ישרה: ${L('Z = √(R² + XL²)')}.`)],
          hints: [hint(1, `${L('Z = √(30² + 40²)')}`)],
          solution: [sol3('Z = √(R² + XL²)', 'Z = √(30² + 40²)', 'Z = 50 Ω')],
          sim: open1()
        },
        {
          id: 's1-i', type: 'num', skill: 'read', pts: 2, titleHe: 'קוראים את מד הזרם',
          bodyHe: `<p class="ask">מה מראה מד הזרם? קראו מהסימולטור, או חשבו ${L('I = U / Z')}.</p>`,
          unit: 'mA', expected: a1.Ieff_mA, tolAbs: 3,
          traps: [trap(0.2, `זה הערך באמפר. התשובה מבוקשת ב-${L('mA')}.`)],
          hints: [hint(1, `${L('I = U / Z = 10 / 50 = 0.2 A')}, כלומר ${L('200 mA')}`)],
          solution: [sol3('I = U / Z', 'I = 10 V / 50 Ω', 'I = 0.2 A = 200 mA')],
          sim: open1()
        },
        {
          id: 's1-sum', type: 'mc', skill: 'voltages', pts: 2, titleHe: 'שישה ועוד שמונה הם עשרה?',
          bodyHe: `<p>מדי המתח מראים ${L('UR = ' + g2(a1.UR) + ' V')} ו-${L('UL = ' + g2(a1.UL) + ' V')}. יחד זה ${L('14 V')}, אבל המקור מספק רק ${L('10 V')}.</p><p class="ask">איך זה ייתכן?</p>`,
          options: [
            opt('שני המתחים לא מגיעים לשיא באותו רגע: יש ביניהם הפרש מופע של 90 מעלות, ולכן מחברים אותם כמחוגים', `נכון: ${L('U = √(6² + 8²) = 10 V')}. הביטו בדיאגרמת המחוגים בסימולטור.`, true),
            opt('מדי המתח לא מדויקים בזרם חילופין', 'המדים מדויקים ומראים ערכים יעילים. ההסבר הוא הפרש המופע.'),
            opt('חלק מהמתח הולך לאיבוד בחוטים', 'אין איבוד: חוק קירכהוף נכון בכל רגע, אבל לערכים הרגעיים ולא לערכים היעילים.')
          ],
          sim: open1()
        }
      ]
    };

    // ---------- station 2: frequency, character, resonance ----------
    const C2 = { topology: 'RLC', inputMode: 'components', freqMode: 'f', f_Hz: 1000, Ueff: 10, R_ohm: 50, L_H: 0.1, C_F: 1e-6 };
    const a2 = solve(C2);
    const res2 = solve(Object.assign({}, C2, { f_Hz: a2.f0_Hz }));
    const open2 = (extra) => Object.assign({ cfg: C2, mode: 'open', second: 'sweep', fRange: [100, 1600], free: true, keepFreq: true }, extra || {});
    const s2 = {
      id: 's2', short: 'תהודה', title: 'תדר, אופי המעגל ותהודה', img: 'st-radio',
      introHe: `מוסיפים קבל. עכשיו יש שני היגבים שמושכים לכיוונים הפוכים.`,
      steps: [
        {
          id: 's2-idea', type: 'info', titleHe: 'סליל מול קבל', img: 'st-swing',
          bodyHe: `<p>במעגל ${T('RLC')} טורי שני ההיגבים פועלים זה נגד זה:</p>
            <div class="eq">${L('X = XL - XC')}</div>
            <ul><li>בתדר גבוה ${L('XL')} גדול: אופי <b>השראי</b>, המתח מקדים את הזרם.</li>
            <li>בתדר נמוך ${L('XC')} גדול: אופי <b>קיבולי</b>, הזרם מקדים את המתח.</li></ul>
            <p>ובאמצע יש תדר אחד שבו הם מבטלים זה את זה. זו <b>תהודה</b>, כמו נדנדה שדוחפים בדיוק בקצב שלה: הזרם מגיע לשיא.</p>`,
          sim: open2()
        },
        {
          id: 's2-low', type: 'sim', task: 'f-low', titleHe: 'יורדים לתדר נמוך',
          bodyHe: `<p>בסימולטור: ${L('R = 50 Ω')}, ${L('L = 100 mH')}, ${L('C = 1 µF')}, מקור ${L('10 V')}.</p>
            <p class="do">הורידו את התדר אל מתחת ל-${L('250 Hz')}, והביטו בשני ההיגבים בלוח המדידות.</p>`,
          taskWaitHe: 'ממתין: הורידו את התדר אל מתחת ל-250Hz...', taskDoneHe: 'הגעתם לתדר נמוך ✓',
          sim: open2({ check: { kind: 'below', f: 250 } })
        },
        {
          id: 's2-char', type: 'mc', skill: 'phase', pts: 2, titleHe: 'מה אופי המעגל בתדר נמוך?',
          bodyHe: `<p class="ask">בתדר נמוך, איזה היגב גדול יותר ומה אופי המעגל?</p>`,
          options: [
            opt(`${L('XC > XL')}: אופי קיבולי, הזרם מקדים את המתח`, `נכון. ${L('XC = 1 / (ω · C)')} גדל כשהתדר יורד.`, true),
            opt(`${L('XL > XC')}: אופי השראי, המתח מקדים את הזרם`, `זה המצב בתדר גבוה. בתדר נמוך היגב הסליל קטן.`),
            opt('שני ההיגבים שווים: המעגל בתהודה', 'הם שווים רק בתדר אחד, תדר התהודה.')
          ],
          sim: open2()
        },
        {
          id: 's2-f0', type: 'num', skill: 'resonance', pts: 3, titleHe: 'מחשבים את תדר התהודה',
          bodyHe: `<p>לפני שמחפשים את התהודה בסימולטור, מנבאים אותה בחישוב. התדר בסימולטור נעול בינתיים.</p><p class="ask">חשבו את תדר התהודה ${L('f0')} של המעגל.</p>`,
          unit: 'Hz', expected: a2.f0_Hz,
          traps: [trap(a2.omega0, `זה ${L('ω0')} ברדיאנים לשנייה. מחלקים ב-${L('2π')} כדי לקבל ${L('f0')}.`)],
          hints: [hint(1, `${L('f0 = 1 / (2π · √(L · C))')}, עם ${L('L = 0.1 H')} ו-${L('C = 1 · 10⁻⁶ F')}`), hint(1, `${L('√(0.1 · 10⁻⁶) = 3.162 · 10⁻⁴')}`)],
          solution: [sol3('f0 = 1 / (2π · √(L · C))', 'f0 = 1 / (2π · √(0.1 H · 1·10⁻⁶ F))', 'f0 = ' + f2(a2.f0_Hz) + ' Hz')],
          sim: open2({ setFreq: 1000, free: false })
        },
        {
          id: 's2-find', type: 'sim', task: 'resonance', titleHe: 'מחפשים את התהודה',
          bodyHe: `<p>עכשיו בודקים את החישוב בניסוי.</p><p class="do">כוונו את התדר אל הערך שחישבתם, ובדקו שהנקודה יושבת על שיא העקומה ושמד הזרם מראה את הערך הגבוה ביותר. כשתפגעו בתהודה הסימולטור יסמן זאת.</p>`,
          taskWaitHe: 'ממתין: כוונו את התדר אל תדר התהודה...', taskDoneHe: 'מצאתם את התהודה ✓',
          afterHe: `בתדר הזה ${L('XL = XC')}: שני ההיגבים מבטלים זה את זה, ונשאר רק הנגד.`,
          sim: open2({ check: { kind: 'resonance', tol: 0.012 } })
        },
        {
          id: 's2-imax', type: 'num', skill: 'read', pts: 2, titleHe: 'הזרם בתהודה',
          bodyHe: `<p class="ask">מהו הזרם במעגל בתדר התהודה? קראו ממד הזרם, או חשבו.</p>`,
          unit: 'mA', expected: res2.Ieff_mA, tolAbs: 4,
          hints: [hint(1, `בתהודה ${L('Z = R')}, ולכן ${L('I = U / R = 10 / 50')}`)],
          solution: [sol3('I = U / R', 'I = 10 V / 50 Ω', 'I = 0.2 A = 200 mA')],
          sim: open2({ setFreq: a2.f0_Hz, free: false })
        },
        {
          id: 's2-facts', type: 'mc', skill: 'resonance', pts: 2, titleHe: 'מה נכון בתהודה?',
          bodyHe: `<p class="ask">איזה משפט נכון למעגל ${T('RLC')} טורי בתהודה?</p>`,
          options: [
            opt(`${L('Z = R')}, הזרם מרבי, והמתח והזרם באותו מופע (${L('φ = 0')})`, 'נכון. המעגל מתנהג כאילו יש בו רק נגד.', true),
            opt(`${L('Z = 0')}, ולכן הזרם אינסופי`, `ההיגבים מתבטלים, אבל הנגד נשאר: ${L('Z = R')}.`),
            opt('העכבה מרבית והזרם מזערי', 'להפך: בתהודה טורית העכבה מזערית והזרם מרבי.')
          ],
          sim: open2({ setFreq: a2.f0_Hz, free: false })
        },
        {
          id: 's2-tools', type: 'info', titleHe: 'ארגז הכלים לבגרות', img: 'formula',
          bodyHe: `<p>מכאן והלאה עובדים כמו בבגרות: מחשבים, מקלידים תשובה, וכל ערך שמצאתם נרשם על משולש העכבות שבסימולטור.</p>
            <p>בכל שלב אפשר לפתוח את <b>דף הנוסחאות</b> (הכפתור למעלה) בלי לאבד נקודות. רמז עולה נקודות, והמחיר כתוב על הכפתור.</p>
            <p>סדר העבודה בכל שאלה: נתוני המקור, היגבים, עכבה, זרם, ורק אז מתחים וזווית.</p>`,
          sim: open2({ setFreq: a2.f0_Hz, free: false })
        }
      ]
    };

    // ---------- station 3: bagrut 2025 Q2 (RL) ----------
    const C3 = { topology: 'RL', inputMode: 'reactances', freqMode: 'omega', omega: 2000, Ueff: 25, R_ohm: 480, XL_ohm: 140 };
    const a3 = solve(C3);
    const C3x = { topology: 'RL', inputMode: 'components', freqMode: 'omega', omega: 6000, Ueff: 25, R_ohm: 480, L_H: a3.L_H };
    const a3x = solve(C3x);
    const comp3 = (extra) => Object.assign({
      cfg: C3, mode: 'compute', given: ['R = 480 Ω', 'XL = 140 Ω', 'u(t) = 25·√2·sin(2000·t) V'],
      sketch: { R: ['R = 480 Ω'], L: ['XL = 140 Ω'], src: ['u(t) = 25·√2·sin(2000·t)'] },
      tri: { R: ['R = 480 Ω'], X: ['XL = 140 Ω'], Z: ['Z', 's3-z', 'Z = 500 Ω'], phi: ['φ', 's3-phi', 'φ = ' + f2(a3.phi_deg) + '°'] }
    }, extra || {});
    const s3 = {
      id: 's3', short: 'בגרות 2025', title: `בגרות 2025, שאלה 2: מעגל ${T('RL')} טורי`, img: 'st-coil',
      introHe: 'שאלה מקורית משאלון 815381, קיץ תשפ"ה. פותרים אותה סעיף אחרי סעיף.',
      question: {
        sourceHe: 'שאלון 815381, קיץ תשפ"ה (2025), שאלה 2',
        figs: [{ src: 'bagrut-2025-q2.png', cap: 'איור לשאלה' }],
        textHe: `<p>באיור מתואר מעגל חשמלי הפועל בזרם חילופין.</p>
          <ol class="heb"><li>חשבו את השראות הסליל ${L('L')}.</li>
          <li>חשבו את עכבת המעגל ואת הפרש המופע בין מתח המקור לזרם במעגל.</li>
          <li>חשבו את המתח על הנגד ואת המתח על הסליל.</li>
          <li>מגדילים את תדירות מקור המתח פי 3. האם הזרם במעגל יקטן או יגדל? נמקו את התשובה בעזרת חישוב.</li></ol>`
      },
      steps: [
        {
          id: 's3-ueff', type: 'num', skill: 'source', pts: 3, titleHe: 'קוראים את המקור: המתח היעיל',
          bodyHe: `<p>כל שאלת זרם חילופין מתחילה בקריאת הביטוי של המקור: ${L('u(t) = 25·√2·sin(2000·t)')}.</p><p class="ask">מהו המתח היעיל של המקור?</p>`,
          unit: 'V', expected: a3.Ueff,
          traps: [trap(a3.Umax, `זה הערך המרבי ${L('Um = 25·√2')}. הערך היעיל הוא המספר שלפני ${L('√2')}.`)],
          hints: [hint(1, `${L('u(t) = Um · sin(ω · t)')}, ו-${L('Um = Ueff · √2')}`)],
          solution: [sol3('Um = Ueff · √2', 'Um = 25 · √2 V', 'Ueff = 25 V')], found: 'U = 25 V',
          sim: comp3()
        },
        {
          id: 's3-omega', type: 'num', skill: 'source', pts: 2, titleHe: 'קוראים את המקור: התדירות הזוויתית',
          bodyHe: `<p class="ask">מהי התדירות הזוויתית ${L('ω')} של המקור?</p>`,
          unit: 'rad/s', expected: a3.omega,
          traps: [trap(a3.f_Hz, `זו התדירות ${L('f')} בהרץ. ${L('ω')} הוא המספר שמכפיל את ${L('t')} בביטוי.`)],
          hints: [hint(1, `בביטוי ${L('sin(ω · t)')} המספר שמכפיל את ${L('t')} הוא ${L('ω')}`)],
          solution: [sol3('u(t) = Um · sin(ω · t)', 'u(t) = 25·√2 · sin(2000 · t)', 'ω = 2000 rad/s')], found: 'ω = 2000 rad/s',
          sim: comp3()
        },
        {
          id: 's3-l', type: 'num', skill: 'findLC', pts: 4, titleHe: 'סעיף א: השראות הסליל',
          bodyHe: `<p class="ask">חשבו את השראות הסליל ${L('L')}.</p>`,
          unit: 'mH', expected: a3.L_H * 1000,
          traps: [trap(140 * 2000, `הכפלתם את ${L('XL')} ב-${L('ω')}. מהנוסחה ${L('XL = ω · L')} מקבלים ${L('L = XL / ω')}.`)],
          hints: [hint(1, `${L('XL = ω · L')}, ולכן ${L('L = XL / ω')}`), hint(2, `${L('L = 140 / 2000 = 0.07 H')}. המירו ל-${L('mH')}.`)],
          solution: [sol3('L = XL / ω', 'L = 140 Ω / 2000 rad/s', 'L = 0.07 H = 70 mH')], found: 'L = 70 mH',
          sim: comp3()
        },
        {
          id: 's3-z', type: 'num', skill: 'impedance', pts: 5, titleHe: 'סעיף ב: עכבת המעגל',
          bodyHe: `<p class="ask">חשבו את עכבת המעגל ${L('Z')}.</p>`,
          unit: 'Ω', expected: a3.Z_ohm,
          traps: [trap(620, `חיברתם ${L('480 + 140')}. נגד והיגב מתחברים בזווית ישרה, כמו במשולש שבסימולטור.`)],
          hints: [hint(1, `${L('Z = √(R² + XL²)')}`), hint(2, `${L('Z = √(480² + 140²)')}`)],
          solution: [sol3('Z = √(R² + XL²)', 'Z = √(480² + 140²)', 'Z = 500 Ω')], found: 'Z = 500 Ω',
          sim: comp3()
        },
        {
          id: 's3-phi', type: 'num', skill: 'phase', pts: 5, titleHe: 'סעיף ב: הפרש המופע',
          bodyHe: `<p class="ask">חשבו את הפרש המופע ${L('φ')} בין מתח המקור לזרם, במעלות.</p>`,
          unit: '°', expected: a3.phi_deg,
          traps: [
            trap(Math.atan(480 / 140) * DEG, `חישבתם ${L('tan⁻¹(R / XL)')}. הזווית שבין ${L('R')} ל-${L('Z')} היא ${L('tan⁻¹(XL / R)')}.`),
            trap(a3.phi_rad, `המחשבון במצב רדיאנים. העבירו אותו למעלות (${L('DEG')}).`)
          ],
          hints: [hint(1, `${L('φ = tan⁻¹(XL / R)')}`), hint(2, `${L('φ = tan⁻¹(140 / 480) = tan⁻¹(0.2917)')}`)],
          solution: [sol3('φ = tan⁻¹(XL / R)', 'φ = tan⁻¹(140 / 480)', 'φ = ' + f2(a3.phi_deg) + '°')], found: 'φ = ' + f2(a3.phi_deg) + '°',
          sim: comp3()
        },
        {
          id: 's3-lead', type: 'mc', skill: 'phase', pts: 2, titleHe: 'סעיף ב: מי מקדים את מי?',
          bodyHe: `<p class="ask">במעגל הזה, מה היחס בין מתח המקור לזרם?</p>`,
          options: [
            opt(`המתח מקדים את הזרם ב-${L(f2(a3.phi_deg) + '°')}: המעגל בעל אופי השראי`, `נכון. במעגל עם סליל הזרם "מתעכב" אחרי המתח.`, true),
            opt(`הזרם מקדים את המתח ב-${L(f2(a3.phi_deg) + '°')}: המעגל בעל אופי קיבולי`, 'אין במעגל קבל. עם סליל, המתח הוא שמקדים.'),
            opt('המתח והזרם באותו מופע', 'זה נכון רק לנגד לבדו, או לתהודה.')
          ],
          sim: comp3()
        },
        {
          id: 's3-i', type: 'num', skill: 'current', pts: 4, titleHe: 'הזרם במעגל',
          bodyHe: `<p>סעיף ג מבקש מתחים על הרכיבים, ובשבילם צריך קודם את הזרם.</p><p class="ask">חשבו את הזרם היעיל ${L('I')} במעגל.</p>`,
          unit: 'mA', expected: a3.Ieff_mA,
          traps: [trap(25 / 480 * 1000, `חילקתם ב-${L('R')}. הזרם נקבע לפי העכבה הכוללת: ${L('I = U / Z')}.`)],
          hints: [hint(1, `${L('I = U / Z')}, בערכים יעילים`), hint(2, `${L('I = 25 / 500 = 0.05 A')}`)],
          solution: [sol3('I = U / Z', 'I = 25 V / 500 Ω', 'I = 0.05 A = 50 mA')], found: 'I = 50 mA',
          sim: comp3()
        },
        {
          id: 's3-ur', type: 'num', skill: 'voltages', pts: 4, titleHe: 'סעיף ג: המתח על הנגד',
          bodyHe: `<p class="ask">חשבו את המתח על הנגד ${L('UR')}.</p>`,
          unit: 'V', expected: a3.UR,
          traps: [trap(25, `זה מתח המקור. על הנגד נופל רק חלק ממנו: ${L('UR = I · R')}.`)],
          hints: [hint(1, `${L('UR = I · R')}`), hint(2, `${L('UR = 0.05 A · 480 Ω')}`)],
          solution: [sol3('UR = I · R', 'UR = 0.05 A · 480 Ω', 'UR = 24 V')], found: 'UR = 24 V',
          sim: comp3()
        },
        {
          id: 's3-ul', type: 'num', skill: 'voltages', pts: 4, titleHe: 'סעיף ג: המתח על הסליל',
          bodyHe: `<p class="ask">חשבו את המתח על הסליל ${L('UL')}.</p>`,
          unit: 'V', expected: a3.UL,
          traps: [trap(1, `${L('25 - 24 = 1')} הוא חיסור רגיל. המתחים מתחברים כמחוגים: ${L('UL = I · XL')}.`)],
          hints: [hint(1, `${L('UL = I · XL')}`), hint(2, `${L('UL = 0.05 A · 140 Ω')}`)],
          solution: [sol3('UL = I · XL', 'UL = 0.05 A · 140 Ω', 'UL = 7 V')], found: 'UL = 7 V',
          afterHe: `בדיקה שכדאי לעשות בבגרות: ${L('√(24² + 7²) = 25 V')}, בדיוק מתח המקור.`,
          sim: comp3()
        },
        {
          id: 's3-x3', type: 'mc', skill: 'freq', pts: 3, titleHe: 'סעיף ד: מגדילים את התדירות פי 3',
          bodyHe: `<p class="ask">מגדילים את תדירות המקור פי 3. האם הזרם יקטן או יגדל, ולמה?</p>`,
          options: [
            opt(`יקטן: ${L('XL = ω · L')} גדל פי 3, העכבה גדלה, ו-${L('I = U / Z')} קטן`, 'נכון, וזה גם הנימוק שמצפים לו. עכשיו נראה זאת בחישוב.', true),
            opt('יגדל: תדירות גבוהה יותר מעבירה יותר זרם', 'זה נכון לקבל. בסליל ההיגב גדל עם התדירות.'),
            opt('לא ישתנה: מתח המקור נשאר אותו מתח', `המתח לא השתנה, אבל העכבה כן: ${L('XL')} תלוי בתדירות.`)
          ],
          sim: comp3({ sweep: { marks: [[a3.f_Hz, 'f'], [a3x.f_Hz, '3f']] } })
        },
        {
          id: 's3-i3', type: 'num', skill: 'freq', pts: 4, titleHe: 'סעיף ד: נימוק בחישוב',
          bodyHe: `<p class="ask">חשבו את הזרם במעגל אחרי שהתדירות גדלה פי 3.</p>`,
          unit: 'mA', expected: a3x.Ieff_mA,
          traps: [trap(a3.Ieff_mA / 3, `הזרם לא קטן פי 3: רק ${L('XL')} גדל פי 3. ${L('R')} לא השתנה, ולכן ${L('Z')} גדל פחות.`)],
          hints: [
            hint(1, `${L('XL')} גדל פי 3: ${L('XL = 3 · 140 = 420 Ω')}. ${L('R')} לא משתנה.`),
            hint(2, `${L('Z = √(480² + 420²) = ' + f2(a3x.Z_ohm) + ' Ω')}`),
            hint(1, `${L('I = 25 / ' + f2(a3x.Z_ohm))}`)
          ],
          solution: [sol3('XL = 3 · 140 Ω = 420 Ω  ;  Z = √(R² + XL²)', 'Z = √(480² + 420²) = ' + f2(a3x.Z_ohm) + ' Ω', 'I = 25 V / ' + f2(a3x.Z_ohm) + ' Ω = ' + f2(a3x.Ieff_mA) + ' mA')],
          found: 'I(3f) = ' + f2(a3x.Ieff_mA) + ' mA',
          afterHe: `מ-${L('50 mA')} אל ${L(f2(a3x.Ieff_mA) + ' mA')}: הזרם אכן קטן.`,
          sim: comp3({ cfg: C3x, sweep: { marks: [[a3.f_Hz, 'f'], [a3x.f_Hz, '3f']] },
            sketch: { R: ['R = 480 Ω'], L: ['XL = 420 Ω'], src: ['u(t) = 25·√2·sin(6000·t)'] },
            tri: { R: ['R = 480 Ω'], X: ['XL = 420 Ω'], Z: ['Z', 's3-i3', 'Z = ' + f2(a3x.Z_ohm) + ' Ω'], phi: ['φ'] } })
        }
      ]
    };

    // ---------- station 4: bagrut 2021 Q2 (RC) ----------
    const C4 = { topology: 'RC', inputMode: 'reactances', freqMode: 'omega', omega: 8000 * Math.PI, Ueff: 17, R_ohm: 80, XC_ohm: 150 };
    const a4 = solve(C4);
    const comp4 = (extra) => Object.assign({
      cfg: C4, mode: 'compute', given: ['R = 80 Ω', 'XC = 150 Ω', 'u(t) = 17·√2·sin(8π·10³·t) V'],
      sketch: { R: ['R = 80 Ω'], C: ['XC = 150 Ω'], src: ['u(t) = 17·√2·sin(8π·10³·t)'] },
      tri: { R: ['R = 80 Ω'], X: ['XC = 150 Ω'], Z: ['Z', 's4-z', 'Z = 170 Ω'], phi: ['φ', 's4-phi', 'φ = ' + f2(a4.phi_deg) + '°'] }
    }, extra || {});
    const s4 = {
      id: 's4', short: 'בגרות 2021', title: `בגרות 2021, שאלה 2: מעגל ${T('RC')} טורי`, img: 'st-lp',
      introHe: 'שאלה מקורית משאלון 815381, קיץ תשפ"א. הפעם קבל במקום סליל.',
      question: {
        sourceHe: 'שאלון 815381, קיץ תשפ"א (2021), שאלה 2',
        figs: [{ src: 'bagrut-2021-q2.png', cap: 'איור לשאלה', wide: true }],
        textHe: `<p>באיור נתון מעגל חשמלי הפועל בזרם חילופין.</p>
          <ol class="heb"><li>חשבו את זמן המחזור של מתח המקור.</li>
          <li>חשבו את קיבול הקבל ${L('C')}.</li>
          <li>חשבו את גודל עכבת המעגל.</li>
          <li>חשבו את המתח היעיל על פני הנגד ${L('R')}.</li></ol>`
      },
      steps: [
        {
          id: 's4-f', type: 'num', skill: 'source', pts: 3, titleHe: 'קוראים את המקור: התדירות',
          bodyHe: `<p>הביטוי של המקור: ${L('u(t) = 17·√2·sin(8π·10³·t)')}. כאן ${L('ω = 8π·10³ rad/s')}.</p><p class="ask">מהי התדירות ${L('f')} של המקור?</p>`,
          unit: 'Hz', expected: a4.f_Hz,
          traps: [trap(a4.omega, `זה ${L('ω')} ברדיאנים לשנייה. ${L('f = ω / (2π)')}.`), trap(8000, `${L('ω = 8π·10³ = 2π · f')}, ולכן ${L('f = 4·10³')}.`)],
          hints: [hint(1, `${L('ω = 2π · f')}, ולכן ${L('f = ω / (2π)')}`), hint(1, `${L('f = 8π·10³ / (2π)')}: ה-${L('π')} מצטמצם`)],
          solution: [sol3('f = ω / (2π)', 'f = 8π·10³ / (2π)', 'f = 4000 Hz')], found: 'f = 4000 Hz',
          sim: comp4()
        },
        {
          id: 's4-t', type: 'num', skill: 'source', pts: 4, titleHe: 'סעיף א: זמן המחזור',
          bodyHe: `<p class="ask">חשבו את זמן המחזור ${L('T')} של מתח המקור.</p>`,
          unit: 'ms', expected: a4.T_s * 1000,
          traps: [trap(4, `${L('T = 1 / f')}, ולא ${L('f / 1000')}.`)],
          hints: [hint(1, `${L('T = 1 / f')}`), hint(2, `${L('T = 1 / 4000 = 0.00025 s')}. המירו ל-${L('ms')}.`)],
          solution: [sol3('T = 1 / f', 'T = 1 / 4000 Hz', 'T = 0.00025 s = 0.25 ms')], found: 'T = 0.25 ms',
          sim: comp4()
        },
        {
          id: 's4-c', type: 'num', skill: 'findLC', pts: 5, titleHe: 'סעיף ב: קיבול הקבל',
          bodyHe: `<p class="ask">חשבו את קיבול הקבל ${L('C')}.</p>`,
          unit: 'nF', expected: a4.C_F * 1e9,
          traps: [trap(1e9 / (a4.f_Hz * 150), `השתמשתם ב-${L('f')} במקום ב-${L('ω')}. בנוסחה ${L('XC = 1 / (ω · C)')} מופיע ${L('ω = 2π · f')}.`)],
          hints: [
            hint(1, `${L('XC = 1 / (ω · C)')}, ולכן ${L('C = 1 / (ω · XC)')}`),
            hint(2, `${L('C = 1 / (8π·10³ · 150) = 2.65·10⁻⁷ F')}`),
            hint(1, `${L('10⁻⁷ F = 100 nF')}`)
          ],
          solution: [sol3('C = 1 / (ω · XC)', 'C = 1 / (8π·10³ rad/s · 150 Ω)', 'C = 2.65·10⁻⁷ F = ' + f2(a4.C_F * 1e9) + ' nF')], found: 'C = ' + g2(a4.C_F * 1e9) + ' nF',
          sim: comp4()
        },
        {
          id: 's4-z', type: 'num', skill: 'impedance', pts: 5, titleHe: 'סעיף ג: עכבת המעגל',
          bodyHe: `<p class="ask">חשבו את גודל עכבת המעגל ${L('Z')}.</p>`,
          unit: 'Ω', expected: a4.Z_ohm,
          traps: [trap(230, `חיברתם ${L('80 + 150')}. נגד והיגב מתחברים בזווית ישרה.`), trap(Math.sqrt(150 * 150 - 80 * 80), `בפיתגורס מחברים את הריבועים: ${L('Z = √(R² + XC²)')}.`)],
          hints: [hint(1, `${L('Z = √(R² + XC²)')}`), hint(2, `${L('Z = √(80² + 150²)')}`)],
          solution: [sol3('Z = √(R² + XC²)', 'Z = √(80² + 150²)', 'Z = 170 Ω')], found: 'Z = 170 Ω',
          sim: comp4()
        },
        {
          id: 's4-i', type: 'num', skill: 'current', pts: 4, titleHe: 'הזרם במעגל',
          bodyHe: `<p>סעיף ד מבקש את המתח על הנגד, ובשבילו צריך את הזרם.</p><p class="ask">חשבו את הזרם היעיל ${L('I')}.</p>`,
          unit: 'mA', expected: a4.Ieff_mA,
          traps: [trap(17 / 80 * 1000, `חילקתם ב-${L('R')}. הזרם נקבע לפי העכבה הכוללת: ${L('I = U / Z')}.`), trap(a4.Umax / 170 * 1000, `השתמשתם בערך המרבי ${L('17·√2')}. המתח היעיל הוא ${L('17 V')}.`)],
          hints: [hint(1, `${L('I = U / Z')}, כש-${L('U = 17 V')} הוא הערך היעיל`), hint(2, `${L('I = 17 / 170 = 0.1 A')}`)],
          solution: [sol3('I = U / Z', 'I = 17 V / 170 Ω', 'I = 0.1 A = 100 mA')], found: 'I = 100 mA',
          sim: comp4()
        },
        {
          id: 's4-ur', type: 'num', skill: 'voltages', pts: 5, titleHe: 'סעיף ד: המתח על הנגד',
          bodyHe: `<p class="ask">חשבו את המתח היעיל על פני הנגד ${L('R')}.</p>`,
          unit: 'V', expected: a4.UR,
          traps: [trap(17, `זה מתח המקור. על הנגד נופל רק חלק ממנו.`)],
          hints: [hint(1, `${L('UR = I · R')}`), hint(2, `${L('UR = 0.1 A · 80 Ω')}`)],
          solution: [sol3('UR = I · R', 'UR = 0.1 A · 80 Ω', 'UR = 8 V')], found: 'UR = 8 V',
          sim: comp4()
        },
        {
          id: 's4-uc', type: 'num', skill: 'voltages', pts: 4, titleHe: 'העמקה: המתח על הקבל', tagHe: 'העמקה, לא בשאלון',
          bodyHe: `<p class="ask">חשבו את המתח היעיל על הקבל ${L('UC')}.</p>`,
          unit: 'V', expected: a4.UC,
          traps: [trap(9, `${L('17 - 8 = 9')} הוא חיסור רגיל. המתחים מתחברים כמחוגים: ${L('UC = I · XC')}.`)],
          hints: [hint(1, `${L('UC = I · XC')}`), hint(2, `${L('UC = 0.1 A · 150 Ω')}`)],
          solution: [sol3('UC = I · XC', 'UC = 0.1 A · 150 Ω', 'UC = 15 V')], found: 'UC = 15 V',
          afterHe: `בדיקה: ${L('√(8² + 15²) = 17 V')}, בדיוק מתח המקור.`,
          sim: comp4()
        },
        {
          id: 's4-phi', type: 'num', skill: 'phase', pts: 4, titleHe: 'העמקה: הפרש המופע', tagHe: 'העמקה, לא בשאלון',
          bodyHe: `<p class="ask">חשבו את הפרש המופע ${L('φ')} בין מתח המקור לזרם, במעלות ועם סימן.</p>`,
          unit: '°', expected: a4.phi_deg,
          traps: [trap(-Math.atan(80 / 150) * DEG, `חישבתם ${L('tan⁻¹(R / XC)')}. הזווית היא ${L('tan⁻¹(XC / R)')}, עם סימן מינוס.`)],
          hints: [hint(1, `${L('φ = tan⁻¹(X / R)')}, וב-${T('RC')}: ${L('X = -XC')}`), hint(2, `${L('φ = tan⁻¹(-150 / 80)')}`)],
          solution: [sol3('φ = tan⁻¹(X / R)  ;  X = -XC', 'φ = tan⁻¹(-150 / 80)', 'φ = ' + f2(a4.phi_deg) + '°')], found: 'φ = ' + f2(a4.phi_deg) + '°',
          sim: comp4()
        },
        {
          id: 's4-char', type: 'mc', skill: 'phase', pts: 2, titleHe: 'מה אומר הסימן?',
          bodyHe: `<p class="ask">הזווית יצאה שלילית. מה זה אומר על המעגל?</p>`,
          options: [
            opt('אופי קיבולי: הזרם מקדים את מתח המקור', 'נכון. בקבל הזרם "מגיע ראשון".', true),
            opt('אופי השראי: המתח מקדים את הזרם', 'זווית חיובית היא אופי השראי. כאן יש קבל, והזווית שלילית.'),
            opt('טעות בחישוב: זווית לא יכולה להיות שלילית', 'היא יכולה. הסימן מבחין בין אופי השראי לאופי קיבולי.')
          ],
          sim: comp4()
        }
      ]
    };

    // ---------- station 5: the personal question ----------
    const PA = { topology: 'RL', inputMode: 'components', freqMode: 'omega', omega: P.omega, Ueff: P.U, R_ohm: P.R, L_H: P.L_mH / 1000 };
    const pa = solve(PA);
    const PB = { topology: 'RLC', inputMode: 'components', freqMode: 'omega', omega: P.omega, Ueff: P.U, R_ohm: P.R, L_H: P.L_mH / 1000, C_F: P.C_uF * 1e-6 };
    const pb = solve(PB);
    const pres = solve(Object.assign({}, PB, { freqMode: 'f', f_Hz: pb.f0_Hz }));
    const RS = g(P.R), LS = g(P.L_mH), WS = g(P.omega), US = g(P.U), CS = g(P.C_uF);
    const SRC = 'u(t) = ' + US + '·√2·sin(' + WS + '·t)';
    const inductive = pb.X_ohm > 0;
    const compA = () => ({
      cfg: PA, mode: 'compute', given: ['R = ' + RS + ' Ω', 'L = ' + LS + ' mH', SRC + ' V'],
      sketch: { R: ['R = ' + RS + ' Ω'], L: ['L = ' + LS + ' mH'], src: [SRC] },
      tri: { R: ['R = ' + RS + ' Ω'], X: ['XL', 's5-xl', 'XL = ' + g2(pa.XL_ohm) + ' Ω'], Z: ['Z', 's5-z', 'Z = ' + g2(pa.Z_ohm) + ' Ω'], phi: ['φ', 's5-phi', 'φ = ' + f2(pa.phi_deg) + '°'] }
    });
    const compB = (extra) => Object.assign({
      cfg: PB, mode: 'compute', given: ['R = ' + RS + ' Ω', 'L = ' + LS + ' mH', 'C = ' + CS + ' µF', SRC + ' V'],
      sketch: { R: ['R = ' + RS + ' Ω'], L: ['L = ' + LS + ' mH'], C: ['C = ' + CS + ' µF'], src: [SRC] },
      tri: { R: ['R = ' + RS + ' Ω'], X: ['XL - XC', 's5-zb', 'X = ' + g2(pb.X_ohm) + ' Ω'], Z: ['Z', 's5-zb', 'Z = ' + g2(pb.Z_ohm) + ' Ω'], phi: ['φ'] }
    }, extra || {});
    const s5 = {
      id: 's5', short: 'משימה אישית', title: 'המשימה האישית שלך', img: 'st-final',
      introHe: 'אותו סוג שאלה, עם רכיבים שרק לך יש. כאן הרמזים יקרים יותר.',
      question: {
        sourceHe: 'שאלה בסגנון בגרות, עם נתונים אישיים',
        personal: true,
        textHe: `<p>נתון מעגל טורי: נגד ${L('R = ' + RS + ' Ω')} וסליל ${L('L = ' + LS + ' mH')}. מתח המקור: ${L(SRC + ' [V]')}.</p>
          <p>בחלק א המעגל הוא ${T('RL')} טורי. בחלק ב מוסיפים בטור קבל ${L('C = ' + CS + ' µF')}, והמעגל הופך ל-${T('RLC')} טורי.</p>`
      },
      steps: [
        {
          id: 's5-xl', type: 'num', skill: 'reactance', pts: 5, titleHe: 'חלק א: היגב הסליל',
          bodyHe: `<p class="ask">חשבו את היגב הסליל ${L('XL')}.</p>`,
          unit: 'Ω', expected: pa.XL_ohm,
          traps: [trap(P.omega * P.L_mH, `שכחתם להמיר את ${L('mH')} להנרי.`)],
          hints: [hint(2, `${L('XL = ω · L')}. קראו את ${L('ω')} מהביטוי של המקור, והמירו את ${L('L')} להנרי.`), hint(3, `${L('XL = ' + WS + ' · ' + g(P.L_mH / 1000))}`)],
          solution: [sol3('XL = ω · L', 'XL = ' + WS + ' rad/s · ' + g(P.L_mH / 1000) + ' H', 'XL = ' + g2(pa.XL_ohm) + ' Ω')], found: 'XL = ' + g2(pa.XL_ohm) + ' Ω',
          sim: compA()
        },
        {
          id: 's5-z', type: 'num', skill: 'impedance', pts: 6, titleHe: 'חלק א: עכבת המעגל',
          bodyHe: `<p class="ask">חשבו את עכבת המעגל ${L('Z')}.</p>`,
          unit: 'Ω', expected: pa.Z_ohm,
          traps: [trap(P.R + pa.XL_ohm, `חיברתם את ${L('R')} ואת ${L('XL')} חיבור רגיל. הם מתחברים בזווית ישרה.`)],
          hints: [hint(2, `${L('Z = √(R² + XL²)')}`), hint(3, `${L('Z = √(' + RS + '² + ' + g2(pa.XL_ohm) + '²)')}`)],
          solution: [sol3('Z = √(R² + XL²)', 'Z = √(' + RS + '² + ' + g2(pa.XL_ohm) + '²)', 'Z = ' + g2(pa.Z_ohm) + ' Ω')], found: 'Z = ' + g2(pa.Z_ohm) + ' Ω',
          sim: compA()
        },
        {
          id: 's5-i', type: 'num', skill: 'current', pts: 5, titleHe: 'חלק א: הזרם במעגל',
          bodyHe: `<p class="ask">חשבו את הזרם היעיל ${L('I')} במעגל.</p>`,
          unit: 'mA', expected: pa.Ieff_mA,
          traps: [trap(P.U / P.R * 1000, `חילקתם ב-${L('R')}. הזרם נקבע לפי העכבה הכוללת.`), trap(pa.Umax / pa.Z_ohm * 1000, `השתמשתם בערך המרבי של המקור. המתח היעיל הוא המספר שלפני ${L('√2')}.`)],
          hints: [hint(2, `${L('I = U / Z')}, כש-${L('U')} הוא המתח היעיל: המספר שלפני ${L('√2')}`), hint(3, `${L('I = ' + US + ' / ' + g2(pa.Z_ohm))}`)],
          solution: [sol3('I = U / Z', 'I = ' + US + ' V / ' + g2(pa.Z_ohm) + ' Ω', 'I = ' + g(pa.Ieff) + ' A = ' + g2(pa.Ieff_mA) + ' mA')], found: 'I = ' + g2(pa.Ieff_mA) + ' mA',
          sim: compA()
        },
        {
          id: 's5-phi', type: 'num', skill: 'phase', pts: 6, titleHe: 'חלק א: הפרש המופע',
          bodyHe: `<p class="ask">חשבו את הפרש המופע ${L('φ')} בין מתח המקור לזרם, במעלות.</p>`,
          unit: '°', expected: pa.phi_deg,
          traps: [trap(Math.atan(P.R / pa.XL_ohm) * DEG, `חישבתם ${L('tan⁻¹(R / XL)')}. הזווית היא ${L('tan⁻¹(XL / R)')}.`), trap(pa.phi_rad, `המחשבון במצב רדיאנים. העבירו אותו למעלות.`)],
          hints: [hint(2, `${L('φ = tan⁻¹(XL / R)')}`), hint(3, `${L('φ = tan⁻¹(' + g2(pa.XL_ohm) + ' / ' + RS + ')')}`)],
          solution: [sol3('φ = tan⁻¹(XL / R)', 'φ = tan⁻¹(' + g2(pa.XL_ohm) + ' / ' + RS + ')', 'φ = ' + f2(pa.phi_deg) + '°')], found: 'φ = ' + f2(pa.phi_deg) + '°',
          sim: compA()
        },
        {
          id: 's5-ul', type: 'num', skill: 'voltages', pts: 5, titleHe: 'חלק א: המתח על הסליל',
          bodyHe: `<p class="ask">חשבו את המתח היעיל על הסליל ${L('UL')}.</p>`,
          unit: 'V', expected: pa.UL,
          traps: [trap(pa.UR, `זה המתח על הנגד. ביקשו את המתח על הסליל: ${L('UL = I · XL')}.`), trap(P.U - pa.UR, `חיסרתם חיסור רגיל. המתחים מתחברים כמחוגים.`)],
          hints: [hint(2, `${L('UL = I · XL')}, עם הזרם באמפר`), hint(3, `${L('UL = ' + g(pa.Ieff) + ' · ' + g2(pa.XL_ohm))}`)],
          solution: [sol3('UL = I · XL', 'UL = ' + g(pa.Ieff) + ' A · ' + g2(pa.XL_ohm) + ' Ω', 'UL = ' + f2(pa.UL) + ' V')], found: 'UL = ' + g2(pa.UL) + ' V',
          sim: compA()
        },
        {
          id: 's5-xc', type: 'num', skill: 'reactance', pts: 5, titleHe: 'חלק ב: היגב הקבל',
          bodyHe: `<p>מוסיפים בטור קבל ${L('C = ' + CS + ' µF')}. התדירות לא השתנתה.</p><p class="ask">חשבו את היגב הקבל ${L('XC')}.</p>`,
          unit: 'Ω', expected: pb.XC_ohm,
          traps: [trap(P.omega * P.C_uF * 1e-6, `חישבתם ${L('ω · C')}. ההיגב הוא ההופכי: ${L('XC = 1 / (ω · C)')}.`)],
          hints: [hint(2, `${L('XC = 1 / (ω · C)')}, עם ${L('C')} בפאראד: ${L('1 µF = 10⁻⁶ F')}`), hint(3, `${L('XC = 1 / (' + WS + ' · ' + CS + '·10⁻⁶)')}`)],
          solution: [sol3('XC = 1 / (ω · C)', 'XC = 1 / (' + WS + ' rad/s · ' + CS + '·10⁻⁶ F)', 'XC = ' + f2(pb.XC_ohm) + ' Ω')], found: 'XC = ' + g2(pb.XC_ohm) + ' Ω',
          sim: compB()
        },
        {
          id: 's5-zb', type: 'num', skill: 'impedance', pts: 6, titleHe: 'חלק ב: העכבה החדשה',
          bodyHe: `<p class="ask">חשבו את עכבת המעגל ${T('RLC')} הטורי.</p>`,
          unit: 'Ω', expected: pb.Z_ohm,
          traps: [
            trap(Math.hypot(P.R, pb.XL_ohm + pb.XC_ohm), `חיברתם את שני ההיגבים. הם פועלים זה נגד זה: ${L('X = XL - XC')}.`),
            trap(pa.Z_ohm, `זו העכבה של חלק א, בלי הקבל.`)
          ],
          hints: [hint(2, `${L('X = XL - XC')}, ואז ${L('Z = √(R² + X²)')}`), hint(3, `${L('X = ' + g2(pb.XL_ohm) + ' - ' + g2(pb.XC_ohm) + ' = ' + g2(pb.X_ohm))}, ו-${L('Z = √(' + RS + '² + ' + (pb.X_ohm < 0 ? '(' + g2(pb.X_ohm) + ')' : g2(pb.X_ohm)) + '²)')}`)],
          solution: [sol3('X = XL - XC  ;  Z = √(R² + X²)', 'X = ' + g2(pb.XL_ohm) + ' Ω - ' + g2(pb.XC_ohm) + ' Ω = ' + g2(pb.X_ohm) + ' Ω', 'Z = √(' + RS + '² + ' + (pb.X_ohm < 0 ? '(' + g2(pb.X_ohm) + ')' : g2(pb.X_ohm)) + '²) = ' + f2(pb.Z_ohm) + ' Ω')],
          found: 'Z(RLC) = ' + g2(pb.Z_ohm) + ' Ω',
          sim: compB()
        },
        {
          id: 's5-char', type: 'mc', skill: 'phase', pts: 3, titleHe: 'חלק ב: אופי המעגל',
          bodyHe: `<p class="ask">מה אופי המעגל אחרי הוספת הקבל?</p>`,
          options: [
            opt(`השראי: ${L('XL > XC')}, והמתח מקדים את הזרם`, inductive ? `נכון: ${L(g2(pb.XL_ohm) + ' > ' + g2(pb.XC_ohm))}.` : `בדקו שוב: ${L('XC = ' + g2(pb.XC_ohm) + ' Ω')} גדול מ-${L('XL = ' + g2(pb.XL_ohm) + ' Ω')}.`, inductive),
            opt(`קיבולי: ${L('XC > XL')}, והזרם מקדים את המתח`, inductive ? `בדקו שוב: ${L('XL = ' + g2(pb.XL_ohm) + ' Ω')} גדול מ-${L('XC = ' + g2(pb.XC_ohm) + ' Ω')}.` : `נכון: ${L(g2(pb.XC_ohm) + ' > ' + g2(pb.XL_ohm))}.`, !inductive),
            opt('התנגדותי: המעגל בתהודה', `בתהודה ${L('XL = XC')}, וכאן הם שונים.`)
          ],
          sim: compB()
        },
        {
          id: 's5-f0', type: 'num', skill: 'resonance', pts: 7, titleHe: 'חלק ב: תדר התהודה',
          bodyHe: `<p class="ask">באיזו תדירות ${L('f0')} המעגל הזה יהיה בתהודה?</p>`,
          unit: 'Hz', expected: pb.f0_Hz,
          traps: [trap(pb.omega0, `זה ${L('ω0')} ברדיאנים לשנייה. מחלקים ב-${L('2π')}.`), trap(pb.f_Hz, `זו התדירות הנוכחית של המקור. מחפשים את התדירות שבה ${L('XL = XC')}.`)],
          hints: [hint(2, `${L('f0 = 1 / (2π · √(L · C))')}, עם ${L('L')} בהנרי ו-${L('C')} בפאראד`), hint(3, `${L('f0 = 1 / (2π · √(' + g(P.L_mH / 1000) + ' · ' + CS + '·10⁻⁶))')}`)],
          solution: [sol3('f0 = 1 / (2π · √(L · C))', 'f0 = 1 / (2π · √(' + g(P.L_mH / 1000) + ' H · ' + CS + '·10⁻⁶ F))', 'f0 = ' + f2(pb.f0_Hz) + ' Hz')], found: 'f0 = ' + g2(pb.f0_Hz) + ' Hz',
          sim: compB({ sweep: { marks: [[pb.f_Hz, 'f'], [pb.f0_Hz, 'f0']], resonance: true } })
        },
        {
          id: 's5-ires', type: 'num', skill: 'resonance', pts: 5, titleHe: 'חלק ב: הזרם בתהודה',
          bodyHe: `<p class="ask">מה יהיה הזרם היעיל במעגל בתדר התהודה?</p>`,
          unit: 'mA', expected: pres.Ieff_mA,
          traps: [trap(pb.Ieff_mA, `זה הזרם בתדירות הנוכחית. בתהודה העכבה שונה.`), trap(pa.Ieff_mA, `זה הזרם של חלק א. בתהודה ${L('Z = R')}.`)],
          hints: [hint(2, `בתהודה ${L('XL = XC')}, ולכן ${L('Z = R')}`), hint(3, `${L('I = U / R = ' + US + ' / ' + RS)}`)],
          solution: [sol3('I = U / R', 'I = ' + US + ' V / ' + RS + ' Ω', 'I = ' + g(pres.Ieff) + ' A = ' + g2(pres.Ieff_mA) + ' mA')], found: 'I(f0) = ' + g2(pres.Ieff_mA) + ' mA',
          afterHe: 'זה הזרם הגדול ביותר שהמעגל הזה יכול להעביר, בכל תדירות.',
          sim: compB({ sweep: { marks: [[pb.f_Hz, 'f'], [pb.f0_Hz, 'f0']], resonance: true } })
        }
      ]
    };

    const stations = [s1, s2, s3, s4, s5];
    stations.forEach((st) => st.steps.forEach((sp) => {
      sp.station = st.id;
      if (!sp.pts) sp.pts = 0;
      if (sp.type === 'num' && !Number.isFinite(sp.expected)) throw new Error('guided content: no expected value for ' + sp.id);
      if (sp.type === 'mc' && sp.options.filter((o) => o.correct).length !== 1) throw new Error('guided content: ' + sp.id + ' needs exactly one correct option');
    }));
    return { stations };
  }

  global.GuidedContent = {
    ACTIVITY_ID: 'u3-ac-guided',
    ACTIVITY_TITLE: 'פעילות מודרכת: זרם חילופין ברמת בגרות',
    ACTIVITY_TITLE_HTML: 'פעילות מודרכת: זרם חילופין ברמת בגרות',
    KICKER_HTML: 'יחידה <span dir="ltr">U3</span> · אלקטרוניקה תקבילית י"א · שאלון <span dir="ltr">815381</span>',
    INTRO_HTML: 'חמש תחנות: תזכורת קצרה, מציאת התהודה בסימולטור, שתי שאלות בגרות מודרכות ומשימה אישית להגשה. בכל שלב מחשבים ומקלידים תשובה.',
    HERO_IMG: 'hero-ac',
    VERSION: 1,
    SKILLS,
    FORMULAS,
    makePersonal,
    /** The personal values as one line for the results sheet. */
    paramsText: (p) => 'R=' + p.R + 'Ω, L=' + p.L_mH + 'mH, ω=' + p.omega + 'rad/s, U=' + p.U + 'V, C=' + p.C_uF + 'µF',
    build
  };
})(window);
